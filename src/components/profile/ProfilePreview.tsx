import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ShieldCheck } from "lucide-react";

/**
 * Allowed fields from the `profiles_public` view. Any other key — especially
 * sensitive ones like email, phone, address — is redacted before rendering.
 */
const ALLOWED_FIELDS = [
  "id", "first_name", "age", "gender", "interested_in", "location",
  "ethnicity", "religion", "values_text", "mode", "plan", "verified",
  "bio", "prompts", "interests", "photos",
] as const;

const SENSITIVE_KEYS = [
  "email", "phone", "phone_number", "address", "password", "password_hash",
  "api_key", "token", "secret", "ssn", "dob", "date_of_birth",
];

type PublicProfile = {
  id: string | null;
  first_name: string | null;
  age: number | null;
  gender: string | null;
  interested_in: string | null;
  location: string | null;
  ethnicity: string | null;
  religion: string | null;
  values_text: string | null;
  mode: string | null;
  plan: string | null;
  verified: boolean | null;
  bio: string | null;
  prompts: unknown;
  interests: unknown;
  photos: unknown;
};

function sanitize(raw: Record<string, unknown> | null): PublicProfile | null {
  if (!raw) return null;
  const safe: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lower.includes(s))) continue;
    safe[key] = raw[key] ?? null;
  }
  return safe as PublicProfile;
}

export function ProfilePreview({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles_public")
        .select(ALLOWED_FIELDS.join(","))
        .eq("id", userId)
        .maybeSingle();
      if (!cancelled) {
        setProfile(sanitize(data as unknown as Record<string, unknown> | null));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <Card className="rounded-2xl p-4 space-y-3">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="rounded-2xl p-4 text-sm text-muted-foreground">
        Profile not available.
      </Card>
    );
  }

  const photos = Array.isArray(profile.photos) ? (profile.photos as string[]) : [];
  const interests = Array.isArray(profile.interests) ? (profile.interests as string[]) : [];

  return (
    <Card className="rounded-2xl overflow-hidden">
      {photos.length > 0 && (
        <div className="relative">
          <Carousel setApi={setApi} opts={{ loop: photos.length > 1 }}>
            <CarouselContent className="ml-0">
              {photos.map((src, idx) => (
                <CarouselItem key={`${src}-${idx}`} className="pl-0">
                  <div className="aspect-[4/3] w-full bg-muted">
                    <img
                      src={src}
                      alt={`${profile.first_name ?? "Member"} photo ${idx + 1}`}
                      className="h-full w-full object-cover object-center no-snap"
                      onContextMenu={(e) => e.preventDefault()}
                      draggable={false}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          {photos.length > 1 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {photos.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === current
                      ? "w-4 bg-white"
                      : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-bold text-ghana-brown">
            {profile.first_name ?? "Member"}{profile.age ? `, ${profile.age}` : ""}
          </h3>
          {profile.verified && (
            <Badge className="bg-ghana-green text-white gap-1">
              <ShieldCheck className="h-3 w-3" /> Verified
            </Badge>
          )}
        </div>
        {profile.location && (
          <p className="text-xs uppercase tracking-wider text-ghana-green">{profile.location}</p>
        )}
        {profile.bio && <p className="text-sm text-foreground/80">{profile.bio}</p>}
        {profile.values_text && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Values: </span>{profile.values_text}
          </p>
        )}
        {(profile.religion || profile.ethnicity) && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {profile.religion && <span>{profile.religion}</span>}
            {profile.ethnicity && <span>· {profile.ethnicity}</span>}
          </div>
        )}
        {interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {interests.slice(0, 8).map((i) => (
              <Badge key={i} variant="outline" className="rounded-full">{i}</Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

export default ProfilePreview;