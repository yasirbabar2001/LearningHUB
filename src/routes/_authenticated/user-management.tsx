import { createFileRoute } from "@tanstack/react-router";
import { PortalUsersPage } from "@/components/admin/EmployeeAccountsPanel";

export const Route = createFileRoute("/_authenticated/user-management")({
  validateSearch: (s: Record<string, unknown>): { tab?: string } =>
    typeof s["tab"] === "string" ? { tab: s["tab"] } : {},
  head: () => ({
    meta: [
      { title: "User Management | L&D Portal" },
      { name: "description", content: "Create employee accounts and grant admin rights in one place." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalUsersPage,
});
