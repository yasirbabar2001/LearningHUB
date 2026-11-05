import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/executive")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", replace: true });
  },
  head: () => ({
    meta: [
      { title: "Executive Summary | ABHI Learning HUB" },
      { name: "description", content: "Executive training insights are now available in the comprehensive dashboard." },
      { property: "og:title", content: "Executive Summary | ABHI Learning HUB" },
      { property: "og:description", content: "Executive training insights are now available in the comprehensive dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});
