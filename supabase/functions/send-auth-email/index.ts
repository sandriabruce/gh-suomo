// Supabase Auth "Send Email" hook handler.
// Routes welcome/verify/magic-link/recovery/email-change/reauth emails through
// Resend, sending from hello@ghsuomo.com.
//
// Configure in Cloud → Auth → Hooks → Send Email Hook:
//   URL: https://dudzxsnrybsgezodylwf.supabase.co/functions/v1/send-auth-email
//   Secret: paste the value stored as SEND_EMAIL_HOOK_SECRET (optional but recommended)

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FROM = "Ghsuomo <hello@ghsuomo.com>";

type Payload = {
  user: { email: string; user_metadata?: Record<string, unknown> };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type:
      | "signup"
      | "login"
      | "magiclink"
      | "recovery"
      | "invite"
      | "email_change_current"
      | "email_change_new"
      | "reauthentication";
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

function buildActionLink(p: Payload) {
  const { site_url, token_hash, email_action_type, redirect_to } = p.email_data;
  // Standard Supabase verification URL.
  return `${site_url}/auth/v1/verify?token=${encodeURIComponent(token_hash)}&type=${encodeURIComponent(email_action_type)}&redirect_to=${encodeURIComponent(redirect_to || site_url)}`;
}

function shell(headline: string, intro: string, cta: { url: string; label: string } | null, footer = "") {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#fff;font-family:Georgia,serif;color:#2b1a0b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 8px 24px;">
          <h1 style="font-size:24px;margin:0 0 16px;color:#7a5b1e;">${headline}</h1>
          <p style="font-size:16px;line-height:1.55;margin:0 0 22px;">${intro}</p>
          ${cta ? `<p style="margin:0 0 28px;">
            <a href="${cta.url}" style="background:#c9a84c;color:#2b1a0b;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:bold;display:inline-block;">${cta.label}</a>
          </p>
          <p style="font-size:13px;line-height:1.5;color:#7a6a55;margin:0 0 8px;">If the button does not work, paste this link into your browser:</p>
          <p style="font-size:13px;line-height:1.5;margin:0;word-break:break-all;"><a href="${cta.url}" style="color:#7a5b1e;">${cta.url}</a></p>` : ""}
          ${footer ? `<p style="font-size:13px;color:#7a6a55;margin:24px 0 0;">${footer}</p>` : ""}
          <hr style="border:none;border-top:1px solid #eadfc7;margin:32px 0;"/>
          <p style="font-size:12px;color:#9a8a75;margin:0;">— The Ghsuomo team</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function render(p: Payload): { subject: string; html: string } {
  const firstName =
    (p.user.user_metadata?.first_name as string)?.trim() ||
    p.user.email.split("@")[0];
  const link = buildActionLink(p);

  switch (p.email_data.email_action_type) {
    case "signup":
      return {
        subject: "Welcome to Ghsuomo — confirm your email",
        html: shell(
          `Welcome, ${firstName}`,
          "Thanks for joining Ghsuomo. Confirm your email to start meeting people who share your values.",
          { url: link, label: "Confirm my email" },
          `This link expires in 24 hours.`,
        ),
      };
    case "recovery":
      return {
        subject: "Reset your Ghsuomo password",
        html: shell(
          `Reset your password`,
          `Hi ${firstName}, tap the button below to choose a new password. If you didn't request this, you can ignore this email.`,
          { url: link, label: "Reset password" },
          `This link expires in 1 hour.`,
        ),
      };
    case "magiclink":
    case "login":
      return {
        subject: "Your Ghsuomo sign-in link",
        html: shell(
          `Sign in to Ghsuomo`,
          `Hi ${firstName}, tap the button below to sign in.`,
          { url: link, label: "Sign me in" },
        ),
      };
    case "invite":
      return {
        subject: "You're invited to Ghsuomo",
        html: shell(
          `You're invited`,
          `Accept your invitation to create your Ghsuomo account.`,
          { url: link, label: "Accept invitation" },
        ),
      };
    case "email_change_current":
    case "email_change_new":
      return {
        subject: "Confirm your new email for Ghsuomo",
        html: shell(
          `Confirm your email change`,
          `Hi ${firstName}, confirm this address to finish updating your account email.`,
          { url: link, label: "Confirm email change" },
        ),
      };
    case "reauthentication":
      return {
        subject: `Ghsuomo verification code: ${p.email_data.token}`,
        html: shell(
          `Your verification code`,
          `Hi ${firstName}, enter this code to continue: <strong style="font-size:20px;letter-spacing:2px;">${p.email_data.token}</strong>`,
          null,
        ),
      };
    default:
      return {
        subject: "A message from Ghsuomo",
        html: shell(`Hello ${firstName}`, "You have a new notification from Ghsuomo.", { url: link, label: "Open Ghsuomo" }),
      };
  }
}

async function sendViaResend(apiKey: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${text}`);
  return text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const raw = await req.text();

  let payload: Payload;
  try {
    if (HOOK_SECRET) {
      const wh = new Webhook(HOOK_SECRET.replace(/^v1,whsec_/, "").replace(/^whsec_/, ""));
      payload = wh.verify(raw, Object.fromEntries(req.headers)) as Payload;
    } else {
      payload = JSON.parse(raw);
    }
  } catch (e) {
    console.error("[send-auth-email] verification failed", e);
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { subject, html } = render(payload);
    await sendViaResend(RESEND_API_KEY, payload.user.email, subject, html);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[send-auth-email] send failed", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});