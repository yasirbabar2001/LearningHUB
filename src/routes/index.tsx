import { usePortalUser } from "@/lib/portal-session";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ABHI Learning HUB | Learning & Development" },
      {
        name: "description",
        content:
          "Choose participant feedback or trainer feedback for classroom and virtual training sessions conducted by the Learning & Development department.",
      },
      { property: "og:title", content: "ABHI Learning HUB | Learning & Development" },
      {
        property: "og:description",
        content: "Submit participant or trainer feedback for L&D training sessions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const { data: user, isPending } = usePortalUser();

  useEffect(() => {
    if (isPending) return;
    navigate({ to: user ? "/leaderboard" : "/login", replace: true });
  }, [isPending, navigate, user]);

  return (
    <main className="grid min-h-screen place-items-center bg-sidebar px-4">
      <p className="text-sm text-sidebar-foreground/70">Opening employee sign in…</p>
    </main>
  );
}
