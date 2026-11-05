import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/analytics")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", replace: true });
  },
  head: () => ({
    meta: [
      { title: "Analytics | ABHI Learning HUB" },
      { name: "description", content: "Training analytics are now available in the comprehensive dashboard." },
      { property: "og:title", content: "Analytics | ABHI Learning HUB" },
      { property: "og:description", content: "Training analytics are now available in the comprehensive dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});