import { useCallback, useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { GraduationCap, RefreshCw, SendHorizontal, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useCoachChat, type CoachMessage } from "./useCoachChat";

function time(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function CoachAvatar({ size = "size-7" }: { size?: string }) {
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-sidebar text-primary`}>
      <GraduationCap className="size-4" />
    </span>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2" aria-live="polite">
      <CoachAvatar />
      <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-xs text-muted-foreground">
        <span className="mr-2">Coach is typing</span>
        <span className="inline-flex gap-1 align-middle">
          {[0, 150, 300].map((d) => (
            <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d}ms` }} />
          ))}
        </span>
      </div>
    </div>
  );
}

export function ChatMessage({ m, onRetry, onRate }: { m: CoachMessage; onRetry?: (() => void) | undefined; onRate?: ((v: 1 | -1) => void) | undefined }) {
  if (m.role === "user") {
    return (
      <div className="flex flex-col items-end">
        <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-sidebar px-3 py-2 text-sm text-primary-foreground" style={{ color: "var(--color-background)" }}>
          {m.text}
        </div>
        <span className="mt-0.5 text-[10px] text-muted-foreground">{time(m.at)}</span>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2">
      <CoachAvatar />
      <div className="flex max-w-[80%] flex-col">
        <div className="prose-coach break-words rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
          <ReactMarkdown>{m.text}</ReactMarkdown>
          {onRetry && (
            <button type="button" onClick={onRetry} aria-label="Retry last message" className="mt-1 rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium hover:bg-secondary">
              Retry
            </button>
          )}
        </div>
        <span className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
          {time(m.at)}
          {onRate && !m.error && (
            <>
              <button type="button" aria-label="Helpful" title="Helpful" onClick={() => onRate(1)} className={m.rating === 1 ? "text-success" : "hover:text-foreground"}>
                <ThumbsUp className="size-3" />
              </button>
              <button type="button" aria-label="Not helpful" title="Not helpful" onClick={() => onRate(-1)} className={m.rating === -1 ? "text-destructive" : "hover:text-foreground"}>
                <ThumbsDown className="size-3" />
              </button>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export function CoachChatPanel({
  chat,
  onClose,
  ref,
}: {
  chat: ReturnType<typeof useCoachChat>;
  onClose: () => void;
  ref?: React.Ref<HTMLDivElement | null>;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const { messages, sending, send, retry, canRetry, newConversation, rate } = chat;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);
  useEffect(() => {
    if (!sending) inputRef.current?.focus();
  }, [sending]);
  // Greet automatically when the conversation is empty.
  const greeted = useRef(false);
  useEffect(() => {
    if (messages.length > 0) { greeted.current = false; return; }
    if (greeted.current || sending) return;
    greeted.current = true;
    void send("Hi", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const submit = () => {
    if (!text.trim() || sending) return;
    void send(text);
    setText("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const last = messages[messages.length - 1];

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Learning Impact Coach"
      className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-card shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 sm:inset-auto sm:bottom-[160px] sm:right-6 sm:h-[560px] sm:max-h-[calc(100vh-180px)] sm:w-[380px] sm:rounded-2xl sm:border sm:border-border"
    >
      <div className="flex items-center gap-2 bg-sidebar px-3 py-2.5 text-sidebar-foreground">
        <CoachAvatar size="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" style={{ color: "var(--color-background)" }}>Learning Impact Coach</p>
          <p className="truncate text-[11px] text-sidebar-foreground/80">Your L&D assistant</p>
        </div>
        <button type="button" onClick={newConversation} disabled={sending} aria-label="New conversation" title="New conversation" className="grid size-8 place-items-center rounded-full hover:bg-sidebar-accent disabled:opacity-50">
          <RefreshCw className="size-4" />
        </button>
        <button type="button" onClick={onClose} aria-label="Close coach" title="Close" className="grid size-8 place-items-center rounded-full hover:bg-sidebar-accent">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((m) => (
          <ChatMessage key={m.id} m={m} onRate={(v) => rate(m.id, v)} onRetry={m.error && canRetry && m === last && !sending ? retry : undefined} />
        ))}
        {sending && <TypingIndicator />}
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-border p-2">
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          disabled={sending}
          aria-label="Message the coach"
          placeholder="Type your message…"
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-[120px] min-h-9 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
        <button type="button" onClick={submit} disabled={sending || !text.trim()} aria-label="Send message" className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <SendHorizontal className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Floating "Learning Impact Coach" launcher, mounted once in the root layout. */
export function CoachLauncher() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const [pulse, setPulse] = useState(true);
  const openRef = useRef(open);
  openRef.current = open;

  const onCoachMessage = useCallback(() => {
    if (!openRef.current) setUnread(true);
  }, []);
  const chat = useCoachChat(onCoachMessage);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 1500);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!open) return;
    setUnread(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // Close when the user clicks/taps anywhere outside the coach window
    // (and outside its launcher button). Capturing phase so page handlers
    // cannot stop it.
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  if (pathname === "/login") return null;

  return (
    <>
      {open && <CoachChatPanel chat={chat} onClose={() => setOpen(false)} ref={panelRef} />}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Learning Coach" : "Chat with your Learning Coach"}
        title="Chat with your Learning Coach"
        className={`fixed bottom-[84px] right-6 z-[71] grid size-[60px] place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 transition-transform hover:scale-110 ${
          open ? "max-sm:hidden" : ""
        } ${pulse ? "animate-pulse" : ""}`}
      >
        {open ? <X className="size-6" /> : <GraduationCap className="size-7" />}
        {unread && !open && (
          <span className="absolute right-1 top-1 size-3 rounded-full bg-destructive ring-2 ring-card" aria-label="New coach message" />
        )}
      </button>
    </>
  );
}
