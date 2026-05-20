import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { BadgeCheck, MessageCircle, ShieldAlert } from "lucide-react";

type Prompt = { q: string; a: string };

type DetailProfile = {
  id: string;
  first_name: string | null;
  age: number | null;
  location: string | null;
  bio: string | null;
  ethnicity: string | null;
  verified: boolean;
  photos: string[];
  interests: string[];
  prompts: Prompt[];
};

function normalize(row: Record<string, unknown> | null): DetailProfile | null {
  if (!row) return null;
  return {
    id: row.id as string,
    first_name: (row.first_name as string | null) ?? null,
    age: (row.age as number | null) ?? null,
    location: (row.location as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    ethnicity: (row.ethnicity as string | null) ?? null,
    verified: !!row.verified,
    photos: Array.isArray(row.photos) ? (row.photos as string[]) : [],
    interests: Array.isArray(row.interests) ? (row.interests as string[]) : [],
    prompts: Array.isArray(row.prompts)
      ? (row.prompts as unknown[]).filter(
          (p): p is Prompt =>
            !!p && typeof p === "object" && "q" in p && "a" in p,
        )
      : [],
  };
}

export function ProfileDetailSheet({
  userId,
  open,
  onOpenChange,
  matchId,
}: {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, the Message button navigates straight into that chat. */
  matchId?: string;
}) {
  const navigate = useNavigate();
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-detail", userId],
    enabled: !!userId && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, age, location, bio, ethnicity, verified, photos, interests, prompts")
        .eq("id", userId!)
        .maybeSingle();
      return normalize(data as Record<string, unknown> | null);
    },
  });

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  useEffect(() => {
    setCurrent(0);
    api?.scrollTo(0, true);
  }, [userId, api]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl p-0">
        {isLoading || !profile ? (
          <div className="p-5 space-y-3">
            <Skeleton className="h-[40vh] w-full rounded-2xl" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <>
            {profile.photos.length > 0 && (
              <div className="relative" style={{ height: "55vh", width: "100%" }}>
                <Carousel
                  setApi={setApi}
                  opts={{ align: "start", loop: profile.photos.length > 1 }}
                  className="h-full w-full"
                >
                  <CarouselContent className="h-full">
                    {profile.photos.map((photo, idx) => (
                      <CarouselItem key={idx} className="h-full basis-full">
                        <div className="h-full w-full">
                          <img
                            src={photo}
                            alt={`${profile.first_name ?? "Member"} photo ${idx + 1}`}
                            className="h-full w-full object-contain object-center no-snap"
                            onContextMenu={(e) => e.preventDefault()}
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
                {profile.photos.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                    {profile.photos.map((_, idx) => (
                      <span
                        key={idx}
                        className={`block h-2 w-2 rounded-full transition-colors ${
                          idx === current ? "bg-white" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="p-5 space-y-4">
              <SheetHeader className="text-left">
                <SheetTitle className="font-display text-2xl text-ghana-brown flex items-center gap-2">
                  <span>
                    {profile.first_name ?? "Member"}{profile.age ? `, ${profile.age}` : ""}
                  </span>
                  {profile.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-ghana-gold/20 px-2 py-0.5 text-xs font-semibold text-ghana-brown">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      <ShieldAlert className="h-3.5 w-3.5" /> Unverified
                    </span>
                  )}
                </SheetTitle>
                {profile.location && (
                  <p className="text-sm text-muted-foreground">{profile.location}</p>
                )}
              </SheetHeader>

              {profile.bio && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About</h4>
                  <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{profile.bio}</p>
                </div>
              )}

              {profile.ethnicity && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Heritage</h4>
                  <p className="mt-1 text-sm">{profile.ethnicity}</p>
                </div>
              )}

              {profile.interests.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interests</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profile.interests.map((tag) => (
                      <Badge key={tag} variant="secondary" className="rounded-full">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.prompts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prompts</h4>
                  {profile.prompts.map((p, idx) => (
                    <div key={idx} className="rounded-xl border bg-muted/30 p-3">
                      <p className="text-xs font-medium text-muted-foreground">{p.q}</p>
                      <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{p.a}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="sticky bottom-0 -mx-5 mt-2 flex gap-3 border-t bg-background/95 px-5 py-3 backdrop-blur">
                <Button
                  onClick={() => {
                    if (matchId) {
                      onOpenChange(false);
                      navigate(`/app/chat/${matchId}`);
                    }
                  }}
                  disabled={!matchId}
                  className="flex-1 bg-green-500 text-white hover:bg-green-600"
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> Message
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default ProfileDetailSheet;