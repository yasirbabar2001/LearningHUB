import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BankLogo } from "@/components/admin/BankLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  clearFailedPortalLogins,
  portalSignIn,
} from "@/lib/portal-users.functions";
import { setPortalSessionKey } from "@/lib/portal-session";
import { passwordExpiry } from "@/lib/password-expiry";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Employee Sign In | ABHI Learning HUB" },
      {
        name: "description",
        content:
          "Sign in with your ABHI Employee ID to submit training feedback, take evaluations and complete the L&D survey.",
      },
      { property: "og:title", content: "Employee Sign In | ABHI Learning HUB" },
      {
        property: "og:description",
        content: "Employee access to ABHI Learning & Development forms and assessments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !password) {
      toast.error("Enter your Employee ID and password.");
      return;
    }
    setBusy(true);
    try {
      const res = await portalSignIn({ data: { employeeCode: code.trim(), password } });
      if (!res.ok) throw new Error(res.message);
      const { data, error } = await supabase.auth.setSession({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      });
      if (error || !data.user) throw new Error("Sign in failed. Please try again.");
      setPortalSessionKey(res.session_key);
      await clearFailedPortalLogins().catch(() => undefined);
      const { data: row } = await supabase
        .from("portal_users")
        .select("status,must_change_password,password_changed_at")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!row || row.status !== "active") {
        await supabase.auth.signOut();
        toast.error("This account has been deactivated. Please contact L&D.");
        return;
      }
      await qc.invalidateQueries({ queryKey: ["portal-user"] });
      if (row.must_change_password) {
        navigate({ to: "/change-password", replace: true });
        return;
      }
      const exp = passwordExpiry(row.password_changed_at);
      if (exp.state === "expired") {
        toast.error("Your password has expired. Please set a new password to continue.");
        navigate({ to: "/change-password", replace: true });
        return;
      }
      if (exp.state === "warning") {
        toast.warning(
          `Your password is over 3 months old. Please change it — it becomes mandatory in ${exp.daysLeft} day${exp.daysLeft === 1 ? "" : "s"}.`,
          { duration: 10000, action: { label: "Change now", onClick: () => navigate({ to: "/change-password" }) } },
        );
      }
      navigate({ to: "/leaderboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-card p-7 shadow-lg">
        <div className="mb-6">
          <BankLogo className="mb-4 h-12" />
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
              <LogIn className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-semibold">ABHI Learning HUB</h1>
              <p className="text-xs text-muted-foreground">
                Sign in with your Employee ID to continue
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Employee ID</Label>
            <Input
              id="code"
              value={code}
              maxLength={50}
              autoComplete="username"
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              value={password}
              maxLength={72}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-5 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          Contact with L&D team for login instructions.{" "}
          <a
            href="mailto:Learningdevelopment@abhibank.com"
            className="font-medium underline underline-offset-2 hover:text-foreground"
          >
            Learningdevelopment@abhibank.com
          </a>
        </p>
      </div>
    </main>
  );
}
