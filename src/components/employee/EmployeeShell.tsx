import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ClipboardCheck,
  MessageSquareText,
  PanelLeft,
  PieChart,
  Presentation,
  Target,
  Trophy,
  UserPlus,
  MonitorPlay,
  Award,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BankLogo } from "@/components/admin/BankLogo";
import { usePortalUser } from "@/lib/portal-session";
import { isLineManager, isTrainer } from "@/lib/tna.functions";
import { listMyTrainings } from "@/lib/training-participants.functions";
import { supabase } from "@/integrations/supabase/client";

const NAV_ITEMS = [
  { to: "/leaderboard" as const, label: "Leaderboard", icon: Trophy },
  { to: "/participant-feedback" as const, label: "Participant Feedback", icon: MessageSquareText },
  { to: "/evaluation" as const, label: "Training Evaluation", icon: ClipboardCheck },
  { to: "/virtual" as const, label: "Virtual Sessions", icon: MonitorPlay },
  { to: "/certificates" as const, label: "My Certificates", icon: Award },
  { to: "/survey" as const, label: "L&D Survey", icon: PieChart },
  { to: "/trainer-feedback" as const, label: "Trainer Feedback", icon: Presentation },
  { to: "/tna" as const, label: "Training Need Assessment", icon: Target },
  { to: "/onboarding" as const, label: "Onboarding Attendance", icon: UserPlus },
];

export function EmployeeShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const { data: portalUser } = usePortalUser();
  const code = portalUser?.employee_code ?? "";
  const { data: lineManager } = useQuery({
    queryKey: ["is-line-manager", code],
    enabled: Boolean(code),
    staleTime: 300_000,
    queryFn: () => isLineManager(),
  });
  const { data: trainer } = useQuery({
    queryKey: ["is-trainer", code],
    enabled: Boolean(code),
    staleTime: 300_000,
    queryFn: () => isTrainer(),
  });
  const { data: myTrainings } = useQuery({
    queryKey: ["my-trainings-nav", portalUser?.id ?? ""],
    enabled: Boolean(portalUser?.id),
    staleTime: 120_000,
    queryFn: () => listMyTrainings(),
  });
  const { data: activeSurvey } = useQuery({
    queryKey: ["has-active-survey"],
    staleTime: 120_000,
    queryFn: async () => {
      const { data } = await supabase.from("surveys").select("id").eq("status", "active").limit(1);
      return (data?.length ?? 0) > 0;
    },
  });
  const hasTrainings = (myTrainings?.length ?? 0) > 0;
  const hasEvaluation = (myTrainings ?? []).some((t) => t.has_evaluation);
  const navItems = NAV_ITEMS.filter((item) => {
    if (item.to === "/onboarding") return portalUser?.onboarding_enabled === true;
    if (item.to === "/tna") return lineManager === true;
    if (item.to === "/trainer-feedback") return trainer === true;
    if (item.to === "/participant-feedback") return hasTrainings;
    if (item.to === "/evaluation") return hasEvaluation;
    if (item.to === "/survey") return activeSurvey === true;
    return true;
  });

  return (
    <div className={`min-h-screen bg-muted ${collapsed ? "md:pl-16" : "md:pl-64"}`}>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-sidebar-border bg-sidebar px-4 py-6 text-sidebar-foreground transition-[width] duration-200 md:flex md:flex-col ${
          collapsed ? "w-16 items-center px-2" : "w-64"
        }`}
      >
        <div
          className={`flex w-full items-center ${collapsed ? "justify-center" : "justify-between"} mb-4`}
        >
          {!collapsed && (
            <BankLogo variant="dark" className="h-11 max-w-[190px]" />
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sidebar-foreground/40 transition-all duration-150 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground ${
              collapsed ? "" : "mt-1"
            }`}
          >
            <PanelLeft className={`size-4 ${collapsed ? "" : "opacity-70"}`} />
          </button>
        </div>
        <nav className={`mt-5 space-y-1.5 ${collapsed ? "w-full" : ""}`} aria-label="Employee portal">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                  collapsed ? "justify-center px-2" : ""
                } ${
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="sticky top-0 z-30 border-b border-sidebar-border bg-sidebar px-4 pb-3 pt-12 text-sidebar-foreground shadow-sm sm:py-4">
        <div className="mx-auto max-w-5xl sm:pr-44">
          <h1 className="font-display text-xl font-semibold text-sidebar-foreground">{title}</h1>
          <p className="text-xs text-sidebar-foreground/70">{subtitle}</p>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b bg-card px-3 py-2 md:hidden" aria-label="Employee portal">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs ${
              pathname === to ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        ))}
      </nav>

      <main className="mx-auto max-w-5xl space-y-5 px-3 py-5 sm:px-5">{children}</main>
    </div>
  );
}