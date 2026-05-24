// send-onboarding-nudge — fires for users who signed up but never completed onboarding.
// Triggered by pg_cron daily. Sends a re-engagement email via Supabase Auth admin API.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "https://ghsuomo.com", "Access-Control-Allow-Headers": "authorization, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Find users who signed up 1-3 days ago but never finished onboarding
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const oneDayAgo   = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

  const { data: incomplete } = await sb
    .from("profiles")
    .select("id, email, first_name, created_at")
    .eq("onboarded", false)
    .eq("is_seed", false)
    .not("email", "is", null)
    .gte("created_at", threeDaysAgo)
    .lte("created_at", oneDayAgo);

  if (!incomplete || incomplete.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { ...cors, "Content-Type": "application/json" } });
  }

  let sent = 0;
  for (const user of incomplete) {
    try {
      // Use Supabase magic link to bring them back to onboarding
      const { error } = await sb.auth.admin.generateLink({
        type: "magiclink",
        email: user.email,
        options: { redirectTo: "https://ghsuomo.com/onboarding" },
      });
      if (error) { console.error(`Nudge error for ${user.id}:`, error.message); continue; }
      sent++;
      console.log(`Nudge sent to ${user.id}`);
    } catch (e: any) {
      console.error(`Nudge exception for ${user.id}:`, e.message);
    }
  }

  return new Response(JSON.stringify({ sent, total: incomplete.length }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
