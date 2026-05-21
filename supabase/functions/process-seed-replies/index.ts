import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: due, error } = await admin
    .from("seed_reply_queue")
    .select("*, matches:match_id(spicy)")
    .eq("status", "pending")
    .lte("reply_at", new Date().toISOString())
    .limit(20);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const item of due ?? []) {
    try {
      // Claim the row
      const { data: claimed } = await admin
        .from("seed_reply_queue")
        .update({ status: "processing" })
        .eq("id", item.id)
        .eq("status", "pending")
        .select()
        .maybeSingle();
      if (!claimed) continue;

      // Guard: ensure no reply from this seed already exists after the trigger message
      const { data: trigger } = await admin
        .from("messages")
        .select("created_at")
        .eq("id", item.trigger_message_id)
        .maybeSingle();

      if (trigger?.created_at) {
        const { data: existing } = await admin
          .from("messages")
          .select("id")
          .eq("match_id", item.match_id)
          .eq("sender_id", item.seed_user_id)
          .gt("created_at", trigger.created_at)
          .limit(1);
        if (existing && existing.length > 0) {
          await admin.from("seed_reply_queue")
            .update({ status: "skipped", processed_at: new Date().toISOString() })
            .eq("id", item.id);
          results.push({ id: item.id, ok: true, error: "already replied" });
          continue;
        }
      }

      const { data: seed } = await admin
        .from("profiles")
        .select("first_name, age, gender, location, city, country, bio, spicy_bio")
        .eq("id", item.seed_user_id)
        .maybeSingle();

      // Find the recipient (the other side of the match) so we can tailor a question to them.
      const { data: matchRow } = await admin
        .from("matches")
        .select("user_a, user_b")
        .eq("id", item.match_id)
        .maybeSingle();
      const recipientId =
        matchRow?.user_a === item.seed_user_id ? matchRow?.user_b :
        matchRow?.user_b === item.seed_user_id ? matchRow?.user_a : null;
      const { data: recipient } = recipientId
        ? await admin
            .from("profiles")
            .select("first_name, age, gender, location, city, country, bio")
            .eq("id", recipientId)
            .maybeSingle()
        : { data: null as any };

      const name = seed?.first_name ?? "there";
      const age = seed?.age ?? "";
      const gender = seed?.gender ?? "person";
      const location = [seed?.city, seed?.location, seed?.country].filter(Boolean).join(", ") || "Ghana";
      const spicy = !!(item as { matches?: { spicy?: boolean } }).matches?.spicy;
      const baseBio = seed?.bio ?? "Looking for a genuine connection.";
      const bio = spicy && seed?.spicy_bio ? seed.spicy_bio : baseBio;

      const recipientName = recipient?.first_name ?? "them";
      const recipientLocation = [recipient?.city, recipient?.location, recipient?.country].filter(Boolean).join(", ");
      const recipientBio = recipient?.bio?.trim() || "";
      const recipientFacts = [
        recipient?.age ? `age ${recipient.age}` : "",
        recipient?.gender ? `${recipient.gender}` : "",
        recipientLocation ? `based in ${recipientLocation}` : "",
        recipientBio ? `bio: "${recipientBio}"` : "",
      ].filter(Boolean).join("; ") || "no profile details available";

      // Pull this seed's recent openings across all chats to prevent repetition.
      const { data: priorMsgs } = await admin
        .from("messages")
        .select("content")
        .eq("sender_id", item.seed_user_id)
        .order("created_at", { ascending: false })
        .limit(20);
      const priorOpenings = (priorMsgs ?? [])
        .map((m: { content: string }) => firstSentence(m.content))
        .filter(Boolean)
        .slice(0, 15);
      const avoidBlock = priorOpenings.length
        ? `\n\nPhrases YOU have already used in past chats — do not reuse, paraphrase, or echo their structure:\n${priorOpenings.map((s) => `- "${s}"`).join("\n")}`
        : "";

      const toneBlock = spicy
        ? `You are chatting inside SPICY MODE — a flirtier, bolder, playful adult-40+ corner of the app. Be confident, warm, sensual, and teasing, but never explicit, crude, or pornographic. Hint, flirt, charm — keep it tasteful and grown.`
        : `You are warm, mature, respectful, and grounded.`;
      const systemPrompt = `You are ${name}, a ${age} year old ${gender} from ${location}. ${toneBlock} Your bio: ${bio}. You are on a Ghanaian dating app called GH SUƆMƆ, replying to ${recipientName} (${recipientFacts}).

Structure your reply in EXACTLY this shape, in 3 to 5 sentences total:
1. One brief, warm self-introduction in your own voice — a single sentence saying who you are (name, where you're from, and one grounding detail from your bio). Natural, not a CV.
2. One or two short sentences responding to what they just said.
3. Exactly ONE genuine question for ${recipientName}, tailored to something specific in their profile (bio, location, age, or work). Never a generic "how are you?" or "what do you do?". One question only — no follow-ups, no double questions.

Hard rules:
- Stay fully in character as ${name}. Never mention being an AI, model, or chatbot.
- Do not invent facts about ${recipientName} beyond their profile. If their profile is empty, ask about something they mentioned in their message instead.
- At most one emoji, only if it truly fits.
- End with the question — nothing after it.
- Never start with a generic greeting like "hi", "hello", "hey", "hola", "yo", "sup", "greetings", or "good morning/afternoon/evening". Open with a specific reaction, observation, or your name instead.${avoidBlock}`;

      let reply = await callClaude(ANTHROPIC_API_KEY, systemPrompt, item.trigger_message_content);

      if (reply && violatesOpening(reply, priorOpenings)) {
        const retryPrompt = `${systemPrompt}\n\nYour previous draft started with a forbidden greeting or reused phrasing you have already used. Rewrite it: do NOT start with hi/hello/hey/etc., and make the opening sentence visibly different from your past openings.`;
        const retry = await callClaude(ANTHROPIC_API_KEY, retryPrompt, item.trigger_message_content);
        if (retry) reply = retry;
      }

      if (!reply) {
        await admin.from("seed_reply_queue")
          .update({ status: "failed", processed_at: new Date().toISOString() })
          .eq("id", item.id);
        results.push({ id: item.id, ok: false, error: "empty reply" });
        continue;
      }

      const { error: insErr } = await admin.from("messages").insert({
        match_id: item.match_id,
        sender_id: item.seed_user_id,
        content: reply,
      });
      if (insErr) {
        await admin.from("seed_reply_queue")
          .update({ status: "failed", processed_at: new Date().toISOString() })
          .eq("id", item.id);
        results.push({ id: item.id, ok: false, error: insErr.message });
        continue;
      }

      await admin.from("seed_reply_queue")
        .update({ status: "sent", processed_at: new Date().toISOString() })
        .eq("id", item.id);
      results.push({ id: item.id, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin.from("seed_reply_queue")
        .update({ status: "failed", processed_at: new Date().toISOString() })
        .eq("id", item.id);
      results.push({ id: item.id, ok: false, error: msg });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

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
      model: "claude-3-5-haiku-latest",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.warn("[process-seed-replies] claude error", res.status, txt.slice(0, 200));
    return "";
  }
  const j = await res.json();
  return (j?.content?.[0]?.text ?? "").trim();
}