import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MonitorPlay, CheckCircle2 } from "lucide-react";
import { EmployeeShell } from "@/components/employee/EmployeeShell";
import { PortalGate } from "@/components/PortalGate";
import { listMyVirtualSessions } from "@/lib/virtual.functions";

export const Route = createFileRoute("/virtual/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Virtual Sessions | ABHI Learning HUB" },
      { name: "description", content: "Complete your assigned online trainings and earn certificates." },
      { property: "og:title", content: "Virtual Sessions | ABHI Learning HUB" },
      { property: "og:description", content: "Self-paced virtual trainings with tests and certificates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PortalGate>{() => <List />}</PortalGate>,
});

function List() {
  const q = useQuery({ queryKey: ["my-virtual"], queryFn: () => listMyVirtualSessions() });
  return (
    <EmployeeShell title="Virtual Sessions" subtitle="Learn, test and earn your certificate">
      <div className="mx-auto max-w-4xl p-4 md:p-8">
        <p className="mb-6 text-sm text-muted-foreground">Pre-test → learn → post-test → feedback → certificate.</p>
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {q.error && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}
        {q.data?.length === 0 && <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">No virtual sessions are assigned to you yet.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          {q.data?.map((s) => (
            <Link key={s.id} to="/virtual/$id" params={{ id: s.id }} className="rounded-lg border bg-card p-5 transition hover:border-primary">
              <div className="flex items-start gap-3">
                <MonitorPlay className="mt-0.5 h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-semibold">{s.title}</p>
                  {s.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
                  <p className="mt-3 text-xs font-medium">
                    {s.completed ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-primary" />Certificate earned</span> : "Open session →"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <Link to="/certificates" className="mt-6 inline-block text-sm font-medium underline">View my certificates</Link>
      </div>
    </EmployeeShell>
  );
}
