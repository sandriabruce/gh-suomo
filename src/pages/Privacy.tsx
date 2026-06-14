import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 border-b">
        <Link to="/"><Logo size="sm" /></Link>
        <Link to="/" className="text-sm text-ghana-gold hover:underline">← Back to home</Link>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 prose prose-sm">
        <h1 className="font-display text-3xl font-bold text-ghana-brown mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: 14 June 2026</p>

        <p>GH SUƆMƆ takes your privacy seriously. This Privacy Policy explains what personal data we collect, how we use it, and your rights.</p>

        <h2>1. Data We Collect</h2>
        <h3>Information you provide</h3>
        <ul>
          <li>Account information: name, email address, date of birth, gender, and preferences;</li>
          <li>Profile information: photos, biography, interests, prompts, and location;</li>
          <li>Identity verification documents: government-issued ID and selfie photos (stored encrypted, never displayed publicly);</li>
          <li>Communications: messages sent between members on the Platform;</li>
          <li>Payment information: processed by Paystack — we do not store card or bank details.</li>
        </ul>
        <h3>Information collected automatically</h3>
        <ul>
          <li>Usage data: features you use, profiles you view, interactions;</li>
          <li>Device data: browser type, operating system, IP address;</li>
          <li>Cookies and similar technologies: session management and analytics.</li>
        </ul>

        <h2>2. How We Use Your Data</h2>
        <ul>
          <li><strong>To operate the Platform:</strong> matching, messaging, and account management;</li>
          <li><strong>Safety and verification:</strong> age verification (minimum 35), photo verification, fraud detection, and banning abusive users;</li>
          <li><strong>Improving the service:</strong> analytics and product development;</li>
          <li><strong>Communications:</strong> service updates, safety alerts, and marketing (which you can opt out of);</li>
          <li><strong>Legal compliance:</strong> responding to lawful requests from authorities.</li>
        </ul>

        <h2>3. AI and Data Processing</h2>
        <p>GH SUƆMƆ uses artificial intelligence for:</p>
        <ul>
          <li>Identity document verification (age and photo matching);</li>
          <li>Generating AI practice profiles ("seeds") — see our AI Disclosure Notice;</li>
          <li>Powering seed profile conversations using Anthropic's Claude AI.</li>
        </ul>
        <p>Verification documents are processed by Anthropic's API under their enterprise privacy commitments. Documents are stored encrypted in a private, access-controlled storage bucket. Verification document images are never shown publicly and are deleted after 12 months or upon account deletion, whichever comes first.</p>

        <h2>4. Data Sharing</h2>
        <p>We do not sell your personal data. We share data only with:</p>
        <ul>
          <li><strong>Service providers:</strong> Supabase (database/storage), Anthropic (AI processing), Paystack (payments), Netlify (hosting) — all under data processing agreements;</li>
          <li><strong>Other members:</strong> only the information on your public profile;</li>
          <li><strong>Law enforcement:</strong> when legally required and to protect safety.</li>
        </ul>

        <h2>5. Data Retention</h2>
        <ul>
          <li>Account data: retained while your account is active and for 2 years after deletion;</li>
          <li>Messages: retained for 1 year after the match ends;</li>
          <li>Verification documents: deleted after 12 months or upon account deletion;</li>
          <li>Payment records: retained for 7 years for legal and tax purposes.</li>
        </ul>

        <h2>6. Your Rights</h2>
        <p>Depending on your location, you may have the right to:</p>
        <ul>
          <li>Access your personal data;</li>
          <li>Correct inaccurate data;</li>
          <li>Delete your data ("right to be forgotten");</li>
          <li>Object to or restrict processing;</li>
          <li>Data portability;</li>
          <li>Withdraw consent at any time.</li>
        </ul>
        <p>To exercise these rights, contact us at <a href="mailto:privacy@ghsuomo.com">privacy@ghsuomo.com</a>. We will respond within 30 days.</p>

        <h2>7. Security</h2>
        <p>We implement industry-standard security measures including encryption at rest and in transit, access controls, and regular security reviews. Verification documents are stored in a private bucket accessible only to you and authorised verification processes. No security system is impenetrable, and we encourage you to protect your account password and report any suspicious activity.</p>

        <h2>8. International Transfers</h2>
        <p>GH SUƆMƆ serves a global Ghanaian diaspora. Your data may be processed in countries outside Ghana, including the United States and European Union. We ensure appropriate safeguards are in place for such transfers.</p>

        <h2>9. Cookies</h2>
        <p>We use essential cookies for authentication and session management. We do not use advertising cookies. You can manage cookie preferences in your browser settings, though disabling essential cookies will prevent you from logging in.</p>

        <h2>10. Children's Privacy</h2>
        <p>GH SUƆMƆ is strictly for adults aged 35 and above. We do not knowingly collect data from anyone under 35. If we discover that a user is under 35, we will immediately suspend their account and delete their data.</p>

        <h2>11. Changes to This Policy</h2>
        <p>We will notify you of material changes at least 14 days before they take effect via email or in-app notice.</p>

        <h2>12. Contact</h2>
        <p>Data protection enquiries: <a href="mailto:privacy@ghsuomo.com">privacy@ghsuomo.com</a></p>

        <p className="text-xs text-muted-foreground mt-12 pt-6 border-t">Questions about this policy? Contact us at privacy@ghsuomo.com.</p>
      </main>
    </div>
  );
}
