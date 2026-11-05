import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

// Live set of signed-in users, kept in sync instantly through a shared realtime channel.
let onlineIds = new Set<string>();
const listeners = new Set<() => void>();
function setOnline(next: Set<string>) {
  onlineIds = next;
  listeners.forEach((l) => l());
}
export function useOnlineUsers() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => onlineIds,
    () => onlineIds,
  );
}

/**
 * Runs on every page for any signed-in user:
 * - joins the live "portal-online" channel so others see a green dot immediately
 * - keeps a backup heartbeat and marks incoming chat messages as delivered
 */
export function ChatPresence() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => { setUserId(data.user?.id ?? null); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // Realtime presence: online the moment you're signed in, gone the moment you leave.
  useEffect(() => {
    if (!userId) { setOnline(new Set()); return; }
    const channel = supabase.channel("portal-online", { config: { presence: { key: userId } } });
    channel
      .on("presence", { event: "sync" }, () => {
        setOnline(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ user_id: userId, at: Date.now() });
      });
    return () => {
      void supabase.removeChannel(channel);
      setOnline(new Set());
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const tick = async () => {
      const now = new Date().toISOString();
      await supabase.from("user_presence").upsert({ user_id: userId, last_seen_at: now });
      await supabase
        .from("direct_messages")
        .update({ delivered_at: now })
        .eq("recipient_id", userId)
        .is("delivered_at", null);
    };
    void tick();
    const t = setInterval(() => { void tick(); }, 30_000);
    const onVis = () => { void tick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [userId]);

  return null;
}
