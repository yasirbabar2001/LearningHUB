import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getIdeasContext,
  listAllIdeas,
  listIdeaReviewers,
  saveIdeaOption,
  saveIdeasSettings,
  setIdeaReviewer,
} from "@/lib/ideas.functions";
import { exportExcel } from "@/lib/analytics";
import { COMPLEXITIES, IDEA_STATUSES, IMPACT_LEVELS, statusTone, type IdeaOption, type IdeasSettings } from "@/lib/ideas-shared";

export const Route = createFileRoute("/_authenticated/ideas-admin")({
  head: () => ({
    meta: [
      { title: "ABHI IDEAS Dashboard | ABHI Learning HUB" },
      { name: "description", content: "Innovation pipeline, trends, heatmaps, insights and reports for ABHI IDEAS." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IdeasAdmin,
});

type Idea = Awaited<ReturnType<typeof listAllIdeas>>[number];

const EMPTY_F = {
  q: "", from: "", to: "", category: "", type: "", department: "", region: "", wing: "", location: "",
  designation: "", employee: "", status: "", assigned_function: "", assigned_owner: "", impact: "", complexity: "", financial: "", impl: "",
};

function uniq(rows: Idea[], k: keyof Idea) {
  return [...new Set(rows.map((r) => r[k]).filter(Boolean) as string[])].sort();
}
function countBy(rows: Idea[], k: (r: Idea) => string | null | undefined) {
  const m = new Map<string, number>();
  rows.forEach((r) => {
    const v = k(r) || "Not set";
    m.set(v, (m.get(v) ?? 0) + 1);
  });
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

function applyFilters(rows: Idea[], f: typeof EMPTY_F) {
  const q = f.q.trim().toLowerCase();
  return rows.filter((r) => {
    if (q) {
      const hay = [r.ref_no, r.title, r.problem, r.solution, r.employee_name, r.employee_code, r.department_name, r.category].join(" ").toLowerCase();
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    const d = r.submitted_at.slice(0, 10);
    if (f.from && d < f.from) return false;
    if (f.to && d > f.to) return false;
    const eq: [string, string | null | undefined][] = [
      [f.category, r.category], [f.type, r.type], [f.department, r.department_name], [f.region, r.region_name],
      [f.wing, r.wing_name], [f.location, r.location_name], [f.designation, r.designation_name], [f.status, r.status],
      [f.assigned_function, r.assigned_function], [f.assigned_owner, r.assigned_owner],
      [f.impact, r.final_impact ?? r.expected_impact], [f.complexity, r.assessed_complexity ?? r.complexity],
      [f.financial, r.financial_level], [f.impl, r.impl_status],
    ];
    if (eq.some(([want, have]) => want && want !== have)) return false;
    if (f.employee && !`${r.employee_name} ${r.employee_code}`.toLowerCase().includes(f.employee.toLowerCase())) return false;
    return true;
  });
}

function IdeasAdmin() {
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["ideas-all"], queryFn: () => listAllIdeas() });
  const [f, setF] = useState(EMPTY_F);
  const filtered = useMemo(() => applyFilters(rows, f), [rows, f]);
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">{"Pipeline → Trends → Themes → Impact → Implementation → Business Value"}</p>
      </div>
      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="ideas">All Ideas ({filtered.length})</TabsTrigger>
          <TabsTrigger value="insights">Idea Insights</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <TabsContent value="dashboard" className="space-y-4">
                <Filters rows={rows} f={f} setF={setF} />
                <Dashboard rows={filtered} from={f.from} to={f.to} />
              </TabsContent>
              <TabsContent value="ideas" className="space-y-4">
                <Filters rows={rows} f={f} setF={setF} />
                <IdeaList rows={filtered} />
              </TabsContent>
              <TabsContent value="insights">
                <Insights rows={rows} />
              </TabsContent>
              <TabsContent value="reports">
                <Reports rows={rows} />
              </TabsContent>
              <TabsContent value="settings">
                <SettingsTab />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}

function Filters({ rows, f, setF }: { rows: Idea[]; f: typeof EMPTY_F; setF: (v: typeof EMPTY_F) => void }) {
  const sel = (k: keyof typeof EMPTY_F, label: string, options: readonly string[]) => (
    <select
      key={k}
      className="h-9 rounded-md border bg-background px-2 text-xs"
      value={f[k]}
      onChange={(e) => setF({ ...f, [k]: e.target.value })}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
  return (
    <div className="space-y-2 rounded-xl border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search reference, title, description, employee, department, keywords…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        </div>
        <Label className="text-xs">From</Label>
        <Input type="date" className="w-40" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
        <Label className="text-xs">To</Label>
        <Input type="date" className="w-40" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
        <Button variant="ghost" size="sm" onClick={() => setF(EMPTY_F)}>
          Clear
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {sel("category", "All categories", uniq(rows, "category"))}
        {sel("type", "All types", uniq(rows, "type"))}
        {sel("status", "All statuses", IDEA_STATUSES)}
        {sel("department", "All departments", uniq(rows, "department_name"))}
        {sel("region", "All regions", uniq(rows, "region_name"))}
        {sel("wing", "All wings", uniq(rows, "wing_name"))}
        {sel("location", "All locations", uniq(rows, "location_name"))}
        {sel("designation", "All designations", uniq(rows, "designation_name"))}
        {sel("assigned_function", "Any assigned dept.", uniq(rows, "assigned_function"))}
        {sel("assigned_owner", "Any owner", uniq(rows, "assigned_owner"))}
        {sel("impact", "Any impact", IMPACT_LEVELS)}
        {sel("complexity", "Any complexity", [...COMPLEXITIES, "Low", "Medium", "High"])}
        {sel("financial", "Any financial impact", ["Low", "Medium", "High"])}
        {sel("impl", "Any implementation stage", uniq(rows, "impl_status"))}
        <Input className="h-9 w-44 text-xs" placeholder="Employee name / ID" value={f.employee} onChange={(e) => setF({ ...f, employee: e.target.value })} />
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-semibold">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function periodKey(d: string, g: string) {
  const dt = new Date(d);
  if (g === "daily") return d.slice(0, 10);
  if (g === "monthly") return d.slice(0, 7);
  if (g === "quarterly") return `${dt.getFullYear()}-Q${Math.floor(dt.getMonth() / 3) + 1}`;
  const t = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((+t - +y) / 86400000 + 1) / 7)).padStart(2, "0")}`;
}

function Dashboard({ rows, from, to }: { rows: Idea[]; from: string; to: string }) {
  const [gran, setGran] = useState("monthly");
  const inProgress = ["Shortlisted", "Pilot / Proof of Concept", "Approved for Implementation", "Implementation in Progress"];
  const since = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const newCount = rows.filter((r) => r.submitted_at.slice(0, 10) >= since && (!to || r.submitted_at.slice(0, 10) <= to)).length;
  const saving = rows.reduce((s, r) => s + Number(r.estimated_saving ?? 0), 0);
  const revenue = rows.reduce((s, r) => s + Number(r.estimated_revenue ?? 0), 0);
  const actualValue = rows.reduce((s, r) => s + Number(r.actual_saving ?? 0) + Number(r.actual_revenue ?? 0), 0);
  const valueIdeas = rows.filter((r) => r.status === "Implemented" && (Number(r.actual_saving ?? 0) > 0 || Number(r.actual_revenue ?? 0) > 0)).length;
  const trend = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const k = periodKey(r.submitted_at, gran);
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return [...m.entries()].sort().map(([period, ideas]) => ({ period, ideas }));
  }, [rows, gran]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        <Kpi label="Total Ideas" value={rows.length} />
        <Kpi label="New Ideas" value={newCount} hint={from ? "In selected period" : "Last 30 days"} />
        <Kpi label="Under Review" value={rows.filter((r) => r.status === "Submitted" || r.status.startsWith("Under")).length} />
        <Kpi label="Shortlisted" value={rows.filter((r) => r.status === "Shortlisted").length} />
        <Kpi label="In Pilot" value={rows.filter((r) => r.status.startsWith("Pilot")).length} />
        <Kpi label="Implemented" value={rows.filter((r) => r.status === "Implemented").length} />
        <Kpi label="Potential Savings" value={pkr(saving)} />
        <Kpi label="Potential Revenue Impact" value={pkr(revenue)} />
        <Kpi label="Ideas that created value" value={valueIdeas} hint={`Actual value ${pkr(actualValue)}`} />
        <Kpi label="In pipeline" value={rows.filter((r) => inProgress.includes(r.status)).length} />
      </div>

      <section className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display font-semibold">Ideas Over Time</h3>
          <select className="h-8 rounded-md border bg-background px-2 text-xs" value={gran} onChange={(e) => setGran(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="period" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="ideas" stroke="var(--primary)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarCard title="Ideas by Category" data={countBy(rows, (r) => r.category)} />
        <BarCard title="Ideas by Status" data={countBy(rows, (r) => r.status)} />
        <BarCard title="Ideas by Department" data={countBy(rows, (r) => r.department_name)} />
        <BarCard title="Ideas by Region" data={countBy(rows, (r) => r.region_name)} />
        <BarCard title="Ideas by Wing" data={countBy(rows, (r) => r.wing_name)} />
        <BarCard title="Ideas by Designation" data={countBy(rows, (r) => r.designation_name)} />
      </div>

      <Heatmap title="Innovation Heatmap — Region × Category" rows={rows} rowKey={(r) => r.region_name} />
      <Heatmap title="Department × Category" rows={rows} rowKey={(r) => r.department_name} />
      <Heatmap title="Wing × Category" rows={rows} rowKey={(r) => r.wing_name} />
    </div>
  );
}

function BarCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const top = data.slice(0, 15);
  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="mb-2 font-display font-semibold">{title}</h3>
      {!top.length ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <div style={{ height: Math.max(160, top.length * 26) }}>
          <ResponsiveContainer>
            <BarChart data={top} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" allowDecimals={false} fontSize={11} />
              <YAxis type="category" dataKey="name" width={170} fontSize={10} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function Heatmap({ title, rows, rowKey }: { title: string; rows: Idea[]; rowKey: (r: Idea) => string | null }) {
  const cats = [...new Set(rows.map((r) => r.category))].sort();
  const keys = [...new Set(rows.map((r) => rowKey(r) || "Not set"))].sort();
  const cell = new Map<string, number>();
  rows.forEach((r) => {
    const k = `${rowKey(r) || "Not set"}|${r.category}`;
    cell.set(k, (cell.get(k) ?? 0) + 1);
  });
  const max = Math.max(1, ...cell.values());
  if (rows.length < 3) return null;
  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="mb-2 font-display font-semibold">{title}</h3>
      <div className="overflow-auto">
        <table className="text-[11px]">
          <thead>
            <tr>
              <th />
              {cats.map((c) => (
                <th key={c} className="h-28 min-w-8 align-bottom">
                  <div className="w-6 origin-bottom-left translate-x-3 -rotate-60 whitespace-nowrap text-left font-normal">{c}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k}>
                <td className="whitespace-nowrap pr-2 font-medium">{k}</td>
                {cats.map((c) => {
                  const v = cell.get(`${k}|${c}`) ?? 0;
                  return (
                    <td key={c} className="size-8 border border-card text-center" style={{ background: v ? `color-mix(in oklab, var(--primary) ${Math.round((v / max) * 90) + 10}%, transparent)` : "var(--muted)" }} title={`${k} · ${c}: ${v}`}>
                      {v || ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function exportRows(rows: Idea[]) {
  return rows.map((r) => ({
    "Reference No": r.ref_no,
    Title: r.title,
    Category: r.category,
    Type: r.type,
    Status: r.status,
    "Submitted On": new Date(r.submitted_at).toLocaleString(),
    "Employee ID": r.is_anonymous ? `${r.employee_code} (anonymous)` : r.employee_code,
    Employee: r.employee_name,
    Designation: r.designation_name,
    Department: r.department_name,
    Location: r.location_name,
    Region: r.region_name,
    Wing: r.wing_name,
    "Line Manager": r.manager_name,
    Problem: r.problem,
    Solution: r.solution,
    Benefits: r.benefits.join(", "),
    "Who Benefits": r.beneficiaries.join(", "),
    "Expected Impact (employee)": r.expected_impact,
    "Final Impact": r.final_impact,
    "Assigned Function": r.assigned_function,
    "Assigned Owner": r.assigned_owner,
    "Target Date": r.target_date,
    "Estimated Cost": r.estimated_cost,
    "Estimated Saving": r.estimated_saving,
    "Estimated Revenue": r.estimated_revenue,
    "Actual Saving": r.actual_saving,
    "Actual Revenue": r.actual_revenue,
    "Implementation Status": r.impl_status,
  }));
}

function IdeaList({ rows }: { rows: Idea[] }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => exportExcel(exportRows(rows), "ABHI-IDEAS")}>
          <Download className="size-4" /> Export to Excel
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          Print / PDF
        </Button>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="py-2 pr-2">Ref</th>
              <th className="pr-2">Title</th>
              <th className="pr-2">Category</th>
              <th className="pr-2">Employee</th>
              <th className="pr-2">Department</th>
              <th className="pr-2">Region</th>
              <th className="pr-2">Date</th>
              <th className="pr-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="py-2 pr-2 font-mono text-xs">
                  <Link to="/ideas-review/$id" params={{ id: r.id }} className="underline">
                    {r.ref_no}
                  </Link>
                </td>
                <td className="pr-2">
                  <Link to="/ideas-review/$id" params={{ id: r.id }} className="font-medium hover:underline">
                    {r.title}
                  </Link>
                </td>
                <td className="pr-2 text-xs">{r.category}</td>
                <td className="pr-2 text-xs">{r.employee_name}</td>
                <td className="pr-2 text-xs">{r.department_name ?? "—"}</td>
                <td className="pr-2 text-xs">{r.region_name ?? "—"}</td>
                <td className="pr-2 text-xs">{new Date(r.submitted_at).toLocaleDateString()}</td>
                <td className="pr-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusTone(r.status)}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="py-4 text-sm text-muted-foreground">No ideas match these filters.</p>}
      </div>
    </section>
  );
}

const STOP = new Set("the a an and or of to in for on with by from is are be at as it this that we our can should will into more less use using make".split(" "));
const tok = (s: string) =>
  new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/(ing|ed|es|s)$/, "")));

function similarGroups(rows: Idea[]) {
  const t = rows.map((r) => tok(`${r.title} ${r.title} ${r.problem} ${r.solution}`));
  const parent = rows.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  for (let i = 0; i < rows.length; i++)
    for (let j = i + 1; j < rows.length; j++) {
      const a = t[i]!, b = t[j]!;
      let n = 0;
      a.forEach((x) => b.has(x) && n++);
      const s = n / (a.size + b.size - n || 1);
      if (s >= 0.25) parent[find(i)] = find(j);
    }
  const g = new Map<number, Idea[]>();
  rows.forEach((r, i) => g.set(find(i), [...(g.get(find(i)) ?? []), r]));
  return [...g.values()].filter((x) => x.length > 1);
}

function recurringTerms(rows: Idea[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    tok(`${row.title} ${row.problem}`).forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1));
  });
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12);
}

function Insights({ rows }: { rows: Idea[] }) {
  const groups = useMemo(() => similarGroups(rows.slice(0, 600)), [rows]);
  const now = Date.now();
  const recent = rows.filter((r) => now - +new Date(r.submitted_at) < 90 * 86400000);
  const prior = rows.filter((r) => {
    const age = now - +new Date(r.submitted_at);
    return age >= 90 * 86400000 && age < 180 * 86400000;
  });
  const cats = [...new Set(rows.map((r) => r.category))];
  const growth = cats
    .map((c) => ({ c, now: recent.filter((r) => r.category === c).length, before: prior.filter((r) => r.category === c).length }))
    .sort((a, b) => b.now - b.before - (a.now - a.before));
  const { data: ctx } = useQuery({ queryKey: ["ideas-ctx"], queryFn: () => getIdeasContext() });
  const allCats = ((ctx?.options ?? []) as IdeaOption[]).filter((o) => o.kind === "category" && o.status === "active").map((o) => o.name);
  const dormant = allCats.filter((c) => rows.filter((r) => r.category === c).length <= 1);
  const cross = rows.filter((r) => r.beneficiaries.length >= 3 || r.beneficiaries.includes("Bank-wide")).slice(0, 10);
  const recurring = useMemo(() => recurringTerms(rows), [rows]);
  const implemented = rows.filter((r) => r.status === "Implemented");
  const progressed = rows.filter((r) => ["Shortlisted", "Pilot / Proof of Concept", "Approved for Implementation", "Implementation in Progress", "Implemented"].includes(r.status));
  const implementationRate = rows.length ? Math.round((implemented.length / rows.length) * 100) : 0;
  const progressionRate = rows.length ? Math.round((progressed.length / rows.length) * 100) : 0;
  const actualValue = rows.reduce((sum, row) => sum + Number(row.actual_saving ?? 0) + Number(row.actual_revenue ?? 0), 0);
  const oldest = rows.length ? rows.reduce((a, b) => (a.submitted_at < b.submitted_at ? a : b)).submitted_at.slice(0, 10) : null;
  const newest = rows.length ? rows.reduce((a, b) => (a.submitted_at > b.submitted_at ? a : b)).submitted_at.slice(0, 10) : null;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-sidebar p-5 text-sidebar-foreground">
        <h3 className="font-display text-lg font-semibold">ABHI IDEA INSIGHTS</h3>
        <p className="text-xs text-sidebar-foreground/70">
          Data-only statistical analysis of {rows.length.toLocaleString()} recorded ideas
          {oldest && newest ? ` submitted from ${oldest} to ${newest}` : ""}. No generative AI or external analysis is used.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Ideas analysed", rows.length.toLocaleString()],
            ["Progressed", `${progressionRate}%`],
            ["Implemented", `${implementationRate}%`],
            ["Recorded actual value", pkr(actualValue)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-sidebar-border bg-sidebar-accent p-3">
              <div className="text-xs text-sidebar-foreground/70">{label}</div>
              <div className="mt-1 text-lg font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-2 font-display font-semibold">Opportunity Areas (last 90 days vs prior 90)</h3>
          <ul className="space-y-1 text-sm">
            {growth.slice(0, 6).map((g) => (
              <li key={g.c} className="flex justify-between">
                <span>{g.c}</span>
                <span className="text-muted-foreground">
                  {g.before} → <b className="text-foreground">{g.now}</b>
                </span>
              </li>
            ))}
            {!growth.length && <li className="text-muted-foreground">No data yet.</li>}
          </ul>
        </section>
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-2 font-display font-semibold">Dormant Areas (0–1 ideas)</h3>
          <p className="text-sm">{dormant.join(" · ") || "None — every category has activity."}</p>
        </section>
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-2 font-display font-semibold">Recurring Problem Terms</h3>
          <p className="mb-2 text-xs text-muted-foreground">Repeated keywords found in idea titles and problem statements.</p>
          <div className="flex flex-wrap gap-2">
            {recurring.map(([term, count]) => (
              <span key={term} className="rounded-md border bg-secondary px-2 py-1 text-xs">{term} · {count}</span>
            ))}
            {!recurring.length && <span className="text-sm text-muted-foreground">Not enough repeated data yet.</span>}
          </div>
        </section>
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-2 font-display font-semibold">Similar Ideas (admin decides — never merged automatically)</h3>
          <ul className="space-y-2 text-sm">
            {groups.slice(0, 10).map((g, i) => (
              <li key={i} className="rounded-md bg-secondary p-2">
                {g.map((r) => (
                  <Link key={r.id} to="/ideas-review/$id" params={{ id: r.id }} className="block hover:underline">
                    <span className="font-mono text-xs">{r.ref_no}</span> {r.title}
                  </Link>
                ))}
              </li>
            ))}
            {!groups.length && <li className="text-muted-foreground">No similar ideas detected.</li>}
          </ul>
        </section>
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-2 font-display font-semibold">Cross-Functional Opportunities</h3>
          <ul className="space-y-1 text-sm">
            {cross.map((r) => (
              <li key={r.id}>
                <Link to="/ideas-review/$id" params={{ id: r.id }} className="hover:underline">
                  <span className="font-mono text-xs">{r.ref_no}</span> {r.title}
                </Link>
                <span className="text-xs text-muted-foreground"> — {r.beneficiaries.join(", ")}</span>
              </li>
            ))}
            {!cross.length && <li className="text-muted-foreground">None yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

async function downloadReport(rows: Idea[], kind: "monthly" | "quarterly", period: string) {
  const inPeriod = rows.filter((r) => {
    const d = r.submitted_at;
    if (kind === "monthly") return d.slice(0, 7) === period;
    const [y, q] = period.split("-Q");
    const m = new Date(d).getMonth();
    return d.slice(0, 4) === y && Math.floor(m / 3) + 1 === Number(q);
  });
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const add = (name: string, data: Record<string, unknown>[]) => {
    const ws = wb.addWorksheet(name);
    if (!data.length) {
      ws.addRow(["No data"]);
      return;
    }
    ws.columns = Object.keys(data[0]!).map((k) => ({ header: k, key: k, width: Math.min(50, Math.max(14, k.length + 4)) }));
    data.forEach((d) => ws.addRow(d));
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF08182E" } };
  };
  const cnt = (list: Idea[], fn: (s: string) => boolean) => list.filter((r) => fn(r.status)).length;
  const sum = (list: Idea[], k: keyof Idea) => list.reduce((s, r) => s + Number(r[k] ?? 0), 0);
  add("Summary", [
    { Metric: "Report", Value: `${kind === "monthly" ? "Monthly" : "Quarterly"} ABHI IDEAS Report — ${period}` },
    { Metric: "Total ideas (all time)", Value: rows.length },
    { Metric: "New ideas in period", Value: inPeriod.length },
    { Metric: "Under review", Value: cnt(rows, (s) => s === "Submitted" || s.startsWith("Under")) },
    { Metric: "Shortlisted", Value: cnt(rows, (s) => s === "Shortlisted") },
    { Metric: "In pilot", Value: cnt(rows, (s) => s.startsWith("Pilot")) },
    { Metric: "Implementation pipeline", Value: cnt(rows, (s) => s.startsWith("Approved") || s.startsWith("Implementation")) },
    { Metric: "Implemented", Value: cnt(rows, (s) => s === "Implemented") },
    { Metric: "Estimated savings (PKR)", Value: sum(rows, "estimated_saving") },
    { Metric: "Actual savings (PKR)", Value: sum(rows, "actual_saving") },
    { Metric: "Estimated revenue (PKR)", Value: sum(rows, "estimated_revenue") },
    { Metric: "Actual revenue (PKR)", Value: sum(rows, "actual_revenue") },
  ]);
  const byTable = (fn: (r: Idea) => string | null | undefined) => countBy(inPeriod, fn).map((x) => ({ Name: x.name, Ideas: x.value }));
  add("By Category", byTable((r) => r.category));
  add("By Department", byTable((r) => r.department_name));
  add("By Region", byTable((r) => r.region_name));
  add("Pipeline", countBy(rows, (r) => r.status).map((x) => ({ Status: x.name, Ideas: x.value })));
  add("Themes", similarGroups(inPeriod).map((g, i) => ({ Theme: `Theme ${i + 1}`, Ideas: g.map((r) => `${r.ref_no} ${r.title}`).join(" | ") })));
  add(
    "Est vs Actual",
    rows
      .filter((r) => r.status === "Implemented" || r.impl_status)
      .map((r) => ({ Ref: r.ref_no, Title: r.title, "Est. saving": r.estimated_saving, "Actual saving": r.actual_saving, "Est. revenue": r.estimated_revenue, "Actual revenue": r.actual_revenue, Status: r.status })),
  );
  add("Cross-Functional", inPeriod.filter((r) => r.beneficiaries.length >= 3).map((r) => ({ Ref: r.ref_no, Title: r.title, Beneficiaries: r.beneficiaries.join(", ") })));
  add("Ideas", exportRows(inPeriod));
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `ABHI-IDEAS-${kind}-${period}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

function Reports({ rows }: { rows: Idea[] }) {
  const now = new Date();
  const [month, setMonth] = useState(now.toISOString().slice(0, 7));
  const [quarter, setQuarter] = useState(`${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-xl border bg-card p-5">
        <h3 className="font-display font-semibold">Monthly ABHI IDEAS Report</h3>
        <p className="mb-3 text-xs text-muted-foreground">Totals, category / department / region, pipeline, financial impact and recurring themes.</p>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="mb-3 w-48" />
        <Button onClick={() => downloadReport(rows, "monthly", month)}>
          <Download className="size-4" /> Download Excel
        </Button>
      </section>
      <section className="rounded-xl border bg-card p-5">
        <h3 className="font-display font-semibold">Quarterly Innovation Report</h3>
        <p className="mb-3 text-xs text-muted-foreground">Idea and implementation pipeline, themes, cross-functional ideas, estimated vs actual impact.</p>
        <Input value={quarter} onChange={(e) => setQuarter(e.target.value)} placeholder="2026-Q3" className="mb-3 w-48" />
        <Button onClick={() => (/^\d{4}-Q[1-4]$/.test(quarter) ? downloadReport(rows, "quarterly", quarter) : toast.error("Use the format 2026-Q3"))}>
          <Download className="size-4" /> Download Excel
        </Button>
      </section>
    </div>
  );
}

const KIND_LABEL: Record<IdeaOption["kind"], string> = {
  category: "Categories",
  type: "Idea types",
  benefit: "Benefit types",
  beneficiary: "Who benefits",
  recognition: "Recognition types",
};

function SettingsTab() {
  const qc = useQueryClient();
  const { data: ctx } = useQuery({ queryKey: ["ideas-ctx"], queryFn: () => getIdeasContext() });
  const { data: reviewers = [] } = useQuery({ queryKey: ["idea-reviewers"], queryFn: () => listIdeaReviewers() });
  const [kind, setKind] = useState<IdeaOption["kind"]>("category");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [revCode, setRevCode] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["ideas-ctx"] });
  const settingsM = useMutation({
    mutationFn: (s: IdeasSettings) => saveIdeasSettings({ data: s }),
    onSuccess: () => {
      toast.success("Settings saved");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const optM = useMutation({
    mutationFn: (p: { id?: string; kind: IdeaOption["kind"]; name: string; description?: string | null; status?: "active" | "inactive" }) => saveIdeaOption({ data: p }),
    onSuccess: () => {
      setNewName("");
      setNewDesc("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const revM = useMutation({
    mutationFn: (p: { employeeCode: string; add: boolean }) => setIdeaReviewer({ data: p }),
    onSuccess: () => {
      setRevCode("");
      qc.invalidateQueries({ queryKey: ["idea-reviewers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!ctx) return null;
  const s = ctx.settings;
  const toggles: [keyof IdeasSettings, string, string][] = [
    ["enabled", "ABHI IDEAS module enabled", "Shows the floating button and employee screens."],
    ["allow_anonymous", "Allow anonymous submissions", "Identity is kept securely and visible only to admins."],
    ["explore_enabled", "Employees can explore public ideas", "Only ideas you mark “Show in Explore Ideas” appear."],
    ["show_comments_to_employee", "Employees see comments marked visible", "Internal comments are never shown."],
    ["leaderboard_enabled", "Ideas Leaderboard", "Ranks innovators by ideas, progress, implementation and recognition."],
  ];
  const items = (ctx.options as IdeaOption[]).filter((o) => o.kind === kind);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h3 className="font-display font-semibold">Module Settings</h3>
        {toggles.map(([k, l, d]) => (
          <div key={k} className="flex items-start justify-between gap-3 border-b pb-2 last:border-0">
            <div>
              <p className="text-sm font-medium">{l}</p>
              <p className="text-xs text-muted-foreground">{d}</p>
            </div>
            <Switch checked={s[k]} onCheckedChange={(v) => settingsM.mutate({ ...s, [k]: v })} />
          </div>
        ))}
      </section>
      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h3 className="font-display font-semibold">Reviewers</h3>
        <p className="text-xs text-muted-foreground">Reviewers see only ideas assigned to them (from their employee screen) and can assess and comment.</p>
        <div className="flex gap-2">
          <Input placeholder="Employee ID" value={revCode} onChange={(e) => setRevCode(e.target.value)} />
          <Button disabled={!revCode.trim()} onClick={() => revM.mutate({ employeeCode: revCode, add: true })}>
            Add
          </Button>
        </div>
        <ul className="space-y-1 text-sm">
          {reviewers.map((r) => (
            <li key={r.user_id} className="flex items-center justify-between rounded-md bg-secondary px-3 py-1.5">
              <span>
                {r.name} <span className="text-xs text-muted-foreground">({r.employee_code})</span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => revM.mutate({ employeeCode: r.employee_code ?? "", add: false })}>
                Remove
              </Button>
            </li>
          ))}
          {!reviewers.length && <li className="text-muted-foreground">No reviewers yet.</li>}
        </ul>
      </section>
      <section className="space-y-3 rounded-xl border bg-card p-5 lg:col-span-2">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(KIND_LABEL) as IdeaOption["kind"][]).map((k) => (
            <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>
              {KIND_LABEL[k]}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Input className="max-w-xs" placeholder="New value" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input className="max-w-md" placeholder="Description / examples (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <Button disabled={newName.trim().length < 2} onClick={() => optM.mutate({ kind, name: newName, description: newDesc || null })}>
            Add
          </Button>
        </div>
        <ul className="divide-y text-sm">
          {items.map((o) => (
            <OptionRow key={o.id} o={o} onSave={(p) => optM.mutate({ id: o.id, kind: o.kind, ...p })} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function OptionRow({ o, onSave }: { o: IdeaOption; onSave: (p: { name: string; description: string | null; status: "active" | "inactive" }) => void }) {
  const [name, setName] = useState(o.name);
  const [desc, setDesc] = useState(o.description ?? "");
  const dirty = name !== o.name || desc !== (o.description ?? "");
  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <span className="w-6 text-xs text-muted-foreground">{o.code}</span>
      <Input className="h-8 max-w-xs" value={name} onChange={(e) => setName(e.target.value)} />
      <Input className="h-8 max-w-md flex-1" value={desc} placeholder="Description" onChange={(e) => setDesc(e.target.value)} />
      {dirty && (
        <Button size="sm" onClick={() => onSave({ name, description: desc || null, status: o.status as "active" })}>
          Save
        </Button>
      )}
      <Switch checked={o.status === "active"} onCheckedChange={(v) => onSave({ name: o.name, description: o.description, status: v ? "active" : "inactive" })} />
    </li>
  );
}
