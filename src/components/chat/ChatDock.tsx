import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, MoreHorizontal, SquarePen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePortalUser } from "@/lib/portal-session";
import { Button } from "@/components/ui/button";
import { Messenger } from "./Messenger";

/** Docked ABHI Chat bar (bottom-right). asTeam = chatting as "ABHI L&D Team" from the admin screen. */
export function ChatDock({
  userId, chat, setChat, asTeam = false,
}: { userId: string; chat: string | undefined; setChat: (v: string | undefined) => void; asTeam?: boolean }) {
  const { data: portalUser } = usePortalUser();
  const dockRef = useRef<HTMLDivElement | null>(null);

  // Auto-minimise: any pointer press outside the dock closes the open chat.
  useEffect(() => {
    if (!chat) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (dockRef.current && target && !dockRef.current.contains(target)) setChat(undefined);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [chat, setChat]);

  const { data: unread = 0 } = useQuery({
    queryKey: ["dm-unread", userId, asTeam],
    refetchInterval: 10000,
    queryFn: async () => {
      let q = supabase
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .is("read_at", null);
      q = asTeam ? q.eq("team_admin_id", userId) : q.or(`team_admin_id.is.null,team_admin_id.neq.${userId}`);
      const { count } = await q;
      return count ?? 0;
    },
  });
  const selected = chat && chat !== "open" ? chat : null;
  const header = (
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <button type="button" onClick={() => setChat(chat ? undefined : "open")} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {(asTeam ? "L&D Team" : portalUser?.name ?? "Me").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")}
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-success ring-2 ring-card" />
            </span>
            <span className="truncate text-sm font-semibold">{asTeam ? "ABHI Chat · L&D Team" : "ABHI Chat"}</span>
            {unread > 0 && (
              <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">{unread}</span>
            )}
          </button>
          <Button variant="ghost" size="icon" className="size-8" title="All conversations" aria-label="All conversations" onClick={() => setChat("open")}>
            <MoreHorizontal className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" title="New message" aria-label="New message" onClick={() => setChat("open")}>
            <SquarePen className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" aria-label={chat ? "Minimise" : "Open"} onClick={() => setChat(chat ? undefined : "open")}>
            {chat ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </Button>
        </div>
  );
  return (
    <div ref={dockRef} className={`fixed bottom-0 z-50 ${chat ? "inset-x-2 md:inset-x-auto md:right-4" : "right-4"}`}>
      <Messenger asTeam={asTeam} me={userId} open={Boolean(chat)} header={header} selected={selected} select={(id) => setChat(id ?? "open")} />
    </div>
  );
}
