import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChatDock } from "@/components/chat/ChatDock";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LeaderboardComposer,
  LeaderboardFeed,
  usePendingLeaderboardCount,
} from "@/components/leaderboard/LeaderboardFeed";

export const Route = createFileRoute("/_authenticated/leaderboard-admin")({
  validateSearch: (s: Record<string, unknown>): { chat?: string | undefined } => ({
    chat: typeof s['chat'] === "string" ? s['chat'] : undefined,
  }),
  component: LeaderboardAdminPage,
});

function LeaderboardAdminPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const pending = usePendingLeaderboardCount();
  const { chat } = Route.useSearch();
  const navigate = useNavigate();
  const setChat = (value: string | undefined) =>
    navigate({ to: "/leaderboard-admin", search: { chat: value }, replace: true });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          Approve posts and comments before they go live, and post as the ABHI L&amp;D Team.
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-5">
        <TabsList>
          <TabsTrigger value="pending">
            Pending approvals
            {pending > 0 && (
              <span className="ml-2 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                {pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All posts</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Everything waiting for review — preview each post or comment, then approve or reject.
          </p>
          <LeaderboardFeed moderate pendingOnly />
        </TabsContent>

        <TabsContent value="all" className="space-y-5">
          {userId && <LeaderboardComposer userId={userId} isAdmin />}
          <LeaderboardFeed moderate />
        </TabsContent>
      </Tabs>
      {userId && <ChatDock asTeam userId={userId} chat={chat} setChat={setChat} />}
    </div>
  );
}
