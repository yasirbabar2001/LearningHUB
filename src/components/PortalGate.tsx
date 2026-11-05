import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { usePortalUser } from "@/lib/portal-session";
import type { PortalUser } from "@/lib/portal-session";
import { passwordExpiry } from "@/lib/password-expiry";

/**
 * Wraps an employee-facing form. Only renders its children once a signed-in,
 * active portal user is available; otherwise sends the visitor to the login page.
 */
export function PortalGate({ children }: { children: (user: PortalUser) => React.ReactNode }) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePortalUser();

  useEffect(() => {
    if (isLoading) return;
    if (!data) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (data.status !== "active") {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (data.must_change_password || passwordExpiry(data.password_changed_at).state === "expired") navigate({ to: "/change-password", replace: true });
  }, [data, isLoading, navigate]);

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <p className="text-sm text-muted-foreground">Loading your details…</p>
      </main>
    );
  }
  if (isError || !data || data.status !== "active" || data.must_change_password || passwordExpiry(data.password_changed_at).state === "expired") {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </main>
    );
  }

  return <>{children(data)}</>;
}

export function IdentityCard({ user }: { user: PortalUser }) {
  const rows: [string, string | null][] = [
    ["Employee ID", user.employee_code],
    ["Name", user.name],
    ["Designation", user.designation_name],
    ["Department", user.department_name],
    ["Location", user.location_name],
    ["Region", user.region_name],
    ["Wing", user.wing_name],
    ["Gender", user.gender_name],
  ];
  return (
    <dl className="grid gap-3 rounded-lg bg-secondary p-4 text-sm sm:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="font-medium">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
