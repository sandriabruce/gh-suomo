import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";

export default function CommunityGuidelines() {
  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 border-b">
        <Link to="/"><Logo size="sm" /></Link>
        <Link to="/" className="text-sm text-ghana-gold hover:underline">← Back to home</Link>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 prose prose-sm">
        <h1 className="font-display text-3xl font-bold text-ghana-brown mb-2">Community Guidelines and Content Moderation Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: 14 June 2026</p>

        <p className="text-base">GH SUƆMƆ is built on the values of respect, honesty, and dignity. These guidelines define what behaviour is and is not acceptable on our Platform. We expect every member to uphold them.</p>

        <h2>1. Our Community Values</h2>
        <p>GH SUƆMƆ is a space for Ghanaian adults aged 35 and above to find meaningful connection. We celebrate Ghanaian culture, the diaspora experience, and the richness of adult relationships. We expect all members to treat each other with the respect and warmth that reflects the best of our community.</p>

        <h2>2. What Is Not Allowed</h2>

        <h3>Safety violations (zero tolerance — immediate ban)</h3>
        <ul>
          <li>Requesting or accepting money, gifts, or financial information from other members;</li>
          <li>Sharing, soliciting, or distributing sexually explicit images or content (outside specifically designated areas, where applicable);</li>
          <li>Threatening, intimidating, or inciting violence against any person;</li>
          <li>Harassment, stalking, or persistent unwanted contact after someone has asked you to stop;</li>
          <li>Impersonating another person, including using their photos without consent;</li>
          <li>Sharing another member's personal information without their consent (doxxing);</li>
          <li>Creating accounts if you are under 35 or have been previously banned.</li>
        </ul>

        <h3>Integrity violations (may result in suspension or ban)</h3>
        <ul>
          <li>Using fake or heavily filtered photos that misrepresent your appearance;</li>
          <li>Providing false information about your age, location, or relationship status;</li>
          <li>Operating multiple accounts;</li>
          <li>Using the Platform for commercial solicitation without authorisation.</li>
        </ul>

        <h3>Respect violations (may result in warnings or temporary suspension)</h3>
        <ul>
          <li>Hate speech or discrimination based on tribe, religion, ethnicity, gender, or disability;</li>
          <li>Sending unsolicited explicit messages or images;</li>
          <li>Ghosting after establishing a meaningful connection without any communication;</li>
          <li>Sharing screenshots of private conversations without the other person's consent.</li>
        </ul>

        <h2>3. Spicy Mode Guidelines</h2>
        <p>Spicy Mode is available exclusively to verified Diamond members aged 35 and above. In Spicy Mode:</p>
        <ul>
          <li>Content may be suggestive and flirtatious but must not be explicitly sexual or pornographic;</li>
          <li>All content must involve only adults (35+);</li>
          <li>Harassment and non-consensual messaging remain prohibited;</li>
          <li>Violations in Spicy Mode carry the same consequences as violations anywhere on the Platform.</li>
        </ul>

        <h2>4. How to Report</h2>
        <p>If you encounter behaviour that violates these guidelines:</p>
        <ul>
          <li>Tap the Flag icon on any profile or message to report it;</li>
          <li>Go to Safety in the menu for additional reporting options;</li>
          <li>Email <a href="mailto:safety@ghsuomo.com">safety@ghsuomo.com</a> for urgent safety concerns.</li>
        </ul>
        <p>Reports are confidential. We take every report seriously.</p>

        <h2>5. Moderation Process</h2>
        <p>When a report is received:</p>
        <ul>
          <li>Our system reviews the report and may use AI to assist in identifying patterns;</li>
          <li>A human moderator reviews cases involving potential bans or serious violations;</li>
          <li>We aim to respond to all reports within 48 hours;</li>
          <li>The reported user will not be told who reported them.</li>
        </ul>

        <h2>6. Consequences</h2>
        <p>Depending on the severity and frequency of violations, consequences may include:</p>
        <ul>
          <li>A warning;</li>
          <li>Temporary suspension;</li>
          <li>Permanent account ban;</li>
          <li>Referral to law enforcement where required by law.</li>
        </ul>
        <p>We reserve the right to act on violations without prior notice in cases that pose an immediate safety risk.</p>

        <h2>7. Appeals</h2>
        <p>If your account has been suspended or banned and you believe this was in error, you may appeal by emailing <a href="mailto:appeals@ghsuomo.com">appeals@ghsuomo.com</a> within 14 days of the action. Please include your registered email address and the reason you believe the decision was incorrect. We will review your appeal within 10 business days.</p>

        <h2>8. Safety Tips</h2>
        <ul>
          <li>Never send money to anyone you meet on GH SUƆMƆ, no matter how compelling their story;</li>
          <li>Meet in public places for first meetings;</li>
          <li>Tell a trusted person where you are going;</li>
          <li>Trust your instincts — if something feels wrong, report it and leave;</li>
          <li>GH SUƆMƆ will never ask for your password or payment details outside the official app.</li>
        </ul>

        <p className="text-xs text-muted-foreground mt-12 pt-6 border-t">Questions about these guidelines? Contact us at hello@ghsuomo.com.</p>
      </main>
    </div>
  );
}
