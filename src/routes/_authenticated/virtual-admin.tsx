import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Upload, FileText, PlayCircle, Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect, type SearchOption } from "@/components/ui/searchable-select";
import { VirtualOverview } from "@/components/virtual/VirtualOverview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/virtual-admin")({
  head: () => ({
    meta: [
      { title: "Virtual Sessions Admin | ABHI Learning HUB" },
      { name: "description", content: "Create virtual trainings, upload content and track employee progress." },
      { property: "og:title", content: "Virtual Sessions Admin | ABHI Learning HUB" },
      { property: "og:description", content: "Manage self-paced virtual trainings and certificates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VirtualAdmin,
});

function VirtualAdmin() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [authorityId, setAuthorityId] = useState("");
  const trainings = useQuery({
    queryKey: ["va-trainings"],
    queryFn: async () => (await supabase.from("trainings").select("id,training_name,training_code,training_date").eq("status", "active").order("training_date", { ascending: false })).data ?? [],
  });
  const sessions = useQuery({
    queryKey: ["va-sessions"],
    queryFn: async () => (await supabase.from("virtual_sessions").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const authorities = useQuery({
    queryKey: ["certificate-authorities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_users")
        .select("id,employee_code,name,designation_name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [form, setForm] = useState({ training_id: "", title: "", description: "", signatory_name: "", signatory_designation: "" });

  const authorityOptions: SearchOption[] = (authorities.data ?? []).map((person) => ({
    value: person.id,
    label: person.name,
    hint: [person.designation_name, person.employee_code].filter(Boolean).join(" · "),
  }));

  const chooseAuthority = (id: string) => {
    setAuthorityId(id);
    const person = authorities.data?.find((candidate) => candidate.id === id);
    setForm((current) => ({
      ...current,
      signatory_name: person?.name ?? "",
      signatory_designation: person?.designation_name ?? "",
    }));
  };

  const create = async (): Promise<void> => {
    if (!form.training_id || !form.title.trim()) { toast.error("Choose a training and enter a title."); return; }
    if (!authorityId || !form.signatory_name || !form.signatory_designation) { toast.error("Choose a certificate issuance authority with a designation."); return; }
    const { error } = await supabase.from("virtual_sessions").insert({ ...form, title: form.title.trim() });
    if (error) { toast.error(error.message.includes("duplicate") ? "This training already has a virtual session." : error.message); return; }
    toast.success("Virtual session created");
    setForm({ training_id: "", title: "", description: "", signatory_name: "", signatory_designation: "" });
    setAuthorityId("");
    void qc.invalidateQueries({ queryKey: ["va-sessions"] });
  };
  const used = new Set((sessions.data ?? []).map((s) => s.training_id));
  const q = search.trim().toLowerCase();
  const filteredSessions = (sessions.data ?? []).filter((s) => {
    if (!q) return true;
    const t = trainings.data?.find((x) => x.id === s.training_id);
    return [s.title, t?.training_name, t?.training_code].some((v) => (v ?? "").toLowerCase().includes(q));
  });

  return (
    <div className="p-4 md:p-6">
      <Tabs defaultValue="new">
        <TabsList>
          <TabsTrigger value="new">New Virtual Training</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="new" className="mt-4 space-y-6">
      <p className="text-sm text-muted-foreground">Self-paced online trainings: pre-test, content, post-test, feedback and certificate. Assign employees and add questions from Trainings.</p>
      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 font-semibold">New virtual session</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Training</Label>
            <select className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.training_id}
              onChange={(e) => { const t = trainings.data?.find((x) => x.id === e.target.value); setForm({ ...form, training_id: e.target.value, title: form.title || t?.training_name || "" }); }}>
              <option value="">Select training…</option>
              {trainings.data?.filter((t) => !used.has(t.id)).map((t) => <option key={t.id} value={t.id}>{t.training_code} · {t.training_name}</option>)}
            </select></div>
          <div><Label>Title</Label><Input className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea className="mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Certificate issuance authority</Label><SearchableSelect className="mt-1" options={authorityOptions} value={authorityId} onChange={chooseAuthority} placeholder="Select employee…" searchPlaceholder="Search name, ID or designation…" emptyText="No matching employee found." /></div>
          <div><Label>Authority designation</Label><Input className="mt-1" value={form.signatory_designation} readOnly placeholder="Filled from User Management" /></div>
        </div>
        <Button className="mt-4" onClick={() => void create()}>Create session</Button>
      </section>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search training to manage…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <section className="rounded-lg border bg-card">
        <div className="max-h-[248px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b bg-muted text-left"><tr><th className="p-3">Session</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
            <tbody>
              {filteredSessions.length === 0 && (sessions.data?.length ?? 0) > 0 && <tr><td className="p-3 text-muted-foreground" colSpan={3}>No training matches your search.</td></tr>}
              {filteredSessions.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="p-3 font-medium">{s.title}</td>
                  <td className="p-3">
                    <Switch checked={s.status === "active"} onCheckedChange={async (v) => {
                      await supabase.from("virtual_sessions").update({ status: v ? "active" : "inactive" }).eq("id", s.id);
                      void qc.invalidateQueries({ queryKey: ["va-sessions"] });
                    }} />
                  </td>
                  <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => setSelected(selected === s.id ? null : s.id)}>{selected === s.id ? "Close" : "Manage"}</Button></td>
                </tr>
              ))}
              {sessions.data?.length === 0 && <tr><td className="p-3 text-muted-foreground" colSpan={3}>No virtual sessions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {selected && (() => {
        const session = sessions.data?.find((item) => item.id === selected);
        return session ? <Manage session={session} authorityOptions={authorityOptions} authorities={authorities.data ?? []} /> : null;
      })()}
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <VirtualOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Authority = { id: string; employee_code: string; name: string; designation_name: string | null };
type ManagedSession = { id: string; training_id: string; signatory_name: string | null; signatory_designation: string | null };

function Manage({ session, authorityOptions, authorities }: { session: ManagedSession; authorityOptions: SearchOption[]; authorities: Authority[] }) {
  const sessionId = session.id;
  const trainingId = session.training_id;
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const selectedAuthorityId = authorities.find((person) =>
    person.name === session.signatory_name && (person.designation_name ?? "") === (session.signatory_designation ?? ""),
  )?.id ?? "";
  const content = useQuery({
    queryKey: ["va-content", sessionId],
    queryFn: async () => (await supabase.from("virtual_session_content").select("*").eq("session_id", sessionId).order("display_order")).data ?? [],
  });
  const progress = useQuery({
    queryKey: ["va-progress", sessionId],
    queryFn: async () => {
      const [parts, att, fb, certs, views] = await Promise.all([
        supabase.from("training_participants").select("employee_code,employee_name").eq("training_id", trainingId),
        supabase.from("evaluation_attempts").select("employee_code,phase,score_pct,passed,started_at,submitted_at").eq("training_id", trainingId),
        supabase.from("feedback").select("employee_code,submitted_at").eq("training_id", trainingId),
        supabase.from("certificates").select("employee_code,cert_no,issued_at").eq("session_id", sessionId),
        supabase.from("virtual_content_views").select("employee_code,content_id,completed"),
      ]);
      const ids = new Set((content.data ?? []).map((c) => c.id));
      const k = (s: string | null) => (s ?? "").trim().toLowerCase();
      const hms = (ms: number) => {
        const s = Math.max(0, Math.floor(ms / 1000));
        const p2 = (n: number) => String(n).padStart(2, "0");
        return `${p2(Math.floor(s / 3600))}:${p2(Math.floor((s % 3600) / 60))}:${p2(s % 60)}`;
      };
      return (parts.data ?? []).map((p) => {
        const a = (att.data ?? []).filter((x) => k(x.employee_code) === k(p.employee_code));
        const pre = a.find((x) => x.phase === "pre");
        const post = a.find((x) => x.phase === "post" && x.passed) ?? a.find((x) => x.phase === "post");
        const viewed = (views.data ?? []).filter((v) => k(v.employee_code) === k(p.employee_code) && v.completed && ids.has(v.content_id)).length;
        const fbRow = (fb.data ?? []).find((f) => k(f.employee_code) === k(p.employee_code));
        const certRow = (certs.data ?? []).find((c) => k(c.employee_code) === k(p.employee_code));
        const startIso = pre?.started_at ?? pre?.submitted_at;
        const endIso = certRow?.issued_at ?? fbRow?.submitted_at;
        const time = startIso && endIso && certRow ? hms(new Date(endIso).getTime() - new Date(startIso).getTime()) : "—";
        return {
          code: p.employee_code, name: p.employee_name ?? "",
          pre: pre ? `${Math.round(Number(pre.score_pct))}%` : "—",
          content: ids.size ? `${Math.round((viewed / ids.size) * 100)}%` : "—",
          post: post ? `${Math.round(Number(post.score_pct))}% ${post.passed ? "Pass" : "Fail"}` : "—",
          feedback: fbRow ? "Yes" : "No",
          cert: certRow?.cert_no ?? "—",
          time,
        };
      });
    },
    enabled: content.isSuccess,
  });

  const upload = async (file: File): Promise<void> => {
    const kind = file.type === "application/pdf" ? "pdf" : file.type.startsWith("video/") ? "video" : null;
    if (!kind) { toast.error("Please upload a PDF or a video file."); return; }
    if (file.size > 100 * 1024 * 1024) { toast.error("Files must be 100 MB or smaller."); return; }
    setBusy(true);
    const path = `${sessionId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("virtual-content").upload(path, file, { contentType: file.type });
    if (!error) await supabase.from("virtual_session_content").insert({ session_id: sessionId, kind, storage_path: path, title: title.trim() || file.name, display_order: (content.data?.length ?? 0) + 1 });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setTitle(""); toast.success("Content added");
    void qc.invalidateQueries({ queryKey: ["va-content", sessionId] });
  };
  const remove = async (id: string, path: string) => {
    await supabase.storage.from("virtual-content").remove([path]);
    await supabase.from("virtual_session_content").delete().eq("id", id);
    void qc.invalidateQueries({ queryKey: ["va-content", sessionId] });
  };
  const exportXlsx = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Progress");
    ws.addRow(["Employee ID", "Name", "Pre-test", "Content viewed", "Post-test", "Feedback", "Certificate", "Time taken (HH:MM:SS)"]);
    progress.data?.forEach((r) => ws.addRow([r.code, r.name, r.pre, r.content, r.post, r.feedback, r.cert, r.time]));
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([buf])); a.download = "virtual-session-progress.xlsx"; a.click();
  };

  const updateAuthority = async (id: string) => {
    const person = authorities.find((candidate) => candidate.id === id);
    if (!person?.designation_name) {
      toast.error("This employee needs a designation in User Management first.");
      return;
    }
    const { error } = await supabase.from("virtual_sessions").update({
      signatory_name: person.name,
      signatory_designation: person.designation_name,
    }).eq("id", sessionId);
    if (error) { toast.error(error.message); return; }
    toast.success("Certificate issuance authority updated.");
    void qc.invalidateQueries({ queryKey: ["va-sessions"] });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border bg-card p-5 lg:col-span-2">
        <h2 className="mb-3 font-semibold">Certificate issuance authority</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Name</Label><SearchableSelect className="mt-1" options={authorityOptions} value={selectedAuthorityId} onChange={(id) => { if (id) void updateAuthority(id); }} placeholder="Select employee…" searchPlaceholder="Search name, ID or designation…" emptyText="No matching employee found." /></div>
          <div><Label>Designation</Label><Input className="mt-1" value={session.signatory_designation ?? ""} readOnly placeholder="Filled from User Management" /></div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">The selected employee's name and designation are taken from User Management. Previously issued certificates keep their original authority details.</p>
      </section>
      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 font-semibold">Content (PDF / video)</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1"><Label>Title (optional)</Label><Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <Button asChild disabled={busy}><label className="cursor-pointer"><Upload className="mr-1 h-4 w-4" />{busy ? "Uploading…" : "Upload"}
            <input type="file" accept="application/pdf,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} /></label></Button>
        </div>
        <ul className="mt-4 space-y-2">
          {content.data?.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <span className="w-5 text-muted-foreground">{i + 1}.</span>
              {c.kind === "pdf" ? <FileText className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
              <span className="flex-1">{c.title}</span>
              <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => void remove(c.id, c.storage_path)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Pre/post-test questions and assigned employees are managed on the Trainings and Questionnaire screens for this training.</p>
      </section>
      <section className="rounded-lg border bg-card p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Employee progress</h2>
          <Button size="sm" variant="outline" onClick={() => void exportXlsx()}><Download className="mr-1 h-4 w-4" />Excel</Button></div>
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-xs">
            <thead className="text-left"><tr><th className="p-1">ID</th><th className="p-1">Name</th><th className="p-1">Pre</th><th className="p-1">Content</th><th className="p-1">Post</th><th className="p-1">Feedback</th><th className="p-1">Certificate</th><th className="p-1">Time (H:M:S)</th></tr></thead>
            <tbody>{progress.data?.map((r) => (
              <tr key={r.code} className="border-t"><td className="p-1">{r.code}</td><td className="p-1">{r.name}</td><td className="p-1">{r.pre}</td><td className="p-1">{r.content}</td><td className="p-1">{r.post}</td><td className="p-1">{r.feedback}</td><td className="p-1">{r.cert}</td><td className="p-1 font-mono">{r.time}</td></tr>
            ))}</tbody>
          </table>
          {progress.data?.length === 0 && <p className="text-sm text-muted-foreground">No employees assigned to this training yet.</p>}
        </div>
      </section>
    </div>
  );
}
