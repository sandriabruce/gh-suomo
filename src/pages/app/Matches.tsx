import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SafetyBanner } from "@/components/safety/SafetyBanner";
import { Card } from "@/components/ui/card";
import { TrialBadge } from "@/components/plan/TrialBadge";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { seedClient } from "@/integrations/supabase/seedClient";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { Logo } from "@/components/brand/Logo";
import { Compass } from "lucide-react";

export default function Matches() {
  const { limits } = useEntitlements();
  const { user } = useAuth();
  const { data: unread } = useUnreadMessages();
  const navigate = useNavigate();

  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows, error } = await seedClient
        .from("matches")
        .select("id, user_a, user_b, status, created_at")
        .or(`user_a.eq.${user!.id},user_b.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const others = (rows ?? []).map((r) => (r.user_a === user!.id ? r.user_b : r.user_a));
      if (others.length === 0) return [];
      const { data: profiles } = await seedClient
        .from("profiles")
        .select("id, first_name, age, city, country, photos")
        .in("id", others);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (rows ?? []).map((r) => {
        const otherId = r.user_a === user!.id ? r.user_b : r.user_a;
        return { ...r, other: byId.get(otherId) };
      });
    },
  });

  return (
    <div className="space-y-4">
      <SafetyBanner variant="warn" message="Romance scammers target mature singles. Never send money — even if the story sounds urgent." />
      <TrialBadge />
      <h1 className="heading-gold font-display text-2xl font-bold">Your matches</h1>

      {isLoading ? (
        <Card className="rounded-2xl p-6 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : !matches || matches.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 rounded-2xl p-8 text-center">
          <Logo size="lg" />
          <p className="text-sm text-muted-foreground">No matches yet.</p>
          <Link
            to="/app/discover"
            className="inline-flex items-center gap-2 rounded-full bg-ghana-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ghana-green/90"
          >
            <Compass className="h-4 w-4" />
            Start swiping
          </Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => {
            const other = m.other as { first_name?: string; age?: number; city?: string; country?: string; photos?: unknown } | undefined;
            const photo = Array.isArray(other?.photos) ? (other!.photos[0] as string | undefined) : undefined;
            const location = [other?.city, other?.country].filter(Boolean).join(", ");
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => navigate(`/app/chat/${m.id}`)}
                className="w-full text-left"
              >
                <Card className="flex items-center gap-3 rounded-2xl p-3 hover:bg-muted/40 transition">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-muted shrink-0">
                    {photo ? <img src={photo} alt={other?.first_name ?? "Match"} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="name-gold truncate font-display text-base font-semibold">
                      {other?.first_name ?? "Match"}{other?.age ? `, ${other.age}` : ""}
                    </p>
                    {location && <p className="truncate text-xs text-muted-foreground">{location}</p>}
                  </div>
                  {unread?.perMatch?.[m.id] ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ghana-red px-1.5 text-[11px] font-bold text-white">
                      {unread.perMatch[m.id] > 9 ? "9+" : unread.perMatch[m.id]}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground capitalize">{m.status}</span>
                  )}
                </Card>
              </button>
            );
          })}
        </div>
      )}

      {!limits.canChat && (
        <p className="text-xs text-muted-foreground">
          Heads up: messaging your matches requires the Premium plan.
        </p>
      )}
    </div>
  );
}