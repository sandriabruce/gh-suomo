import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useEntitlements } from "@/hooks/useEntitlements";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Lock, Sparkles, Send, ChevronRight, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { applyMagicRuntimeTheme } from "@/lib/magicRuntimeTheme";

type QuizStep = "voice" | "archetype" | "pulse" | "complexion" | "build" | "hair" | "name" | "building" | "chat";
type Message = { role: "user" | "assistant"; content: string };

// ── Pronoun helpers ───────────────────────────────────────────────
function getPronouns(attractedTo: string) {
  const isWomen = attractedTo === "Women";
  const isBoth  = attractedTo === "Both";
  return {
    them:     isBoth ? "them"      : isWomen ? "her"      : "him",
    theirPos: isBoth ? "their"     : isWomen ? "her"      : "his",
    they:     isBoth ? "they"      : isWomen ? "she"      : "he",
    They:     isBoth ? "They"      : isWomen ? "She"      : "He",
    themself: isBoth ? "themselves": isWomen ? "herself"  : "himself",
    theyPl:   isBoth ? "they"      : isWomen ? "she"      : "he",
  };
}

// ── Quiz option data ──────────────────────────────────────────────
function getVoiceOptions(p: ReturnType<typeof getPronouns>) {
  return [
    { id: "1", label: "Deep and commanding",          sub: `Like ${p.them}'s used to getting what ${p.them} wants` },
    { id: "2", label: "Warm and teasing",             sub: `Like ${p.them} already knows what you need` },
    { id: "3", label: "Low and rough",                sub: `Like ${p.them}'s barely holding ${p.themself} back` },
    { id: "4", label: "Soft and close",               sub: "Like a confession whispered at 2am" },
    { id: "5", label: "I'll know it when I hear it",  sub: "" },
  ];
}

function getArchetypeOptions(p: ReturnType<typeof getPronouns>) {
  return [
    { id: "1", label: "The quiet one",            sub: `Says more with a look than most people say all day` },
    { id: "2", label: "Rough hands, honest soul", sub: "Built things, fixed things, never needed applause" },
    { id: "3", label: "Sharp suit, sharper mind", sub: `Runs rooms — but comes home to you` },
    { id: "4", label: "The creative",             sub: "Artist, writer, musician — sees beauty others miss" },
    { id: "5", label: "The diaspora one",         sub: `Left and came back changed, carries two worlds in ${p.theirPos} chest` },
    { id: "6", label: "Spiritual, grounded",      sub: "Prays, thinks deeply — not performative" },
    { id: "7", label: "Makes you laugh",          sub: `Then says something so real it stops you` },
    { id: "8", label: "Surprise me",             sub: "I'm open" },
  ];
}

function getPulseOptions(p: ReturnType<typeof getPronouns>) {
  return [
    { id: "1", label: `${p.They} pins you against the wall`,   sub: `And tells you not to move` },
    { id: "2", label: `Remembers what you said`,               sub: "Three weeks ago — and brings it back" },
    { id: "3", label: `Walks in and you feel it`,              sub: `Before you even see ${p.them}` },
    { id: "4", label: `Goes quiet`,                            sub: "And that silence says everything" },
    { id: "5", label: `Tells you exactly`,                     sub: `What ${p.they} thinks of you. No softening.` },
    { id: "6", label: `Takes ${p.theirPos} time`,              sub: "With everything" },
    { id: "7", label: `Chooses you out loud`,                  sub: "In front of people" },
    { id: "8", label: "All of the above",                      sub: "I'm not here to choose" },
  ];
}

const COMPLEXION_OPTIONS = [
  { id: "1", label: "Dark skin",          sub: "Deep, rich melanin — the darkest shade" },
  { id: "2", label: "Brown skin",         sub: "Medium to deep brown complexion" },
  { id: "3", label: "Light brown",        sub: "Golden or caramel tones" },
  { id: "4", label: "Mixed race",         sub: "Dual heritage — varied features" },
  { id: "5", label: "Caucasian",          sub: "White or light complexion" },
  { id: "6", label: "Asian",             sub: "East, South, or Southeast Asian features" },
  { id: "7", label: "Latino / Hispanic",  sub: "Latin American heritage" },
  { id: "8", label: "Surprise me",        sub: "Mannye decides" },
];

