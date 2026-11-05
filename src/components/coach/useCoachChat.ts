import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Record a coach conversation line for L&D analytics (never blocks the chat). */
function logLine(row: { id: string; session_id: string; role: "user" | "coach"; body: string; is_error?: boolean; response_ms?: number }) {
  void supabase.from("coach_messages").insert(row).then(({ error }) => {
    if (error) console.warn("[coach log]", error.message);
  });
}

const SESSION_KEY = "coach_session_id";
const MESSAGES_KEY = "coach_messages";
const TIMEOUT_MS = 120_000;

export type CoachMessage = {
  id: string;
  role: "coach" | "user";
  text: string;
  at: string;
  error?: boolean;
  rating?: 1 | -1 | null;
};

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useCoachChat(onCoachMessage?: () => void) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const messagesRef = useRef<CoachMessage[]>([]);
  messagesRef.current = messages;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [lastFailed, setLastFailed] = useState<{ text: string; hidden: boolean } | null>(null);
  const contextSent = useRef(false);
  const loaded = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MESSAGES_KEY);
      if (raw) setMessages(JSON.parse(raw) as CoachMessage[]);
      const sid = localStorage.getItem(SESSION_KEY);
      if (sid) {
        setSessionId(sid);
        contextSent.current = Boolean(raw && JSON.parse(raw).length);
      }
    } catch {
      /* ignore */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (loaded.current) localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  }, [messages]);

  const ensureSession = useCallback(() => {
    let sid = sessionId ?? localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = newId();
      localStorage.setItem(SESSION_KEY, sid);
      contextSent.current = false;
    }
    if (sid !== sessionId) setSessionId(sid);
    return sid;
  }, [sessionId]);

  const send = useCallback(
    async (text: string, hidden = false) => {
      const trimmed = text.trim();
      if (!trimmed || inFlight.current) return;
      inFlight.current = true;
      const sid = ensureSession();
      if (!hidden) {
        const uid = newId();
        setMessages((m) => [...m, { id: uid, role: "user", text: trimmed, at: new Date().toISOString() }]);
        logLine({ id: uid, session_id: sid, role: "user", body: trimmed });
      }
      const started = Date.now();
      setSending(true);
      setLastFailed(null);
      const history = [
        ...messagesRef.current.filter((m) => !m.error).map((m) => ({ role: m.role, text: m.text })),
        { role: "user", text: trimmed },
      ];
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const cid = newId();
      let reply = "";
      try {
        const { data: s } = await supabase.auth.getSession();
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.session?.access_token ?? ""}` },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        });
        if (res.status === 400) throw new Error("bad");
        if (!res.ok || !res.body) throw new Error("net");
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        const at = new Date().toISOString();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = dec.decode(value, { stream: true });
          if (!chunk) continue;
          const first = reply === "";
          reply += chunk;
          const text = reply;
          if (first) setSending(false);
          setMessages((m) =>
            first ? [...m, { id: cid, role: "coach", text, at }] : m.map((x) => (x.id === cid ? { ...x, text } : x)),
          );
        }
        if (!reply.trim()) throw new Error("net");
        logLine({ id: cid, session_id: sid, role: "coach", body: reply, response_ms: Date.now() - started });
        onCoachMessage?.();
      } catch (e) {
        const bad = e instanceof Error && e.message === "bad";
        setMessages((m) => [
          ...m.filter((x) => x.id !== cid),
          {
            id: newId(),
            role: "coach",
            error: true,
            at: new Date().toISOString(),
            text: bad
              ? "Something went wrong with the message. Please try again."
              : "Sorry, I couldn't connect just now. Please try again.",
          },
        ]);
        setLastFailed({ text: trimmed, hidden });
        logLine({ id: newId(), session_id: sid, role: "coach", body: bad ? "[error] bad request" : "[error] connection failed", is_error: true, response_ms: Date.now() - started });
      } finally {
        clearTimeout(timer);
        inFlight.current = false;
        setSending(false);
      }
    },
    [ensureSession, onCoachMessage],
  );

  const retry = useCallback(() => {
    if (!lastFailed) return;
    const f = lastFailed;
    setMessages((m) => (m[m.length - 1]?.error ? m.slice(0, -1) : m));
    void send(f.text, true);
  }, [lastFailed, send]);

  const newConversation = useCallback(() => {
    const sid = newId();
    localStorage.setItem(SESSION_KEY, sid);
    setSessionId(sid);
    contextSent.current = false;
    setMessages([]);
    setLastFailed(null);
  }, []);

  const rate = useCallback((id: string, value: 1 | -1) => {
    let next: 1 | -1 | null = value;
    setMessages((m) =>
      m.map((x) => {
        if (x.id !== id) return x;
        next = x.rating === value ? null : value;
        return { ...x, rating: next };
      }),
    );
    setTimeout(() => {
      void supabase.from("coach_messages").update({ rating: next }).eq("id", id);
    }, 0);
  }, []);

  return { messages, sending, send, retry, canRetry: Boolean(lastFailed), newConversation, rate };
}
