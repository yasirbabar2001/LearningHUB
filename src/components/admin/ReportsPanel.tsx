import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { SectionCard } from "@/components/admin/Kpi";
import { StatTable } from "@/components/admin/StatTable";
import { Button } from "@/components/ui/button";
import { useFeedback, useSettings } from "@/lib/data";
import { useEvaluationAttempts } from "@/lib/evaluation-data";
import { exportEvaluationReport } from "@/lib/evaluation-report";
import { useSurveyResponses } from "@/lib/survey-data";
import { exportSurveyReport } from "@/lib/survey-report";
import { useGlobalFilters } from "@/lib/filter-store";
import {
  applyFilters,
  avg,
  exportCsv,
  exportExcel,
  exportPdf,
  fmtPct,
  fmtRating,
  groupStats,
  monthKey,
  type FeedbackRow,
} from "@/lib/analytics";

const REPORTS: { id: string; label: string; keyFn: (r: FeedbackRow) => string | null }[] = [
  { id: "training", label: "Training-wise Report", keyFn: (r) => r.training_name },
  { id: "trainer", label: "Trainer-wise Report", keyFn: (r) => r.trainer_name },
  { id: "department", label: "Department-wise Report", keyFn: (r) => r.department_name },
  { id: "region", label: "Region-wise Report", keyFn: (r) => r.region_name },
  { id: "location", label: "Location-wise Report", keyFn: (r) => r.location_name },
  { id: "wing", label: "Wing-wise Report", keyFn: (r) => r.wing_name },
  { id: "designation", label: "Designation-wise Report", keyFn: (r) => r.designation_name },
  { id: "gender", label: "Gender-wise Report", keyFn: (r) => r.gender_name },
  { id: "type", label: "Training Type Report", keyFn: (r) => r.training_type },
  { id: "month", label: "Monthly Report", keyFn: monthKey },
];

export function ReportsPanel() {
  const filters = useGlobalFilters();
  const { data: all = [] } = useFeedback();
  const { data: settings } = useSettings();
  const minSample = settings?.min_sample_size ?? 10;
  const [reportId, setReportId] = useState("training");
  const { data: attempts = [] } = useEvaluationAttempts();
  const { data: surveyRows = [] } = useSurveyResponses();

  const rows = useMemo(() => applyFilters(all, filters), [all, filters]);
  const report = REPORTS.find((r) => r.id === reportId)!;
  const stats = useMemo(
    () => groupStats(rows, report.keyFn).sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0)),
    [rows, report],
  );

  const exportRows = stats.map((s) => ({
    Group: s.key,
    Responses: s.responses,
    Content: s.content?.toFixed(2) ?? "",
    Trainer: s.trainer?.toFixed(2) ?? "",
    Venue: s.venue?.toFixed(2) ?? "",
    Overall: s.overall?.toFixed(2) ?? "",
    QualityScore: s.quality?.toFixed(2) ?? "",
    RecommendationRate: s.recommendPct?.toFixed(1) ?? "",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Every report respects the dashboard filters.</p>
        <div className="no-print flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsv(exportRows, report.id)}>
            <FileText className="size-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportExcel(exportRows, report.id)}>
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <Printer className="size-4" /> PDF / Print
          </Button>
        </div>
      </div>

      <div className="no-print flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <Button
            key={r.id}
            size="sm"
            variant={r.id === reportId ? "default" : "outline"}
            onClick={() => setReportId(r.id)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <SectionCard
        title="Pre & Post Training Evaluation Report"
        description="Excel workbook with pre vs post scores, knowledge gain and pass rates by training, trainer, department, region, location, wing, designation and gender."
      >
        <Button
          size="sm"
          disabled={!attempts.length}
          onClick={() => exportEvaluationReport(attempts)}
        >
          <FileSpreadsheet className="size-4" />{" "}
          {attempts.length
            ? `Download Evaluation Excel (${attempts.length} attempts)`
            : "No evaluations submitted yet"}
        </Button>
      </SectionCard>

      <SectionCard
        title="L&D Effectiveness Survey Report"
        description="Excel workbook with section scores, per-question averages, choice analysis, demographics, open feedback and raw responses."
      >
        <Button
          size="sm"
          disabled={!surveyRows.length}
          onClick={() => exportSurveyReport(surveyRows)}
        >
          <FileSpreadsheet className="size-4" />{" "}
          {surveyRows.length
            ? `Download Survey Excel (${surveyRows.length} responses)`
            : "No survey responses yet"}
        </Button>
      </SectionCard>

      <SectionCard
        title={report.label}
        description={`${rows.length} feedback responses · generated ${new Date().toLocaleString()}`}
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          <Summary label="Responses" value={String(rows.length)} />
          <Summary label="Avg Overall" value={fmtRating(avg(rows.map((r) => r.overall_rating)))} />
          <Summary label="Avg Content" value={fmtRating(avg(rows.map((r) => r.content_rating)))} />
          <Summary
            label="Recommendation"
            value={fmtPct(
              rows.filter((r) => r.recommendation !== null).length
                ? (rows.filter((r) => r.recommendation).length /
                    rows.filter((r) => r.recommendation !== null).length) *
                    100
                : null,
            )}
          />
        </div>
        <StatTable stats={stats} label={report.label.replace("-wise Report", "")} minSample={minSample} />
      </SectionCard>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
