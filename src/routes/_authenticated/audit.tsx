import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/Kpi";
import { useAuditLogs } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail | ABHI Learning HUB" },
      { name: "description", content: "Chronological log of administrative actions in the portal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { data = [], isLoading } = useAuditLogs();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Last 500 administrative actions.</p>
      </div>
      <SectionCard title="Activity Log">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Admin</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Entity</th>
                  <th className="py-2 pr-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {data.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">{l.admin_email ?? "—"}</td>
                    <td className="py-2 pr-3 capitalize">{l.action}</td>
                    <td className="py-2 pr-3">{l.entity ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {l.details ? JSON.stringify(l.details) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.length ? (
              <p className="py-4 text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : null}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
