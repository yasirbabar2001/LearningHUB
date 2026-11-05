import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/portal-users")({
  beforeLoad: () => { throw redirect({ to: "/user-management", search: { tab: "employees" } }); },
});
