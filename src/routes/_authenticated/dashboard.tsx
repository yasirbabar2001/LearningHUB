import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Download, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { FilterPanel } from "@/components/admin/FilterPanel";
import { KpiCard, RatingKpi, SectionCard } from "@/components/admin/Kpi";
import { StatTable } from "@/components/admin/StatTable";
import { AnalyticsPanel } from "@/components/admin/AnalyticsPanel";
import { ReportsPanel } from "@/components/admin/ReportsPanel";
import { downloadAllVirtualReport } from "@/components/virtual/VirtualProgressReport";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadDashboardReport } from "@/lib/report-export";
import { downloadMisReport } from "@/lib/mis-report";
import { useFeedback, useSettings, useTrainings } from "@/lib/data";
import { useGlobalFilters } from "@/lib/filter-store";
import {
  applyFilters,
  avg,
  buildInsights,
  fmtPct,
  fmtRating,
  groupStats,
  monthKey,
  pct,
} from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Comprehensive Dashboard | ABHI Learning HUB" },
      {
        name: "description",
        content:
          "Comprehensive management dashboard for training statistics, analytics, executive insights and reports.",
      },
      { property: "og:title", content: "Comprehensive Dashboard | ABHI Learning HUB" },
      {
        property: "og:description",
        content: "Comprehensive management dashboard for training statistics, analytics, executive insights and reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const CHART = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Dashboard() {
  const filters = useGlobalFilters();
  const { data: all = [], isLoading } = useFeedback();
  const { data: trainings = [] } = useTrainings();
  const { data: settings } = useSettings();
  const threshold = settings?.rating_threshold ?? 4;
  const minSample = settings?.min_sample_size ?? 10;

  const rows = useMemo(() => applyFilters(all, filters), [all, filters]);

  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const thisYear = now.toISOString().slice(0, 4);

  const classroom = rows.filter((r) => r.training_type === "classroom");
  const virtual = rows.filter((r) => r.training_type === "virtual");
  const recs = rows.filter((r) => r.recommendation !== null);
  const recPct = recs.length
    ? (recs.filter((r) => r.recommendation).length / recs.length) * 100
    : null;

  const overall = avg(rows.map((r) => r.overall_rating));
  const content = avg(rows.map((r) => r.content_rating));
  const trainer = avg(rows.map((r) => r.trainer_rating));
  const venue = avg(classroom.map((r) => r.venue_rating));

  const typeCompare = [
    {
      metric: "Content",
      Classroom: avg(classroom.map((r) => r.content_rating)) ?? 0,
      Virtual: avg(virtual.map((r) => r.content_rating)) ?? 0,
    },
    {
      metric: "Trainer",
      Classroom: avg(classroom.map((r) => r.trainer_rating)) ?? 0,
      Virtual: avg(virtual.map((r) => r.trainer_rating)) ?? 0,
    },
    {
      metric: "Overall",
      Classroom: avg(classroom.map((r) => r.overall_rating)) ?? 0,
      Virtual: avg(virtual.map((r) => r.overall_rating)) ?? 0,
    },
  ];

  const monthly = useMemo(
    () =>
      groupStats(rows, monthKey)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((m) => ({
          month: m.key,
          Overall: m.overall ? Number(m.overall.toFixed(2)) : 0,
          Content: m.content ? Number(m.content.toFixed(2)) : 0,
          Trainer: m.trainer ? Number(m.trainer.toFixed(2)) : 0,
          Responses: m.responses,
        })),
    [rows],
  );

  const byTraining = useMemo(() => groupStats(rows, (r) => r.training_name), [rows]);
  const byTrainer = useMemo(() => groupStats(rows, (r) => r.trainer_name), [rows]);
  const byRegion = useMemo(() => groupStats(rows, (r) => r.region_name), [rows]);

  const alerts = [
    ...byTraining
      .filter((t) => t.overall !== null && t.overall < threshold)
      .map((t) => ({ type: "Training", ...t })),
    ...byTrainer
      .filter((t) => t.trainer !== null && t.trainer < threshold)
      .map((t) => ({ type: "Trainer", ...t })),
  ];

  const insights = useMemo(() => buildInsights(rows, minSample), [rows, minSample]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading analytics…</p>;

  const filterNote =
    Object.entries(filters)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ") || "No filters applied (all feedback)";

  const handleDownload = async () => {
    if (!rows.length) {
      toast.error("No feedback data available for the current filters.");
      return;
    }
    try {
      toast.loading("Preparing report…", { id: "report" });
      await downloadDashboardReport(rows, filterNote);
      toast.success("Report downloaded.", { id: "report" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate the report.", {
        id: "report",
      });
    }
  };

  const handleMis = async () => {
    if (!rows.length) {
      toast.error("No feedback data available for the current filters.");
      return;
    }
    try {
      toast.loading("Preparing MIS report…", { id: "mis" });
      await downloadMisReport(rows, filterNote);
      toast.success("MIS report downloaded.", { id: "mis" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate the MIS report.", {
        id: "mis",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Statistics, executive insights, detailed analysis and reports in one place.
        </p>
      </div>

      <FilterPanel rows={all} />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="no-print flex h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Detailed Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports &amp; Downloads</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Trainings" value={String(trainings.length)} />
        <KpiCard
          label="Active Trainings"
          value={String(trainings.filter((t) => t.status === "active").length)}
        />
        <KpiCard
          label="Classroom Trainings"
          value={String(trainings.filter((t) => t.training_type === "classroom").length)}
        />
        <KpiCard
          label="Virtual Trainings"
          value={String(trainings.filter((t) => t.training_type === "virtual").length)}
        />
        <KpiCard label="Total Feedback Responses" value={String(rows.length)} tone="accent" />
        <KpiCard label="Classroom Feedback" value={String(classroom.length)} />
        <KpiCard label="Virtual Feedback" value={String(virtual.length)} />
        <KpiCard
          label="Feedback This Month / Year"
          value={`${rows.filter((r) => r.submitted_at.slice(0, 7) === thisMonth).length} / ${rows.filter((r) => r.submitted_at.slice(0, 4) === thisYear).length}`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <RatingKpi label="Overall Average Rating" rating={overall} responses={rows.length} minSample={minSample} />
        <RatingKpi label="Training Content" rating={content} responses={rows.length} minSample={minSample} />
        <RatingKpi label="Trainer Rating" rating={trainer} responses={rows.length} minSample={minSample} />
        <RatingKpi label="Venue Rating (Classroom)" rating={venue} responses={classroom.length} minSample={minSample} />
        <KpiCard
          label="Recommendation Rate"
          value={fmtPct(recPct)}
          sub={`${recs.filter((r) => r.recommendation).length} of ${recs.length} said Yes`}
          tone="success"
        />
      </div>

      <SectionCard title="Key Insights" description="Generated from actual feedback records.">
        <ul className="space-y-2">
          {insights.map((i) => (
            <li key={i} className="flex gap-2 text-sm">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>{i}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Classroom vs Virtual — Average Ratings">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={typeCompare}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="metric" fontSize={12} />
              <YAxis domain={[0, 5]} fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Classroom" fill={CHART[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Virtual" fill={CHART[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Feedback Split by Training Type">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={[
                  { name: "Classroom", value: classroom.length },
                  { name: "Virtual", value: virtual.length },
                ]}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={95}
                label
              >
                <Cell fill={CHART[0]} />
                <Cell fill={CHART[1]} />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <SectionCard
        title="Training Quality Trend"
        description="Average category ratings over time."
      >
        {monthly.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis domain={[0, 5]} fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Overall" stroke={CHART[0]} strokeWidth={2} />
              <Line type="monotone" dataKey="Content" stroke={CHART[1]} strokeWidth={2} />
              <Line type="monotone" dataKey="Trainer" stroke={CHART[2]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground">Insufficient data to generate this trend.</p>
        )}
      </SectionCard>

      <SectionCard title="Attention Required" description={`Below the configured threshold of ${threshold.toFixed(2)} / 5.`}>
        {alerts.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((a) => (
              <div key={`${a.type}-${a.key}`} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <AlertTriangle className="size-3.5" /> {a.type}
                </p>
                <p className="mt-1 font-medium">{a.key}</p>
                <p className="text-xs text-muted-foreground">
                  Overall {fmtRating(a.overall)} · Trainer {fmtRating(a.trainer)} · Content{" "}
                  {fmtRating(a.content)} · {a.responses} responses
                </p>
                {a.responses < minSample ? (
                  <p className="mt-1 text-xs text-warning">Small sample size — interpret with caution.</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No trainings or trainers are below the threshold for the current filters.
          </p>
        )}
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Top Trainers" description="Ranked by average trainer rating.">
          <StatTable
            stats={[...byTrainer].sort((a, b) => (b.trainer ?? 0) - (a.trainer ?? 0)).slice(0, 5)}
            label="Trainer"
            minSample={minSample}
          />
        </SectionCard>
        <SectionCard title="Best Performing Trainings — Content">
          <StatTable
            stats={[...byTraining].sort((a, b) => (b.content ?? 0) - (a.content ?? 0)).slice(0, 5)}
            label="Training"
            minSample={minSample}
          />
        </SectionCard>
      </div>

      <SectionCard title="Region-wise Performance">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byRegion.map((r) => ({ region: r.key, Overall: Number((r.overall ?? 0).toFixed(2)), Score: Number((pct(r.overall) ?? 0).toFixed(1)) }))}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="region" fontSize={12} />
            <YAxis domain={[0, 5]} fontSize={12} />
            <Tooltip />
            <Bar dataKey="Overall" fill={CHART[3]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <StatTable stats={byRegion} label="Region" minSample={minSample} />
      </SectionCard>
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsPanel />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <SectionCard
            title="Complete Dashboard Reports"
            description="Download the full filtered feedback workbook or the management information report."
          >
            <div className="no-print flex flex-wrap gap-2">
              <Button onClick={handleDownload}>
                <Download className="size-4" /> Download Full Report
              </Button>
              <Button variant="outline" onClick={handleMis}>
                <Download className="size-4" /> Download MIS Report
              </Button>
              <Button variant="outline" onClick={() => { void downloadAllVirtualReport(filters).catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Could not build the virtual training report.")); }}>
                <Download className="size-4" /> Download Virtual Training Report
              </Button>
            </div>
          </SectionCard>
          <ReportsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
