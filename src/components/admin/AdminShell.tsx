import { portalSignOut } from "@/lib/portal-session";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  ListTree,
  LogOut,
  MessageSquareText,
  PieChart,
  Presentation,
  ScrollText,
  Settings as SettingsIcon,
  Target,
  Trophy,
  UserCog,
  UserPlus,
  Users,
  MonitorPlay,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { BankLogo } from "@/components/admin/BankLogo";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { label: string; icon: React.ComponentType<{ className?: string }>; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Training Programs",
    icon: GraduationCap,
    items: [
      { to: "/trainings", label: "Trainings", icon: GraduationCap },
      { to: "/virtual-admin", label: "Virtual Sessions", icon: MonitorPlay },
      { to: "/training-calendar", label: "Training Calendar", icon: CalendarDays },
      { to: "/tna-admin", label: "Training Need Assessment", icon: Target },
      { to: "/onboarding-report", label: "Onboarding Sessions", icon: UserPlus },
    ],
  },
  {
    label: "Feedback & Evaluation",
    icon: MessageSquareText,
    items: [
      { to: "/feedback", label: "Feedback", icon: MessageSquareText },
      { to: "/trainer-reports", label: "Trainer Feedback", icon: Presentation },
      { to: "/evaluations", label: "Pre & Post Evaluation", icon: ClipboardCheck },
      { to: "/survey-report", label: "L&D Survey", icon: PieChart },
      { to: "/leaderboard-admin", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    label: "ABHI IDEAS",
    icon: Lightbulb,
    items: [{ to: "/ideas-admin", label: "Ideas Dashboard", icon: Lightbulb }],
  },
  {
    label: "Content & Setup",
    icon: ListTree,
    items: [
      { to: "/lov", label: "LOV Management", icon: ListTree },
      { to: "/questions", label: "Questionnaire", icon: ClipboardList },
    ],
  },
  {
    label: "Users & Access",
    icon: Users,
    items: [
      { to: "/user-management", label: "User Management", icon: UserCog },
      { to: "/profile-requests", label: "Profile Approvals", icon: UserCog },
      { to: "/audit", label: "Audit Log", icon: ScrollText },
      { to: "/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

const NAV_FLAT = NAV_GROUPS.flatMap((g) => g.items);

export function AdminShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeGroup = NAV_GROUPS.findIndex((g) => g.items.some((i) => pathname.startsWith(i.to)));
  const activeItem = NAV_FLAT.find((item) => pathname.startsWith(item.to));
  const [open, setOpen] = useState<Record<number, boolean>>(() => ({
    ...(activeGroup >= 0 ? { [activeGroup]: true } : { 0: true }),
  }));

  const signOut = async () => {
    await logAudit("logout");
    await portalSignOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="border-b border-sidebar-border px-5 py-5">
          <BankLogo variant="dark" className="mb-3 block h-11 w-auto max-w-[200px]" />
          <p className="font-display text-lg font-semibold text-white">L&amp;D Portal</p>
          <p className="text-xs text-sidebar-foreground/70">ABHI Learning HUB</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_GROUPS.map((group, gi) => {
            const GroupIcon = group.icon;
            const isOpen = !!open[gi];
            const hasActive = group.items.some((i) => pathname.startsWith(i.to));
            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() =>
                    setOpen((prev) => {
                      if (prev[gi]) return { [gi]: false };
                      return { [gi]: true };
                    })
                  }
                  className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent ${
                    hasActive ? "text-accent" : "text-sidebar-foreground/90"
                  }`}
                >
                  <GroupIcon className="size-4 shrink-0" />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown
                    className={`size-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
                    {group.items.map(({ to, label, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        className="flex items-center gap-2.5 rounded-md border-l-2 border-transparent px-3 py-1.5 text-[13px] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
                        activeProps={{
                          className: "bg-sidebar-accent border-accent font-medium text-accent",
                        }}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/85 hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-40 flex min-h-16 items-center border-b border-sidebar-border bg-sidebar px-4 pb-2 pt-12 text-sidebar-foreground shadow-sm sm:px-5 sm:py-0 sm:pr-72 lg:px-6 lg:pr-80">
          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden">
              <BankLogo variant="dark" className="h-8 max-w-[190px]" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold text-sidebar-foreground">
                {activeItem?.label ?? "L&D Portal"}
              </p>
              <p className="hidden text-xs text-sidebar-foreground/70 sm:block">ABHI Learning HUB</p>
            </div>
          </div>
        </header>
        <nav className="no-print flex gap-1 overflow-x-auto border-b bg-card px-3 py-2 lg:hidden">
          {NAV_FLAT.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-muted-foreground"
              activeProps={{ className: "bg-secondary font-medium text-foreground" }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
