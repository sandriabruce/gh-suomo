import { useState } from "react";
import { Flame, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seedClient } from "@/integrations/supabase/seedClient";
import { interestsForMode, promptsForMode } from "@/lib/brand";
import { toast } from "sonner";

const SPICY_ONBOARDING_KEY = "spicy-mode:onboarded:v1";

// All spicy interests — spicy-only ones first, then shared ones that also apply
const ALL_SPICY = interestsForMode("spark");
const SPICY_ONLY = ["Nightlife","Discretion","Weekend escapes","Fine dining","Champagne taste","Long drives","Deep conversations","Sensual energy","Slow mornings","Late nights","Good wine","Luxury travel","Bold choices","Chemistry","No games"];
const SHARED_IN_SPICY = ALL_SPICY.filter(i => !SPICY_ONLY.includes(i));
const ORDERED_SPICY_INTERESTS = [...SPICY_ONLY, ...SHARED_IN_SPICY];

const SPICY_PROMPTS = promptsForMode("spark");

type Step = "welcome" | "interests" | "prompt" | "done";

interface Props {
  userId: string;
  onComplete: () => void;
}

export function SpicyOnboarding({ userId, onComplete }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");
  const [promptAnswer, setPromptAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleInterest(i: string) {
    setSelectedInterests(prev =>
      prev.includes(i)
        ? prev.filter(x => x !== i)
        : prev.length < 8 ? [...prev, i] : prev
    );
  }

  async function save() {
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      if (selectedInterests.length >= 3) {
        updates.interests = selectedInterests;
      }
      if (selectedPrompt && promptAnswer.trim()) {
        const { data: current } = await seedClient
          .from("profiles").select("prompts").eq("id", userId).single();
        const existing = ((current?.prompts ?? []) as {q:string,a:string}[]);
        const filtered = existing.filter(p => p.q !== selectedPrompt);
        updates.prompts = [...filtered, { q: selectedPrompt, a: promptAnswer.trim() }];
      }
      if (Object.keys(updates).length > 0) {
        await seedClient.from("profiles").update(updates).eq("id", userId);
      }
      localStorage.setItem(SPICY_ONBOARDING_KEY, "1");
      toast.success("Your spicy profile is set 🔥");
      onComplete();
    } catch {
      toast.error("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function skip() {
    localStorage.setItem(SPICY_ONBOARDING_KEY, "1");
    onComplete();
  }

  const BG = "linear-gradient(160deg,#1a0000,#2d0808,#1a0000)";
  const GOLD = "linear-gradient(135deg,#c9a84c,#e8c96d)";

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.88)" }}>
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-y-auto max-h-[92dvh] text-white" style={{ background: BG }}>
        <div className="p-6 pb-10 space-y-0">

          {/* ── WELCOME ── */}
          {step === "welcome" && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center pt-2">
                <span className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: GOLD }}>
                  <Flame className="h-8 w-8 text-[#1a0000]" />
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "#c9a84c" }}>Welcome to the Spicy Side</h2>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                  This is a bolder, more sensual corner of GH SUƆMƆ — for Diamond members who know exactly what they want. Suggestive. Not explicit. Adults 40+ only.
                </p>
              </div>
              <div className="rounded-2xl p-4 text-left space-y-2.5 text-sm" style={{ border: "1px solid rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.04)" }}>
                {[
                  "Your spicy profile is completely separate from your sweet profile",
                  "Pick bolder interests and answer a more revealing prompt",
                  "Seeds in Spicy Mode match your energy and yours alone",
                  "Everything stays private — between you and who you choose",
                ].map((t, i) => (
                  <p key={i} style={{ color: "rgba(255,255,255,0.75)" }}>
                    <span style={{ color: "#c9a84c" }}>✦</span>&nbsp;&nbsp;{t}
                  </p>
                ))}
              </div>
              <Button
                className="w-full h-12 text-base font-semibold rounded-xl"
                style={{ background: GOLD, color: "#1a0000" }}
                onClick={() => setStep("interests")}
              >
                Set up my spicy profile <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <button className="text-xs underline underline-offset-2" style={{ color: "rgba(255,255,255,0.3)" }} onClick={skip}>
                Skip for now — just enter
              </button>
            </div>
          )}

          {/* ── INTERESTS ── */}
          {step === "interests" && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(201,168,76,0.7)" }}>Step 1 of 2</p>
                <h2 className="text-xl font-bold mt-1" style={{ color: "#c9a84c" }}>What are you into?</h2>
                <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Pick at least 3. These only show in Spicy Mode.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {ORDERED_SPICY_INTERESTS.map(i => {
                  const active = selectedInterests.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() => toggleInterest(i)}
                      className="rounded-full px-3.5 py-1.5 text-sm font-medium transition"
                      style={{
                        border: active ? "1px solid #c9a84c" : "1px solid rgba(255,255,255,0.15)",
                        background: active ? GOLD : "transparent",
                        color: active ? "#1a0000" : "rgba(255,255,255,0.65)",
                      }}
                    >
                      {active && <Check className="inline h-3 w-3 mr-1 -mt-0.5" />}{i}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{selectedInterests.length}/8 selected</p>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 text-sm" style={{ color: "rgba(255,255,255,0.4)" }} onClick={() => setStep("welcome")}>Back</Button>
                <Button
                  className="flex-1 rounded-xl"
                  style={{
                    background: selectedInterests.length >= 3 ? GOLD : "rgba(255,255,255,0.08)",
                    color: selectedInterests.length >= 3 ? "#1a0000" : "rgba(255,255,255,0.3)",
                  }}
                  disabled={selectedInterests.length < 3}
                  onClick={() => setStep("prompt")}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── PROMPT ── */}
          {step === "prompt" && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(201,168,76,0.7)" }}>Step 2 of 2</p>
                <h2 className="text-xl font-bold mt-1" style={{ color: "#c9a84c" }}>One honest prompt</h2>
                <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Choose a prompt and answer it. This shows on your spicy profile instead of your regular one.
                </p>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {SPICY_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => { setSelectedPrompt(p); setPromptAnswer(""); }}
                    className="w-full rounded-xl px-4 py-3 text-left text-sm transition"
                    style={{
                      border: selectedPrompt === p ? "1px solid rgba(201,168,76,0.6)" : "1px solid rgba(255,255,255,0.1)",
                      background: selectedPrompt === p ? "rgba(201,168,76,0.08)" : "transparent",
                      color: selectedPrompt === p ? "#c9a84c" : "rgba(255,255,255,0.55)",
                    }}
                  >
                    {selectedPrompt === p && <span className="mr-2">✦</span>}{p}
                  </button>
                ))}
              </div>

              {selectedPrompt && (
                <div className="space-y-1">
                  <p className="text-xs" style={{ color: "rgba(201,168,76,0.7)" }}>{selectedPrompt}</p>
                  <textarea
                    value={promptAnswer}
                    onChange={e => setPromptAnswer(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="Your honest answer…"
                    className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none"
                    style={{
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#fff",
                    }}
                  />
                  <p className="text-right text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{promptAnswer.length}/300</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button variant="ghost" className="flex-1 text-sm" style={{ color: "rgba(255,255,255,0.4)" }} onClick={() => setStep("interests")}>Back</Button>
                <Button
                  className="flex-1 rounded-xl font-semibold"
                  style={{ background: GOLD, color: "#1a0000" }}
                  disabled={saving}
                  onClick={save}
                >
                  {saving ? "Saving…" : "Enter Spicy Mode 🔥"}
                </Button>
              </div>
              <button className="w-full text-center text-xs underline underline-offset-2" style={{ color: "rgba(255,255,255,0.25)" }} onClick={save}>
                Skip the prompt — save interests only
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export function shouldShowSpicyOnboarding(): boolean {
  try { return !localStorage.getItem(SPICY_ONBOARDING_KEY); } catch { return false; }
}
