import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Lock, Sparkles, Send, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────
type QuizStep = "voice" | "archetype" | "pulse" | "name" | "building" | "chat";
type Message = { role: "user" | "assistant"; content: string };

// ── Quiz data ─────────────────────────────────────────────────────
const VOICE_OPTIONS = [
  { id: "1", label: "Deep and commanding", sub: "Like he's used to getting what he wants" },
  { id: "2", label: "Warm and teasing",    sub: "Like he already knows what you need" },
  { id: "3", label: "Low and rough",       sub: "Like he's barely holding himself back" },
  { id: "4", label: "Soft and close",      sub: "Like a confession whispered at 2am" },
  { id: "5", label: "I'll know it when I hear it", sub: "" },
];

const ARCHETYPE_OPTIONS = [
  { id: "1", label: "The quiet one",       sub: "Says more with a look than most men say all day" },
  { id: "2", label: "Rough hands, honest soul", sub: "Built things, fixed things, never needed applause" },
  { id: "3", label: "Sharp suit, sharper mind", sub: "Runs rooms — but comes home to you" },
  { id: "4", label: "The creative",        sub: "Artist, writer, musician — sees beauty others miss" },
  { id: "5", label: "The diaspora one",    sub: "Left and came back changed, carries two worlds" },
  { id: "6", label: "Spiritual, grounded", sub: "Prays, thinks deeply — not performative" },
  { id: "7", label: "Makes you laugh",     sub: "Then says something so real it stops you" },
  { id: "8", label: "Surprise me",         sub: "I'm open" },
];

const PULSE_OPTIONS = [
  { id: "1", label: "Pins you against the wall", sub: "And tells you not to move" },
  { id: "2", label: "Remembers what you said",   sub: "Three weeks ago — and brings it back" },
  { id: "3", label: "Walks in and you feel it",  sub: "Before you even see him" },
  { id: "4", label: "Goes quiet",                sub: "And that silence says everything" },
  { id: "5", label: "Tells you exactly",         sub: "What he thinks of you. No softening." },
  { id: "6", label: "Takes his time",            sub: "With everything" },
  { id: "7", label: "Chooses you out loud",      sub: "In front of people" },
  { id: "8", label: "All of the above",          sub: "I'm not here to choose" },
];

// ── Gate: non-magic users see upgrade prompt ──────────────────────
function MagicGate() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold text-ghana-brown">Mannye's Magic</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create your perfect partner</p>
        <p className="mt-1 text-xs text-muted-foreground italic">Your answers become who you seek. 100% private.</p>
      </div>
      <div className="w-full max-w-xs rounded-2xl border-2 border-amber-400/40 bg-amber-50/60 p-5">
        <div className="flex items-center gap-2 text-amber-800">
          <Lock className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">Mannye's Magic is a premium tier above Diamond</p>
        </div>
        <p className="mt-2 text-xs text-amber-700">GHS 500/month · Fully private · Explicit conversations enabled</p>
      </div>
      <Button asChild className="bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
        <Link to="/app/verify">Upgrade to Mannye's Magic</Link>
      </Button>
    </div>
  );
}