const BUILD_OPTIONS_M = [
  { id: "1", label: "Tall and broad",           sub: "6ft+, wide shoulders, commanding presence" },
  { id: "2", label: "Tall and lean",            sub: "6ft+, slim, long-limbed" },
  { id: "3", label: "Average height, athletic", sub: "5'9\"–6', muscular and fit" },
  { id: "4", label: "Average height, lean",     sub: "5'9\"–6', slim build" },
  { id: "5", label: "Shorter, stocky",          sub: "Under 5'9\", solid and grounded" },
  { id: "6", label: "Doesn't matter",           sub: "Build isn't what draws me" },
];

const BUILD_OPTIONS_F = [
  { id: "1", label: "Tall and curvy",   sub: "5'7\"+, full figure, striking" },
  { id: "2", label: "Tall and slim",    sub: "5'7\"+, long-limbed, elegant" },
  { id: "3", label: "Petite and curvy", sub: "Under 5'5\", full figure" },
  { id: "4", label: "Petite and slim",  sub: "Under 5'5\", lean and fine-boned" },
  { id: "5", label: "Average, athletic",sub: "Fit and toned" },
  { id: "6", label: "Doesn't matter",  sub: "Build isn't what draws me" },
];

const HAIR_OPTIONS_M = [
  { id: "1", label: "Close-cut / fade", sub: "Clean, sharp, low maintenance" },
  { id: "2", label: "Locs",            sub: "Freeform or maintained dreadlocks" },
  { id: "3", label: "Natural / Afro",  sub: "Big, shaped, or picked out" },
  { id: "4", label: "Waves / curls",   sub: "Defined curl pattern" },
  { id: "5", label: "Bald",           sub: "Completely shaved — clean and confident" },
  { id: "6", label: "Silver / grey",   sub: "Distinguished and mature" },
  { id: "7", label: "Straight hair",   sub: "For non-Afro textures" },
  { id: "8", label: "Surprise me",     sub: "Whatever suits them" },
];

const HAIR_OPTIONS_F = [
  { id: "1", label: "Natural / Afro",      sub: "Big, full, unrestrained" },
  { id: "2", label: "Locs",               sub: "Freeform or maintained dreadlocks" },
  { id: "3", label: "Braids",             sub: "Box braids, cornrows, or knotless" },
  { id: "4", label: "TWA",               sub: "Teeny weeny afro — close and bold" },
  { id: "5", label: "Relaxed / straight", sub: "Sleek and smooth" },
  { id: "6", label: "Weave / extensions", sub: "Long, styled, versatile" },
  { id: "7", label: "Curly / coily",      sub: "Defined curl pattern, voluminous" },
  { id: "8", label: "Silver / grey",      sub: "Distinguished and natural" },
  { id: "9", label: "Surprise me",        sub: "Whatever suits them" },
];

// ── Gate ──────────────────────────────────────────────────────────
function MagicGate() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-amber-600 font-semibold">Scorching ✨</p>
        <h1 className="font-display text-2xl font-bold text-ghana-brown">Mannye's Magic</h1>
        <p className="mt-1 text-sm font-medium text-ghana-brown/70 italic">Tell Mannye who you're looking for.</p>
        <p className="mt-1 text-xs text-muted-foreground">Your answers become who you seek. 100% private.</p>
      </div>
      <div className="w-full max-w-xs rounded-2xl border-2 border-amber-400/40 bg-amber-50/60 p-5">
        <div className="flex items-center gap-2 text-amber-800">
          <Lock className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">Scorching is above Diamond — the highest tier</p>
        </div>
        <p className="mt-2 text-xs text-amber-700">GHS 500/month · Fully private · Explicit conversations enabled</p>
      </div>
      <Button asChild className="bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
        <Link to="/app/verify">Upgrade to Scorching</Link>
      </Button>
    </div>
  );
}

