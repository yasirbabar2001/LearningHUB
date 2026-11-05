import { createFileRoute, redirect } from "@tanstack/react-router";

// Messenger now lives inside the Leaderboard as "ABHI Chat"; keep old links working.
export const Route = createFileRoute("/messages")({
  validateSearch: (s: Record<string, unknown>): { to?: string | undefined } => ({ to: typeof s['to'] === "string" ? s['to'] : undefined }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/leaderboard", search: { chat: search.to ?? "open" } });
  },
});
