import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Image as ImageIcon, Loader2, Paperclip, Reply, Search, Send, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useOnlineUsers } from "./ChatPresence";

type Person = { id: string; employee_code: string; name: string; designation_name: string | null };
type Msg = { id: string; sender_id: string; recipient_id: string; body: string; read_at: string | null; delivered_at: string | null; created_at: string; team_admin_id: string | null; reply_to_id: string | null; attachment_path: string | null; attachment_name: string | null; attachment_type: string | null; liked_at: string | null };

const ONLINE_MS = 90 * 1000;
const PresenceCtx = createContext<Record<string, string>>({});

/** Sends a "still here" signal every minute while an employee page is open and visible. */
export function usePresenceHeartbeat(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;
    const beat = () => {
      if (document.visibilityState !== "visible") return;
      void supabase
        .from("user_presence")
        .upsert({ user_id: userId, last_seen_at: new Date().toISOString() });
    };
    beat();
    const t = setInterval(beat, 60_000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [userId]);
}

function StatusDot({ id }: { id: string }) {
  const seen = useContext(PresenceCtx)[id];
  const live = useOnlineUsers();
  const online = live.size > 0 ? live.has(id) : Boolean(seen) && Date.now() - new Date(seen ?? 0).getTime() < ONLINE_MS;
  return (
    <span
      title={online ? "Online" : "Away"}
      aria-label={online ? "Online" : "Away"}
      className={`absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-card ${online ? "bg-success" : "bg-destructive"}`}
    />
  );
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export function Messenger({
  me, selected, select, asTeam = false, open = true, header,
}: { me: string; selected: string | null; select: (id: string | null) => void; asTeam?: boolean; open?: boolean; header?: ReactNode }) {
  const TEAM = "team:";
  const TEAM_PERSON = (id: string): Person => ({ id, employee_code: "", name: "ABHI L&D Team", designation_name: "Learning & Development" });
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  useEffect(() => { setReplyTo(null); }, [selected]);

  const { data: messages = [] } = useQuery({
    queryKey: ["dm", me],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(2000);
      if (error) throw new Error(error.message);
      const rows = data as Msg[];
      // Mark incoming messages as delivered once they reach this device.
      const undelivered = rows.filter((m) => m.recipient_id === me && !m.delivered_at).map((m) => m.id);
      if (undelivered.length) {
        const now = new Date().toISOString();
        await supabase.from("direct_messages").update({ delivered_at: now }).in("id", undelivered);
        for (const m of rows) if (undelivered.includes(m.id)) m.delivered_at = now;
      }
      return rows;
    },
  });
  const all = messages;
  const visible = useMemo(
    () => all.filter((m) => (asTeam ? m.team_admin_id === me : m.team_admin_id !== me)),
    [all, asTeam, me],
  );
  const keyOf = (m: Msg) => {
    const other = m.sender_id === me ? m.recipient_id : m.sender_id;
    return !asTeam && m.team_admin_id ? TEAM + other : other;
  };
  const selectedId = selected?.startsWith(TEAM) ? selected.slice(TEAM.length) : selected;
  const isTeamThread = Boolean(selected?.startsWith(TEAM));

  const partnerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of visible) ids.add(m.sender_id === me ? m.recipient_id : m.sender_id);
    if (selectedId) ids.add(selectedId);
    return [...ids].sort();
  }, [visible, me, selectedId]);

  const { data: people = {} } = useQuery({
    queryKey: ["dm-people", partnerIds],
    enabled: partnerIds.length > 0,
    staleTime: 600_000,
    queryFn: async () => {
      const { data } = await supabase.rpc("employees_by_ids", { _ids: partnerIds });
      return Object.fromEntries((data ?? []).map((p) => [p.id, p as Person])) as Record<string, Person>;
    },
  });

  const { data: results = [], isFetching: searching } = useQuery({
    queryKey: ["dm-search", q.trim()],
    enabled: q.trim().length > 0,
    queryFn: async () => {
      const { data } = await supabase.rpc("search_employees", { _q: q });
      return ((data ?? []) as (Person & { id: string })[]).filter((p) => p.id !== me);
    },
  });

  const presenceIds = useMemo(
    () => [...new Set([...partnerIds, ...results.map((r) => r.id)])].sort(),
    [partnerIds, results],
  );
  const { data: presence = {} } = useQuery({
    queryKey: ["presence", presenceIds],
    enabled: presenceIds.length > 0,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data } = await supabase.from("user_presence").select("user_id,last_seen_at").in("user_id", presenceIds);
      return Object.fromEntries((data ?? []).map((r) => [r.user_id, r.last_seen_at])) as Record<string, string>;
    },
  });

  const conversations = useMemo(() => {
    const map = new Map<string, { last: Msg; unread: number }>();
    for (const m of visible) {
      const other = keyOf(m);
      const cur = map.get(other) ?? { last: m, unread: 0 };
      cur.last = m;
      if (m.recipient_id === me && !m.read_at) cur.unread++;
      map.set(other, cur);
    }
    return [...map.entries()].sort((a, b) => b[1].last.created_at.localeCompare(a[1].last.created_at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, me, asTeam]);

  const thread = visible.filter((m) => keyOf(m) === selected);

  // Mark incoming messages as read when the conversation is open.
  const unreadIds = thread.filter((m) => m.recipient_id === me && !m.read_at).map((m) => m.id).join(",");
  useEffect(() => {
    if (!unreadIds) return;
    void supabase
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds.split(","))
      .then(() => qc.invalidateQueries({ queryKey: ["dm", me] }));
  }, [unreadIds, me, qc]);

  const partner = selectedId ? (isTeamThread ? TEAM_PERSON(selectedId) : people[selectedId]) : undefined;
  const refresh = () => qc.invalidateQueries({ queryKey: ["dm", me] });

  return (
    <PresenceCtx.Provider value={presence}>
    <div className="ml-auto flex max-w-full items-end gap-3 md:max-w-[calc(100vw-2rem)]">
      {open && selected && (
        <section className="flex h-[min(520px,calc(100vh-5rem))] w-full flex-col overflow-hidden rounded-t-lg border bg-card shadow-2xl md:w-[400px]">
          <header className="flex items-center gap-2 border-b p-3 md:gap-3">
            {/* Mobile: back to the conversation list. Desktop keeps the close ✕ only. */}
            <Button variant="ghost" size="icon" className="size-8 shrink-0 md:hidden" onClick={() => select(null)} aria-label="Back to chats">
              <ArrowLeft className="size-4" />
            </Button>
            <Avatar name={partner?.name ?? "?"} {...(isTeamThread || !selectedId ? {} : { id: selectedId })} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{partner?.name ?? "Employee"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {partner ? (isTeamThread ? "Learning & Development" : `ID ${partner.employee_code}${partner.designation_name ? ` · ${partner.designation_name}` : ""}`) : ""}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => select(null)} aria-label="Close chat">
              <X className="size-4" />
            </Button>
          </header>
          <Thread
            thread={thread}
            all={visible}
            me={me}
            isTeam={isTeamThread}
            names={{ me: asTeam ? "ABHI L&D Team" : "You", other: partner?.name ?? "Employee" }}
            onReply={setReplyTo}
            onChanged={refresh}
          />
          <Composer
            me={me}
            to={selectedId ?? ""}
            teamAdminId={asTeam ? me : isTeamThread ? selectedId : null}
            replyTo={replyTo}
            replyName={replyTo ? (replyTo.sender_id === me ? "yourself" : partner?.name ?? "Employee") : ""}
            clearReply={() => setReplyTo(null)}
            onSent={refresh}
          />
        </section>
      )}
      {/* Mobile: when a chat is open it takes the whole dock and the list is hidden. */}
      <aside className={`${selected ? "hidden md:flex" : "flex"} w-[320px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-t-lg border bg-card shadow-2xl ${open ? "h-[min(560px,calc(100vh-5rem))]" : ""}`}>
        {header}
        {open && (
          <>
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by Employee ID or name"
              className="pl-9"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {q.trim() ? (
            searching ? (
              <p className="p-4 text-sm text-muted-foreground">Searching…</p>
            ) : results.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No employee found.</p>
            ) : (
              results.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  sub={`ID ${p.employee_code}${p.designation_name ? ` · ${p.designation_name}` : ""}`}
                  onClick={() => {
                    setQ("");
                    select(p.id);
                  }}
                />
              ))
            )
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No conversations yet. Search a colleague by Employee ID to start.</p>
          ) : (
            conversations.map(([id, c]) => (
              <PersonRow
                key={id}
                person={id.startsWith(TEAM) ? TEAM_PERSON(id) : (people[id] ?? { id, employee_code: "", name: "Employee", designation_name: null })}
                noStatus={id.startsWith(TEAM)}
                sub={`${c.last.sender_id === me ? "You: " : ""}${c.last.body || (c.last.attachment_name ? `📎 ${c.last.attachment_name}` : "")}`}
                date={c.last.created_at}
                unread={c.unread}
                active={id === selected}
                onClick={() => select(id)}
              />
            ))
          )}
        </div>
          </>
        )}
      </aside>
    </div>
    </PresenceCtx.Provider>
  );
}

