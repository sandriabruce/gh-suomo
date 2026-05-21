import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Flame, Crown, Flag, ShieldAlert, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useSpicyTheme } from "@/hooks/useSpicyTheme";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type SpicyCandidate = {
  id: string;
  first_name: string | null;
  age: number | null;
  location: string | null;
  spicy_bio: string | null;
  spicy_photos: string[];
  spicy_prompts: { q: string; a: string }[];
};

const SPICY_AGE_CONSENT_KEY = "spicy-mode:age-consent:v1";

function mapSpicy(row: Record<string, unknown>): SpicyCandidate {
  const photos = Array.isArray(row.spicy_photos) ? (row.spicy_photos as string[]) : [];
  const prompts = Array.isArray(row.spicy_prompts)
    ? ((row.spicy_prompts as unknown[]).filter(
        (p): p is { q: string; a: string } =>
          !!p && typeof p === "object" && "q" in p && "a" in p,
      ))
    : [];
  return {
    id: row.id as string,
    first_name: (row.first_name as string | null) ?? null,
    age: (row.age as number | null) ?? null,
    location: (row.location as string | null) ?? null,
    spicy_bio: (row.spicy_bio as string | null) ?? null,
    spicy_photos: photos,
    spicy_prompts: prompts,
  };
}

export default function Spicy() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { plan, loading: entLoading } = useEntitlements();
  const [openId, setOpenId] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetail, setReportDetail] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const [ageConfirmed, setAgeConfirmed] = useState<boolean>(() => {
    try { return !!localStorage.getItem(SPICY_AGE_CONSENT_KEY); } catch { return false; }
  });

  const isDiamond = plan === "diamond";

  // Activate the luxury crimson + gold theme any time Spicy Mode is unlocked.
  useSpicyTheme(isDiamond && ageConfirmed);

  const targetGenders = useMemo<string[]>(() => {
    const want = profile?.interested_in;
    if (want === "Men") return ["Man"];
    if (want === "Women") return ["Woman"];
    return ["Man", "Woman"];
  }, [profile?.interested_in]);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["spicy-feed", targetGenders],
    enabled: !!user && isDiamond && ageConfirmed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, age, location, spicy_bio, spicy_photos, spicy_prompts, gender, is_seed, banned")
        .eq("is_seed", true)
        .eq("banned", false)
        .in("gender", targetGenders)
        .limit(60);
      if (error) throw error;
      return (data ?? [])
        .map(mapSpicy)
        .filter((c) => c.spicy_photos.length > 0);
    },
  });

  const open = candidates.find((c) => c.id === openId) ?? null;

  // ---------- Gates ----------
  if (entLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!isDiamond) {
    return (
      <div className="space-y-6">
        <SpicyHeader />
        <Card className="overflow-hidden rounded-3xl border-ghana-gold/40 bg-gradient-to-br from-[#2a0a0a] via-[#3a0f10] to-[#1a0506] p-8 text-center text-white shadow-xl">
          <Crown className="mx-auto h-10 w-10 text-ghana-gold" />
          <h1 className="mt-3 font-display text-3xl font-bold text-ghana-gold">Spicy Mode is Diamond-only</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/80">
            A bolder, flirtier corner of GH SUƆMƆ for adults 40+. Suggestive — not explicit. Available exclusively to Diamond subscribers.
          </p>
          <Button
            onClick={() => navigate("/app/verify")}
            className="mt-6 bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90"
            size="lg"
          >
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to Diamond
          </Button>
        </Card>
      </div>
    );
  }

  if (!ageConfirmed) {
    return (
      <div className="space-y-6">
        <SpicyHeader />
        <Card className="rounded-3xl border-ghana-gold/40 bg-gradient-to-br from-[#2a0a0a] to-[#1a0506] p-8 text-white shadow-xl">
          <Flame className="h-10 w-10 text-orange-400" />
          <h2 className="mt-3 font-display text-2xl font-bold text-ghana-gold">You are entering Spicy Mode</h2>
          <p className="mt-3 text-sm text-white/80">
            This section contains suggestive content intended for adults 40+. By continuing you confirm
            you are 40 or older and consent to this content.
          </p>
          <Button
            size="lg"
            className="mt-6 bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90"
            onClick={() => {
              try { localStorage.setItem(SPICY_AGE_CONSENT_KEY, new Date().toISOString()); } catch { /* ignore */ }
              setAgeConfirmed(true);
            }}
          >
            I am 40+ — enter Spicy Mode
          </Button>
        </Card>
      </div>
    );
  }

  // ---------- Spicy discover ----------
  async function openChatWith(otherId: string) {
    if (!user) return;
    setOpening(true);
    try {
      const { data: existing } = await supabase
        .from("matches")
        .select("id,spicy")
        .or(`and(user_a.eq.${user.id},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${user.id})`)
        .limit(1);
      let matchId = existing?.[0]?.id;
      if (matchId) {
        if (!existing?.[0]?.spicy) {
          await supabase.from("matches").update({ spicy: true }).eq("id", matchId);
        }
      } else {
        const { data: created, error } = await supabase
          .from("matches")
          .insert({ user_a: user.id, user_b: otherId, status: "active", score: 80, spicy: true })
          .select("id")
          .single();
        if (error) { toast.error(error.message); return; }
        matchId = created.id;
      }
      setOpenId(null);
      navigate(`/app/chat/${matchId}`);
    } finally {
      setOpening(false);
    }
  }

  async function submitReport() {
    if (!user || !reportFor || !reportReason) return;
    setReportSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_id: reportFor,
      reason: reportReason,
      detail: reportDetail.trim() || null,
    });
    setReportSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks for the report. Our team will review it.");
    setReportFor(null);
    setReportReason("");
    setReportDetail("");
  }

  return (
    <div className="space-y-4">
      <SpicyHeader />
      <p className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-[11px] text-orange-200">
        Suggestive content. Not explicit. Report anything that makes you uncomfortable.
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <Card className="rounded-2xl bg-[#1a0506]/60 p-6 text-center text-sm text-white/70">
          No Spicy profiles available yet. Check back soon.
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {candidates.map((c) => {
            const photo = c.spicy_photos[0];
            return (
              <div
                key={c.id}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#1a0506] shadow-[0_10px_30px_-10px_rgba(255,80,40,0.45)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(c.id)}
                  className="absolute inset-0 text-left focus:outline-none focus:ring-2 focus:ring-orange-400"
                  aria-label={`View ${c.first_name ?? "member"}'s spicy profile`}
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt={c.first_name ?? "Member"}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover object-center transition-transform group-hover:scale-105"
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#3a0f10] to-[#7a1a1a]" />
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2.5">
                    <p className="font-display text-sm font-bold leading-tight text-ghana-gold">
                      {c.first_name ?? "Member"}{c.age ? `, ${c.age}` : ""}
                    </p>
                    {c.location && (
                      <p className="truncate text-[11px] text-white/85">{c.location}</p>
                    )}
                  </div>
                  <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-orange-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    <Flame className="h-3 w-3" /> Spicy
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setReportFor(c.id); }}
                  className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur hover:bg-ghana-red/80"
                  aria-label={`Report ${c.first_name ?? "this member"}`}
                >
                  <Flag className="h-3 w-3" /> Report
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Profile detail sheet */}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent
          side="bottom"
          className="flex h-[90dvh] flex-col overflow-hidden rounded-t-3xl border-t-orange-500/30 bg-gradient-to-b from-[#1a0506] via-[#0f0303] to-[#0a0202] p-0 text-white"
        >
          {open && (
            <>
              {open.spicy_photos[0] && (
                <div className="relative h-[clamp(180px,38dvh,360px)] shrink-0">
                  <img
                    src={open.spicy_photos[0]}
                    alt={open.first_name ?? "Member"}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-orange-500/90 px-2.5 py-1 text-xs font-semibold text-white">
                    <Flame className="h-3.5 w-3.5" /> Spicy Mode
                  </span>
                </div>
              )}
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 pb-28">
                <SheetHeader className="text-left">
                  <SheetTitle className="font-display text-2xl text-ghana-gold">
                    {open.first_name ?? "Member"}{open.age ? `, ${open.age}` : ""}
                  </SheetTitle>
                  {open.location && (
                    <p className="text-sm text-white/70">{open.location}</p>
                  )}
                </SheetHeader>
                {open.spicy_bio && (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-white/85">{open.spicy_bio}</p>
                )}
                {open.spicy_prompts.length > 0 && (
                  <div className="space-y-3">
                    {open.spicy_prompts.map((p, i) => (
                      <div key={i} className="rounded-2xl border border-orange-500/20 bg-white/5 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-orange-300">{p.q}</p>
                        <p className="mt-1 text-sm text-white/90">{p.a}</p>
                      </div>
                    ))}
                  </div>
                )}
                {open.spicy_photos.slice(1).map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt={`${open.first_name ?? "Member"} ${idx + 2}`}
                    className="w-full rounded-2xl object-cover"
                  />
                ))}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => openChatWith(open.id)}
                    disabled={opening}
                    className="flex-1 bg-orange-500 text-white hover:bg-orange-600"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {opening ? "Opening…" : "Start spicy chat"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setReportFor(open.id)}
                    className="border-orange-500/40 bg-transparent text-white hover:bg-orange-500/10"
                  >
                    <ShieldAlert className="mr-2 h-4 w-4" /> Report
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Report dialog */}
      <Dialog open={!!reportFor} onOpenChange={(o) => !o && setReportFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this profile</DialogTitle>
            <DialogDescription>
              Tell us what's wrong. Our team reviews every report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            >
              <option value="">Choose a reason…</option>
              <option value="inappropriate_content">Inappropriate content</option>
              <option value="harassment">Harassment</option>
              <option value="scam">Scam / fraud</option>
              <option value="underage">Looks underage</option>
              <option value="other">Other</option>
            </select>
            <textarea
              className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Optional details"
              value={reportDetail}
              onChange={(e) => setReportDetail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportFor(null)}>Cancel</Button>
            <Button
              disabled={!reportReason || reportSubmitting}
              onClick={submitReport}
              className="bg-ghana-red text-white hover:bg-ghana-red/90"
            >
              {reportSubmitting ? "Sending…" : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SpicyHeader() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow-lg">
        <Flame className="h-5 w-5" />
      </span>
      <div>
        <h1 className="font-display text-xl font-bold text-ghana-gold">Spicy Mode</h1>
        <p className="text-[11px] text-muted-foreground">Bolder energy. Adults 40+ only.</p>
      </div>
    </div>
  );
}
