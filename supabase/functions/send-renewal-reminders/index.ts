import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FROM = "Ghsuomo <hello@ghsuomo.com>";
const APP_URL = "https://gh-roots-romance.lovable.app";
const RENEW_URL = `${APP_URL}/app/profile?renew=1`;

const WINDOWS = [7, 3, 1, 0] as const;

function subjectFor(days: number, plan: string) {
  if (days === 0) return `Your ${plan} subscription expires today`;
  if (days === 1) return `Your ${plan} subscription expires tomorrow`;
  return `Your ${plan} subscription expires in ${days} days`;
}

function bodyFor(opts: { firstName: string; days: number; plan: string; expiresAt: string }) {
  const { firstName, days, plan, expiresAt } = opts;
  const when =
    days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  const expiresHuman = new Date(expiresAt).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const headline =
    days === 0
      ? `${firstName}, your subscription expires today`
      : `${firstName}, a quick reminder from Ghsuomo`;

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#fff;font-family:Georgia,serif;color:#2b1a0b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 8px 24px;">
          <h1 style="font-size:22px;margin:0 0 16px;color:#7a5b1e;">${headline}</h1>
          <p style="font-size:16px;line-height:1.55;margin:0 0 14px;">
            Hi ${firstName}, your <strong>${plan}</strong> plan is set to expire ${when}
            ${days === 0 ? "" : `(on ${expiresHuman})`}.
          </p>
          <p style="font-size:16px;line-height:1.55;margin:0 0 22px;">
            Renew now to keep your matches, conversations and verified status without interruption.
          </p>
          <p style="margin:0 0 28px;">
            <a href="${RENEW_URL}" style="background:#c9a84c;color:#2b1a0b;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:bold;display:inline-block;">
              Renew my subscription
            </a>
          </p>
          <p style="font-size:13px;line-height:1.5;color:#7a6a55;margin:0;">
            If the button does not work, paste this link into your browser:<br/>
            <a href="${RENEW_URL}" style="color:#7a5b1e;">${RENEW_URL}</a>
          </p>
          <hr style="border:none;border-top:1px solid #eadfc7;margin:32px 0;"/>
          <p style="font-size:12px;color:#9a8a75;margin:0;">
            You're receiving this because you have an active Ghsuomo subscription.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendViaResend(apiKey: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${text}`);
  return text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const results: Record<string, unknown> = { sent: 0, skipped: 0, errors: [] as unknown[] };

  for (const days of WINDOWS) {
    // Find subscriptions whose expires_at falls on the day = today + days (UTC).
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() + days);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const { data: subs, error } = await admin
      .from("subscriptions")
      .select("id,user_id,plan,expires_at,status")
      .in("status", ["active", "trial"])
      .gte("expires_at", start.toISOString())
      .lt("expires_at", end.toISOString());

    if (error) {
      (results.errors as unknown[]).push({ days, error: error.message });
      continue;
    }
    if (!subs?.length) continue;

    for (const sub of subs) {
      try {
        // Idempotency: skip if already sent for this (subscription, days, expires_at)
        const { data: existing } = await admin
          .from("subscription_renewal_reminders")
          .select("id")
          .eq("subscription_id", sub.id)
          .eq("days_before", days)
          .eq("expires_at", sub.expires_at!)
          .maybeSingle();
        if (existing) { (results.skipped as number)++; continue; }

        const { data: profile } = await admin
          .from("profiles")
          .select("first_name,email")
          .eq("id", sub.user_id)
          .maybeSingle();

        const email = profile?.email;
        if (!email) { (results.skipped as number)++; continue; }

        const firstName = profile?.first_name?.trim() || "there";
        const planLabel = String(sub.plan).charAt(0).toUpperCase() + String(sub.plan).slice(1);

        await sendViaResend(
          RESEND_API_KEY,
          email,
          subjectFor(days, planLabel),
          bodyFor({ firstName, days, plan: planLabel, expiresAt: sub.expires_at! }),
        );

        await admin.from("subscription_renewal_reminders").insert({
          subscription_id: sub.id,
          user_id: sub.user_id,
          days_before: days,
          expires_at: sub.expires_at!,
        });

        (results.sent as number)++;
      } catch (e) {
        (results.errors as unknown[]).push({ subscription_id: sub.id, days, error: String(e) });
      }
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});