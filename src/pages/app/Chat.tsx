import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SafetyBanner } from "@/components/safety/SafetyBanner";
import { useEntitlements } from "@/hooks/useEntitlements";
import { TrialBadge } from "@/components/plan/TrialBadge";
import { supabase } from "@/integrations/supabase/client";
import { seedClient } from "@/integrations/supabase/seedClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ArrowLeft, ImagePlus, Loader2, Mic, MicOff, Play, Pause, Square } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { markMatchRead, useUnreadMessages } from "@/hooks/useUnreadMessages";
import { Card } from "@/components/ui/card";
import { ProfileDetailSheet } from "@/components/profile/ProfileDetailSheet";
import { useSpicyTheme } from "@/hooks/useSpicyTheme";

const IMAGE_MSG_PREFIX = "[image]";
const VOICE_MSG_PREFIX = "[voice]";
const VOICE_PATH_PREFIX = "[voicepath]"; // new: stores storage path, renders via signed URL
function isImageMessage(content: string) { return content.startsWith(IMAGE_MSG_PREFIX); }
function imageUrlFrom(content: string) { return content.slice(IMAGE_MSG_PREFIX.length).trim(); }
function isVoiceMessage(content: string) {
  return content.startsWith(VOICE_MSG_PREFIX) || content.startsWith(VOICE_PATH_PREFIX);
}
function voicePathFrom(content: string) {
  if (content.startsWith(VOICE_PATH_PREFIX)) return content.slice(VOICE_PATH_PREFIX.length).trim();
  return null; // legacy public URL message
}
function voiceUrlFrom(content: string) {
  if (content.startsWith(VOICE_MSG_PREFIX)) return content.slice(VOICE_MSG_PREFIX.length).trim();
  return null;
}

