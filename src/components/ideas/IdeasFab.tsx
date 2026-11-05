import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lightbulb } from "lucide-react";
import { usePortalUser } from "@/lib/portal-session";
import { getIdeasContext } from "@/lib/ideas.functions";

const HIDDEN = ["/login", "/change-password", "/set-password", "/ideas", "/"];

export function IdeasFab() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: user } = usePortalUser();
  const { data: ctx } = useQuery({
    queryKey: ["ideas-ctx"],
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    queryFn: () => getIdeasContext(),
  });
  if (!user || user.must_change_password || !ctx?.settings.enabled || HIDDEN.includes(pathname)) return null;
  return (
    <Link
      to="/ideas"
      search={{}}
      title={"Have an idea? Keh Do ABHI!"}
      className="group fixed bottom-40 right-4 z-40 flex items-center gap-2 rounded-full border-2 border-primary bg-sidebar py-2 pl-2 pr-4 text-sidebar-foreground shadow-lg transition-transform hover:scale-105"
    >
      <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
        <Lightbulb className="size-5" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-sm font-bold tracking-wide">ABHI IDEAS</span>
        <span className="block text-[10px] text-sidebar-foreground/75">{"Have an idea? Keh Do ABHI!"}</span>
      </span>
    </Link>
  );
}
