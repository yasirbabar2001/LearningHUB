import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; title: string; status: string; enrolled: number; inProgress: number; completed: number };

export function VirtualOverview() {
  const [selected, setSelected] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["virtual-overview"],
    queryFn: async (): Promise<Row[]> => {
      const { data: sessions } = await supabase.from("virtual_sessions").select("id,title,status,training_id");
      const list = sessions ?? [];
      if (!list.length) return [];
      const tids = list.map((s) => s.training_id);
      const sids = list.map((s) => s.id);
      const [parts, attempts, certs, content] = await Promise.all([
        supabase.from("training_participants").select("training_id,employee_code").in("training_id", tids),
        supabase.from("evaluation_attempts").select("training_id,employee_code").in("training_id", tids),
        supabase.from("certificates").select("session_id,employee_code").in("session_id", sids),
        supabase.from("virtual_session_content").select("id,session_id").in("session_id", sids),
      ]);
      const contentIds = (content.data ?? []).map((c) => c.id);
      const views = contentIds.length
        ? (await supabase.from("virtual_content_views").select("content_id,employee_code").in("content_id", contentIds)).data ?? []
        : [];
      const contentSession = new Map((content.data ?? []).map((c) => [c.id, c.session_id]));
      return list.map((s) => {
        const enrolled = new Set((parts.data ?? []).filter((p) => p.training_id === s.training_id).map((p) => p.employee_code));
        const done = new Set((certs.data ?? []).filter((c) => c.session_id === s.id).map((c) => c.employee_code));
        const started = new Set<string>();
        (attempts.data ?? []).forEach((a) => a.training_id === s.training_id && started.add(a.employee_code));
        views.forEach((v) => contentSession.get(v.content_id) === s.id && v.employee_code && started.add(v.employee_code));
        const completed = [...enrolled].filter((e) => done.has(e)).length;
        const inProgress = [...enrolled].filter((e) => !done.has(e) && started.has(e)).length;
        return { id: s.id, title: s.title, status: s.status, enrolled: enrolled.size, inProgress, completed };
      });
    },
  });
  const rows = q.data ?? [];
  const enrolled = rows.reduce((a, r) => a + r.enrolled, 0);
  const inProgress = rows.reduce((a, r) => a + r.inProgress, 0);
  const completed = rows.reduce((a, r) => a + r.completed, 0);
  const pct = enrolled ? Math.round((completed / enrolled) * 100) : 0;
  const stats = [
    ["Total Virtual Trainings", rows.length],
    ["Active Virtual Trainings", rows.filter((r) => r.status === "active").length],
    ["Enrolled Employees", enrolled],
    ["In-progress Employees", inProgress],
    ["Completed Employees", completed],
    ["Completion %", `${pct}%`],
  ] as const;

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-3 font-semibold">Virtual sessions overview</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-md border bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-semibold">{q.isLoading ? "…" : value}</div>
          </div>
        ))}
      </div>
      <h3 className="mb-2 mt-5 text-sm font-medium">Training-wise detail</h3>
      <div className="max-h-64 overflow-y-auto rounded-md border">
        {rows.length === 0 && <p className="p-3 text-sm text-muted-foreground">{q.isLoading ? "Loading…" : "No virtual sessions yet."}</p>}
        {rows.map((r) => {
          const open = selected === r.id;
          const p = r.enrolled ? Math.round((r.completed / r.enrolled) * 100) : 0;
          return (
            <div key={r.id} className="border-b last:border-b-0">
              <button type="button" onClick={() => setSelected(open ? null : r.id)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50 ${open ? "bg-muted/60 font-medium" : ""}`}>
                <span className="truncate">{r.title}</span>
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">{r.status === "active" ? "Active" : "Inactive"}</span>
              </button>
              {open && (
                <div className="grid grid-cols-2 gap-2 px-3 pb-3 text-sm md:grid-cols-4">
                  <div><span className="text-muted-foreground">Enrolled:</span> <b>{r.enrolled}</b></div>
                  <div><span className="text-muted-foreground">In-progress:</span> <b>{r.inProgress}</b></div>
                  <div><span className="text-muted-foreground">Completed:</span> <b>{r.completed}</b></div>
                  <div><span className="text-muted-foreground">Completion:</span> <b>{p}%</b></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
