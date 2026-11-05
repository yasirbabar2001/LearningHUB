import { neutralizeRows } from "@/lib/analytics";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard, SectionCard } from "@/components/admin/Kpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { fmtRating } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/trainer-reports")({
  head: () => ({
    meta: [
      { title: "Trainer Feedback Reports | ABHI Learning HUB" },
      {
        name: "description",
        content:
          "Review trainer-submitted assessments of engagement, logistics, material, timing and support for each delivered session.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainerReportsPage,
});

type Row = {
  id: string;
  submitted_at: string;
  trainer_name: string | null;
  training_name: string | null;
  training_code: string | null;
  training_type: string | null;
  training_date: string | null;
  training_mandatory: string | null;
  participants_count: number | null;
  engagement_rating: number | null;
  knowledge_rating: number | null;
  logistics_rating: number | null;
  material_rating: number | null;
  time_rating: number | null;
  support_rating: number | null;
  overall_rating: number | null;
  avg_rating: number | null;
  objectives_achieved: boolean | null;
  strengths: string | null;
  challenges: string | null;
  suggestions: string | null;
  additional_comments: string | null;
};

const avg = (nums: (number | null)[]) => {
  const v = nums.filter((n): n is number => typeof n === "number");
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

function TrainerReportsPage() {
  const [search, setSearch] = useState("");
  const [trainer, setTrainer] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["trainer-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_feedback")
        .select("*")
        .order("submitted_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const trainers = useMemo(
    () => [...new Set(data.map((r) => r.trainer_name).filter((v): v is string => !!v))].sort(),
    [data],
  );

  const rows = useMemo(
    () =>
      data.filter((r) => {
        if (trainer && r.trainer_name !== trainer) return false;
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return [r.training_name, r.training_code, r.trainer_name]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q));
      }),
    [data, trainer, search],
  );

  const byTrainer = useMemo(() => {
    const map = new Map<string, Row[]>();
    rows.forEach((r) => {
      const k = r.trainer_name ?? "—";
      map.set(k, [...(map.get(k) ?? []), r]);
    });
    return [...map.entries()]
      .map(([name, list]) => ({
        name,
        sessions: list.length,
        participants: list.reduce((a, b) => a + (b.participants_count ?? 0), 0),
        engagement: avg(list.map((r) => r.engagement_rating)),
        logistics: avg(list.map((r) => r.logistics_rating)),
        material: avg(list.map((r) => r.material_rating)),
        support: avg(list.map((r) => r.support_rating)),
        overall: avg(list.map((r) => r.overall_rating)),
      }))
      .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
  }, [rows]);

  const objectivesPct = rows.length
    ? Math.round((rows.filter((r) => r.objectives_achieved).length / rows.length) * 100)
    : 0;

  const exportExcel = () => {
    const detail = rows.map((r) => ({
      "Submitted At": new Date(r.submitted_at).toLocaleString(),
      Trainer: r.trainer_name ?? "",
      "Training Name": r.training_name ?? "",
      "Training Code": r.training_code ?? "",
      "Training Type": r.training_type ?? "",
      "Training Date": r.training_date ?? "",
      Mandatory: r.training_mandatory === "mandatory" ? "Mandatory" : "Non Mandatory",
      Participants: r.participants_count ?? "",
      "Participant Engagement": r.engagement_rating ?? "",
      "Participant Prior Knowledge": r.knowledge_rating ?? "",
      "Venue / Platform & Logistics": r.logistics_rating ?? "",
      "Material & Content": r.material_rating ?? "",
      "Time Allocation": r.time_rating ?? "",
      "L&D Support": r.support_rating ?? "",
      "Overall Effectiveness": r.overall_rating ?? "",
      "Average Rating": r.avg_rating ?? "",
      "Objectives Achieved": r.objectives_achieved ? "Yes" : "No",
      Strengths: r.strengths ?? "",
      Challenges: r.challenges ?? "",
      Suggestions: r.suggestions ?? "",
      "Additional Comments": r.additional_comments ?? "",
    }));

    const summary = byTrainer.map((t) => ({
      Trainer: t.name,
      Sessions: t.sessions,
      Participants: t.participants,
      Engagement: t.engagement?.toFixed(2) ?? "",
      Logistics: t.logistics?.toFixed(2) ?? "",
      Material: t.material?.toFixed(2) ?? "",
      "L&D Support": t.support?.toFixed(2) ?? "",
      Overall: t.overall?.toFixed(2) ?? "",
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(neutralizeRows(summary)), "Trainer Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(neutralizeRows(detail)), "Trainer Feedback Detail");
    XLSX.writeFile(wb, `trainer-feedback-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Assessments submitted by trainers for the sessions they delivered.
          </p>
        </div>
        <Button onClick={exportExcel} disabled={!rows.length}>
          <Download className="size-4" /> Download Excel
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Trainer Submissions" value={String(rows.length)} />
        <KpiCard
          label="Avg Overall Effectiveness"
          value={fmtRating(avg(rows.map((r) => r.overall_rating)))}
        />
        <KpiCard
          label="Avg Participant Engagement"
          value={fmtRating(avg(rows.map((r) => r.engagement_rating)))}
        />
        <KpiCard label="Objectives Achieved" value={`${objectivesPct}%`} tone="success" />
      </div>

      <SectionCard
        title="Filters"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SearchableSelect
            options={[
              { value: "__all", label: "All trainers" },
              ...trainers.map((t) => ({ value: t, label: t })),
            ]}
            value={trainer || "__all"}
            onChange={(v) => setTrainer(!v || v === "__all" ? "" : v)}
            placeholder="All trainers"
            searchPlaceholder="Search trainer…"
          />
          <Input
            placeholder="Search training name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </SectionCard>

      <SectionCard title="Trainer-wise Summary">
        <div className="overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Trainer</th>
                <th className="py-2 pr-3">Sessions</th>
                <th className="py-2 pr-3">Participants</th>
                <th className="py-2 pr-3">Engagement</th>
                <th className="py-2 pr-3">Logistics</th>
                <th className="py-2 pr-3">Material</th>
                <th className="py-2 pr-3">L&amp;D Support</th>
                <th className="py-2 pr-3">Overall</th>
              </tr>
            </thead>
            <tbody>
              {byTrainer.map((t) => (
                <tr key={t.name} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{t.name}</td>
                  <td className="py-2 pr-3 tabular-nums">{t.sessions}</td>
                  <td className="py-2 pr-3 tabular-nums">{t.participants}</td>
                  <td className="py-2 pr-3 tabular-nums">{fmtRating(t.engagement)}</td>
                  <td className="py-2 pr-3 tabular-nums">{fmtRating(t.logistics)}</td>
                  <td className="py-2 pr-3 tabular-nums">{fmtRating(t.material)}</td>
                  <td className="py-2 pr-3 tabular-nums">{fmtRating(t.support)}</td>
                  <td className="py-2 pr-3 tabular-nums">{fmtRating(t.overall)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!byTrainer.length ? (
            <p className="py-4 text-sm text-muted-foreground">
              {isLoading ? "Loading…" : "No trainer feedback submitted yet."}
            </p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Submissions">
        <div className="overflow-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Trainer</th>
                <th className="py-2 pr-3">Training</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Participants</th>
                <th className="py-2 pr-3">Overall</th>
                <th className="py-2 pr-3">Objectives</th>
                <th className="py-2 pr-3">Challenges</th>
                <th className="py-2 pr-3">Suggestions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b align-top last:border-0">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {new Date(r.submitted_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-3">{r.trainer_name ?? "—"}</td>
                  <td className="py-2 pr-3 font-medium">{r.training_name ?? "—"}</td>
                  <td className="py-2 pr-3 capitalize">{r.training_type ?? "—"}</td>
                  <td className="py-2 pr-3 tabular-nums">{r.participants_count ?? "—"}</td>
                  <td className="py-2 pr-3 tabular-nums">{fmtRating(r.overall_rating)}</td>
                  <td className="py-2 pr-3">{r.objectives_achieved ? "Yes" : "No"}</td>
                  <td className="max-w-[220px] py-2 pr-3 text-muted-foreground">
                    {r.challenges ?? "—"}
                  </td>
                  <td className="max-w-[220px] py-2 pr-3 text-muted-foreground">
                    {r.suggestions ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? (
            <p className="py-4 text-sm text-muted-foreground">
              {isLoading ? "Loading…" : "No trainer feedback found."}
            </p>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}
