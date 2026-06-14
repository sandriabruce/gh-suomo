import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";

export default function AIDisclosure() {
  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 border-b">
        <Link to="/"><Logo size="sm" /></Link>
        <Link to="/" className="text-sm text-ghana-gold hover:underline">← Back to home</Link>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 prose prose-sm">
        <h1 className="font-display text-3xl font-bold text-ghana-brown mb-2">AI Disclosure Notice</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: 14 June 2026</p>

        <p className="text-base font-medium">GH SUƆMƆ uses artificial intelligence in several parts of the service. This notice explains exactly where and how AI is used so you can make informed decisions.</p>

        <h2>1. AI-Generated Practice Profiles ("Seeds")</h2>
        <p>While the GH SUƆMƆ community is growing, some profiles you see in Discover are AI-generated practice profiles, also called "seeds." These are designed to:</p>
        <ul>
          <li>Give you a realistic experience of the Platform before our real member community is fully established;</li>
          <li>Help you practice starting conversations and expressing yourself;</li>
          <li>Demonstrate the kind of depth and quality of connection GH SUƆMƆ is designed for.</li>
        </ul>
        <p>AI profiles have detailed backstories, personalities, and conversational styles drawn from research into Ghanaian life at home and in the diaspora. Conversations with them are powered by Anthropic's Claude AI.</p>
        <p><strong>Important:</strong> AI-generated profiles are not real people. You will not be matched with, or charged for premium features on the basis of, AI profile interactions without your clear awareness that the profile is AI-generated. As our real member community grows, AI profiles will be replaced by real members.</p>

        <h2>2. Identity and Age Verification</h2>
        <p>When you submit an identity document (Ghana Card, Passport, Driver's Licence, or Voter ID) or a selfie for verification, your images are processed by Anthropic's Claude AI (claude-opus model) to:</p>
        <ul>
          <li>Confirm the document is genuine and issued by a recognised authority;</li>
          <li>Extract your date of birth to confirm you are 35 years or older;</li>
          <li>Compare your selfie to your profile photos to confirm you are who you say you are.</li>
        </ul>
        <p>Documents are transmitted encrypted, stored in a private storage bucket, and are never shown publicly. Every verification attempt is logged for human review. Cases the AI cannot confidently assess are flagged for manual review by a member of our team.</p>

        <h2>3. Content Moderation</h2>
        <p>AI tools may be used to assist in reviewing reported content for violations of our Community Guidelines. Final moderation decisions involving account suspension or banning are reviewed by a human team member.</p>

        <h2>4. What AI Does Not Do</h2>
        <ul>
          <li>AI does not make decisions about your subscription, billing, or account status;</li>
          <li>AI does not have access to your payment information;</li>
          <li>AI-generated profile responses are not stored as personal memories — each conversation session is independent;</li>
          <li>AI does not contact you outside the Platform.</li>
        </ul>

        <h2>5. Third-Party AI Provider</h2>
        <p>AI processing is performed via Anthropic, Inc. Anthropic processes conversation and image data under their enterprise privacy and data processing commitments. We do not share personally identifiable information beyond what is necessary for verification and conversation generation. See Anthropic's privacy policy at <a href="https://anthropic.com/privacy" target="_blank" rel="noopener">anthropic.com/privacy</a>.</p>

        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Ask us which profiles you have interacted with are AI-generated;</li>
          <li>Request deletion of your verification documents;</li>
          <li>Opt out of AI-assisted features (note: this may limit certain Platform functionality).</li>
        </ul>
        <p>Contact us at <a href="mailto:ai@ghsuomo.com">ai@ghsuomo.com</a> with any AI-related questions or concerns.</p>

        <p className="text-xs text-muted-foreground mt-12 pt-6 border-t">If anything in this notice is unclear, contact us at ai@ghsuomo.com.</p>
      </main>
    </div>
  );
}
