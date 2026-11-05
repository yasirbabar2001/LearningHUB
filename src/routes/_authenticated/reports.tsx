import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/reports")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", replace: true });
  },
  head: () => ({
    meta: [
      { title: "Reports | ABHI Learning HUB" },
      { name: "description", content: "Training reports are now available in the comprehensive dashboard." },
      { property: "og:title", content: "Reports | ABHI Learning HUB" },
      { property: "og:description", content: "Training reports are now available in the comprehensive dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});