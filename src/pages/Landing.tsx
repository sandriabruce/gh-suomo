import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { CoupleCard, SAMPLE_COUPLES } from "@/components/brand/CoupleCard";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { applySpicyRuntimeTheme, SPICY_MODE_STORAGE_KEY, SPICY_MODE_STORAGE_KEY_CANONICAL } from "@/lib/spicyRuntimeTheme";

export default function Landing() {
  // Always show brown on the landing page — never crimson
  useEffect(() => {
    try {
      localStorage.removeItem(SPICY_MODE_STORAGE_KEY);
      localStorage.removeItem(SPICY_MODE_STORAGE_KEY_CANONICAL);
    } catch { /* ignore */ }
    applySpicyRuntimeTheme(false);
  }, []);
  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link to="/" aria-label="Home"><Logo size="sm" /></Link>
        <Link to="/auth"><Button variant="ghost" className="text-ghana-brown text-slate-50">Sign in</Button></Link>
      </header>
      <section className="mx-auto max-w-3xl px-4 py-12 text-center">
        <Logo size="xl" showWordmark className="justify-center" />
        <p className="mx-auto mt-6 max-w-xl text-lg text-foreground/80">
          Dating for the 35+ Ghanaian. At home and across the diaspora — built for real love, with real safety.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth"><Button size="lg" className="bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">Start free 7-day trial</Button></Link>
          <Link to="/app/safety"><Button size="lg" variant="outline" className="border-ghana-red text-ghana-red">Safety first</Button></Link>
        </div>
        <div className="mt-10 grid grid-cols-4 gap-3 text-center">
          {[["94+","couples"],["21","countries"],["2.8k+","members"],["7","weddings"]].map(([n,l]) => (
            <div key={l} className="rounded-2xl border-2 border-ghana-gold/40 bg-card p-3">
              <div className="font-display text-xl font-bold text-ghana-gold">{n}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="font-display text-2xl font-bold text-ghana-gold">Real love stories</h2>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {SAMPLE_COUPLES.map((c) => <CoupleCard key={c.id} couple={c} />)}
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-16 text-center">
        <div className="rounded-2xl border border-amber-400/30 bg-amber-50/40 px-6 py-8">
          <p className="text-xs uppercase tracking-widest text-amber-700">Mannye's Magic</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-ghana-brown">
            Tell Mannye who you're looking for.
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Create your perfect partner. Your answers become who you seek. 100% private.
          </p>
          <Link to="/auth">
            <Button className="mt-5 bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
              Try Mannye's Magic ✨
            </Button>
          </Link>
        </div>
      </section>
      <InstallBanner />
      <footer className="border-t border-ghana-gold/20 bg-card/50 px-4 py-8 mt-4">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <Link to="/terms" className="hover:text-ghana-gold transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-ghana-gold transition-colors">Privacy Policy</Link>
            <Link to="/ai-disclosure" className="hover:text-ghana-gold transition-colors">AI Disclosure</Link>
            <Link to="/refunds" className="hover:text-ghana-gold transition-colors">Refunds</Link>
            <Link to="/guidelines" className="hover:text-ghana-gold transition-colors">Community Guidelines</Link>
            <a href="mailto:hello@ghsuomo.com" className="hover:text-ghana-gold transition-colors">Contact</a>
          </div>
          <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
            © {new Date().getFullYear()} GH SUƆMƆ. All rights reserved. · For Ghanaians 35+ worldwide. · Documents pending final legal review.
          </p>
        </div>
      </footer>
    </div>
  );
}