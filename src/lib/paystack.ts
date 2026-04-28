// Paystack publishable key — safe to expose in frontend code.
// Secret key (sk_...) must NEVER be placed here; it belongs in an edge function secret.
export const PAYSTACK_PUBLIC_KEY = "pk_test_845cc874ca09acee7e669457c8219084cae5830a";

export const isPaystackTestMode = PAYSTACK_PUBLIC_KEY.startsWith("pk_test_");