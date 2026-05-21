// Verify a user's age (from a government ID) or photo (selfie vs. profile photos)
// using the Lovable AI gateway. Called by the client with paths to files
// already uploaded into the private `verifications` storage bucket.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ID_LABELS: Record<string, string> = {
  ghana_card: "Ghana Card",
  passport: "Passport",
  drivers_license: "Driver's licence",
  voter_id: "Voter ID",
};

type Body =
  | { kind: "age"; id_type: keyof typeof ID_LABELS; id_document_path: string }
  | { kind: "photo"; selfie_path: string };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function downloadAsDataUrl(admin: ReturnType<typeof createClient>, path: string): Promise<string> {
  const { data, error } = await admin.storage.from("verifications").download(path);
  if (error || !data) throw new Error(`download failed: ${error?.message ?? "no data"}`);
  const buf = new Uint8Array(await data.arrayBuffer());
  let b64 = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    b64 += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  const base64 = btoa(b64);
  const mime = data.type || "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

async function callAiVision(apiKey: string, systemPrompt: string, userText: string, images: string[], tool: any) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            ...images.map((url) => ({ type: "image_url", image_url: { url } })),
          ],
        },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: tool.function.name } },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`ai gateway ${res.status}: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  const call = j?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("no tool call returned");
  return JSON.parse(call.function.arguments);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
  const userId = claimsData.claims.sub as string;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Fetch this user's profile (for name + existing photos)
  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("id, first_name, photos")
    .eq("id", userId)
    .maybeSingle();
  if (profErr || !profile) return json({ error: "profile not found" }, 404);

  try {
    if (body.kind === "age") {
      if (!body.id_type || !ID_LABELS[body.id_type]) return json({ error: "invalid id_type" }, 400);
      if (!body.id_document_path?.startsWith(`${userId}/`)) return json({ error: "invalid id_document_path" }, 400);

      const docUrl = await downloadAsDataUrl(admin, body.id_document_path);

      const result = await callAiVision(
        LOVABLE_API_KEY,
        `You are an identity verification reviewer. You look at a photo of a government-issued ID document and extract the holder's date of birth and full name. Be strict: if the image is unreadable, blurred, looks edited or is not a real ${ID_LABELS[body.id_type]}, mark it not_legible and explain why.`,
        `This should be a ${ID_LABELS[body.id_type]}. The first name on the user's profile is "${profile.first_name ?? ""}". Extract the holder's date of birth in ISO format (YYYY-MM-DD), the full name printed on the document, whether it matches the profile first name, and confirm the document type.`,
        [docUrl],
        {
          type: "function",
          function: {
            name: "report_id_check",
            description: "Report the outcome of an ID document check.",
            parameters: {
              type: "object",
              additionalProperties: false,
              properties: {
                date_of_birth: { type: ["string", "null"], description: "ISO YYYY-MM-DD or null if not legible." },
                full_name: { type: ["string", "null"] },
                name_matches_profile: { type: "boolean" },
                document_type_matches: { type: "boolean", description: "Whether the document actually looks like the declared type." },
                legible: { type: "boolean" },
                appears_authentic: { type: "boolean" },
                notes: { type: "string" },
              },
              required: ["date_of_birth", "full_name", "name_matches_profile", "document_type_matches", "legible", "appears_authentic", "notes"],
            },
          },
        },
      );

      // Decide outcome
      let age: number | null = null;
      if (result.date_of_birth) {
        const dob = new Date(result.date_of_birth);
        if (!isNaN(dob.getTime())) {
          const diff = Date.now() - dob.getTime();
          age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
        }
      }
      const approved =
        !!result.legible &&
        !!result.appears_authentic &&
        !!result.document_type_matches &&
        !!result.name_matches_profile &&
        age !== null && age >= 35 && age <= 120;

      const status: "approved" | "rejected" = approved ? "approved" : "rejected";
      const reason = approved
        ? `Approved · age ${age}, ${ID_LABELS[body.id_type]}`
        : `Rejected · ${result.notes ?? "did not meet verification criteria"}`;

      await admin.from("verification_requests").insert({
        user_id: userId,
        kind: "age",
        id_type: body.id_type,
        id_document_path: body.id_document_path,
        status,
        ai_extracted_dob: result.date_of_birth ?? null,
        ai_extracted_name: result.full_name ?? null,
        ai_notes: reason,
        processed_at: new Date().toISOString(),
      });

      const update: Record<string, unknown> = {
        age_verification_status: status,
        age_verification_notes: reason,
        age_verified: approved,
      };
      if (approved) update.verified = true;
      await admin.from("profiles").update(update).eq("id", userId);

      return json({ ok: true, status, reason, extracted: result, computed_age: age });
    }

    if (body.kind === "photo") {
      if (!body.selfie_path?.startsWith(`${userId}/`)) return json({ error: "invalid selfie_path" }, 400);

      const photos = Array.isArray(profile.photos) ? (profile.photos as string[]).slice(0, 3) : [];
      if (!photos.length) return json({ error: "Add at least one profile photo before requesting photo verification." }, 400);

      const selfieUrl = await downloadAsDataUrl(admin, body.selfie_path);
      // Profile photos live in the public profile-photos bucket — fetch directly.
      const profileImages: string[] = [];
      for (const url of photos) {
        try {
          const r = await fetch(url);
          if (!r.ok) continue;
          const buf = new Uint8Array(await r.arrayBuffer());
          let b64 = "";
          const chunk = 0x8000;
          for (let i = 0; i < buf.length; i += chunk) b64 += String.fromCharCode(...buf.subarray(i, i + chunk));
          profileImages.push(`data:${r.headers.get("content-type") ?? "image/jpeg"};base64,${btoa(b64)}`);
        } catch (_) { /* skip */ }
      }
      if (!profileImages.length) return json({ error: "Could not load your profile photos." }, 400);

      const result = await callAiVision(
        LOVABLE_API_KEY,
        `You are a face verification reviewer. The first image is a live selfie. The remaining images are the user's profile photos. Decide whether the selfie clearly shows the SAME person as the profile photos. Be strict — reject if the selfie is unclear, low quality, doesn't show a real human face, or appears to be a photo-of-a-photo.`,
        `Compare the selfie (first image) with the profile photos (the rest). Return a match_score between 0 and 1 (1 = certain same person), whether the selfie is a clear live human face, and whether the same person appears in both.`,
        [selfieUrl, ...profileImages],
        {
          type: "function",
          function: {
            name: "report_face_check",
            description: "Report the outcome of a selfie/profile face match.",
            parameters: {
              type: "object",
              additionalProperties: false,
              properties: {
                match_score: { type: "number", minimum: 0, maximum: 1 },
                same_person: { type: "boolean" },
                selfie_is_live_face: { type: "boolean" },
                notes: { type: "string" },
              },
              required: ["match_score", "same_person", "selfie_is_live_face", "notes"],
            },
          },
        },
      );

      const approved =
        !!result.selfie_is_live_face &&
        !!result.same_person &&
        typeof result.match_score === "number" &&
        result.match_score >= 0.75;

      const status: "approved" | "rejected" = approved ? "approved" : "rejected";
      const reason = approved
        ? `Approved · face match ${Math.round((result.match_score ?? 0) * 100)}%`
        : `Rejected · ${result.notes ?? "selfie did not clearly match your profile photos"}`;

      await admin.from("verification_requests").insert({
        user_id: userId,
        kind: "photo",
        selfie_path: body.selfie_path,
        status,
        ai_face_match_score: result.match_score ?? null,
        ai_notes: reason,
        processed_at: new Date().toISOString(),
      });

      const update: Record<string, unknown> = {
        photo_verification_status: status,
        photo_verification_notes: reason,
        photo_verified: approved,
      };
      if (approved) update.verified = true;
      await admin.from("profiles").update(update).eq("id", userId);

      return json({ ok: true, status, reason, match_score: result.match_score });
    }

    return json({ error: "invalid kind" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[verify-identity] error", msg);

    // 402/429 surfacing for Lovable AI rate/credit errors
    const lower = msg.toLowerCase();
    if (lower.includes("429")) return json({ error: "AI rate limit reached, please try again in a minute." }, 429);
    if (lower.includes("402")) return json({ error: "AI credits exhausted — please add credits in workspace usage settings." }, 402);

    return json({ error: msg }, 500);
  }
});