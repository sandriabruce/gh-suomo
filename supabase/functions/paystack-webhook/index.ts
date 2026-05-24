// Paystack webhook — authoritative activation path.
// Configure your Paystack dashboard webhook URL to:
//   https://<project-ref>.supabase.co/functions/v1/paystack-webhook
// We verify the x-paystack-signature header against PAYSTACK_SECRET_KEY (HMAC-SHA512).

import { activateFromPaystackData, admin } from "../_shared/activate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-paystack-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hmacSha512Hex(key: string, message: string) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return new Response("missing secret", { status: 500 });

    const raw = await req.text();
    const sigHeader = req.headers.get("x-paystack-signature") ?? "";
    const expected = await hmacSha512Hex(secret, raw);
    if (sigHeader !== expected) {
      console.warn("paystack-webhook: bad signature");
      return new Response("invalid signature", { status: 401 });
    }

    const evt = JSON.parse(raw);
    const eventType = evt?.event as string | undefined;
    const data = evt?.data ?? {};
    const reference = data?.reference as string | undefined;

    // Always log the event for audit, idempotently by event_id.
    const sb = admin();
    const eventId = `${eventType}:${reference ?? data?.subscription_code ?? data?.id ?? ""}:${data?.id ?? ""}`;
    await sb.from("payment_events").upsert(
      {
        provider: "paystack",
        event_id: eventId,
        event_type: eventType ?? "unknown",
        reference: reference ?? null,
        payload: evt,
      },
      { onConflict: "provider,event_id" },
    );

    // ── Activate on successful charge ──────────────────────────────────
    if (eventType === "charge.success" && reference) {
      const result = await activateFromPaystackData({
        reference,
        status: data.status ?? "success",
        amount: data.amount ?? 0,
        currency: data.currency ?? "GHS",
        metadata: data.metadata ?? null,
      });
      console.log("paystack-webhook activated", result);
    }

    // ── Downgrade / cancel on subscription end events ──────────────────
    // These fire when a Paystack subscription is cancelled, disabled, or fails to renew.
    if (
      eventType === "subscription.disable" ||
      eventType === "subscription.not_renew" ||
      eventType === "invoice.payment_failed"
    ) {
      const customerId = data?.customer?.id ?? data?.customer_id ?? null;
      const subscriptionCode = data?.subscription_code ?? null;

      // Find the user from subscriptions table by paystack reference or subscription code
      let userId: string | null = null;

      if (subscriptionCode) {
        const { data: sub } = await sb
          .from("subscriptions")
          .select("user_id, id")
          .eq("paystack_reference", subscriptionCode)
          .maybeSingle();
        userId = sub?.user_id ?? null;
        if (sub?.id) {
          await sb.from("subscriptions").update({
            status: eventType === "invoice.payment_failed" ? "past_due" : "cancelled",
            updated_at: new Date().toISOString(),
          }).eq("id", sub.id);
        }
      }

      // If we found the user, downgrade their profile plan to explorer
      if (userId) {
        await sb.from("profiles").update({
          plan: "explorer",
          updated_at: new Date().toISOString(),
        }).eq("id", userId);
        console.log(`paystack-webhook: downgraded user ${userId} to explorer (${eventType})`);
      } else {
        console.warn(`paystack-webhook: could not find user for ${eventType}`, { subscriptionCode, customerId });
      }
    }

    // ── Re-activate on subscription renewal ───────────────────────────
    if (eventType === "invoice.payment_success" || eventType === "subscription.enable") {
      const subscriptionCode = data?.subscription_code ?? null;
      if (subscriptionCode && reference) {
        // Find the subscription and reactivate it
        const { data: sub } = await sb
          .from("subscriptions")
          .select("user_id, plan, id")
          .eq("paystack_reference", subscriptionCode)
          .maybeSingle();

        if (sub?.user_id && sub?.plan) {
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          await sb.from("subscriptions").update({
            status: "active",
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          }).eq("id", sub.id);

          await sb.from("profiles").update({
            plan: sub.plan,
            updated_at: new Date().toISOString(),
          }).eq("id", sub.user_id);

          console.log(`paystack-webhook: renewed ${sub.user_id} on ${sub.plan}`);
        }
      }
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("paystack-webhook error", e);
    return new Response("error", { status: 500 });
  }
});