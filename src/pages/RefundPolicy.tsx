import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 border-b">
        <Link to="/"><Logo size="sm" /></Link>
        <Link to="/" className="text-sm text-ghana-gold hover:underline">← Back to home</Link>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 prose prose-sm">
        <h1 className="font-display text-3xl font-bold text-ghana-brown mb-2">Refund and Cancellation Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: 14 June 2026</p>

        <h2>1. Subscription Cancellation</h2>
        <p>You may cancel your GH SUƆMƆ subscription at any time. Cancellation takes effect at the end of your current billing period. You will retain access to your plan's features until that date.</p>
        <p>To cancel: go to your Profile → Settings → Subscription → Cancel Plan, or contact us at <a href="mailto:billing@ghsuomo.com">billing@ghsuomo.com</a>.</p>

        <h2>2. Refunds</h2>
        <h3>General policy</h3>
        <p>Subscription fees are generally non-refundable once a billing period has begun. Access to the Platform is provided immediately upon payment, and the service is considered consumed from the moment you can use it.</p>

        <h3>Exceptions — when we will issue a refund</h3>
        <p>We will issue a full or partial refund in the following circumstances:</p>
        <ul>
          <li><strong>Technical failure:</strong> If the Platform was unavailable for more than 72 consecutive hours during your billing period due to our error, we will pro-rate a refund for the affected days;</li>
          <li><strong>Duplicate charge:</strong> If you were charged more than once for the same billing period;</li>
          <li><strong>Unauthorised charge:</strong> If you did not authorise the payment and notify us within 14 days;</li>
          <li><strong>14-day cooling-off period (new subscribers only):</strong> If you are a first-time subscriber and have not used more than 3 premium features, you may request a full refund within 14 days of your first payment.</li>
        </ul>

        <h2>3. Free Trial</h2>
        <p>GH SUƆMƆ may offer a free trial period for new members. The free trial automatically converts to a paid subscription unless cancelled before the trial end date. We will send a reminder before your trial ends.</p>

        <h2>4. How to Request a Refund</h2>
        <p>Email <a href="mailto:billing@ghsuomo.com">billing@ghsuomo.com</a> with:</p>
        <ul>
          <li>Your registered email address;</li>
          <li>The date and amount of the charge;</li>
          <li>The reason for your refund request.</li>
        </ul>
        <p>We will respond within 5 business days. Approved refunds are processed via the original payment method within 10 business days.</p>

        <h2>5. Payment Processing</h2>
        <p>Payments are processed by Paystack. GH SUƆMƆ does not store your card or bank account details. All payment disputes are governed by Paystack's terms and your bank's policies. For payment disputes, you may also contact your bank or mobile money provider directly.</p>

        <h2>6. Price Changes</h2>
        <p>We will give you at least 30 days' notice before changing subscription prices. Price changes take effect at your next renewal date. If you do not agree with a price change, you may cancel before the new price takes effect.</p>

        <h2>7. Contact</h2>
        <p>Billing enquiries: <a href="mailto:billing@ghsuomo.com">billing@ghsuomo.com</a></p>

        <p className="text-xs text-muted-foreground mt-12 pt-6 border-t">Questions about refunds? Contact us at billing@ghsuomo.com.</p>
      </main>
    </div>
  );
}