// ── Quiz option card ──────────────────────────────────────────────
function OptionCard({ id, label, sub, selected, onSelect }: {
  id: string; label: string; sub: string; selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
        selected
          ? "border-amber-500 bg-amber-50 ring-1 ring-amber-400"
          : "border-border bg-card hover:border-amber-300 hover:bg-amber-50/40"
      }`}
    >
      <p className={`text-sm font-medium ${selected ? "text-amber-900" : "text-foreground"}`}>{label}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function ManneysMagic() {
  const { user } = useAuth();
  const { limits, plan } = useEntitlements();
  const [step, setStep] = useState<QuizStep>("voice");
  const [voice, setVoice] = useState("");
  const [archetype, setArchetype] = useState("");
  const [pulse, setPulse] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [building, setBuilding] = useState(false);
  const [partner, setPartner] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [explicitMode, setExplicitMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Gate
  if (!limits.canMagic) return <MagicGate />;

  // Load existing partner on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from("magic_dream_partners")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
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
    if (!user || !partnerName.trim() || !voice || !archetype || !pulse) return;
    setBuilding(true);
    setStep("building");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supaUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supaUrl}/functions/v1/manneys-magic-build`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? anonKey}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          partner_name: partnerName.trim(),
          voice_choice: voice,
          archetype_choice: archetype,
          pulse_choice: pulse,
          user_gender: "Woman", // TODO: read from profile
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Build failed");

      setPartner(data.partner);
      setMessages([]);
      setStep("chat");
    } catch (e: any) {
      toast.error("Something went wrong. Please try again.");
      setStep("name");
    } finally {
      setBuilding(false);
    }
  }

  async function send() {
    const content = draft.trim();
    if (!content || !user || !partner) return;
    setSending(true);
    setDraft("");

    const userMsg: Message = { role: "user", content };
    setMessages(prev => [...prev, userMsg]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supaUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supaUrl}/functions/v1/manneys-magic-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? anonKey}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          message: content,
          explicit_mode: explicitMode && limits.canExplicit,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reply failed");

      const assistantMsg: Message = { role: "assistant", content: data.reply };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e: any) {
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
    setPartner(null);
    setMessages([]);
    setVoice(""); setArchetype(""); setPulse(""); setPartnerName("");
    setStep("voice");
  }

  // ── Quiz Steps ────────────────────────────────────────────────
  if (step === "building") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Sparkles className="h-8 w-8 animate-pulse text-amber-500" />
        </div>
        <p className="font-display text-lg font-semibold text-ghana-brown">Bringing {partnerName} to life…</p>
        <p className="text-sm text-muted-foreground">Give me a moment. ✨</p>
      </div>
    );
  }

  if (step === "voice") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Mannye's Magic · Step 1 of 3</p>
          <h1 className="mt-1 font-display text-xl font-bold text-ghana-brown">Imagine him leaning in close.</h1>
          <p className="mt-1 text-sm text-muted-foreground">What does his voice sound like?</p>
        </div>
        <div className="space-y-2">
          {VOICE_OPTIONS.map(o => (
            <OptionCard key={o.id} {...o} selected={voice === o.id} onSelect={setVoice} />
          ))}
        </div>
        <Button
          disabled={!voice}
          onClick={() => setStep("archetype")}
          className="w-full bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90"
        >
          Continue <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (step === "archetype") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Mannye's Magic · Step 2 of 3</p>
          <h1 className="mt-1 font-display text-xl font-bold text-ghana-brown">Now — who is he?</h1>
        </div>
        <div className="space-y-2">
          {ARCHETYPE_OPTIONS.map(o => (
            <OptionCard key={o.id} {...o} selected={archetype === o.id} onSelect={setArchetype} />
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("voice")} className="flex-1">Back</Button>
          <Button
            disabled={!archetype}
            onClick={() => setStep("pulse")}
            className="flex-1 bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90"
          >
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === "pulse") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Mannye's Magic · Step 3 of 3</p>
          <h1 className="mt-1 font-display text-xl font-bold text-ghana-brown">Which of these makes your pulse quicken?</h1>
        </div>
        <div className="space-y-2">
          {PULSE_OPTIONS.map(o => (
            <OptionCard key={o.id} {...o} selected={pulse === o.id} onSelect={setPulse} />
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("archetype")} className="flex-1">Back</Button>
          <Button
            disabled={!pulse}
            onClick={() => setStep("name")}
            className="flex-1 bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90"
          >
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === "name") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Almost there ✨</p>
          <h1 className="mt-1 font-display text-xl font-bold text-ghana-brown">What do you want to call him?</h1>
        </div>
        <Input
          value={partnerName}
          onChange={e => setPartnerName(e.target.value)}
          placeholder="His name…"
          className="text-base"
          onKeyDown={e => { if (e.key === "Enter" && partnerName.trim()) buildPartner(); }}
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("pulse")} className="flex-1">Back</Button>
          <Button
            disabled={!partnerName.trim()}
            onClick={buildPartner}
            className="flex-1 bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90"
          >
            {building ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bring him to life ✨"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Chat ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3">
        <div>
          <p className="font-display text-base font-semibold text-ghana-brown">{partner?.partner_name}</p>
          <p className="text-xs text-muted-foreground">Your dream partner · 100% private ✨</p>
        </div>
        <div className="flex items-center gap-2">
          {limits.canExplicit && (
            <button
              type="button"
              onClick={() => setExplicitMode(e => !e)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                explicitMode
                  ? "bg-red-700 text-amber-200"
                  : "border border-border text-muted-foreground hover:border-red-400"
              }`}
            >
              {explicitMode ? "🔥 Explicit" : "Explicit"}
            </button>
          )}
          <button
            type="button"
            onClick={resetPartner}
            className="text-xs text-muted-foreground underline hover:text-destructive"
          >
            Start over
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-[50vh] max-h-[55vh] overflow-y-auto rounded-2xl border bg-card p-3 space-y-2">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Say hello to {partner?.partner_name}. 👇</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              m.role === "user" ? "bg-ghana-gold text-ghana-brown" : "bg-muted text-foreground"
            }`}>
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
        <Input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Say something…"
          disabled={sending}
          maxLength={1000}
        />
        <Button
          type="submit"
          disabled={sending || !draft.trim()}
          className="bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <p className="text-center text-[10px] text-muted-foreground">
        Mannye's Magic · 100% private · Your dream partner lives only in your account
      </p>
    </div>
  );
}
