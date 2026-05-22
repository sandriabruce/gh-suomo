import { SafetyBanner } from "@/components/safety/SafetyBanner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, MessageCircle, BadgeCheck, ShieldAlert, Flag, Flame } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { seedClient } from "@/integrations/supabase/seedClient";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { CoupleCard, SAMPLE_COUPLES } from "@/components/brand/CoupleCard";
import { useEntitlements } from "@/hooks/useEntitlements";
import { TrialBadge } from "@/components/plan/TrialBadge";
import { PlanLockOverlay } from "@/components/plan/PlanLockOverlay";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { setSpicyModeActive, useIsSpicyModeActive } from "@/hooks/useSpicyTheme";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Candidate = {
  id: string;
  first_name: string | null;
  age: number | null;
  location: string | null;
  bio: string | null;
  photos: string[];
  interests: string[];
  prompts: { q: string; a: string }[];
  ethnicity: string | null;
  verified: boolean;
};

const PAGE_SIZE = 20;

function mapRow(row: Record<string, unknown>): Candidate {
  return {
    id: row.id as string,
    first_name: (row.first_name as string | null) ?? null,
    age: (row.age as number | null) ?? null,
    location: (row.location as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    photos: Array.isArray(row.photos) ? (row.photos as string[]) : [],
    interests: Array.isArray(row.interests) ? (row.interests as string[]) : [],
    prompts: Array.isArray(row.prompts)
      ? ((row.prompts as unknown[]).filter(
          (p): p is { q: string; a: string } =>
            !!p && typeof p === "object" && "q" in p && "a" in p,
        ))
      : [],
    ethnicity: (row.ethnicity as string | null) ?? null,
    verified: !!row.verified,
  };
}

function cacheKey(genders: string[]) {
  return `discover-cache:${genders.slice().sort().join(",")}`;
}

export default function Discover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { limits, plan, trial } = useEntitlements();
  const [, setI] = useState(0);
  const [likes, setLikes] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [blockedIds, setBlockedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("blocked-user-ids");
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>("");
  const [reportDetail, setReportDetail] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [confirmBlockFor, setConfirmBlockFor] = useState<string | null>(null);
  const [galleryApi, setGalleryApi] = useState<CarouselApi | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Track active slide to render dot indicators.
  useEffect(() => {
    if (!galleryApi) return;
    const onSelect = () => setGalleryIndex(galleryApi.selectedScrollSnap());
    onSelect();
    galleryApi.on("select", onSelect);
    galleryApi.on("reInit", onSelect);
    return () => { galleryApi.off("select", onSelect); };
  }, [galleryApi]);

  // Reset to first photo whenever a new profile opens.
  useEffect(() => {
    setGalleryIndex(0);
    galleryApi?.scrollTo(0, true);
  }, [openId, galleryApi]);
  const mode = profile?.mode ?? "romance";
  const accent = mode === "spark" ? "bg-gradient-spark" : "bg-gradient-romance";
  const limit = limits.weeklyMatchLimit;
  const limitReached = limit !== null && likes >= limit;

  // Map viewer's interested_in to which seed gender(s) to show.
  const targetGenders = useMemo<string[]>(() => {
    const want = profile?.interested_in;
    if (want === "Men") return ["Man"];
    if (want === "Women") return ["Woman"];
    if (want === "Everyone") return ["Man", "Woman"];
    return ["Man", "Woman"];
  }, [profile?.interested_in]);

  // Read cached first page synchronously so the grid renders instantly
  // (and works briefly offline) before the network responds.
  const cached = useMemo<Candidate[] | null>(() => {
    try {
      const raw = localStorage.getItem(cacheKey(targetGenders));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Candidate[];
      return Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
  }, [targetGenders]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error: fetchError,
  } = useInfiniteQuery({
    queryKey: ["discover-feed", targetGenders],
    initialPageParam: 0,
    getNextPageParam: (last: Candidate[], all) =>
      last.length < PAGE_SIZE ? undefined : all.length,
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await seedClient
        .from("profiles")
        .select("id, first_name, age, location, bio, photos, verified")
        .eq("is_seed", true)
        .in("gender", targetGenders)
        .order("id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      const mapped = (data ?? []).map(mapRow);
      if (pageParam === 0) {
        try { localStorage.setItem(cacheKey(targetGenders), JSON.stringify(mapped)); } catch { /* ignore */ }
      }
      return mapped;
    },
    initialData: cached
      ? { pages: [cached], pageParams: [0] }
      : undefined,
  });

  const candidates = useMemo(() => {
    const all = (data?.pages ?? []).flat();
    // De-dupe in case pages overlap and drop blocked users.
    const seen = new Set<string>();
    return all.filter((c) => {
      if (blockedIds.has(c.id) || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [data, blockedIds]);

  const loading = isLoading && candidates.length === 0;

  // Infinite-scroll sentinel — fetch the next page when it comes into view.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, candidates.length]);

  const openPerson = candidates.find((c) => c.id === openId) ?? null;

  // Fetch the existing match (if any) with the open profile to surface status.
  const { data: openMatch } = useQuery({
    queryKey: ["match-with", user?.id, openId],
    enabled: !!user && !!openId,
    queryFn: async () => {
      const { data } = await seedClient
        .from("matches")
        .select("id,status,user_a,user_b")
        .or(`and(user_a.eq.${user!.id},user_b.eq.${openId!}),and(user_a.eq.${openId!},user_b.eq.${user!.id})`)
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  });

  // Derive a richer status so the sheet shows what the other side has done.
  // - matched:       both sides connected (match is active)
  // - liked_you:     they liked you first, waiting on your response
  // - liked_by_you:  you liked them, waiting on a reply
  // - none:          no interaction yet
  const matchStatus: "matched" | "liked_you" | "liked_by_you" | "none" = openPerson
    ? openMatch?.status === "active"
      ? "matched"
      : openMatch && user
        ? openMatch.user_a === user.id
          ? "liked_by_you"
          : "liked_you"
        : likedIds.has(openPerson.id)
          ? "liked_by_you"
          : "none"
    : "none";

  const handleLikeFromSheet = (id: string) => {
    if (limitReached) return;
    setLikedIds((s) => new Set(s).add(id));
    setLikes((n) => n + 1);
    setI((x) => x + 1);
  };

  async function openChatWith(otherId: string) {
    if (!user) return;
    setOpeningChat(true);
    try {
      // Look for an existing match between the two users.
      const { data: existing } = await seedClient
        .from("matches")
        .select("id,user_a,user_b")
        .or(`and(user_a.eq.${user.id},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${user.id})`)
        .limit(1);
      let matchId = existing?.[0]?.id;
      if (!matchId) {
        const { data: created, error } = await seedClient
          .from("matches")
          .insert({ user_a: user.id, user_b: otherId, status: "active", score: 80 })
          .select("id")
          .single();
        if (error) { toast.error(error.message); return; }
        matchId = created.id;
      }
      setOpenId(null);
      navigate(`/app/chat/${matchId}`);
    } finally {
      setOpeningChat(false);
    }
  }

  function persistBlocked(next: Set<string>) {
    setBlockedIds(next);
    try { localStorage.setItem("blocked-user-ids", JSON.stringify(Array.from(next))); } catch { /* ignore */ }
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

  function confirmBlock() {
    if (!confirmBlockFor) return;
    const next = new Set(blockedIds);
    next.add(confirmBlockFor);
    persistBlocked(next);
    toast.success("User blocked. You won't see them again.");
    setConfirmBlockFor(null);
    setOpenId(null);
    setI((x) => x + 1);
  }

  const isSpicy = useIsSpicyModeActive();
  const [showSpicyWelcome, setShowSpicyWelcome] = useState(false);

  function handleSpicyToggle(active: boolean) {
    setSpicyModeActive(active);
    if (active) {
      setShowSpicyWelcome(true);
      setTimeout(() => setShowSpicyWelcome(false), 4000);
    }
  }

  return (
    <div className="space-y-4">
      <SafetyBanner message="Tip: Real connections take time. Never send money to anyone you meet here." />
      <TrialBadge />

      {/* User profile card at top */}
      {profile && (
        <div className="flex items-center gap-3 rounded-2xl border border-ghana-gold/30 bg-card p-3 shadow-sm">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-ghana-gold">
            {profile.photos?.[0] ? (
              <img src={profile.photos[0]} alt={profile.first_name ?? "You"} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-ghana-gold/20 text-ghana-gold font-bold text-lg">
                {(profile.first_name ?? "?")[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{profile.first_name ?? "Your profile"}{profile.age ? `, ${profile.age}` : ""}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.location ?? "Add your location"}</p>
          </div>
          <button
            onClick={() => navigate("/app/profile")}
            className="text-xs text-ghana-gold border border-ghana-gold/40 rounded-full px-3 py-1 hover:bg-ghana-gold/10 transition"
          >
            Edit
          </button>
        </div>
      )}

      {/* Sweet / Spicy toggle — Diamond only */}
      {plan === "diamond" && (
        <div className="relative">
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-ghana-gold/20 bg-card p-2">
            <button
              onClick={() => handleSpicyToggle(false)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition ${!isSpicy ? "bg-ghana-gold text-ghana-brown shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Heart className="h-4 w-4" /> Sweet
            </button>
            <button
              onClick={() => handleSpicyToggle(true)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition ${isSpicy ? "bg-gradient-to-r from-red-700 to-red-600 text-amber-300 shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Flame className="h-4 w-4" /> Spicy
            </button>
          </div>

          {/* Welcome to the spicy side banner */}
          {showSpicyWelcome && (
            <div
              className="absolute left-0 right-0 z-50 mt-2 animate-in fade-in slide-in-from-top-2 duration-500"
              style={{ animation: "fadeInDown 0.5s ease" }}
            >
              <div className="rounded-2xl border border-amber-400/40 p-4 text-center shadow-xl"
                style={{ background: "linear-gradient(135deg, #6B0000, #8B0000)" }}>
                <div className="text-2xl mb-1">🔥</div>
                <p className="font-bold text-amber-300 text-base">Welcome to the Spicy Side</p>
                <p className="text-amber-100/80 text-xs mt-1">Bolder energy. Adults 40+ only. Suggestive — not explicit.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {limit !== null && (
        <p className="text-xs text-muted-foreground">
          {plan === "explorer" || plan === "verified"
            ? `${Math.max(0, limit - likes)} of ${limit} weekly matches remaining on the ${plan} plan.`
            : null}
        </p>
      )}
      {limitReached ? (
        <PlanLockOverlay
          title="Weekly match limit reached"
          message={`The ${plan === "verified" ? "Verified" : "Explorer"} plan includes ${limit} matches per week. Upgrade to Premium for unlimited matches.`}
          cta="Upgrade to Premium"
        />
      ) : (
      <>
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 9 }).map((_, idx) => (
            <Skeleton key={idx} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <Card className="rounded-2xl p-6 text-center text-sm text-muted-foreground">
          {fetchError
            ? "We couldn't load profiles. Check your connection and try again."
            : "No profiles to show yet. Check back soon."}
        </Card>
      ) : (
        <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {candidates.map((c) => {
            const photo = c.photos?.[0];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setOpenId(c.id)}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted text-left shadow-warm focus:outline-none focus:ring-2 focus:ring-ghana-gold"
                aria-label={`View ${c.first_name ?? "member"}'s profile`}
              >
                {photo ? (
                  <img
                    src={photo}
                    alt={c.first_name ?? "Member"}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover object-center no-snap transition-transform group-hover:scale-105"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : (
                  <div className={`absolute inset-0 ${accent}`} />
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5">
                  <p className="name-gold font-display text-sm font-bold leading-tight">
                    {c.first_name ?? "Member"}{c.age ? `, ${c.age}` : ""}
                  </p>
                  {c.location && (
                    <p className="truncate text-[11px] text-white/90">{c.location}</p>
                  )}
                </div>
                {c.verified && (
                  <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-ghana-gold/90 px-1.5 py-0.5 text-[10px] font-semibold text-ghana-brown">
                    <BadgeCheck className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
          {isFetchingNextPage &&
            Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={`s-${idx}`} className="aspect-[3/4] rounded-2xl" />
            ))}
        </div>
        {hasNextPage && (
          <div ref={sentinelRef} className="h-10 w-full" aria-hidden />
        )}
        </>
      )}
      </>
      )}
      <section>
        <h3 className="font-display text-xl font-bold text-ghana-gold">Real love stories</h3>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {SAMPLE_COUPLES.map((c) => <CoupleCard key={c.id} couple={c} />)}
        </div>
      </section>
      <InstallBanner />

      <Sheet open={!!openPerson} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="bottom" className="flex h-[92dvh] max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl p-0">
          {openPerson && (
            <>
              {openPerson.photos.length > 0 && (
                <div className="relative h-[clamp(150px,32dvh,300px)] shrink-0 sm:h-[clamp(180px,34dvh,340px)]">
                  <Carousel
                    setApi={setGalleryApi}
                    opts={{ align: "start", loop: openPerson.photos.length > 1 }}
                    className="h-full w-full [&>div]:h-full"
                  >
                    <CarouselContent className="h-full">
                      {openPerson.photos.map((photo, idx) => (
                        <CarouselItem key={idx} className="h-full basis-full">
                          <div className="h-full w-full">
                            <img
                              src={photo}
                              alt={`${openPerson.first_name ?? "Member"} photo ${idx + 1}`}
                              className="h-full w-full object-contain object-center no-snap"
                              onContextMenu={(e) => e.preventDefault()}
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {openPerson.photos.length > 1 && (
                      <>
                        <CarouselPrevious className="left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-ghana-brown border-0" />
                        <CarouselNext className="right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-ghana-brown border-0" />
                      </>
                    )}
                  </Carousel>
                  {openPerson.photos.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                      {openPerson.photos.map((_, idx) => (
                        <span
                          key={idx}
                          className={`block h-2 w-2 rounded-full transition-colors ${
                            idx === galleryIndex ? "bg-white" : "bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 pb-24 [touch-action:pan-y] [-webkit-overflow-scrolling:touch]">
                <SheetHeader className="text-left">
                  <SheetTitle className="name-gold font-display text-2xl flex items-center gap-2">
                    <span>
                      {openPerson.first_name ?? "Member"}{openPerson.age ? `, ${openPerson.age}` : ""}
                    </span>
                    {openPerson.verified ? (
                      <span
                        title="Verified member"
                        className="inline-flex items-center gap-1 rounded-full bg-ghana-gold/20 px-2 py-0.5 text-xs font-semibold text-ghana-brown"
                      >
                        <BadgeCheck className="h-3.5 w-3.5" /> Verified
                      </span>
                    ) : (
                      <span
                        title="This member hasn't completed photo verification yet"
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" /> Unverified
                      </span>
                    )}
                  </SheetTitle>
                  {openPerson.location && (
                    <p className="text-sm text-muted-foreground">{openPerson.location}</p>
                  )}
                  <div className="pt-1">
                    {matchStatus === "matched" && (
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                        It's a match — you both liked each other
                      </Badge>
                    )}
                    {matchStatus === "liked_you" && (
                      <Badge className="bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
                        {openPerson.first_name ?? "They"} liked you — like back to match
                      </Badge>
                    )}
                    {matchStatus === "liked_by_you" && (
                      <Badge variant="secondary" className="rounded-full">
                        You liked them — waiting on a reply
                      </Badge>
                    )}
                  </div>
                </SheetHeader>

                {openPerson.bio && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About</h4>
                    <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{openPerson.bio}</p>
                  </div>
                )}

                {openPerson.ethnicity && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Heritage</h4>
                    <p className="mt-1 text-sm">{openPerson.ethnicity}</p>
                  </div>
                )}

                {openPerson.interests.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interests</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {openPerson.interests.map((tag) => (
                        <Badge key={tag} variant="secondary" className="rounded-full">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {openPerson.prompts.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prompts</h4>
                    {openPerson.prompts.map((p, idx) => (
                      <div key={idx} className="rounded-xl border bg-muted/30 p-3">
                        <p className="text-xs font-medium text-muted-foreground">{p.q}</p>
                        <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{p.a}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setReportFor(openPerson.id)}
                  >
                    <Flag className="mr-1.5 h-4 w-4" /> Report
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:bg-muted"
                    onClick={() => setConfirmBlockFor(openPerson.id)}
                  >
                    <Ban className="mr-1.5 h-4 w-4" /> Block
                  </Button>
                </div>

                <div className="sticky bottom-0 -mx-5 mt-2 flex gap-3 border-t bg-background/95 px-5 py-3 backdrop-blur">
                  <Button
                    onClick={() => { handleLikeFromSheet(openPerson.id); setOpenId(null); }}
                    className="flex-1 bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90"
                    disabled={limitReached || matchStatus === "matched" || matchStatus === "liked_by_you"}
                  >
                    <Heart className="mr-2 h-4 w-4 fill-current" />
                    {matchStatus === "matched"
                      ? "Matched"
                      : matchStatus === "liked_by_you"
                        ? "Liked"
                        : matchStatus === "liked_you"
                          ? "Like back"
                          : "Like"}
                  </Button>
                  <Button
                    onClick={() => openChatWith(openPerson.id)}
                    disabled={openingChat}
                    className="flex-1 bg-green-500 text-white hover:bg-green-600"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {matchStatus === "matched" ? "Open chat" : "Message"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!reportFor} onOpenChange={(o) => { if (!o) { setReportFor(null); setReportReason(""); setReportDetail(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report this profile</DialogTitle>
            <DialogDescription>
              Help us keep GH SUƆMƆ safe. Reports are confidential and reviewed by our team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {[
              "Scam or asking for money",
              "Fake or stolen photos",
              "Inappropriate or offensive",
              "Underage",
              "Harassment",
              "Other",
            ].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReportReason(r)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  reportReason === r
                    ? "border-ghana-gold bg-ghana-gold/10 text-ghana-brown"
                    : "border-border hover:bg-muted"
                }`}
              >
                {r}
              </button>
            ))}
            <textarea
              value={reportDetail}
              onChange={(e) => setReportDetail(e.target.value)}
              maxLength={500}
              placeholder="Add any details (optional)"
              className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportFor(null)}>Cancel</Button>
            <Button
              onClick={submitReport}
              disabled={!reportReason || reportSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {reportSubmitting ? "Sending…" : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmBlockFor} onOpenChange={(o) => !o && setConfirmBlockFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block this user?</AlertDialogTitle>
            <AlertDialogDescription>
              You won't see them in Discover again, and they won't appear in your matches. You can manage blocked users later in Safety settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}