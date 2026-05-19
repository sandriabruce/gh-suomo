import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SafetyBanner } from "@/components/safety/SafetyBanner";
import { useEntitlements } from "@/hooks/useEntitlements";
import { PlanLockOverlay } from "@/components/plan/PlanLockOverlay";
import { TrialBadge } from "@/components/plan/TrialBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { markMatchRead } from "@/hooks/useUnreadMessages";

const FREE_MESSAGE_LIMIT = 2;

export default function Chat() {
  const { limits, trial, plan } = useEntitlements();
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

  const { data: messages } = useQuery({
    queryKey: ["messages", matchId],
    enabled: !!matchId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id,sender_id,content,created_at,read_at")
        .eq("match_id", matchId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // Mark this match as read whenever messages load/update while viewing it.
  useEffect(() => {
    if (!matchId || !user) return;
    markMatchRead(user.id, matchId);
    qc.invalidateQueries({ queryKey: ["unread-messages", user.id] });

    // Mark incoming unread messages as read on the server (sender sees the receipt).
    const unreadIncoming = (messages ?? []).filter(
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
    const channel = supabase
      .channel(`messages-${matchId}`)
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
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, qc]);

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

  const myMessageCount = (messages ?? []).filter((m) => m.sender_id === user?.id).length;
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

  async function send() {
    if (!draft.trim() || !user || !matchId) return;
    setSending(true);
    const content = draft.trim();
    const { error } = await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: user.id,
      content,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setDraft("");
    if (draftKey) { try { localStorage.removeItem(draftKey); } catch { /* ignore */ } }
    qc.invalidateQueries({ queryKey: ["messages", matchId] });

    // If the other party in this match is a seed profile, trigger an AI reply.
    try {
      const { data: match } = await supabase
        .from("matches")
        .select("user_a, user_b")
        .eq("id", matchId)
        .maybeSingle();
      if (match) {
        const receiver_id = match.user_a === user.id ? match.user_b : match.user_a;
        const { data: receiver } = await supabase
          .from("profiles")
          .select("is_seed")
          .eq("id", receiver_id)
          .maybeSingle();
        if (receiver?.is_seed) {
          const { data: { session } } = await supabase.auth.getSession();
          const payload = JSON.stringify({
            sender_id: user.id,
            receiver_id,
            match_id: matchId,
            message_content: content,
          });
          const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token ?? ""}`,
            "apikey": "sb_publishable_Ez-FJKDxN-lnjPQ8ouwYoA_Fh9UyFN3",
          };
          const url = "https://bjfvmgymyfwgbzntcigj.supabase.co/functions/v1/generate-seed-response";
          const MAX_ATTEMPTS = 4;
          const TIMEOUT_MS = 15000;
          const attempt = async (n: number): Promise<void> => {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
            try {
              const res = await fetch(url, { method: "POST", headers, body: payload, signal: ctrl.signal });
              clearTimeout(timer);
              if (!res.ok) throw new Error(`status ${res.status}`);
              setTimeout(() => qc.invalidateQueries({ queryKey: ["messages", matchId] }), 2000);
            } catch (err) {
              clearTimeout(timer);
              if (n >= MAX_ATTEMPTS) {
                console.warn("generate-seed-response failed after retries", err);
                return;
              }
              const delay = Math.min(1000 * 2 ** (n - 1), 8000) + Math.random() * 500;
              setTimeout(() => { void attempt(n + 1); }, delay);
            }
          };
          void attempt(1);
        }
      }
    } catch { /* non-fatal */ }
  }

  return (
    <div className="flex flex-col gap-3">
      <SafetyBanner variant="warn" message="Never share phone numbers, WhatsApp, or money requests. Report anything suspicious." />
      {trial.active && <TrialBadge />}
      <div ref={scrollRef} className="min-h-[300px] max-h-[55vh] overflow-y-auto rounded-2xl border bg-card p-3 space-y-2">
        {(messages ?? []).length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Say hello 👋</p>
        ) : (
          (messages ?? []).map((m, i, arr) => {
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