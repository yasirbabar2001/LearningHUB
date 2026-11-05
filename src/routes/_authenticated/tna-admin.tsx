import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCog, Download, Plus, Trash2, Upload } from "lucide-react";
import { SectionCard } from "@/components/admin/Kpi";
import { StatusSwitch } from "@/components/admin/StatusSwitch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/data";
import { seedSkills } from "@/lib/tna-skills-seed";
import { buildCalendar, type CalendarInputs } from "@/lib/tna-calendar";

export const Route = createFileRoute("/_authenticated/tna-admin")({
  head: () => ({
    meta: [
      { title: "Training Need Assessment | L&D Portal" },
      {
        name: "description",
        content:
          "Run the yearly training need assessment: upload eligible staff, manage skills and review line manager ratings.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminTnaPage,
});

type Cycle = { id: string; year: number; title: string; description: string | null; status: string };

function AdminTnaPage() {
  const qc = useQueryClient();
  const [cycleId, setCycleId] = useState("");

  const cycles = useQuery({
    queryKey: ["tna-cycles-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tna_cycles")
        .select("id,year,title,description,status")
        .order("year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Cycle[];
    },
  });

  const current = cycles.data?.find((c) => c.id === cycleId) ?? cycles.data?.[0];
  const activeId = current?.id ?? "";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Run one TNA per year: upload eligible staff, set the skill catalogue, collect line manager ratings
          and generate the training calendar.
        </p>
      </div>

      <CyclesCard
        cycles={cycles.data ?? []}
        selected={activeId}
        onSelect={setCycleId}
        refresh={() => qc.invalidateQueries({ queryKey: ["tna-cycles-admin"] })}
      />

      {activeId ? (
        <Tabs defaultValue="staff">
          <TabsList className="flex-wrap">
            <TabsTrigger value="staff">Eligible Staff</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="responses">Responses</TabsTrigger>
            <TabsTrigger value="calendar">Generate Calendar</TabsTrigger>
          </TabsList>
          <TabsContent value="staff">
            <StaffTab cycleId={activeId} />
          </TabsContent>
          <TabsContent value="skills">
            <SkillsTab cycleId={activeId} />
          </TabsContent>
          <TabsContent value="responses">
            <ResponsesTab cycleId={activeId} />
          </TabsContent>
          <TabsContent value="calendar">
            <CalendarTab cycle={current!} />
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-sm text-muted-foreground">Create a TNA cycle to get started.</p>
      )}
    </div>
  );
}

function CyclesCard({
  cycles,
  selected,
  onSelect,
  refresh,
}: {
  cycles: Cycle[];
  selected: string;
  onSelect: (id: string) => void;
  refresh: () => void;
}) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [title, setTitle] = useState("Annual Training Need Assessment");

  const create = useMutation({
    mutationFn: async () => {
      const y = Number(year);
      if (!y || y < 2000 || y > 2100) throw new Error("Enter a valid year.");
      if (!title.trim()) throw new Error("Enter a title.");
      const { data, error } = await supabase
        .from("tna_cycles")
        .insert({ year: y, title: title.trim() })
        .select("id")
        .single();
      if (error) throw new Error(error.message.includes("duplicate") ? "That TNA already exists." : error.message);
      const rows = seedSkills().map((s, i) => ({ ...s, cycle_id: data.id, display_order: i }));
      const { error: sErr } = await supabase.from("tna_skills").insert(rows);
      if (sErr) throw sErr;
      await logAudit("create", "tna_cycles", data.id, { year: y, title: title.trim() });
      return data.id;
    },
    onSuccess: (id) => {
      refresh();
      onSelect(id);
      toast.success("TNA cycle created with the starter skill catalogue.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tna_cycles").update({ status }).eq("id", id);
      if (error) throw error;
      await logAudit("update", "tna_cycles", id, { status });
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tna_cycles").delete().eq("id", id);
      if (error) throw error;
      await logAudit("delete", "tna_cycles", id);
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SectionCard
      title="TNA Cycles"
      description="Switch a cycle off to close it for submissions; switch a new one on each year."
    >
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label>Year</Label>
          <Input className="w-28" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div className="min-w-[220px] flex-1 space-y-1.5">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          <Plus className="size-4" /> New TNA
        </Button>
      </div>
      <div className="divide-y rounded-lg border">
        {cycles.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 p-3">
            <button
              type="button"
              className={`flex-1 text-left text-sm ${c.id === selected ? "font-semibold text-primary" : ""}`}
              onClick={() => onSelect(c.id)}
            >
              {c.year} — {c.title}
            </button>
            <StatusSwitch status={c.status} onChange={(status) => toggle.mutate({ id: c.id, status })} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => confirm(`Delete the ${c.year} TNA and all its data?`) && remove.mutate(c.id)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
        {!cycles.length ? <p className="p-3 text-sm text-muted-foreground">No TNA cycles yet.</p> : null}
      </div>
    </SectionCard>
  );
}

const HEADER_MAP: Record<string, string> = {
  "employee id": "employee_code",
  "employee code": "employee_code",
  "emp id": "employee_code",
  "emp code": "employee_code",
  "staff id": "employee_code",
  name: "name",
  "employee name": "name",
  "staff name": "name",
  "full name": "name",
  designation: "designation",
  "job title": "designation",
  "sub department": "sub_department",
  sub: "sub_department",
  department: "department",
  dept: "department",
  branch: "branch",
  location: "branch",
  region: "region",
  wing: "wing",
  gender: "gender",
  "line manager employee id": "manager_code",
  "line manager emp id": "manager_code",
  "line manager id": "manager_code",
  "line manager code": "manager_code",
  "line manager": "manager_code",
  "manager employee id": "manager_code",
  "manager id": "manager_code",
  "manager code": "manager_code",
  "reporting manager id": "manager_code",
  "reporting manager employee id": "manager_code",
  "supervisor id": "manager_code",
  "lm id": "manager_code",
  "lm code": "manager_code",
  "line manager name": "manager_name",
  "line manager employee name": "manager_name",
  "manager name": "manager_name",
  "reporting manager name": "manager_name",
  "reporting manager": "manager_name",
  "supervisor name": "manager_name",
  "lm name": "manager_name",
};

/** Normalises a spreadsheet header: lowercase, strip punctuation, collapse spaces. */
function normaliseHeader(h: string) {
  return String(h)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const TEMPLATE_HEADERS = [
  "Employee ID",
  "Name",
  "Designation",
  "Sub Department",
  "Department",
  "Branch",
  "Region",
  "Wing",
  "Gender",
  "Line Manager Employee ID",
  "Line Manager Name",
];

async function downloadStaffTemplate() {
  const XLSX = await import("xlsx");
  const sample = [
    {
      "Employee ID": "10234",
      Name: "Ali Raza",
      Designation: "Relationship Officer",
      "Sub Department": "Micro Lending",
      Department: "Business",
      Branch: "Lahore Main",
      Region: "Central-1",
      Wing: "Micro Finance",
      Gender: "Male",
      "Line Manager Employee ID": "10011",
      "Line Manager Name": "Sara Khan",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample, { header: TEMPLATE_HEADERS });
  ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Eligible Staff");
  XLSX.writeFile(wb, "TNA-eligible-staff-template.xlsx");
}

function StaffTab({ cycleId }: { cycleId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const key = ["tna-staff", cycleId];

  const staff = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tna_staff")
        .select("*")
        .eq("cycle_id", cycleId)
        .order("name")
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]!];
      if (!sheet) throw new Error("The file has no worksheets.");
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (!raw.length) throw new Error("The file has no rows.");
      const rows = raw
        .map((r) => {
          const out: Record<string, string | null> = {};
          for (const [k, v] of Object.entries(r)) {
            const field = HEADER_MAP[normaliseHeader(k)];
            if (field) out[field] = String(v ?? "").trim() || null;
          }
          return out;
        })
        .filter((r) => r["employee_code"] && r["name"])
        .map((r) => ({ ...r, cycle_id: cycleId }));
      if (!rows.length)
        throw new Error("No rows found. Required columns: Employee ID and Name (plus Line Manager Employee ID).");
      const { error } = await supabase
        .from("tna_staff")
        .upsert(rows as never, { onConflict: "cycle_id,employee_code" });
      if (error) throw error;
      await logAudit("import", "tna_staff", cycleId, { count: rows.length });
      return rows.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: key });
      toast.success(`${n} staff record(s) uploaded.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tna_staff").delete().eq("cycle_id", cycleId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Staff list cleared.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const managers = new Set((staff.data ?? []).map((s) => (s.manager_code ?? "").toLowerCase()).filter(Boolean));

  return (
    <SectionCard
      title="Eligible Staff"
      description="Download the template, fill it in and upload it. Columns: Employee ID, Name, Designation, Sub Department, Department, Branch, Region, Wing, Gender, Line Manager Employee ID, Line Manager Name."
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate(f);
            e.target.value = "";
          }}
        />
        <Button variant="outline" size="sm" onClick={() => void downloadStaffTemplate()}>
          <Download className="size-4" /> Download template
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
          <Upload className="size-4" /> {upload.isPending ? "Uploading…" : "Upload staff file"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => confirm("Remove every staff record from this TNA?") && clear.mutate()}
        >
          <Trash2 className="size-4" /> Clear list
        </Button>
        <span className="text-xs text-muted-foreground">
          {staff.data?.length ?? 0} staff • {managers.size} line manager(s)
        </span>
      </div>
      <div className="max-h-[480px] overflow-auto rounded-lg border">
        <table className="w-full min-w-[840px] text-sm">
          <thead className="sticky top-0 bg-secondary text-left text-xs uppercase text-muted-foreground">
            <tr>
              {["Employee ID", "Name", "Designation", "Department", "Branch", "Region", "Line Manager"].map((h) => (
                <th key={h} className="px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(staff.data ?? []).map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2">{s.employee_code}</td>
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2">{s.designation}</td>
                <td className="px-3 py-2">{s.department}</td>
                <td className="px-3 py-2">{s.branch}</td>
                <td className="px-3 py-2">{s.region}</td>
                <td className="px-3 py-2">
                  {s.manager_name} {s.manager_code ? `(${s.manager_code})` : ""}
                </td>
              </tr>
            ))}
            {!staff.data?.length ? (
              <tr>
                <td className="p-3 text-sm text-muted-foreground" colSpan={7}>
                  No staff uploaded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function SkillsTab({ cycleId }: { cycleId: string }) {
  const qc = useQueryClient();
  const key = ["tna-skills", cycleId];
  const [form, setForm] = useState({
    name: "",
    skill_type: "technical",
    department: "",
    designation: "",
    description: "",
  });
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

  const skills = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tna_skills")
        .select("*")
        .eq("cycle_id", cycleId)
        .order("skill_type")
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Enter a skill name.");
      const { error } = await supabase.from("tna_skills").insert({
        cycle_id: cycleId,
        name: form.name.trim(),
        skill_type: form.skill_type,
        description: form.description.trim() || null,
        department: form.department.trim() || null,
        designation: form.designation.trim() || null,
        display_order: (skills.data?.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ name: "", skill_type: form.skill_type, department: "", designation: "", description: "" });
      invalidate();
      toast.success("Skill added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveBehaviour = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const { error } = await supabase
        .from("tna_skills")
        .update({ description: text.trim() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditing(null);
      invalidate();
      toast.success("Behaviours saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tna_skills").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tna_skills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SectionCard
      title="Skill Catalogue"
      description="Soft skills apply to every employee. Technical skills apply only where the department or designation matches — leave both blank to apply to everyone. Behaviours are shown to line managers under each competency while they rate."
    >
      <div className="mb-4 space-y-2">
        <div className="grid gap-2 sm:grid-cols-4">
          <Input
            placeholder="Skill name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={form.skill_type}
            onChange={(e) => setForm({ ...form, skill_type: e.target.value })}
          >
            <option value="soft">Soft</option>
            <option value="technical">Technical</option>
          </select>
          <Input
            placeholder="Department (optional)"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
          <Input
            placeholder="Designation (optional)"
            value={form.designation}
            onChange={(e) => setForm({ ...form, designation: e.target.value })}
          />
        </div>
        <Textarea
          rows={3}
          placeholder="Behaviours — what a line manager should look for when rating this competency (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Button onClick={() => add.mutate()} disabled={add.isPending}>
          <Plus className="size-4" /> Add skill
        </Button>
      </div>
      <div className="divide-y rounded-lg border">
        {(skills.data ?? []).map((s) => (
          <div key={s.id} className="space-y-2 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="w-20 shrink-0 text-xs uppercase text-muted-foreground">{s.skill_type}</span>
              <span className="flex-1 font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground">
                {[s.department, s.designation].filter(Boolean).join(" • ") || "All employees"}
              </span>
              <StatusSwitch status={s.status} onChange={(status) => toggle.mutate({ id: s.id, status })} />
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(s.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
            {editing?.id === s.id ? (
              <div className="space-y-2">
                <Textarea
                  rows={3}
                  value={editing.text}
                  onChange={(e) => setEditing({ id: s.id, text: e.target.value })}
                  placeholder="Behaviours to look for…"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={saveBehaviour.isPending}
                    onClick={() => saveBehaviour.mutate({ id: s.id, text: editing.text })}
                  >
                    Save behaviours
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-start gap-2">
                <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
                  {s.description ? (
                    <>
                      <span className="font-medium text-foreground">Behaviours: </span>
                      {s.description}
                    </>
                  ) : (
                    "No behaviours added yet."
                  )}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing({ id: s.id, text: s.description ?? "" })}
                >
                  {s.description ? "Edit behaviours" : "Add behaviours"}
                </Button>
              </div>
            )}
          </div>
        ))}
        {!skills.data?.length ? <p className="p-3 text-sm text-muted-foreground">No skills yet.</p> : null}
      </div>
    </SectionCard>
  );
}

function ResponsesTab({ cycleId }: { cycleId: string }) {
  const assessments = useQuery({
    queryKey: ["tna-assessments", cycleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tna_assessments")
        .select("*")
        .eq("cycle_id", cycleId)
        .order("submitted_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = assessments.data ?? [];

  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const { data: ratings } = await supabase
      .from("tna_ratings")
      .select("assessment_id,skill_name,skill_type,rating")
      .eq("cycle_id", cycleId)
      .limit(50000);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          "Employee ID": r.employee_code,
          Name: r.employee_name,
          Designation: r.designation,
          Department: r.department,
          "Sub Department": r.sub_department,
          Branch: r.branch,
          Region: r.region,
          Wing: r.wing,
          Gender: r.gender,
          "Line Manager": r.manager_name,
          "Soft Avg": r.avg_soft,
          "Technical Avg": r.avg_technical,
          "Overall Avg": r.avg_overall,
          "Skills with gap": r.gap_count,
          Comments: r.comments,
          "Submitted At": r.submitted_at,
        })),
      ),
      "Summary",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        (ratings ?? []).map((x) => {
          const a = byId.get(x.assessment_id);
          return {
            "Employee ID": a?.employee_code,
            Name: a?.employee_name,
            Department: a?.department,
            Skill: x.skill_name,
            Type: x.skill_type,
            Rating: x.rating,
          };
        }),
      ),
      "Skill Ratings",
    );
    XLSX.writeFile(wb, `TNA-responses-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <SectionCard title="Line Manager Submissions" description={`${rows.length} team member(s) assessed so far.`}>
      <div className="mb-3">
        <Button variant="outline" size="sm" onClick={exportXlsx} disabled={!rows.length}>
          <Download className="size-4" /> Download Excel
        </Button>
      </div>
      <div className="max-h-[520px] overflow-auto rounded-lg border">
        <table className="w-full min-w-[840px] text-sm">
          <thead className="sticky top-0 bg-secondary text-left text-xs uppercase text-muted-foreground">
            <tr>
              {["Employee", "Department", "Branch", "Line Manager", "Soft", "Technical", "Overall", "Gaps"].map(
                (h) => (
                  <th key={h} className="px-3 py-2">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  {r.employee_name} <span className="text-muted-foreground">({r.employee_code})</span>
                </td>
                <td className="px-3 py-2">{r.department}</td>
                <td className="px-3 py-2">{r.branch}</td>
                <td className="px-3 py-2">{r.manager_name}</td>
                <td className="px-3 py-2 tabular-nums">{r.avg_soft ?? "—"}</td>
                <td className="px-3 py-2 tabular-nums">{r.avg_technical ?? "—"}</td>
                <td className="px-3 py-2 tabular-nums">{r.avg_overall ?? "—"}</td>
                <td className="px-3 py-2 tabular-nums">{r.gap_count}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="p-3 text-sm text-muted-foreground" colSpan={8}>
                  No submissions yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function CalendarTab({ cycle }: { cycle: Cycle }) {
  const qc = useQueryClient();
  const [minAffected, setMinAffected] = useState("5");
  const [gapAt, setGapAt] = useState("3");
  const [batchSize, setBatchSize] = useState("30");
  const [calYear, setCalYear] = useState(String(cycle.year + 1));
  const [preview, setPreview] = useState<ReturnType<typeof buildCalendar> | null>(null);

  const generate = useMutation({
    mutationFn: async (save: boolean) => {
      const [{ data: assessments }, { data: ratings }] = await Promise.all([
        supabase
          .from("tna_assessments")
          .select("id,employee_code,employee_name,department,sub_department,branch,region,wing,designation")
          .eq("cycle_id", cycle.id)
          .limit(100000),
        supabase
          .from("tna_ratings")
          .select("assessment_id,skill_name,skill_type,rating")
          .eq("cycle_id", cycle.id)
          .limit(100000),
      ]);
      if (!ratings?.length) throw new Error("There are no TNA ratings for this cycle yet.");
      const year = Number(calYear) || cycle.year + 1;
      const inputs: CalendarInputs = {
        assessments: assessments ?? [],
        ratings: ratings ?? [],
        minAffected: Number(minAffected) || 1,
        gapAt: Number(gapAt) || 3,
        batchSize: Number(batchSize) || 30,
        year,
      };
      const plan = buildCalendar(inputs);
      if (!plan.items.length) throw new Error("No training programme met the minimum number of affected staff.");
      if (save) {
        await supabase.from("training_calendar_participants").delete().eq("cycle_id", cycle.id);
        await supabase.from("training_calendar").delete().eq("cycle_id", cycle.id);
        const { data: saved, error } = await supabase
          .from("training_calendar")
          .insert(plan.items.map((p) => ({ ...p, cycle_id: cycle.id })))
          .select("id,skill_name");
        if (error) throw error;
        const byName = new Map((saved ?? []).map((s) => [s.skill_name, s.id]));
        for (let i = 0; i < plan.participants.length; i += 500) {
          const { error: pErr } = await supabase.from("training_calendar_participants").insert(
            plan.participants.slice(i, i + 500).map((p) => ({
              ...p,
              cycle_id: cycle.id,
              calendar_id: byName.get(p.program_name) ?? null,
            })),
          );
          if (pErr) throw pErr;
        }
        await logAudit("generate", "training_calendar", cycle.id, {
          items: plan.items.length,
          participants: plan.participants.length,
          year,
        });
      }
      return { plan, save };
    },
    onSuccess: ({ plan, save }) => {
      setPreview(plan);
      if (save) {
        qc.invalidateQueries({ queryKey: ["training-calendar"] });
        qc.invalidateQueries({ queryKey: ["training-calendar-participants"] });
        toast.success(
          `Calendar generated: ${plan.items.length} training programme(s) for ${plan.participants.length} nomination(s).`,
        );
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const map = new Map<number, typeof items>();
    const items = preview?.items ?? [];
    for (const p of items) map.set(p.month, [...(map.get(p.month) ?? []), p]);
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [preview]);

  return (
    <SectionCard
      title="Generate Training Calendar"
      description="Related skill gaps are grouped into one training programme, ranked by how many staff are affected and how severe the gaps are, then spread across the year with every employee scheduled onto a dated session."
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Calendar year</Label>
          <Input className="w-28" value={calYear} onChange={(e) => setCalYear(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Minimum staff affected</Label>
          <Input className="w-28" value={minAffected} onChange={(e) => setMinAffected(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Gap at rating ≤</Label>
          <Input className="w-24" value={gapAt} onChange={(e) => setGapAt(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Batch size</Label>
          <Input className="w-24" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => generate.mutate(false)} disabled={generate.isPending}>
          Preview
        </Button>
        <Button onClick={() => generate.mutate(true)} disabled={generate.isPending}>
          <CalendarCog className="size-4" /> Generate &amp; save
        </Button>
      </div>
      {preview?.items.length ? (
        <div className="space-y-4">
          {grouped.map(([month, items]) => (
            <div key={month}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {new Date(Number(calYear) || cycle.year + 1, month - 1, 1).toLocaleString("en", { month: "long" })}{" "}
                {Number(calYear) || cycle.year + 1}
              </p>
              <div className="divide-y rounded-lg border">
                {items.map((p) => (
                  <div key={p.skill_name} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                    <span className="flex-1 font-medium">{p.skill_name}</span>
                    <span className="text-xs uppercase text-muted-foreground">{p.skill_type}</span>
                    <span className="text-xs">{p.affected_count} staff</span>
                    <span className="text-xs">avg {p.avg_rating}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                        p.priority === "high"
                          ? "bg-destructive/15 text-destructive"
                          : p.priority === "medium"
                            ? "bg-warning/15 text-warning"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {p.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Run a preview to see the proposed calendar.</p>
      )}
    </SectionCard>
  );
}
