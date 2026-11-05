import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LeaderboardComposer, LeaderboardFeed } from "@/components/leaderboard/LeaderboardFeed";
import { EmployeeShell } from "@/components/employee/EmployeeShell";
import { ChatDock } from "@/components/chat/ChatDock";

export const Route = createFileRoute("/leaderboard")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { chat?: string | undefined } => ({
    chat: typeof s['chat'] === "string" ? s['chat'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Leaderboard | ABHI Learning HUB" },
      {
        name: "description",
        content:
          "Share and celebrate achievements, success stories and acknowledgements across ABHI Microfinance Bank.",
      },
      { property: "og:title", content: "Leaderboard | ABHI Learning HUB" },
      {
        property: "og:description",
        content: "Achievements, success stories and acknowledgements from across ABHI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const navigate = useNavigate();
  const { chat } = Route.useSearch();
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      if (!data.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      setUserId(data.user.id);
      setChecked(true);
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  if (!checked || !userId) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <p className="text-sm text-muted-foreground">Loading leaderboard…</p>
      </main>
    );
  }

  const setChat = (value: string | undefined) =>
    navigate({ to: "/leaderboard", search: { chat: value }, replace: true });

  return (
    <EmployeeShell title="Leaderboard" subtitle="Achievements, success stories & acknowledgements">
      <LeaderboardComposer userId={userId} />
      <LeaderboardFeed />

      <ChatDock userId={userId} chat={chat} setChat={setChat} />
    </EmployeeShell>
  );
}
