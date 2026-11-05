import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { SectionCard } from "@/components/admin/Kpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/training-calendar")({
  head: () => ({
    meta: [
      { title: "Training Calendar | L&D Portal" },
      {
        name: "description",
        content: "Yearly employee-wise training calendar generated from the training need assessment results.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainingCalendarPage,
});

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function TrainingCalendarPage() {
  const qc = useQueryClient();
  const [year, setYear] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const items = useQuery({
    queryKey: ["training-calendar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_calendar")
        .select("*")
        .order("year", { ascending: false })
        .order("month")
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const people = useQuery({
    queryKey: ["training-calendar-participants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_calendar_participants")
        .select("*")
        .order("training_date")
        .order("employee_name")
        .limit(100000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const years = useMemo(
    () =>
      [...new Set([...(items.data ?? []).map((i) => i.year), ...(people.data ?? []).map((p) => p.year)])].sort(
        (a, b) => b - a,
      ),
    [items.data, people.data],
  );
  const selectedYear = year ?? years[0] ?? new Date().getFullYear();
  const rows = (items.data ?? []).filter((i) => i.year === selectedYear);

  const staffRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (people.data ?? [])
      .filter((p) => p.year === selectedYear)
      .filter((p) =>
        !q
          ? true
          : [p.employee_code, p.employee_name, p.designation, p.department, p.program_name]
              .join(" ")
              .toLowerCase()
              .includes(q),
      );
  }, [people.data, selectedYear, search]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("training_calendar").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-calendar"] });
      qc.invalidateQueries({ queryKey: ["training-calendar-participants"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        staffRows.map((r) => ({
          "Employee ID": r.employee_code,
          "Employee Name": r.employee_name,
          Designation: r.designation ?? "",
          Department: r.department ?? "",
          "Sub Department": r.sub_department ?? "",
          Branch: r.branch ?? "",
          Region: r.region ?? "",
          "Training Program": r.program_name,
          "Month of Training": MONTHS[r.month - 1],
          "Date of Training": fmtDate(r.training_date),
          Quarter: `Q${r.quarter}`,
          Mode: r.delivery_mode,
          Priority: r.priority,
          "Skill gaps covered": (r.skills ?? []).join(", "),
        })),
      ),
      "Employee Calendar",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          Month: MONTHS[r.month - 1],
          Quarter: `Q${r.quarter}`,
          "Training Program": r.skill_name,
          Type: r.skill_type,
          Priority: r.priority,
          "Staff affected": r.affected_count,
          "Average rating": r.avg_rating,
          Audience: r.audience,
          Mode: r.delivery_mode,
          "Skills covered": (r.skills_covered ?? []).join(", "),
          Notes: r.notes,
        })),
      ),
      "Programs",
    );
    XLSX.writeFile(wb, `Training-Calendar-${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Generated automatically from the training need assessment results, with every employee scheduled onto a dated
          session.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Year</Label>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={selectedYear}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {(years.length ? years : [selectedYear]).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Search employee / program</Label>
          <Input className="w-64" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, ID, department…" />
        </div>
        <Button variant="outline" size="sm" onClick={exportXlsx} disabled={!rows.length && !staffRows.length}>
          <Download className="size-4" /> Download Excel
        </Button>
      </div>

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">Employee-wise ({staffRows.length})</TabsTrigger>
          <TabsTrigger value="programs">Training programs ({rows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-4">
          {!staffRows.length ? (
            <p className="text-sm text-muted-foreground">
              No employee schedule for {selectedYear} yet. Generate one from the Training Need Assessment page.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-2">Employee ID</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Designation</th>
                    <th className="p-2">Department</th>
                    <th className="p-2">Training</th>
                    <th className="p-2">Month</th>
                    <th className="p-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {staffRows.map((p) => (
                    <tr key={p.id} className="align-top">
                      <td className="p-2 font-mono text-xs">{p.employee_code}</td>
                      <td className="p-2 font-medium">{p.employee_name}</td>
                      <td className="p-2 text-muted-foreground">{p.designation ?? "—"}</td>
                      <td className="p-2 text-muted-foreground">{p.department ?? "—"}</td>
                      <td className="p-2">
                        <p>{p.program_name}</p>
                        <p className="text-xs text-muted-foreground">{(p.skills ?? []).join(", ")}</p>
                      </td>
                      <td className="p-2">{MONTHS[p.month - 1]}</td>
                      <td className="p-2 whitespace-nowrap">{fmtDate(p.training_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="programs" className="mt-4">
          {!rows.length ? (
            <p className="text-sm text-muted-foreground">
              No calendar for {selectedYear} yet. Generate one from the Training Need Assessment page.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {MONTHS.map((m, idx) => {
                const monthRows = rows.filter((r) => r.month === idx + 1);
                if (!monthRows.length) return null;
                return (
                  <SectionCard key={m} title={`${m} ${selectedYear}`} description={`${monthRows.length} training(s)`}>
                    <div className="divide-y">
                      {monthRows.map((r) => (
                        <div key={r.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{r.skill_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.audience} • {r.affected_count} staff • avg {r.avg_rating}/5
                            </p>
                            {(r.skills_covered ?? []).length ? (
                              <p className="text-xs text-muted-foreground">
                                Covers: {(r.skills_covered ?? []).join(", ")}
                              </p>
                            ) : null}
                          </div>
                          <span
                            className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                              r.priority === "high"
                                ? "bg-destructive/15 text-destructive"
                                : r.priority === "medium"
                                  ? "bg-warning/15 text-warning"
                                  : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {r.priority}
                          </span>
                          <Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
