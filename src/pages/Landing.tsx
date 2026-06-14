import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { CoupleCard, SAMPLE_COUPLES } from "@/components/brand/CoupleCard";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { applySpicyRuntimeTheme, SPICY_MODE_STORAGE_KEY, SPICY_MODE_STORAGE_KEY_CANONICAL } from "@/lib/spicyRuntimeTheme";

export default function Landing() {
  const navigate = useNavigate();

  // If user is already logged in, send them straight to the app
  // This prevents the system back button from landing on the sign-in page
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/app/discover", { replace: true });
    });
  }, [navigate]);

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
      {/* ── Three tiers ───────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="font-display text-2xl font-bold text-ghana-gold text-center mb-2">Choose your experience</h2>
        <p className="text-center text-sm text-muted-foreground mb-8">Three ways to find who you're looking for.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* Sweet */}
          <div className="flex flex-col rounded-2xl border-2 border-ghana-gold/30 bg-card px-6 py-7 text-center">
            <p className="text-2xl">🍯</p>
            <p className="mt-2 text-xs uppercase tracking-widest font-semibold text-ghana-gold">Sweet</p>
            <h3 className="mt-1 font-display text-xl font-bold text-ghana-gold">Real people.<br/>Real connection.</h3>
            <p className="mt-3 text-sm text-muted-foreground flex-1">
              Browse profiles, send messages, and meet Ghanaians 35+ at home and across the diaspora.
            </p>
            <div className="mt-4 text-xs text-muted-foreground">From <span className="font-semibold text-ghana-gold">Free</span></div>
            <Link to="/auth" className="mt-4">
              <Button className="w-full bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
                Get started
              </Button>
            </Link>
          </div>

          {/* Spicy */}
          <div className="flex flex-col rounded-2xl border-2 border-ghana-red/40 bg-gradient-to-b from-red-950/80 to-red-900/60 px-6 py-7 text-center">
            <p className="text-2xl">🌶️</p>
            <p className="mt-2 text-xs uppercase tracking-widest font-semibold text-red-400">Spicy</p>
            <h3 className="mt-1 font-display text-xl font-bold text-amber-100">Turn up the heat.</h3>
            <p className="mt-3 text-sm text-red-200/80 flex-1">
              Diamond members unlock Spicy mode — a private lounge with a different energy. Adults only.
            </p>
            <div className="mt-4 text-xs text-red-300/70">Diamond · <span className="font-semibold text-amber-300">GHS 350/mo</span></div>
            <Link to="/auth" className="mt-4">
              <Button className="w-full bg-ghana-red text-white hover:bg-ghana-red/90">
                Upgrade to Diamond
              </Button>
            </Link>
          </div>

          {/* Scorching */}
          <div className="flex flex-col rounded-2xl border-2 border-amber-400/40 bg-gradient-to-b from-blue-950/80 to-blue-900/60 px-6 py-7 text-center">
            <p className="text-2xl">🔥</p>
            <p className="mt-2 text-xs uppercase tracking-widest font-semibold text-amber-400">Scorching</p>
            <h3 className="mt-1 font-display text-xl font-bold text-amber-100">
              Tell Mannye who you're looking for.
            </h3>
            <p className="mt-3 text-sm text-blue-200/80 flex-1">
              Suɔmɔ's Sorcery. Answer six questions and meet your dream partner — built just for you. 100% private.
            </p>
            <div className="mt-4 text-xs text-blue-300/70">Scorching · <span className="font-semibold text-amber-300">GHS 500/mo</span></div>
            <Link to="/auth" className="mt-4">
              <Button className="w-full bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
                Try Scorching ✨
              </Button>
            </Link>
          </div>

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
            © {new Date().getFullYear()} GH SUƆMƆ. All rights reserved. · For Ghanaians 35+ worldwide.
          </p>
        </div>
      </footer>
    </div>
  );
}