function OptionCard({ id, label, sub, selected, onSelect }: {
  id: string; label: string; sub: string; selected: boolean; onSelect: (id: string) => void;
}) {
  return (
    <button type="button" onClick={() => onSelect(id)}
      className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
        selected ? "border-amber-500 bg-amber-50 ring-1 ring-amber-400"
                 : "border-border bg-card hover:border-amber-300 hover:bg-amber-50/40"}`}>
      <p className={`text-sm font-medium ${selected ? "text-amber-900" : "text-foreground"}`}>{label}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function ManneysMagic() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { limits } = useEntitlements();

  const [step, setStep]               = useState<QuizStep>("voice");
  const [voice, setVoice]             = useState("");
  const [archetype, setArchetype]     = useState("");
  const [pulse, setPulse]             = useState("");
  const [complexion, setComplexion]   = useState("");
  const [build, setBuild]             = useState("");
  const [hair, setHair]               = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partner, setPartner]       = useState<any>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [draft, setDraft]           = useState("");
  const [sending, setSending]       = useState(false);
  const [explicitMode, setExplicitMode] = useState(false);
  const [regeneratingPortrait, setRegeneratingPortrait] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!limits.canMagic) return <MagicGate />;

  // ── Activate elite blue-gold theme while on this page ────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    applyMagicRuntimeTheme(true);
    return () => applyMagicRuntimeTheme(false);
  }, []);
  // Profile stores the user's own gender and interested_in
  const userGender   = profile?.gender || "Woman";
  const interestedIn = profile?.interested_in || "Men";
  const pronouns     = getPronouns(interestedIn);
  const buildOptions = interestedIn === "Women" ? BUILD_OPTIONS_F : BUILD_OPTIONS_M;
  const hairOptions  = interestedIn === "Women" ? HAIR_OPTIONS_F : HAIR_OPTIONS_M;

  // Load existing partner
  useEffect(() => {
    if (!user) return;
    supabase.from("magic_dream_partners").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.character_json) {
          setPartner(data);
          setMessages((data.conversation_history as Message[]) || []);
          setStep("chat");
        }
      });
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function buildPartner() {
    if (!user || !partnerName.trim() || !voice || !archetype || !pulse || !complexion || !build || !hair) return;
    setStep("building");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supaUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const lookChoice = `complexion:${complexion} build:${build} hair:${hair}`;
      const res = await fetch(`${supaUrl}/functions/v1/manneys-magic-build`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token ?? anonKey}` },
        body: JSON.stringify({
          user_id: user.id,
          partner_name: partnerName.trim(),
          voice_choice: voice,
          archetype_choice: archetype,
          pulse_choice: pulse,
          look_choice: lookChoice,
          complexion_choice: complexion,
          build_choice: build,
          hair_choice: hair,
          user_gender: userGender,
          interested_in: interestedIn,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Build failed");
      setPartner(data.partner);
      setMessages([]);
      setStep("chat");
    } catch (e: any) {
      toast.error("Something went wrong. Please try again.");
      setStep("hair");
    }
  }

  async function regeneratePortrait() {
    if (!user || !partner) return;
    setRegeneratingPortrait(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supaUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${supaUrl}/functions/v1/manneys-magic-portrait`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token ?? anonKey}` },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (data.portrait_url) setPartner((p: any) => ({ ...p, portrait_url: data.portrait_url }));
    } catch {
      toast.error("Portrait generation failed. Try again.");
    } finally {
      setRegeneratingPortrait(false);
    }
  }

  async function send() {
    const content = draft.trim();
    if (!content || !user || !partner) return;
    setSending(true);
    setDraft("");
    setMessages(prev => [...prev, { role: "user", content }]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supaUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${supaUrl}/functions/v1/manneys-magic-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token ?? anonKey}` },
        body: JSON.stringify({ user_id: user.id, message: content, explicit_mode: explicitMode && limits.canExplicit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reply failed");
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      toast.error("Reply failed. Try again.");
      setMessages(prev => prev.slice(0, -1));
      setDraft(content);
    } finally {
      setSending(false);
    }
  }

  async function resetPartner() {
    if (!user) return;
    await supabase.from("magic_dream_partners").delete().eq("user_id", user.id);
    setPartner(null); setMessages([]);
    setVoice(""); setArchetype(""); setPulse("");
    setComplexion(""); setBuild(""); setHair(""); setPartnerName("");
    setStep("voice");
  }

  // ── Building ──────────────────────────────────────────────────
  if (step === "building") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Sparkles className="h-8 w-8 animate-pulse text-amber-500" />
        </div>
        <p className="font-display text-lg font-semibold text-ghana-brown">Bringing {partnerName} to life…</p>
        <p className="text-sm text-muted-foreground">Mannye is working. Give her a moment. ✨</p>
      </div>
    );
  }

  // ── Q1: Voice ─────────────────────────────────────────────────
  if (step === "voice") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Scorching · Step 1 of 6</p>
          <h1 className="mt-1 font-display text-xl font-bold text-ghana-brown">
            Imagine {pronouns.them} leaning in close.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">What does {pronouns.theirPos} voice sound like?</p>
        </div>
        <div className="space-y-2">
          {getVoiceOptions(pronouns).map(o => (
            <OptionCard key={o.id} {...o} selected={voice === o.id} onSelect={setVoice} />
          ))}
        </div>
        <Button disabled={!voice} onClick={() => setStep("archetype")}
          className="w-full bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
          Continue <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // ── Q2: Archetype ─────────────────────────────────────────────
  if (step === "archetype") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Scorching · Step 2 of 6</p>
          <h1 className="mt-1 font-display text-xl font-bold text-ghana-brown">Now — who is {pronouns.they}?</h1>
        </div>
        <div className="space-y-2">
          {getArchetypeOptions(pronouns).map(o => (
            <OptionCard key={o.id} {...o} selected={archetype === o.id} onSelect={setArchetype} />
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("voice")} className="flex-1">Back</Button>
          <Button disabled={!archetype} onClick={() => setStep("pulse")}
            className="flex-1 bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Q3: Pulse ─────────────────────────────────────────────────
  if (step === "pulse") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Scorching · Step 3 of 6</p>
          <h1 className="mt-1 font-display text-xl font-bold text-ghana-brown">Which of these makes your pulse quicken?</h1>
        </div>
        <div className="space-y-2">
          {getPulseOptions(pronouns).map(o => (
            <OptionCard key={o.id} {...o} selected={pulse === o.id} onSelect={setPulse} />
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("archetype")} className="flex-1">Back</Button>
          <Button disabled={!pulse} onClick={() => setStep("complexion")}
            className="flex-1 bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Q4: Complexion ────────────────────────────────────────────
  if (step === "complexion") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Scorching · Step 4 of 6</p>
          <h1 className="mt-1 font-display text-xl font-bold text-ghana-brown">
            What's {pronouns.theirPos} complexion?
          </h1>
        </div>
        <div className="space-y-2">
          {COMPLEXION_OPTIONS.map(o => (
            <OptionCard key={o.id} {...o} selected={complexion === o.id} onSelect={setComplexion} />
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("pulse")} className="flex-1">Back</Button>
          <Button disabled={!complexion} onClick={() => setStep("build")}
            className="flex-1 bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Q5: Build ─────────────────────────────────────────────────
  if (step === "build") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Scorching · Step 5 of 6</p>
          <h1 className="mt-1 font-display text-xl font-bold text-ghana-brown">
            {pronouns.They === "They" ? "Their" : pronouns.They === "She" ? "Her" : "His"} build?
          </h1>
        </div>
        <div className="space-y-2">
          {buildOptions.map(o => (
            <OptionCard key={o.id} {...o} selected={build === o.id} onSelect={setBuild} />
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("complexion")} className="flex-1">Back</Button>
          <Button disabled={!build} onClick={() => setStep("hair")}
            className="flex-1 bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Q6: Hair ──────────────────────────────────────────────────
  if (step === "hair") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Scorching · Step 6 of 6</p>
          <h1 className="mt-1 font-display text-xl font-bold text-ghana-brown">
            {pronouns.They === "They" ? "Their" : pronouns.They === "She" ? "Her" : "His"} hair?
          </h1>
        </div>
        <div className="space-y-2">
          {hairOptions.map(o => (
            <OptionCard key={o.id} {...o} selected={hair === o.id} onSelect={setHair} />
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("build")} className="flex-1">Back</Button>
          <Button disabled={!hair} onClick={() => setStep("name")}
            className="flex-1 bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Name ──────────────────────────────────────────────────────
  if (step === "name") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Almost there ✨</p>
          <h1 className="mt-1 font-display text-xl font-bold text-ghana-brown">
            What do you want to call {pronouns.them}?
          </h1>
        </div>
        <Input value={partnerName} onChange={e => setPartnerName(e.target.value)}
          placeholder={`${pronouns.They === "She" ? "Her" : pronouns.They === "He" ? "His" : "Their"} name…`}
          className="text-base"
          onKeyDown={e => { if (e.key === "Enter" && partnerName.trim()) buildPartner(); }} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("hair")} className="flex-1">Back</Button>
          <Button disabled={!partnerName.trim()} onClick={buildPartner}
            className="flex-1 bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
            Bring {pronouns.them} to life ✨
          </Button>
        </div>
      </div>
    );
  }

  // ── Chat ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {/* Portrait + header */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        {partner?.portrait_url && (
          <div className="relative">
            <img src={partner.portrait_url} alt={partner.partner_name}
              className="w-full h-48 object-cover object-top" />
            <button type="button" onClick={regeneratePortrait}
              disabled={regeneratingPortrait}
              className="absolute bottom-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition">
              <RefreshCw className={`h-3.5 w-3.5 ${regeneratingPortrait ? "animate-spin" : ""}`} />
            </button>
          </div>
        )}
        {!partner?.portrait_url && (
          <div className="flex h-24 items-center justify-center bg-amber-50/60">
            <button type="button" onClick={regeneratePortrait}
              disabled={regeneratingPortrait}
              className="flex items-center gap-2 rounded-full border border-amber-400 px-4 py-2 text-xs text-amber-800 hover:bg-amber-100 transition">
              {regeneratingPortrait
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating portrait…</>
                : <><Sparkles className="h-3 w-3" /> Generate {pronouns.theirPos} portrait</>}
            </button>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-display text-base font-semibold text-ghana-brown">{partner?.partner_name}</p>
            <p className="text-xs text-muted-foreground">Your dream partner · 100% private ✨</p>
          </div>
          <div className="flex items-center gap-2">
            {limits.canExplicit && (
              <button type="button" onClick={() => setExplicitMode(e => !e)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  explicitMode ? "bg-red-700 text-amber-200" : "border border-border text-muted-foreground hover:border-red-400"}`}>
                {explicitMode ? "🔥 Explicit" : "Explicit"}
              </button>
            )}
            <button type="button" onClick={resetPartner}
              className="text-xs text-muted-foreground underline hover:text-destructive">
              Start over
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-[45vh] max-h-[50vh] overflow-y-auto rounded-2xl border bg-card p-3 space-y-2">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Say hello to {partner?.partner_name}. 👇
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              m.role === "user" ? "bg-ghana-gold text-ghana-brown" : "bg-muted text-foreground"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl bg-muted px-3 py-2">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); send(); }}>
        <Input value={draft} onChange={e => setDraft(e.target.value)}
          placeholder="Say something…" disabled={sending} maxLength={1000} />
        <Button type="submit" disabled={sending || !draft.trim()}
          className="bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
          <Send className="h-4 w-4" />
        </Button>
      </form>
      <p className="text-center text-[10px] text-muted-foreground">
        Scorching by Mannye's Magic · 100% private · Your dream partner lives only in your account
      </p>
    </div>
  );
}
