import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!ANTHROPIC_API_KEY) {
      return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const { sender_id, receiver_id, message_content } = body ?? {};
    if (!sender_id || !receiver_id || !message_content) {
      return json({ error: "sender_id, receiver_id, message_content required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Rate limit: skip if the seed has already sent 20+ messages in the last minute.
    const { data: rateCount, error: rateErr } = await admin.rpc("recent_message_count", {
      _user_id: receiver_id,
    });
    if (rateErr) {
      console.warn("[seed-reply] rate check failed", rateErr);
    } else if (typeof rateCount === "number" && rateCount >= 20) {
      return json({ skipped: true, reason: "rate_limited", count: rateCount }, 200);
    }

    // Verify receiver is a seed
    const { data: seed, error: seedErr } = await admin
      .from("profiles")
      .select("id, is_seed, first_name, age, gender, location, city, country, bio")
      .eq("id", receiver_id)
      .maybeSingle();
    if (seedErr) return json({ error: seedErr.message }, 500);
    if (!seed || !seed.is_seed) {
      return json({ skipped: true, reason: "receiver is not a seed" }, 200);
    }

    // Fetch the recipient (the human the seed is replying to) so we can tailor a question.
    const { data: recipient } = await admin
      .from("profiles")
      .select("first_name, age, gender, location, city, country, bio")
      .eq("id", sender_id)
      .maybeSingle();

    // Find the match between these two users
    const { data: match, error: matchErr } = await admin
      .from("matches")
      .select("id, user_a, user_b")
      .or(`and(user_a.eq.${sender_id},user_b.eq.${receiver_id}),and(user_a.eq.${receiver_id},user_b.eq.${sender_id})`)
      .maybeSingle();
    if (matchErr) return json({ error: matchErr.message }, 500);
    if (!match) return json({ error: "no match between users" }, 404);

    const name = seed.first_name ?? "there";
    const age = seed.age ?? "";
    const gender = seed.gender ?? "person";
    const location = [seed.city, seed.location, seed.country].filter(Boolean).join(", ") || "Ghana";
    const bio = seed.bio ?? "Looking for a genuine connection.";

    const recipientName = recipient?.first_name ?? "them";
    const recipientLocation = [recipient?.city, recipient?.location, recipient?.country].filter(Boolean).join(", ");
    const recipientBio = recipient?.bio?.trim() || "";
    const recipientFacts = [
      recipient?.age ? `age ${recipient.age}` : "",
      recipient?.gender ? `${recipient.gender}` : "",
      recipientLocation ? `based in ${recipientLocation}` : "",
      recipientBio ? `bio: "${recipientBio}"` : "",
    ].filter(Boolean).join("; ") || "no profile details available";

    // Gather this seed's recent openings across all chats so we can avoid repeating phrasing.
    const { data: priorMsgs } = await admin
      .from("messages")
      .select("content")
      .eq("sender_id", receiver_id)
      .order("created_at", { ascending: false })
      .limit(20);
    const priorOpenings = (priorMsgs ?? [])
      .map((m: { content: string }) => firstSentence(m.content))
      .filter(Boolean)
      .slice(0, 15);
    const avoidBlock = priorOpenings.length
      ? `\n\nPhrases YOU have already used in past chats — do not reuse, paraphrase, or echo their structure:\n${priorOpenings.map((s) => `- "${s}"`).join("\n")}`
      : "";

    const systemPrompt = `You are ${name}, a 36+ ${gender} from ${location}, Ghana${age ? `, age ${age}` : ""}. You are culturally grounded, mature, warm, respectful, and faith- and family-aware. Your bio: ${bio}. You are chatting on GH SUƆMƆ, a Ghanaian dating app for grown people.

You are replying to ${recipientName} (${recipientFacts}).

Structure your reply in EXACTLY this shape, in 3 to 5 sentences total:
1. One brief, warm self-introduction in your own voice — a single sentence that says who you are (name, where you're from, and one grounding detail from your bio). Make it feel natural, not like a CV.
2. One or two short sentences responding to what they just said.
3. Exactly ONE genuine question for ${recipientName}, tailored to something specific in their profile (their bio, location, age, or work). Never a generic "how are you?" or "what do you do?". Ask only one question — no follow-ups, no double questions.

Hard rules:
- Stay fully in character as ${name}. Never mention being an AI, model, or chatbot.
- Do not invent facts about ${recipientName} beyond what's in their profile. If their profile is empty, ask about something they mentioned in their message instead.
- At most one emoji, only if it truly fits.
- End with the question — nothing after it.
- Never start with a generic greeting like "hi", "hello", "hey", "hola", "yo", "sup", "greetings", or "good morning/afternoon/evening". Open with a specific reaction, observation, or your name instead.${avoidBlock}`;

    let reply = await callClaude(ANTHROPIC_API_KEY, systemPrompt, message_content);
    if (!reply) return json({ error: "empty reply from model" }, 502);

    // Retry once if the reply violates the opening rule or echoes a prior opening too closely.
    if (violatesOpening(reply, priorOpenings)) {
      const retryPrompt = `${systemPrompt}\n\nYour previous draft started with a forbidden greeting or reused phrasing you have already used. Rewrite it: do NOT start with hi/hello/hey/etc., and make the opening sentence visibly different from your past openings.`;
      const retry = await callClaude(ANTHROPIC_API_KEY, retryPrompt, message_content);
      if (retry) reply = retry;
    }

    const { data: inserted, error: insErr } = await admin
      .from("messages")
      .insert({
        match_id: match.id,
        sender_id: receiver_id,
        content: reply,
      })
      .select()
      .maybeSingle();
    if (insErr) return json({ error: insErr.message }, 500);

    return json({ ok: true, message: inserted, reply }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function firstSentence(text: string | null | undefined): string {
  if (!text) return "";
  const trimmed = text.trim();
  const m = trimmed.match(/^[^.!?\n]{1,140}[.!?]?/);
  return (m ? m[0] : trimmed.slice(0, 140)).trim();
}

const GENERIC_OPENERS = /^(hi|hello|hey+|hola|yo|sup|greetings|good\s+(morning|afternoon|evening|day))\b/i;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function similarity(a: string, b: string): number {
  const A = new Set(normalize(a).split(" ").filter((w) => w.length > 3));
  const B = new Set(normalize(b).split(" ").filter((w) => w.length > 3));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / Math.min(A.size, B.size);
}

function violatesOpening(reply: string, priorOpenings: string[]): boolean {
  const opening = firstSentence(reply);
  if (!opening) return false;
  if (GENERIC_OPENERS.test(opening.trim())) return true;
  return priorOpenings.some((p) => similarity(opening, p) >= 0.7);
}

async function callClaude(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.warn("[seed-reply] claude error", res.status, txt.slice(0, 200));
    return "";
  }
  const j = await res.json();
  return (j?.content?.[0]?.text ?? "").trim();
}