import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 border-b">
        <Link to="/"><Logo size="sm" /></Link>
        <Link to="/" className="text-sm text-ghana-gold hover:underline">← Back to home</Link>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 prose prose-sm">
        <h1 className="font-display text-3xl font-bold text-ghana-brown mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: 24 May 2026 · Pending review by legal counsel · Subject to change</p>

        <h2>1. About GH SUƆMƆ</h2>
        <p>GH SUƆMƆ ("the Platform", "we", "us", "our") is a dating and social connection service operated by [Company Name TBC] ("the Company"), registered in [Jurisdiction TBC]. The Platform is designed exclusively for Ghanaian adults aged 35 and above, including members of the Ghanaian diaspora worldwide.</p>
        <p>By creating an account, you confirm that you are at least 35 years old and agree to these Terms of Service ("Terms") in full. If you do not agree, you must not use the Platform.</p>

        <h2>2. Eligibility</h2>
        <p>You may use GH SUƆMƆ only if you:</p>
        <ul>
          <li>Are at least 35 years of age;</li>
          <li>Are of Ghanaian heritage or have a meaningful connection to Ghana or its diaspora;</li>
          <li>Are legally capable of entering a binding contract in your jurisdiction;</li>
          <li>Are not prohibited from using dating services by applicable law;</li>
          <li>Have not been banned or suspended from GH SUƆMƆ previously.</li>
        </ul>
        <p>We reserve the right to verify your age and identity. False information about your age is grounds for immediate account termination.</p>

        <h2>3. Account Registration and Security</h2>
        <p>You are responsible for all activity on your account. You must:</p>
        <ul>
          <li>Provide accurate, complete, and current information;</li>
          <li>Keep your password secure and not share it with any third party;</li>
          <li>Notify us immediately of any unauthorised use of your account;</li>
          <li>Not create multiple accounts;</li>
          <li>Not use another person's account.</li>
        </ul>
        <p>We may suspend or terminate your account at any time if we believe your account has been compromised or if you violate these Terms.</p>

        <h2>4. User Conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Post false, misleading, or deceptive content;</li>
          <li>Solicit money, gifts, or financial information from other users;</li>
          <li>Harass, threaten, intimidate, or abuse other members;</li>
          <li>Post sexually explicit content unless specifically permitted in designated areas;</li>
          <li>Upload photos of anyone other than yourself;</li>
          <li>Use the Platform for commercial solicitation without our prior written consent;</li>
          <li>Attempt to circumvent any security measures;</li>
          <li>Use automated tools, bots, or scripts to access the Platform;</li>
          <li>Collect or store personal data of other users without their consent;</li>
          <li>Impersonate any person or entity.</li>
        </ul>
        <p>Violation of these rules may result in immediate account suspension and referral to law enforcement where appropriate.</p>

        <h2>5. AI-Assisted Profiles ("Seeds")</h2>
        <p>GH SUƆMƆ uses artificial intelligence to generate practice profiles ("seeds") that allow members to engage with the Platform while our real member community grows. You acknowledge and agree that:</p>
        <ul>
          <li>Some profiles you interact with may be AI-generated and not represent real people;</li>
          <li>AI-generated profiles are clearly disclosed in our AI Disclosure Notice;</li>
          <li>Conversations with AI profiles are provided for entertainment and practice purposes only;</li>
          <li>You will not be charged for interactions you were led to believe were with real humans unless you consented to AI interaction;</li>
          <li>We will transition AI profiles to real members as our community grows.</li>
        </ul>

        <h2>6. Spicy Mode</h2>
        <p>GH SUƆMƆ offers a "Spicy Mode" feature available exclusively to Diamond-tier subscribers aged 35 and above. Spicy Mode contains mature, suggestive content. By enabling Spicy Mode, you confirm that:</p>
        <ul>
          <li>You are at least 35 years of age;</li>
          <li>You consent to viewing suggestive but non-explicit adult content;</li>
          <li>You understand this content is intended for mature audiences only;</li>
          <li>All content in Spicy Mode is suggestive in nature and does not include graphic sexual content.</li>
        </ul>

        <h2>7. Subscription and Payments</h2>
        <p>GH SUƆMƆ offers both free and paid subscription tiers. By subscribing to a paid plan:</p>
        <ul>
          <li>You authorise us to charge your selected payment method;</li>
          <li>Subscriptions renew automatically unless cancelled before the renewal date;</li>
          <li>All prices are displayed in your local currency where possible;</li>
          <li>Payments are processed securely via Paystack;</li>
          <li>You agree to our Refund and Cancellation Policy, available separately.</li>
        </ul>
        <p>We reserve the right to change subscription pricing with at least 30 days' notice.</p>

        <h2>8. Intellectual Property</h2>
        <p>All content, design, technology, and trademarks on GH SUƆMƆ are owned by the Company or our licensors. You may not reproduce, distribute, or create derivative works from our content without explicit written permission.</p>
        <p>By uploading content to the Platform, you grant us a non-exclusive, royalty-free, worldwide licence to use, display, and distribute your content in connection with operating the Platform. You retain ownership of your content.</p>

        <h2>9. Privacy</h2>
        <p>Your use of GH SUƆMƆ is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Platform, you consent to the processing of your personal data as described in the Privacy Policy.</p>

        <h2>10. Disclaimers and Limitation of Liability</h2>
        <p>GH SUƆMƆ is provided "as is" without warranties of any kind. We do not guarantee that you will find a match or that the Platform will be available at all times. To the maximum extent permitted by applicable law, we disclaim all liability for indirect, incidental, or consequential damages.</p>
        <p>We are not responsible for the conduct of users on or off the Platform. Dating involves inherent risks and you engage with other members at your own risk. We encourage all members to follow our Safety Guidelines.</p>

        <h2>11. Governing Law and Disputes</h2>
        <p>These Terms are governed by the laws of [Jurisdiction TBC]. Any disputes shall first be attempted to be resolved through good-faith negotiation. If unresolved, disputes shall be submitted to arbitration in [Jurisdiction TBC] under the rules of [Arbitration Body TBC].</p>

        <h2>12. Changes to These Terms</h2>
        <p>We may update these Terms from time to time. We will notify you of material changes by email or in-app notification at least 14 days before the changes take effect. Your continued use of the Platform after that date constitutes acceptance of the updated Terms.</p>

        <h2>13. Contact</h2>
        <p>For questions about these Terms, contact us at: <a href="mailto:legal@ghsuomo.com">legal@ghsuomo.com</a></p>

        <p className="text-xs text-muted-foreground mt-12 pt-6 border-t">These Terms are pending final review by legal counsel and are subject to change. The version currently in force is the most recently dated version on this page.</p>
      </main>
    </div>
  );
}
