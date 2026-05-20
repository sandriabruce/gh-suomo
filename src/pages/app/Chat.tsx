import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SafetyBanner } from "@/components/safety/SafetyBanner";
import { useEntitlements } from "@/hooks/useEntitlements";
import { TrialBadge } from "@/components/plan/TrialBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { markMatchRead } from "@/hooks/useUnreadMessages";

const FREE_MESSAGE_LIMIT = 3;

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
      const { data, error } = await supabase
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
          const retry = await supabase
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
      const { data, error } = await supabase
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

  const { data: otherProfile } = useQuery({
    queryKey: ["chat-partner", otherUserId],
    enabled: !!otherUserId,
    queryFn: async () => {
      const { data } = await supabase
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
  }, [messages]);

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
      supabase
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
    const channel = supabase
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
      supabase.removeChannel(channel);
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
    return (
      <div className="space-y-4">
        <SafetyBanner variant="warn" message="Never share phone numbers, WhatsApp, or money requests. Report anything suspicious." />
        {trial.active && <TrialBadge />}
        <h1 className="heading-gold font-display text-2xl font-bold">Chat</h1>
        <p className="text-sm text-muted-foreground">Open a conversation from Matches.</p>
      </div>
    );
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
    if (!draft.trim() || !user || !matchId) return;
    setSending(true);
    const content = draft.trim();
    let { data: inserted, error } = await supabase
      .from("messages")
      .insert({
        match_id: matchId,
        sender_id: user.id,
        content,
      })
      .select("id,sender_id,content,created_at,read_at")
      .single();
    if (error) {
      const missingReadAt =
        /read_at/i.test(error.message ?? "") ||
        error.code === "PGRST204" ||
        error.code === "42703";
      if (missingReadAt) {
        const retry = await supabase
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
      return;
    }
    setDraft("");
    if (draftKey) { try { localStorage.removeItem(draftKey); } catch { /* ignore */ } }
    if (inserted) {
      qc.setQueryData<ChatMessage[]>(["messages", matchId], (current = []) => (
        current.some((m) => m.id === inserted.id) ? current : [...current, inserted]
      ));
    }
    qc.invalidateQueries({ queryKey: ["messages", matchId] });

    // If the other party in this match is a seed profile, trigger an AI reply.
    try {
      console.log("[seed-reply] start: looking up match", matchId);
      const { data: match, error: matchErr } = await supabase
        .from("matches")
        .select("user_a, user_b")
        .eq("id", matchId)
        .maybeSingle();
      if (matchErr) console.warn("[seed-reply] match lookup error", matchErr);
      console.log("[seed-reply] match row", match);
      if (!match) return;

      const receiver_id = match.user_a === user.id ? match.user_b : match.user_a;
      const { data: receiver, error: recvErr } = await supabase
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
      };
      console.log("[seed-reply] POST →", url, payload);
      // Fire-and-forget: do NOT await and do NOT attach an AbortController/signal.
      // Awaiting here ties the request to the component lifecycle; if the user
      // navigates away the in-flight promise can be cancelled with
      // "AbortError: signal is aborted without reason".
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
            setTimeout(
              () => qc.invalidateQueries({ queryKey: ["messages", matchId] }),
              2000,
            );
          }
        })
        .catch((fetchErr) => {
          console.error("[seed-reply] fetch threw", fetchErr);
        });
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
        <Avatar className="h-10 w-10">
          {partnerPhoto && <AvatarImage src={partnerPhoto} alt={partnerName} className="object-cover" />}
          <AvatarFallback>{partnerName.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="name-gold truncate font-display text-base font-semibold">
            {partnerName}{otherProfile?.age ? `, ${otherProfile.age}` : ""}
          </p>
        </div>
      </div>
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
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-ghana-gold text-ghana-brown" : "bg-muted text-foreground"}`}>
                  {m.content}
                </div>
                {isLastReadMine && (
                  <span className="mt-0.5 pr-1 text-[10px] text-muted-foreground">
                    Read {new Date(m.read_at!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                )}
              </div>
            );
          })
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
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); send(); }}
        >
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
    </div>
  );
}