// VoicePlayer — handles both legacy public URLs ([voice]url) and new signed paths ([voicepath]path)
function VoicePlayer({ content, mine }: { content: string; mine: boolean }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const path = voicePathFrom(content);
    if (path) {
      // Generate a signed URL (1 hour expiry) for private playback
      supabase.storage.from("profile-photos")
        .createSignedUrl(path, 3600)
        .then(({ data }) => { if (data?.signedUrl) setSrc(data.signedUrl); })
        .catch(() => {});
    } else {
      // Legacy: already a public URL
      setSrc(voiceUrlFrom(content));
    }
  }, [content]);

  return (
    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? "bg-ghana-gold" : "bg-muted"}`}>
      {src
        ? <audio src={src} controls className="h-8 max-w-full" />
        : <span className="text-xs text-muted-foreground">Loading voice note…</span>
      }
    </div>
  );
}

type ChatMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

export default function Chat() {
  const { trial, plan } = useEntitlements();
  const { id: matchId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [seedTyping, setSeedTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const seedReplyTimerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const draftKey = matchId && user ? `chat-draft:${user.id}:${matchId}` : null;

  // Restore any saved draft (e.g. after an upgrade redirect).
  useEffect(() => {
    if (!draftKey) return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) setDraft(saved);
    } catch { /* ignore */ }
  }, [draftKey]);

  const { data: messages = [], isLoading: messagesLoading, error: messagesError } = useQuery<ChatMessage[]>({
    queryKey: ["messages", matchId],
    enabled: !!matchId && !!user,
    queryFn: async () => {
      const { data, error } = await seedClient
        .from("messages")
        .select("id,sender_id,content,created_at,read_at")
        .eq("match_id", matchId!)
        .order("created_at", { ascending: true });
      if (error) {
        // Fallback for deployments where the read_at column hasn't propagated
        // to PostgREST's schema cache yet (returns 400 / PGRST204).
        const missingReadAt =
          /read_at/i.test(error.message ?? "") ||
          error.code === "PGRST204" ||
          error.code === "42703";
        if (missingReadAt) {
          console.warn("[messages] read_at missing, retrying without it", error);
          const retry = await seedClient
            .from("messages")
            .select("id,sender_id,content,created_at")
            .eq("match_id", matchId!)
            .order("created_at", { ascending: true });
          if (retry.error) throw retry.error;
          return (retry.data ?? []).map((m) => ({ ...m, read_at: null }));
        }
        throw error;
      }
      return data ?? [];
    },
  });

  const { data: matchRow, isLoading: matchLoading } = useQuery({
    queryKey: ["match", matchId],
    enabled: !!matchId && !!user,
    queryFn: async () => {
      const { data, error } = await seedClient
        .from("matches")
        .select("id,user_a,user_b,status")
        .eq("id", matchId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const otherUserId = matchRow && user
    ? matchRow.user_a === user.id ? matchRow.user_b : matchRow.user_a
    : null;

  // Spicy conversations inherit the luxury crimson + gold theme.
  useSpicyTheme(false);

  const { data: otherProfile } = useQuery({
    queryKey: ["chat-partner", otherUserId],
    enabled: !!otherUserId,
    queryFn: async () => {
      const { data } = await seedClient
        .from("profiles")
        .select("id, first_name, age, photos")
        .eq("id", otherUserId!)
        .maybeSingle();
      return data;
    },
  });
  const partnerPhoto = Array.isArray(otherProfile?.photos)
    ? (otherProfile!.photos[0] as string | undefined)
    : undefined;
  const partnerName = otherProfile?.first_name ?? "Match";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, seedTyping]);

  // Clear typing indicator as soon as a new message from the partner lands.
  useEffect(() => {
    if (!user || !seedTyping || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.sender_id !== user.id) setSeedTyping(false);
  }, [messages, user, seedTyping]);

  // Cancel any scheduled seed reply when the user leaves this chat.
  useEffect(() => {
    return () => {
      if (seedReplyTimerRef.current !== null) {
        clearTimeout(seedReplyTimerRef.current);
        seedReplyTimerRef.current = null;
      }
    };
  }, [matchId]);

  // Mark this match as read whenever messages load/update while viewing it.
  useEffect(() => {
    if (!matchId || !user) return;
    markMatchRead(user.id, matchId);
    qc.invalidateQueries({ queryKey: ["unread-messages", user.id] });

    // Mark incoming unread messages as read on the server (sender sees the receipt).
    const unreadIncoming = messages.filter(
      (m) => m.sender_id !== user.id && !m.read_at,
    );
    if (unreadIncoming.length > 0) {
      seedClient
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIncoming.map((m) => m.id))
        .then(({ error }) => {
          if (error) console.warn("mark read failed", error);
        });
    }
  }, [matchId, user, messages, qc]);

  useEffect(() => {
    if (!matchId) return;
    const channelName = `messages-${matchId}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = seedClient
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", matchId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", matchId] });
        }
      );
    channel.subscribe();
    return () => {
      seedClient.removeChannel(channel);
    };
  }, [matchId, qc]);

  const myMessageCount = messages.filter((m) => m.sender_id === user?.id).length;
  const isFreePlan = plan === "explorer" || plan === "verified";
  const overFreeLimit = isFreePlan && !trial.active && myMessageCount >= FREE_MESSAGE_LIMIT;

  // When the user hits the cap with text in the box, persist it and send them to upgrade.
  useEffect(() => {
    if (!overFreeLimit || !draftKey) return;
    if (draft.trim()) {
      try { localStorage.setItem(draftKey, draft); } catch { /* ignore */ }
      toast.message("We saved your message. Upgrade to send it.");
      navigate("/app/verify");
    }
  }, [overFreeLimit, draft, draftKey, navigate]);

  if (!matchId) {
    return <ChatList />;
  }

  if (!matchLoading && !matchRow) {
    return (
      <div className="space-y-4">
        <SafetyBanner variant="warn" message="Never share phone numbers, WhatsApp, or money requests. Report anything suspicious." />
        <h1 className="heading-gold font-display text-2xl font-bold">Conversation unavailable</h1>
        <p className="text-sm text-muted-foreground">
          This match no longer exists or you don't have access to it. Start a new conversation from Discover or Matches.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/app/matches">Back to matches</Link></Button>
          <Button asChild className="bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
            <Link to="/app/discover">Find people</Link>
          </Button>
        </div>
      </div>
    );
  }

  async function send() {
    const content = draft.trim();
    if (!content) return;
    const ok = await sendContent(content);
    if (ok) triggerSeedReply(content);
  }

  async function sendContent(content: string): Promise<boolean> {
    if (!content || !user || !matchId) return false;
    if (content === draft.trim()) setSending(true);
    const isImage = isImageMessage(content);
    let { data: inserted, error } = await seedClient
      .from("messages")
      .insert({ match_id: matchId, sender_id: user.id, content })
      .select("id,sender_id,content,created_at,read_at")
      .single();
    if (error) {
      const missingReadAt =
        /read_at/i.test(error.message ?? "") ||
        error.code === "PGRST204" ||
        error.code === "42703";
      if (missingReadAt) {
        const retry = await seedClient
          .from("messages")
          .insert({ match_id: matchId, sender_id: user.id, content })
          .select("id,sender_id,content,created_at")
          .single();
        if (!retry.error && retry.data) {
          inserted = { ...retry.data, read_at: null } as ChatMessage;
          error = null;
        } else if (retry.error) {
          error = retry.error;
        }
      }
    }
    setSending(false);
    if (error) {
      console.error("send message failed", error);
      toast.error(`Message not sent: ${error.message}`);
      return false;
    }
    if (!isImage) {
      setDraft("");
      if (draftKey) { try { localStorage.removeItem(draftKey); } catch { /* ignore */ } }
    }
    if (inserted) {
      qc.setQueryData<ChatMessage[]>(["messages", matchId], (current = []) => (
        current.some((m) => m.id === inserted!.id) ? current : [...current, inserted!]
      ));
    }
    qc.invalidateQueries({ queryKey: ["messages", matchId] });
    return true;
  }

  async function uploadImage(file: File) {
    if (!user || !matchId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image is too large (max 8MB).");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/chat-images/${matchId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("profile-photos").getPublicUrl(path);
      const url = pub.publicUrl;
      await sendContent(`${IMAGE_MSG_PREFIX}${url}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("upload image failed", e);
      toast.error(`Photo not sent: ${msg}`);
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType });
        setAudioUrl(URL.createObjectURL(blob));
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingSecs(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSecs(s => {
          if (s >= 90) { stopRecording(); return s; } // 90s max
          return s + 1;
        });
      }, 1000);
    } catch {
      toast.error("Microphone access denied. Enable it in browser settings.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    setRecording(false);
  }

  function cancelVoice() {
    stopRecording();
    setAudioUrl(null);
    audioChunksRef.current = [];
  }

  async function sendVoiceNote() {
    if (!user || !matchId || audioChunksRef.current.length === 0) return;
    setUploading(true);
    try {
      const blob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType ?? "audio/webm" });
      const ext = blob.type.includes("mp4") ? "m4a" : "webm";
      const path = `${user.id}/voice-notes/${matchId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("profile-photos").upload(path, blob, { contentType: blob.type });
      if (upErr) throw upErr;
      // Store path not public URL — playback uses a signed URL generated at render time
      await sendContent(`${VOICE_PATH_PREFIX}${path}`);
      setAudioUrl(null);
      audioChunksRef.current = [];
    } catch (e) {
      toast.error("Voice note not sent.");
    } finally {
      setUploading(false);
    }
  }
  async function triggerSeedReply(content: string) {
    if (!user || !matchId) return;
    // If the other party in this match is a seed profile, trigger an AI reply.
    try {
      console.log("[seed-reply] start: looking up match", matchId);
      const { data: match, error: matchErr } = await seedClient
        .from("matches")
        .select("user_a, user_b")
        .eq("id", matchId)
        .maybeSingle();
      if (matchErr) console.warn("[seed-reply] match lookup error", matchErr);
      console.log("[seed-reply] match row", match);
      if (!match) return;

      const receiver_id = match.user_a === user.id ? match.user_b : match.user_a;
      const { data: receiver, error: recvErr } = await seedClient
        .from("profiles")
        .select("is_seed")
        .eq("id", receiver_id)
        .maybeSingle();
      if (recvErr) console.warn("[seed-reply] receiver lookup error", recvErr);
      console.log("[seed-reply] receiver", receiver_id, receiver);
      if (!receiver?.is_seed) {
        console.log("[seed-reply] receiver is not a seed; skipping");
        return;
      }

      const supaUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey =
        import.meta.env.VITE_SUPABASE_ANON_KEY ??
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      console.log("[seed-reply] env", {
        hasUrl: !!supaUrl,
        urlHost: supaUrl ? new URL(supaUrl).host : null,
        hasAnonKey: !!anonKey,
        anonKeyLen: anonKey?.length ?? 0,
      });
      if (!supaUrl || !anonKey) {
        console.error("[seed-reply] missing VITE_SUPABASE_URL or anon/publishable key");
        return;
      }

      console.log("[seed-reply] calling getSession()");
      const sessionResult = await supabase.auth.getSession();
      console.log("[seed-reply] getSession result", {
        hasSession: !!sessionResult.data.session,
        error: sessionResult.error,
      });
      const session = sessionResult.data.session;

      const url = `${supaUrl}/functions/v1/generate-seed-response`;
      const payload = {
        sender_id: user.id,
        receiver_id,
        match_id: matchId,
        message_content: content,
        spicy_mode: !!matchRow?.spicy,
      };
      // Random "thinking" delay so seed replies feel human, not instant.
      const delayMs = 3_000 + Math.floor(Math.random() * 5_000); // 3-8s
      console.log("[seed-reply] scheduled in", Math.round(delayMs / 1000), "s →", url, payload);
      setSeedTyping(true);
      if (seedReplyTimerRef.current !== null) clearTimeout(seedReplyTimerRef.current);
      seedReplyTimerRef.current = window.setTimeout(() => {
        seedReplyTimerRef.current = null;
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? anonKey}`,
          },
          body: JSON.stringify(payload),
        })
          .then(async (res) => {
            const text = await res.text().catch(() => "");
            console.log("[seed-reply] response", res.status, text);
            if (res.ok) {
              qc.invalidateQueries({ queryKey: ["messages", matchId] });
            } else {
              setSeedTyping(false);
            }
          })
          .catch((fetchErr) => {
            console.error("[seed-reply] fetch threw", fetchErr);
            setSeedTyping(false);
          });
      }, delayMs);
    } catch (outerErr) {
      console.error("[seed-reply] outer error", outerErr);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SafetyBanner variant="warn" message="Never share phone numbers, WhatsApp, or money requests. Report anything suspicious." />
      {trial.active && <TrialBadge />}
      <div className="flex items-center gap-3 rounded-2xl border bg-background p-3">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90"
          aria-label="Back to matches"
        >
          <Link to="/app/matches"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <button
          type="button"
          onClick={() => otherUserId && setProfileOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left hover:bg-muted/40"
          aria-label={`Open ${partnerName}'s profile`}
        >
          <Avatar className="h-10 w-10">
            {partnerPhoto && <AvatarImage src={partnerPhoto} alt={partnerName} className="object-cover" />}
            <AvatarFallback>{partnerName.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="name-gold truncate font-display text-base font-semibold">
              {partnerName}{otherProfile?.age ? `, ${otherProfile.age}` : ""}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">Tap to view profile</p>
          </div>
        </button>
      </div>
      <ProfileDetailSheet
        userId={otherUserId}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        matchId={matchId}
      />
      <div ref={scrollRef} className="min-h-[300px] max-h-[55vh] overflow-y-auto rounded-2xl border bg-card p-3 space-y-2">
        {messagesError ? (
          <p className="text-center text-sm text-destructive py-8">
            Unable to load messages: {messagesError.message}
          </p>
        ) : messagesLoading ? (
          <p className="text-center text-sm text-muted-foreground py-8">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Say hello 👋</p>
        ) : (
          messages.map((m, i, arr) => {
            const mine = m.sender_id === user?.id;
            // Show "Read" only on the latest read message I sent, to avoid clutter.
            const isLastReadMine =
              mine && !!m.read_at &&
              !arr.slice(i + 1).some((n) => n.sender_id === user?.id && n.read_at);
            return (
              <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                {isImageMessage(m.content) ? (
                  <a
                    href={imageUrlFrom(m.content)}
                    target="_blank"
                    rel="noreferrer"
                    className="max-w-[70%] overflow-hidden rounded-2xl border bg-muted"
                  >
                    <img
                      src={imageUrlFrom(m.content)}
                      alt="Shared"
                      loading="lazy"
                      className="block max-h-72 w-full object-cover"
                    />
                  </a>
                ) : isVoiceMessage(m.content) ? (
                  <VoicePlayer content={m.content} mine={mine} />
                ) : (
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-ghana-gold text-ghana-brown" : "bg-muted text-foreground"}`}>
                    {m.content}
                  </div>
                )}
                {isLastReadMine && (
                  <span className="mt-0.5 pr-1 text-[10px] text-muted-foreground">
                    Read {new Date(m.read_at!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                )}
              </div>
            );
          })
        )}
        {seedTyping && (
          <div className="flex items-start">
            <div
              className="flex items-center gap-1 rounded-2xl bg-muted px-3 py-2"
              aria-label={`${partnerName} is typing`}
            >
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60" />
            </div>
          </div>
        )}
      </div>

      {overFreeLimit ? (
        <div className="rounded-2xl border-2 border-ghana-gold/50 bg-gradient-to-br from-ghana-gold/15 via-background to-ghana-red/10 p-5 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-ghana-gold text-ghana-brown">
            <Lock className="h-5 w-5" />
          </div>
          <p className="mt-3 font-display text-base font-semibold text-ghana-brown">
            Upgrade to Premium to keep the conversation going
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            You've sent {myMessageCount} messages on the {plan === "verified" ? "Verified" : "Explorer"} plan. Premium and Diamond unlock unlimited messaging.
          </p>
          {draft.trim() && (
            <p className="mt-2 text-xs text-ghana-brown">
              Your draft is saved — it'll be waiting here after you upgrade.
            </p>
          )}
          <Button asChild className="mt-3 bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
            <Link
              to="/app/verify"
              onClick={() => {
                if (draftKey && draft.trim()) {
                  try { localStorage.setItem(draftKey, draft); } catch { /* ignore */ }
                }
              }}
            >
              Upgrade to Premium
            </Link>
          </Button>
        </div>
        ) : (
        <>
          {/* Voice note preview */}
          {audioUrl && !recording && (
            <div className="flex items-center gap-2 rounded-2xl border bg-muted/40 px-3 py-2">
              <audio src={audioUrl} controls className="flex-1 h-8 min-w-0" />
              <Button size="icon" variant="ghost" onClick={cancelVoice} className="shrink-0 text-destructive" aria-label="Cancel"><MicOff className="h-4 w-4" /></Button>
              <Button size="sm" onClick={() => { sendVoiceNote(); triggerSeedReply("[voice note]"); }} disabled={uploading} className="shrink-0 bg-ghana-gold text-ghana-brown">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          )}
          {/* Recording in progress */}
          {recording && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3">
              <span className="flex h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="flex-1 text-sm text-red-700 font-medium">{Math.floor(recordingSecs / 60)}:{String(recordingSecs % 60).padStart(2, "0")}</span>
              <Button size="icon" variant="ghost" onClick={cancelVoice} className="text-muted-foreground" aria-label="Cancel"><MicOff className="h-4 w-4" /></Button>
              <Button size="icon" onClick={stopRecording} className="bg-red-500 text-white hover:bg-red-600" aria-label="Stop"><Square className="h-4 w-4 fill-current" /></Button>
            </div>
          )}
          {/* Main input row */}
          {!recording && !audioUrl && (
          <form
            className="flex gap-2"
            onSubmit={(e) => { e.preventDefault(); send(); }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={uploading || sending}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Send a photo"
              className="shrink-0"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={uploading || sending}
              onClick={startRecording}
              aria-label="Record voice note"
              className="shrink-0"
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              disabled={sending}
              maxLength={500}
            />
            <Button type="submit" disabled={sending || !draft.trim()} className="bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90">
              Send
            </Button>
          </form>
          )}
        </>
      )}
    </div>
  );
}

function ChatList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: unread } = useUnreadMessages();

  const { data: convos, isLoading } = useQuery({
    queryKey: ["chat-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;
      const { data: rows, error } = await supabase
        .from("matches")
        .select("id, user_a, user_b, created_at")
        .or(`user_a.eq.${uid},user_b.eq.${uid}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const others = (rows ?? []).map((r) => (r.user_a === uid ? r.user_b : r.user_a));
      if (others.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, age, photos")
        .in("id", others);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      // Fetch last message per match (best effort, sequential keeps it simple).
      const enriched = await Promise.all(
        (rows ?? []).map(async (r) => {
          const { data: last } = await supabase
            .from("messages")
            .select("content, created_at, sender_id")
            .eq("match_id", r.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const otherId = r.user_a === uid ? r.user_b : r.user_a;
          return { ...r, other: byId.get(otherId), last };
        })
      );
      // Sort: most recent activity first.
      enriched.sort((a, b) => {
        const at = a.last?.created_at ?? a.created_at;
        const bt = b.last?.created_at ?? b.created_at;
        return new Date(bt).getTime() - new Date(at).getTime();
      });
      return enriched;
    },
  });

  return (
    <div className="space-y-4">
      <SafetyBanner variant="warn" message="Never share phone numbers, WhatsApp, or money requests. Report anything suspicious." />
      <h1 className="heading-gold font-display text-2xl font-bold">Chats</h1>
      {isLoading ? (
        <Card className="rounded-2xl p-6 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : !convos || convos.length === 0 ? (
        <Card className="rounded-2xl p-6 text-center text-sm text-muted-foreground">
          No conversations yet. Match with someone from Discover to start chatting.
        </Card>
      ) : (
        <div className="space-y-2">
          {convos.map((c) => {
            const other = c.other as { first_name?: string; age?: number; photos?: unknown } | undefined;
            const photo = Array.isArray(other?.photos) ? (other!.photos[0] as string | undefined) : undefined;
            const name = other?.first_name ?? "Match";
            const unreadCount = unread?.perMatch?.[c.id] ?? 0;
            const lastPreview = c.last
              ? (isImageMessage(c.last.content) ? "📷 Photo" : c.last.content)
              : "Say hello 👋";
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate(`/app/chat/${c.id}`)}
                className="w-full text-left"
              >
                <Card className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-muted/40">
                  <Avatar className="h-12 w-12">
                    {photo && <AvatarImage src={photo} alt={name} className="object-cover" />}
                    <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="name-gold truncate font-display text-base font-semibold">
                      {name}{other?.age ? `, ${other.age}` : ""}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{lastPreview}</p>
                  </div>
                  {unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ghana-red px-1.5 text-[11px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}