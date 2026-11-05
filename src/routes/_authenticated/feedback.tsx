import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FilterPanel } from "@/components/admin/FilterPanel";
import { SectionCard } from "@/components/admin/Kpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFeedback } from "@/lib/data";
import { useGlobalFilters } from "@/lib/filter-store";
import { applyFilters, exportCsv, exportExcel, fmtRating } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback Records | ABHI Learning HUB" },
      {
        name: "description",
        content: "Browse, search and export every submitted training feedback record.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FeedbackPage,
});

function FeedbackPage() {
  const filters = useGlobalFilters();
  const { data: all = [], isLoading } = useFeedback();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const base = applyFilters(all, filters);
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((r) =>
      [r.employee_code, r.employee_name, r.training_name, r.trainer_name, r.department_name]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [all, filters, search]);

  const exportRows = () =>
    rows.map((r) => ({
      Submitted: new Date(r.submitted_at).toLocaleString(),
      EmployeeCode: r.employee_code,
      Employee: r.employee_name,
      Gender: r.gender_name,
      Designation: r.designation_name,

      Department: r.department_name,
      Wing: r.wing_name,
      Region: r.region_name,
      Location: r.location_name,
      Training: r.training_name,
      TrainingCode: r.training_code,
      Type: r.training_type,
      TrainingDate: r.training_date,
      Trainer: r.trainer_name,
      Content: r.content_rating,
      Trainer_Rating: r.trainer_rating,
      Venue: r.venue_rating,
      Overall: r.overall_rating,
      QualityScore: r.quality_score,
      Recommend: r.recommendation === null ? "" : r.recommendation ? "Yes" : "No",
      MostUseful: r.useful_aspect,
      Improvements: r.improvement_suggestion,
      Additional: r.additional_comments,
    }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {rows.length} record{rows.length === 1 ? "" : "s"} matching the current filters.
        </p>
      </div>

      <FilterPanel rows={all} />

      <SectionCard
        title="All Submitted Feedback"
        action={
          <div className="no-print flex flex-wrap gap-2">
            <Input
              placeholder="Search employee, training, trainer…"
              className="w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={() => exportCsv(exportRows(), "feedback")}>
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportExcel(exportRows(), "feedback")}>
              Excel
            </Button>
          </div>
        }
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Submitted</th>
                  <th className="py-2 pr-3">Employee</th>
                  <th className="py-2 pr-3">Department</th>
                  <th className="py-2 pr-3">Region</th>
                  <th className="py-2 pr-3">Training</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Trainer</th>
                  <th className="py-2 pr-3">Content</th>
                  <th className="py-2 pr-3">Trainer</th>
                  <th className="py-2 pr-3">Venue</th>
                  <th className="py-2 pr-3">Overall</th>
                  <th className="py-2 pr-3">Quality</th>
                  <th className="py-2 pr-3">Recommend</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="font-medium">{r.employee_name ?? "—"}</span>
                      <span className="block text-xs text-muted-foreground">{r.employee_code}</span>
                    </td>
                    <td className="py-2 pr-3">{r.department_name ?? "—"}</td>
                    <td className="py-2 pr-3">{r.region_name ?? "—"}</td>
                    <td className="py-2 pr-3">{r.training_name ?? "—"}</td>
                    <td className="py-2 pr-3 capitalize">{r.training_type ?? "—"}</td>
                    <td className="py-2 pr-3">{r.trainer_name ?? "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmtRating(r.content_rating)}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmtRating(r.trainer_rating)}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmtRating(r.venue_rating)}</td>
                    <td className="py-2 pr-3 tabular-nums font-medium">{fmtRating(r.overall_rating)}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmtRating(r.quality_score)}</td>
                    <td className="py-2 pr-3">
                      {r.recommendation === null ? "—" : r.recommendation ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length ? (
              <p className="py-4 text-sm text-muted-foreground">No feedback matches the filters.</p>
            ) : null}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
