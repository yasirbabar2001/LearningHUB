import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ALL, type Filters } from "@/lib/analytics";

const hms = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${p2(Math.floor(s / 3600))}:${p2(Math.floor((s % 3600) / 60))}:${p2(s % 60)}`;
};

export function useVirtualProgress(sessionId: string | undefined, trainingId: string | undefined) {
  return useQuery({
    queryKey: ["va-progress", sessionId],
    enabled: !!sessionId && !!trainingId,
    queryFn: () => fetchVirtualProgress(sessionId!, trainingId!),
  });
}

export async function fetchVirtualProgress(sessionId: string, trainingId: string) {
  {
    {
      const [training, content, parts, att, fb, certs, views] = await Promise.all([
        supabase.from("trainings").select("training_name").eq("id", trainingId!).maybeSingle(),
        supabase.from("virtual_session_content").select("id").eq("session_id", sessionId!),
        supabase.from("training_participants").select("employee_code,employee_name").eq("training_id", trainingId!),
        supabase.from("evaluation_attempts").select("employee_code,phase,score_pct,passed,started_at,submitted_at").eq("training_id", trainingId!),
        supabase.from("feedback").select("employee_code,submitted_at").eq("training_id", trainingId!),
        supabase.from("certificates").select("employee_code,cert_no,issued_at").eq("session_id", sessionId!),
        supabase.from("virtual_content_views").select("employee_code,content_id,completed"),
      ]);
      const ids = new Set((content.data ?? []).map((c) => c.id));
      const k = (s: string | null) => (s ?? "").trim().toLowerCase();
      return (parts.data ?? []).map((p) => {
        const a = (att.data ?? []).filter((x) => k(x.employee_code) === k(p.employee_code));
        const pre = a.find((x) => x.phase === "pre");
        const post = a.find((x) => x.phase === "post" && x.passed) ?? a.find((x) => x.phase === "post");
        const viewed = (views.data ?? []).filter((v) => k(v.employee_code) === k(p.employee_code) && v.completed && ids.has(v.content_id)).length;
        const fbRow = (fb.data ?? []).find((f) => k(f.employee_code) === k(p.employee_code));
        const certRow = (certs.data ?? []).find((c) => k(c.employee_code) === k(p.employee_code));
        const startIso = pre?.started_at ?? pre?.submitted_at;
        const endIso = certRow?.issued_at ?? fbRow?.submitted_at;
        return {
          training: training.data?.training_name ?? "—",
          completed: certRow?.issued_at ? new Date(certRow.issued_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—",
          code: p.employee_code, name: p.employee_name ?? "",
          pre: pre ? `${Math.round(Number(pre.score_pct))}%` : "—",
          content: ids.size ? `${Math.round((viewed / ids.size) * 100)}%` : "—",
          post: post ? `${Math.round(Number(post.score_pct))}% ${post.passed ? "Pass" : "Fail"}` : "—",
          feedback: fbRow ? "Yes" : "No",
          cert: certRow?.cert_no ?? "—",
          attempts: a.filter((x) => x.phase === "post").length,
          time: startIso && endIso && certRow ? hms(new Date(endIso).getTime() - new Date(startIso).getTime()) : "—",
          status: certRow ? "Completed" : (pre || viewed > 0 || a.length > 0) ? "In-progress" : "Not completed",
        };
      });
    }
  }
}

/** One workbook with every virtual session's employee progress, honouring the dashboard filters. */
export async function downloadAllVirtualReport(f?: Filters) {
  const [{ data: sessions }, { data: trainings }, { data: people }] = await Promise.all([
    supabase.from("virtual_sessions").select("id,title,training_id").order("created_at", { ascending: false }),
    supabase.from("trainings").select("id,training_name,training_type,training_date,trainers(name)"),
    supabase.from("portal_users").select("employee_code,department_name,location_name,region_name,wing_name,designation_name,gender_name"),
  ]);
  const m = (v: string | null | undefined, x: string | undefined) => !x || x === ALL || (v ?? "") === x;
  const k = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
  const pmap = new Map((people ?? []).map((p) => [k(p.employee_code), p]));
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Virtual Training Report");
  ws.addRow(["Virtual session", "Training", "Training date", "Employee ID", "Name", "Designation", "Department", "Location", "Region", "Pre-test", "Content viewed", "Post-test", "Post-test attempts", "Feedback", "Certificate", "Completion date", "Time taken (HH:MM:SS)", "Status"]).font = { bold: true };
  let count = 0;
  for (const s of sessions ?? []) {
    const tr = (trainings ?? []).find((x) => x.id === s.training_id);
    const trainer = (tr?.trainers as { name?: string } | null)?.name ?? null;
    const d = tr?.training_date ?? "";
    if (f) {
      if (f.dateFrom && d && d < f.dateFrom) continue;
      if (f.dateTo && d && d > f.dateTo) continue;
      if (!m(tr?.training_name, f.training) || !m(tr?.training_type, f.trainingType) || !m(trainer, f.trainer)) continue;
    }
    const rows = await fetchVirtualProgress(s.id, s.training_id);
    for (const r of rows) {
      const p = pmap.get(k(r.code));
      if (f && !(m(p?.department_name, f.department) && m(p?.location_name, f.location) && m(p?.region_name, f.region)
        && m(p?.wing_name, f.wing) && m(p?.designation_name, f.designation) && m(p?.gender_name, f.gender))) continue;
      ws.addRow([s.title, r.training, d, r.code, r.name, p?.designation_name ?? "", p?.department_name ?? "", p?.location_name ?? "", p?.region_name ?? "", r.pre, r.content, r.post, r.attempts, r.feedback, r.cert, r.completed, r.time, r.status]);
      count++;
    }
  }
  if (!count) throw new Error("No virtual training records match the current filters.");
  ws.columns.forEach((c) => { c.width = 18; });
  const buf = await wb.xlsx.writeBuffer();
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([buf])); a.download = "virtual-training-report.xlsx"; a.click();
}

export function VirtualProgressTable({ sessionId, trainingId, title = "Employee progress", fileName = "virtual-session-progress" }: { sessionId?: string | undefined; trainingId?: string | undefined; title?: string; fileName?: string }) {
  const progress = useVirtualProgress(sessionId, trainingId);
  const exportXlsx = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Progress");
    ws.addRow(["Training", "Employee ID", "Name", "Pre-test", "Content viewed", "Post-test", "Post-test attempts", "Feedback", "Certificate", "Completion date", "Time taken (HH:MM:SS)", "Status"]);
    progress.data?.forEach((r) => ws.addRow([r.training, r.code, r.name, r.pre, r.content, r.post, r.attempts, r.feedback, r.cert, r.completed, r.time, r.status]));
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([buf])); a.download = `${fileName}.xlsx`; a.click();
  };
  return (
    <>
      <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{title}</h2>
        <Button size="sm" variant="outline" disabled={!progress.data?.length} onClick={() => void exportXlsx()}><Download className="mr-1 h-4 w-4" />Excel</Button></div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-xs">
          <thead className="text-left"><tr><th className="p-1">Training</th><th className="p-1">ID</th><th className="p-1">Name</th><th className="p-1">Pre</th><th className="p-1">Content</th><th className="p-1">Post</th><th className="p-1">Feedback</th><th className="p-1">Certificate</th><th className="p-1">Completed on</th><th className="p-1">Time (H:M:S)</th><th className="p-1">Status</th></tr></thead>
          <tbody>{progress.data?.map((r) => (
            <tr key={r.code} className="border-t"><td className="p-1">{r.training}</td><td className="p-1">{r.code}</td><td className="p-1">{r.name}</td><td className="p-1">{r.pre}</td><td className="p-1">{r.content}</td><td className="p-1">{r.post}</td><td className="p-1">{r.feedback}</td><td className="p-1">{r.cert}</td><td className="p-1 whitespace-nowrap">{r.completed}</td><td className="p-1 font-mono">{r.time}</td><td className="p-1">{r.status}</td></tr>
          ))}</tbody>
        </table>
        {progress.data?.length === 0 && <p className="text-sm text-muted-foreground">No employees assigned to this training yet.</p>}
      </div>
    </>
  );
}

/** Dashboard card: pick any virtual session and see its employee progress. */
export function VirtualProgressDashboardCard() {
  const sessions = useQuery({
    queryKey: ["va-sessions-lite"],
    queryFn: async () => (await supabase.from("virtual_sessions").select("id,title,training_id").order("created_at", { ascending: false })).data ?? [],
  });
  const [sel, setSel] = useState("");
  useEffect(() => { if (!sel && sessions.data?.[0]) setSel(sessions.data[0].id); }, [sessions.data, sel]);
  const s = sessions.data?.find((x) => x.id === sel);
  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Virtual session:</span>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={sel} onChange={(e) => setSel(e.target.value)}>
          {sessions.data?.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
        </select>
      </div>
      {sessions.data?.length === 0
        ? <p className="text-sm text-muted-foreground">No virtual sessions created yet.</p>
        : <VirtualProgressTable sessionId={s?.id} trainingId={s?.training_id} title="Virtual training — employee progress" />}
    </section>
  );
}
