import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function lastReadKey(userId: string, matchId: string) {
  return `chat-last-read:${userId}:${matchId}`;
}

export function markMatchRead(userId: string, matchId: string) {
  try {
    localStorage.setItem(lastReadKey(userId, matchId), new Date().toISOString());
  } catch { /* ignore */ }
}

export function useUnreadMessages() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["unread-messages", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;
      const { data: matches, error } = await supabase
        .from("matches")
        .select("id, user_a, user_b")
        .or(`user_a.eq.${uid},user_b.eq.${uid}`);
      if (error) throw error;
      const perMatch: Record<string, number> = {};
      let total = 0;
      await Promise.all(
        (matches ?? []).map(async (m) => {
          const other = m.user_a === uid ? m.user_b : m.user_a;
          const sinceStr = (() => {
            try { return localStorage.getItem(lastReadKey(uid, m.id)); } catch { return null; }
          })();
          let q = supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("match_id", m.id)
            .eq("sender_id", other);
          if (sinceStr) q = q.gt("created_at", sinceStr);
          const { count } = await q;
          const c = count ?? 0;
          if (c > 0) {
            perMatch[m.id] = c;
            total += c;
          }
        })
      );
      return { perMatch, total };
    },
  });

  // Realtime: any new message → refresh counts.
  useEffect(() => {
    if (!user) return;
    const channelName = `unread-messages-${user.id}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          qc.invalidateQueries({ queryKey: ["unread-messages", user.id] });
        }
      );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  return query;
}
