import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { seedClient } from "@/integrations/supabase/seedClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Lock, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";

type LikeRow = {
  id: string;
  liker_id: string;
  prompt_q: string | null;
  prompt_a: string | null;
  photo_url: string | null;
  created_at: string;
  liker: {
    first_name: string | null;
    age: number | null;
    photos: string[];
    location: string | null;
  } | null;
};

export default function Likes() {
  const { user } = useAuth();
  const { plan, trial } = useEntitlements();
  const navigate = useNavigate();
  const [connecting, setConnecting] = useState<string | null>(null);

  const isPremium = plan === "premium" || plan === "diamond" || trial.active;

  const { data: likes = [], isLoading } = useQuery<LikeRow[]>({
    queryKey: ["who-liked-me", user?.id],
    enabled: !!user && isPremium,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_likes")
        .select("id, liker_id, prompt_q, prompt_a, photo_url, created_at")
        .eq("liked_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const likerIds = data.map(r => r.liker_id);
      const { data: profiles } = await seedClient
        .from("profiles")
        .select("id, first_name, age, photos, location")
        .in("id", likerIds);

      const byId = new Map((profiles ?? []).map(p => [p.id, p]));
      return data.map(r => ({
        ...r,
        liker: (byId.get(r.liker_id) as LikeRow["liker"]) ?? null,
      }));
    },
  });

  async function matchWith(likerId: string) {
    if (!user) return;
    setConnecting(likerId);
    try {
      const { data: existing } = await seedClient
        .from("matches")
        .select("id")
        .or(`and(user_a.eq.${user.id},user_b.eq.${likerId}),and(user_a.eq.${likerId},user_b.eq.${user.id})`)
        .limit(1);

      let matchId = existing?.[0]?.id;
      if (!matchId) {
        const { data: created, error } = await seedClient
          .from("matches")
          .insert({ user_a: user.id, user_b: likerId, status: "active", score: 90 })
          .select("id")
          .single();
        if (error) { toast.error(error.message); return; }
        matchId = created.id;
      }
      navigate(`/app/chat/${matchId}`);
    } finally {
      setConnecting(null);
    }
  }

  if (!isPremium) {
    return (
      <div className="space-y-4">
        <h1 className="heading-gold font-display text-2xl font-bold">Who liked you</h1>
        <Card className="rounded-2xl p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ghana-gold/20">
              <Lock className="h-8 w-8 text-ghana-gold" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">See who's already interested</p>
            <p className="mt-1 text-sm text-muted-foreground">
              People who liked your prompts or photos show up here. Upgrade to Premium or Diamond to see them.
            </p>
          </div>
          <Button onClick={() => navigate("/app/verify")} className="bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
            Upgrade to see them
          </Button>
        </Card>

        {/* Blurred tease — show count but not who */}
        <BlurredTease userId={user?.id} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="heading-gold font-display text-2xl font-bold">Who liked you</h1>
        {likes.length > 0 && (
          <Badge className="bg-ghana-gold text-ghana-brown">{likes.length} {likes.length === 1 ? "like" : "likes"}</Badge>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : likes.length === 0 ? (
        <Card className="rounded-2xl p-6 text-center">
          <Heart className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No likes yet. Your profile will get more attention as more people join.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {likes.map(like => {
            const liker = like.liker;
            const photo = Array.isArray(liker?.photos) ? liker!.photos[0] : undefined;
            const name = liker?.first_name ?? "Someone";
            return (
              <Card key={like.id} className="rounded-2xl p-4 flex items-start gap-3">
                <Avatar className="h-14 w-14 shrink-0">
                  {photo && <AvatarImage src={photo} alt={name} className="object-cover" />}
                  <AvatarFallback>{name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm name-gold">
                      {name}{liker?.age ? `, ${liker.age}` : ""}
                    </p>
                    <Heart className="h-3.5 w-3.5 text-ghana-red fill-current shrink-0" />
                  </div>
                  {liker?.location && (
                    <p className="text-xs text-muted-foreground">{liker.location}</p>
                  )}
                  {like.prompt_q && (
                    <div className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                      <p className="text-muted-foreground font-medium">{like.prompt_q}</p>
                      <p className="mt-0.5 text-foreground">{like.prompt_a}</p>
                    </div>
                  )}
                  {like.photo_url && !like.prompt_q && (
                    <p className="mt-1 text-xs text-muted-foreground">Liked your photo</p>
                  )}
                  <p className="mt-1.5 text-[10px] text-muted-foreground/60">
                    {new Date(like.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => matchWith(like.liker_id)}
                  disabled={connecting === like.liker_id}
                  className="shrink-0 bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90"
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1" />
                  Chat
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BlurredTease({ userId }: { userId?: string }) {
  const { data } = useQuery({
    queryKey: ["likes-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase
        .from("profile_likes")
        .select("id", { count: "exact", head: true })
        .eq("liked_id", userId!);
      return count ?? 0;
    },
  });

  if (!data) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="blur-sm pointer-events-none">
        {Array.from({ length: Math.min(data, 3) }).map((_, i) => (
          <Card key={i} className="rounded-2xl p-4 flex items-center gap-3 mb-2">
            <div className="h-14 w-14 rounded-full bg-ghana-gold/20 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-24 rounded bg-muted" />
              <div className="h-3 w-16 rounded bg-muted" />
            </div>
          </Card>
        ))}
      </div>
      {data > 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl bg-background/90 border border-ghana-gold/30 px-6 py-4 text-center shadow-lg">
            <p className="font-semibold text-sm">
              {data} {data === 1 ? "person" : "people"} liked your profile
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Upgrade to see who</p>
          </div>
        </div>
      )}
    </div>
  );
}
