import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ShieldCheck, Camera, IdCard, Loader2 } from "lucide-react";

type Status = "unverified" | "pending" | "approved" | "rejected";

type ProfileBits = {
  age_verification_status: Status;
  photo_verification_status: Status;
  age_verified: boolean;
  photo_verified: boolean;
  age_verification_notes: string | null;
  photo_verification_notes: string | null;
};

const ID_TYPES = [
  { value: "ghana_card", label: "Ghana Card" },
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's licence" },
  { value: "voter_id", label: "Voter ID" },
] as const;

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; className: string }> = {
    unverified: { label: "Not verified", className: "bg-muted text-muted-foreground" },
    pending:    { label: "In review",     className: "bg-ghana-gold/20 text-ghana-brown" },
    approved:   { label: "Verified",      className: "bg-ghana-green text-white" },
    rejected:   { label: "Rejected",      className: "bg-destructive/15 text-destructive" },
  };
  const v = map[status];
  return <Badge className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${v.className}`}>{v.label}</Badge>;
}

export function IdentityVerificationCard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileBits | null>(null);
  const [idType, setIdType] = useState<typeof ID_TYPES[number]["value"]>("ghana_card");
  const [busy, setBusy] = useState<"age" | "photo" | null>(null);
  const idInput = useRef<HTMLInputElement | null>(null);
  const selfieInput = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("age_verification_status, photo_verification_status, age_verified, photo_verified, age_verification_notes, photo_verification_notes")
      .eq("id", user.id)
      .maybeSingle();
    if (data) setProfile(data as ProfileBits);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  async function uploadAndVerify(kind: "age" | "photo", file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8 MB.");
      return;
    }
    setBusy(kind);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("verifications")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const body = kind === "age"
        ? { kind, id_type: idType, id_document_path: path }
        : { kind, selfie_path: path };

      const { data, error } = await supabase.functions.invoke("verify-identity", { body });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const status = (data as any)?.status as Status;
      const reason = (data as any)?.reason as string | undefined;
      if (status === "approved") toast.success(reason ?? (kind === "age" ? "Age verified" : "Photo verified"));
      else toast.error(reason ?? "Verification did not pass — please try again with a clearer photo.");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Verification failed");
    } finally {
      setBusy(null);
      if (idInput.current) idInput.current.value = "";
      if (selfieInput.current) selfieInput.current.value = "";
    }
  }

  const ageStatus = profile?.age_verification_status ?? "unverified";
  const photoStatus = profile?.photo_verification_status ?? "unverified";

  return (
    <Card className="rounded-2xl border-2 border-ghana-gold/40 p-4 space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-ghana-green" />
        <h2 className="font-display text-lg font-bold text-ghana-brown">Identity verification</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Verify your age and photo to earn a trust badge and reassure matches you're the real you. Documents are encrypted, only ever used for verification, and never shown on your profile.
      </p>

      {/* Age verification */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IdCard className="h-4 w-4 text-ghana-brown" />
            <span className="font-medium text-ghana-brown">Age verification</span>
          </div>
          <StatusBadge status={ageStatus} />
        </div>
        {ageStatus === "approved" ? (
          <p className="text-xs text-ghana-green">{profile?.age_verification_notes ?? "Your age has been confirmed."}</p>
        ) : (
          <div className="space-y-2">
            {ageStatus === "rejected" && profile?.age_verification_notes && (
              <p className="text-xs text-destructive">{profile.age_verification_notes}</p>
            )}
            <div className="space-y-1">
              <Label className="text-xs">ID type</Label>
              <Select value={idType} onValueChange={(v) => setIdType(v as typeof idType)}>
                <SelectTrigger className="h-10 rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ID_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <input
              ref={idInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAndVerify("age", f);
              }}
            />
            <Button
              type="button"
              disabled={busy !== null}
              onClick={() => idInput.current?.click()}
              className="w-full bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90 rounded-full"
            >
              {busy === "age" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reviewing…</> : "Upload ID & verify"}
            </Button>
            <p className="text-[11px] text-muted-foreground">Take a clear, well-lit photo of your ID. All four corners must be visible.</p>
          </div>
        )}
      </div>

      <div className="h-px bg-ghana-gold/30" />

      {/* Photo verification */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-ghana-brown" />
            <span className="font-medium text-ghana-brown">Photo verification</span>
          </div>
          <StatusBadge status={photoStatus} />
        </div>
        {photoStatus === "approved" ? (
          <p className="text-xs text-ghana-green">{profile?.photo_verification_notes ?? "Your photos match your selfie."}</p>
        ) : (
          <div className="space-y-2">
            {photoStatus === "rejected" && profile?.photo_verification_notes && (
              <p className="text-xs text-destructive">{profile.photo_verification_notes}</p>
            )}
            <input
              ref={selfieInput}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAndVerify("photo", f);
              }}
            />
            <Button
              type="button"
              disabled={busy !== null}
              onClick={() => selfieInput.current?.click()}
              className="w-full bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90 rounded-full"
            >
              {busy === "photo" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Matching…</> : "Take selfie & verify"}
            </Button>
            <p className="text-[11px] text-muted-foreground">Front-facing, neutral expression, good lighting. We compare it to your profile photos.</p>
          </div>
        )}
      </div>
    </Card>
  );
}