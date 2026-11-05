import { useMemo, useState } from "react";
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
import { SectionCard } from "@/components/admin/Kpi";
import { CoachInsights } from "@/components/admin/CoachInsights";
import { StatTable } from "@/components/admin/StatTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFeedback, useSettings } from "@/lib/data";
import { useGlobalFilters } from "@/lib/filter-store";
import {
  allComments,
  applyFilters,
  classifySentiment,
  fmtPct,
  fmtRating,
  groupStats,
  monthKey,
  quarterKey,
  themeCounts,
  yearKey,
  type FeedbackRow,
} from "@/lib/analytics";

const CHART = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function AnalyticsPanel() {
  const filters = useGlobalFilters();
  const { data: all = [] } = useFeedback();
  const { data: settings } = useSettings();
  const minSample = settings?.min_sample_size ?? 10;
  const threshold = settings?.rating_threshold ?? 4;
  const rows = useMemo(() => applyFilters(all, filters), [all, filters]);

  const [rank, setRank] = useState("top5");
  const [period, setPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("highest");

  const byTraining = useMemo(() => groupStats(rows, (r) => r.training_name), [rows]);
  const byTrainer = useMemo(() => groupStats(rows, (r) => r.trainer_name), [rows]);
  const byGender = useMemo(() => groupStats(rows, (r) => r.gender_name), [rows]);

  const ranked = useMemo(() => {
    const sorted = [...byTraining].sort((a, b) => (b.content ?? 0) - (a.content ?? 0));
    const n = rank.endsWith("5") ? 5 : 10;
    return rank.startsWith("top") ? sorted.slice(0, n) : sorted.reverse().slice(0, n);
  }, [byTraining, rank]);

  const trend = useMemo(() => {
    const keyFn = period === "monthly" ? monthKey : period === "quarterly" ? quarterKey : yearKey;
    return groupStats(rows, keyFn)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((g) => ({
        period: g.key,
        Overall: Number((g.overall ?? 0).toFixed(2)),
        Content: Number((g.content ?? 0).toFixed(2)),
        Trainer: Number((g.trainer ?? 0).toFixed(2)),
        Venue: Number((g.venue ?? 0).toFixed(2)),
        Responses: g.responses,
      }));
  }, [rows, period]);

  const trainingPerf = useMemo(() => {
    const list = [...byTraining];
    const rowFor = (key: string) => rows.find((r) => r.training_name === key);
    switch (sort) {
      case "lowest":
        return list.sort((a, b) => (a.overall ?? 0) - (b.overall ?? 0));
      case "responses":
        return list.sort((a, b) => b.responses - a.responses);
      case "latest":
        return list.sort((a, b) =>
          (rowFor(b.key)?.training_date ?? "").localeCompare(rowFor(a.key)?.training_date ?? ""),
        );
      case "oldest":
        return list.sort((a, b) =>
          (rowFor(a.key)?.training_date ?? "").localeCompare(rowFor(b.key)?.training_date ?? ""),
        );
      default:
        return list.sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
    }
  }, [byTraining, sort, rows]);

  const comments = useMemo(() => allComments(rows), [rows]);
  const sentiments = useMemo(() => {
    const counts = { positive: 0, neutral: 0, negative: 0 };
    comments.forEach((c) => (counts[classifySentiment(c)] += 1));
    const total = comments.length || 1;
    return {
      counts,
      data: (["positive", "neutral", "negative"] as const).map((k) => ({
        name: k[0]!.toUpperCase() + k.slice(1),
        value: counts[k],
        share: (counts[k] / total) * 100,
      })),
    };
  }, [comments]);

  const themes = useMemo(() => themeCounts(comments), [comments]);

  const commentRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      !q
        ? r.useful_aspect || r.improvement_suggestion || r.additional_comments
        : [
            r.useful_aspect,
            r.improvement_suggestion,
            r.additional_comments,
            r.training_name,
            r.trainer_name,
            r.department_name,
          ]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const venueByLocation = useMemo(
    () =>
      groupStats(
        rows.filter((r) => r.training_type === "classroom"),
        (r) => r.location_name,
      ).sort((a, b) => (b.venue ?? 0) - (a.venue ?? 0)),
    [rows],
  );

  const dimension = (label: string, keyFn: (r: FeedbackRow) => string | null) => (
    <SectionCard title={`${label}-wise Analysis`}>
      <StatTable
        stats={groupStats(rows, keyFn).sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))}
        label={label}
        minSample={minSample}
      />
    </SectionCard>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="trainers">
        <TabsList className="no-print flex-wrap">
          <TabsTrigger value="trainers">Trainers</TabsTrigger>
          <TabsTrigger value="trainings">Trainings</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="venue">Venue</TabsTrigger>
          <TabsTrigger value="org">Organisation</TabsTrigger>
          <TabsTrigger value="gender">Gender</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="recommend">Recommendation</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="coach">Learning Coach</TabsTrigger>
        </TabsList>

        <TabsContent value="coach" className="space-y-5">
          <CoachInsights />
        </TabsContent>

        <TabsContent value="trainers" className="space-y-5">
          <SectionCard
            title="Trainer Performance"
            description="Ratings shown alongside sample size. Do not judge a trainer on a single session."
          >
            <StatTable
              stats={[...byTrainer].sort((a, b) => (b.trainer ?? 0) - (a.trainer ?? 0))}
              label="Trainer"
              minSample={minSample}
            />
          </SectionCard>
          <SectionCard title="Trainers Requiring Attention" description={`Average trainer rating below ${threshold.toFixed(2)}.`}>
            <StatTable
              stats={byTrainer.filter((t) => t.trainer !== null && t.trainer < threshold)}
              label="Trainer"
              minSample={minSample}
            />
          </SectionCard>
          <SectionCard title="Trainer Rating Trend">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" fontSize={12} />
                <YAxis domain={[0, 5]} fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Trainer" stroke={CHART[0]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>
        </TabsContent>

        <TabsContent value="trainings" className="space-y-5">
          <SectionCard
            title="Training Performance"
            action={
              <select
                className="no-print rounded-md border bg-background px-2 py-1.5 text-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
                <option value="responses">Most Responses</option>
                <option value="latest">Latest Training</option>
                <option value="oldest">Oldest Training</option>
              </select>
            }
          >
            <StatTable stats={trainingPerf} label="Training" minSample={minSample} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="content" className="space-y-5">
          <SectionCard
            title="Content Rating Ranking"
            action={
              <select
                className="no-print rounded-md border bg-background px-2 py-1.5 text-sm"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
              >
                <option value="top5">Top 5</option>
                <option value="top10">Top 10</option>
                <option value="bottom5">Bottom 5</option>
                <option value="bottom10">Bottom 10</option>
              </select>
            }
          >
            <StatTable stats={ranked} label="Training" minSample={minSample} />
          </SectionCard>
          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="Content Rating by Department">
              <StatTable stats={groupStats(rows, (r) => r.department_name)} label="Department" minSample={minSample} />
            </SectionCard>
            <SectionCard title="Content Rating by Region">
              <StatTable stats={groupStats(rows, (r) => r.region_name)} label="Region" minSample={minSample} />
            </SectionCard>
          </div>
          <SectionCard title="Content Rating by Month">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" fontSize={12} />
                <YAxis domain={[0, 5]} fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="Content" stroke={CHART[1]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>
        </TabsContent>

        <TabsContent value="venue" className="space-y-5">
          <SectionCard
            title="Venue Analysis by Location"
            description="Classroom trainings only — seating, audio/visual, environment and resources."
          >
            {venueByLocation.length ? (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={venueByLocation.map((v) => ({ location: v.key, Venue: Number((v.venue ?? 0).toFixed(2)) }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="location" fontSize={12} />
                    <YAxis domain={[0, 5]} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="Venue" fill={CHART[2]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <StatTable stats={venueByLocation} label="Location" minSample={minSample} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Insufficient data to generate this insight.
              </p>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="org" className="space-y-5">
          {dimension("Department", (r) => r.department_name)}
          {dimension("Region", (r) => r.region_name)}
          {dimension("Location", (r) => r.location_name)}
          {dimension("Wing", (r) => r.wing_name)}
          {dimension("Designation", (r) => r.designation_name)}
        </TabsContent>

        <TabsContent value="gender" className="space-y-5">
          {dimension("Gender", (r) => r.gender_name)}
          <SectionCard title="Average Ratings by Gender">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byGender.map((g) => ({
                gender: g.key,
                Content: Number((g.content ?? 0).toFixed(2)),
                Trainer: Number((g.trainer ?? 0).toFixed(2)),
                Overall: Number((g.overall ?? 0).toFixed(2)),
              }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="gender" fontSize={12} />
                <YAxis domain={[0, 5]} fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Content" fill={CHART[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Trainer" fill={CHART[1]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Overall" fill={CHART[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
          <SectionCard title="Response Share by Gender">
            {byGender.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={byGender.map((g) => ({ name: g.key, value: g.responses }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    label
                  >
                    {byGender.map((g, i) => (
                      <Cell key={g.key} fill={CHART[i % CHART.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">
                Insufficient data to generate this insight.
              </p>
            )}
          </SectionCard>
          <SectionCard title="Recommendation Rate by Gender">
            <div className="space-y-1.5">
              {byGender.map((g) => (
                <div key={g.key} className="flex items-center gap-3 text-sm">
                  <span className="w-48 shrink-0 truncate">{g.key}</span>
                  <div className="h-2 flex-1 rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-success"
                      style={{ width: `${g.recommendPct ?? 0}%` }}
                    />
                  </div>
                  <span className="w-28 shrink-0 text-right tabular-nums text-muted-foreground">
                    {fmtPct(g.recommendPct)} ({g.responses})
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="trends" className="space-y-5">
          <SectionCard
            title="Quality Trend"
            action={
              <select
                className="no-print rounded-md border bg-background px-2 py-1.5 text-sm"
                value={period}
                onChange={(e) => setPeriod(e.target.value as typeof period)}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" fontSize={12} />
                <YAxis domain={[0, 5]} fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Overall" stroke={CHART[0]} strokeWidth={2} />
                <Line type="monotone" dataKey="Content" stroke={CHART[1]} strokeWidth={2} />
                <Line type="monotone" dataKey="Trainer" stroke={CHART[2]} strokeWidth={2} />
                <Line type="monotone" dataKey="Venue" stroke={CHART[3]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>
          <SectionCard title="Feedback Volume Trend">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="Responses" fill={CHART[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </TabsContent>

        <TabsContent value="recommend" className="space-y-5">
          {(
            [
              ["Training", (r: FeedbackRow) => r.training_name],
              ["Trainer", (r: FeedbackRow) => r.trainer_name],
              ["Department", (r: FeedbackRow) => r.department_name],
              ["Region", (r: FeedbackRow) => r.region_name],
              ["Location", (r: FeedbackRow) => r.location_name],
              ["Training Type", (r: FeedbackRow) => r.training_type],
              ["Month", monthKey],
            ] as [string, (r: FeedbackRow) => string | null][]
          ).map(([label, keyFn]) => (
            <SectionCard key={label} title={`Recommendation Rate by ${label}`}>
              <div className="space-y-1.5">
                {groupStats(rows, keyFn)
                  .sort((a, b) => (b.recommendPct ?? 0) - (a.recommendPct ?? 0))
                  .map((g) => (
                    <div key={g.key} className="flex items-center gap-3 text-sm">
                      <span className="w-48 shrink-0 truncate">{g.key}</span>
                      <div className="h-2 flex-1 rounded-full bg-secondary">
                        <div
                          className="h-2 rounded-full bg-success"
                          style={{ width: `${g.recommendPct ?? 0}%` }}
                        />
                      </div>
                      <span className="w-28 shrink-0 text-right tabular-nums text-muted-foreground">
                        {fmtPct(g.recommendPct)} ({g.responses})
                      </span>
                    </div>
                  ))}
              </div>
            </SectionCard>
          ))}
        </TabsContent>

        <TabsContent value="comments" className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard
              title="Comment Sentiment"
              description="Automated analytical aid only — always review original comments."
            >
              {comments.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={sentiments.data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} label>
                      <Cell fill={CHART[3]} />
                      <Cell fill={CHART[1]} />
                      <Cell fill={CHART[4]} />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">Insufficient data to generate this insight.</p>
              )}
            </SectionCard>
            <SectionCard title="Frequently Mentioned Themes">
              {comments.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={themes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={12} />
                    <YAxis type="category" dataKey="theme" width={130} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="count" fill={CHART[0]} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">Insufficient data to generate this insight.</p>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Employee Comments"
            description="Original, unedited employee feedback."
            action={
              <Input
                placeholder="Search comments…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="no-print w-56"
              />
            }
          >
            <div className="max-h-[600px] overflow-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">Training</th>
                    <th className="py-2 pr-3">Trainer</th>
                    <th className="py-2 pr-3">Dept / Region</th>
                    <th className="py-2 pr-3">Most Useful</th>
                    <th className="py-2 pr-3">Improvements</th>
                    <th className="py-2 pr-3">Additional</th>
                    <th className="py-2 pr-3">Sentiment</th>
                  </tr>
                </thead>
                <tbody>
                  {commentRows.map((r) => {
                    const text = [r.useful_aspect, r.improvement_suggestion, r.additional_comments]
                      .filter(Boolean)
                      .join(" ");
                    const s = text ? classifySentiment(text) : "neutral";
                    return (
                      <tr key={r.id} className="border-b align-top last:border-0">
                        <td className="py-2 pr-3">{r.training_name}</td>
                        <td className="py-2 pr-3">{r.trainer_name}</td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {r.department_name} · {r.region_name}
                        </td>
                        <td className="py-2 pr-3">{r.useful_aspect ?? "—"}</td>
                        <td className="py-2 pr-3">{r.improvement_suggestion ?? "—"}</td>
                        <td className="py-2 pr-3">{r.additional_comments ?? "—"}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs capitalize ${
                              s === "positive"
                                ? "bg-success/15 text-success"
                                : s === "negative"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {s}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!commentRows.length ? (
                <p className="py-4 text-sm text-muted-foreground">No comments match the filters.</p>
              ) : null}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Overall average across filtered responses: {fmtRating(
          groupStats(rows, () => "all")[0]?.overall ?? null,
        )}{" "}
        / 5
        <Button variant="link" className="ml-2 h-auto p-0 text-xs" onClick={() => window.print()}>
          Print this view
        </Button>
      </p>
    </div>
  );
}