function Avatar({ name, id }: { name: string; id?: string }) {
  return (
    <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
      {initials(name)}
      {id && <StatusDot id={id} />}
    </span>
  );
}

function PersonRow({
  person, sub, unread = 0, active = false, onClick, noStatus = false, date,
}: { person: Person; sub: string; unread?: number; active?: boolean; onClick: () => void; noStatus?: boolean; date?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted ${active ? "bg-muted" : ""}`}
    >
      <Avatar name={person.name} {...(noStatus ? {} : { id: person.id })} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className={`min-w-0 flex-1 truncate text-sm ${unread ? "font-bold" : "font-medium"}`}>{person.name}</p>
          {date && <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>}
        </div>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
      {unread > 0 && (
        <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">{unread}</span>
      )}
    </button>
  );
}

function Attachment({ m, mine }: { m: Msg; mine: boolean }) {
  const { data: url } = useQuery({
    queryKey: ["dm-att", m.attachment_path],
    enabled: Boolean(m.attachment_path),
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.storage.from("chat-attachments").createSignedUrl(m.attachment_path!, 3600);
      return data?.signedUrl ?? null;
    },
  });
  if (!m.attachment_path) return null;
  if (m.attachment_type?.startsWith("image/")) {
    return url ? (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={m.attachment_name ?? "Photo"} className="mb-1 max-h-60 rounded-lg object-cover" />
      </a>
    ) : (
      <div className="mb-1 h-32 w-48 animate-pulse rounded-lg bg-muted" />
    );
  }
  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noreferrer"
      className={`mb-1 flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs underline-offset-2 hover:underline ${mine ? "border-primary-foreground/30" : ""}`}
    >
      <FileText className="size-4 shrink-0" />
      <span className="truncate">{m.attachment_name ?? "Attachment"}</span>
    </a>
  );
}

function Thread({
  thread, all, me, isTeam = false, names, onReply, onChanged,
}: {
  thread: Msg[]; all: Msg[]; me: string; isTeam?: boolean;
  names: { me: string; other: string }; onReply: (m: Msg) => void; onChanged: () => void;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [thread.length]);
  const byId = useMemo(() => new Map(all.map((m) => [m.id, m])), [all]);
  const toggleLike = async (m: Msg) => {
    const { error } = await supabase
      .from("direct_messages")
      .update({ liked_at: m.liked_at ? null : new Date().toISOString() })
      .eq("id", m.id);
    if (error) toast.error(error.message);
    else onChanged();
  };
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/40 p-4">
      {thread.length === 0 && !isTeam && (
        <div className="mx-auto mt-4 max-w-sm rounded-lg border bg-card p-4 text-center shadow-sm">
          <p className="text-sm font-semibold">Before you start…</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            ABHI Chat is an official bank platform. Please keep every conversation
            professional and work-related, and kindly avoid unnecessary private
            messages to colleagues. Messages may be reviewed by L&D for compliance.
          </p>
        </div>
      )}
      {thread.length === 0 && isTeam && <p className="text-center text-sm text-muted-foreground">Say hello 👋</p>}
      {thread.map((m) => {
        const mine = m.sender_id === me;
        const parent = m.reply_to_id ? byId.get(m.reply_to_id) : undefined;
        return (
          <div key={m.id} className={`group flex items-center gap-1 ${mine ? "flex-row-reverse" : ""}`}>
            <div className={`relative max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "bg-primary text-primary-foreground" : "bg-card"}`}>
              {parent && (
                <div className={`mb-1 rounded-md border-l-2 px-2 py-1 text-[11px] ${mine ? "border-primary-foreground/60 bg-primary-foreground/10" : "border-primary bg-muted"}`}>
                  <p className="font-semibold">{parent.sender_id === me ? names.me : names.other}</p>
                  <p className="line-clamp-2 opacity-80">{parent.body || parent.attachment_name || "Attachment"}</p>
                </div>
              )}
              <Attachment m={m} mine={mine} />
              {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
              <p className={`mt-1 text-right text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {new Date(m.created_at).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                {mine && (
                  <span
                    className={`ml-1 font-semibold tracking-[-0.2em] ${m.read_at ? "text-info" : ""}`}
                    title={m.read_at ? "Read" : m.delivered_at ? "Delivered" : "Sent"}
                    aria-label={m.read_at ? "Read" : m.delivered_at ? "Delivered" : "Sent"}
                  >
                    {m.read_at || m.delivered_at ? "✓✓" : "✓"}
                  </span>
                )}
              </p>
              {m.liked_at && (
                <span className="absolute -bottom-2 right-2 rounded-full border bg-card px-1 text-[11px] shadow-sm" title="Liked">👍</span>
              )}
            </div>
            <div className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button type="button" title="Reply" aria-label="Reply" onClick={() => onReply(m)} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <Reply className="size-3.5" />
              </button>
              {!mine && (
                <button type="button" title={m.liked_at ? "Unlike" : "Like"} aria-label="Like" onClick={() => void toggleLike(m)} className={`rounded-full p-1 hover:bg-muted ${m.liked_at ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <ThumbsUp className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
      <div ref={end} />
    </div>
  );
}

function Composer({
  me, to, teamAdminId, replyTo, replyName, clearReply, onSent,
}: {
  me: string; to: string; teamAdminId: string | null; replyTo: Msg | null; replyName: string;
  clearReply: () => void; onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const send = async (override?: string) => {
    const body = (override ?? text).trim();
    const f = override ? null : file;
    if (!body && !f) return;
    setBusy(true);
    let attachment: { attachment_path: string; attachment_name: string; attachment_type: string } | null = null;
    if (f) {
      const safe = f.name.replace(/[^A-Za-z0-9._-]/g, "_");
      const path = `${me}/${crypto.randomUUID()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, f, { contentType: f.type });
      if (upErr) {
        setBusy(false);
        toast.error(upErr.message);
        return;
      }
      attachment = { attachment_path: path, attachment_name: f.name, attachment_type: f.type || "application/octet-stream" };
    }
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: me, recipient_id: to, body, team_admin_id: teamAdminId,
      reply_to_id: replyTo?.id ?? null, ...(attachment ?? {}),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!override) {
      setText("");
      setFile(null);
    }
    clearReply();
    onSent();
  };

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error("File must be 10 MB or smaller.");
      return;
    }
    setFile(f);
  };

  return (
    <div className="border-t">
      {replyTo && (
        <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-1.5 text-xs">
          <Reply className="size-3.5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 truncate">
            Replying to <span className="font-semibold">{replyName}</span>: {replyTo.body || replyTo.attachment_name}
          </p>
          <button type="button" aria-label="Cancel reply" onClick={clearReply}><X className="size-3.5" /></button>
        </div>
      )}
      {file && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs">
          {file.type.startsWith("image/") ? <ImageIcon className="size-3.5" /> : <Paperclip className="size-3.5" />}
          <p className="min-w-0 flex-1 truncate">{file.name}</p>
          <button type="button" aria-label="Remove file" onClick={() => setFile(null)}><X className="size-3.5" /></button>
        </div>
      )}
      <div className="p-3 pb-1">
        <Textarea
          rows={2}
          value={text}
          maxLength={4000}
          placeholder="Write a message…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className="min-h-14 resize-none bg-muted/50"
        />
      </div>
      <div className="flex items-center gap-1 px-2 pb-2">
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        <Button variant="ghost" size="icon" className="size-8" title="Photo" aria-label="Attach photo" onClick={() => photoRef.current?.click()}>
          <ImageIcon className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8" title="Attachment" aria-label="Attach file" onClick={() => fileRef.current?.click()}>
          <Paperclip className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8" title="Send a like" aria-label="Send a like" disabled={busy} onClick={() => void send("👍")}>
          <ThumbsUp className="size-4" />
        </Button>
        <Button size="sm" className="ml-auto" disabled={busy || (!text.trim() && !file)} onClick={() => void send()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <><Send className="size-4" /> Send</>}
        </Button>
      </div>
    </div>
  );
}
