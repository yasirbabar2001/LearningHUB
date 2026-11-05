import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BankLogo } from "@/components/admin/BankLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { completePortalPasswordChange } from "@/lib/portal-users.functions";
import { passwordRuleError, PASSWORD_RULES_TEXT } from "@/lib/password-rules";

export const Route = createFileRoute("/change-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create Your Password | ABHI Learning HUB" },
      {
        name: "description",
        content: "Replace your one-time password with a personal password to access the portal.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) navigate({ to: "/login", replace: true });
      else setReady(true);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ruleErr = passwordRuleError(password);
    if (ruleErr) {
      toast.error(ruleErr);
      return;
    }
    if (/^Abhi@(\d{13}|.+Y)$/i.test(password)) {
      toast.error("Please choose a password different from the one-time password.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
        ...(current ? ({ current_password: current } as Record<string, string>) : {}),
      } as never);
      if (error) throw error;
      await completePortalPasswordChange();
      await qc.invalidateQueries({ queryKey: ["portal-user"] });
      await qc.refetchQueries({ queryKey: ["portal-user"] });
      toast.success("Password updated. Welcome to ABHI Learning HUB.");
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update your password.");
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
              <KeyRound className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-semibold">Create your password</h1>
              <p className="text-xs text-muted-foreground">
                Replace the one-time password with a password only you know
              </p>
            </div>
          </div>
        </div>

        {!ready ? (
          <p className="text-sm text-muted-foreground">Checking your session…</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current">Current password</Label>
              <PasswordInput
                id="current"
                autoComplete="current-password"
                value={current}
                maxLength={72}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new">New password</Label>
              <PasswordInput
                id="new"
                autoComplete="new-password"
                value={password}
                maxLength={72}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">{PASSWORD_RULES_TEXT}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <PasswordInput
                id="confirm"
                autoComplete="new-password"
                value={confirm}
                maxLength={72}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving…" : "Save password"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
