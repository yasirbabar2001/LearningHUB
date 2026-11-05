import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchNotifications, markAllNotificationsRead } from "@/lib/notifications-data";

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Bell with the signed-in employee's notifications. */
export function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 60_000,
  });
  const markRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <Popover
      onOpenChange={(open) => {
        if (open && unread > 0) markRead.mutate();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          title="Notifications"
          className="relative grid size-6 place-items-center rounded-full border border-border bg-card/95 text-foreground shadow-md backdrop-blur transition-colors hover:bg-accent"
        >
          <Bell className="size-3" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid min-w-3.5 place-items-center rounded-full bg-destructive px-1 text-[8px] font-semibold leading-3.5 text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <p className="border-b border-border px-3 py-2 text-xs font-semibold">Notifications</p>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              You have no notifications yet.
            </p>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                if (n.link) navigate({ to: n.link as never });
              }}
              className={`block w-full border-b border-border/60 px-3 py-2 text-left transition-colors hover:bg-secondary ${
                n.read_at ? "" : "bg-accent/10"
              }`}
            >
              <p className="text-xs font-semibold">{n.title}</p>
              {n.body && <p className="text-[11px] text-muted-foreground">{n.body}</p>}
              <p className="mt-0.5 text-[10px] text-muted-foreground">{when(n.created_at)}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
