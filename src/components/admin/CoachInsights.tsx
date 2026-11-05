import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/admin/Kpi";

type Msg = {
  id: string;
  user_id: string;
  employee_code: string | null;
  employee_name: string | null;
  department_name: string | null;
  session_id: string;
  role: string;
  body: string;
  is_error: boolean;
  response_ms: number | null;
  rating: number | null;
  created_at: string;
};

const IMPACT_KEYS = [
  "Behavior Applied",
  "Application Frequency",
  "Improvement Observed",
  "Evidence Quality",
  "Overall Behavior Change",
  "Barrier",
  "At Risk",
] as const;
type Impact = Partial<Record<(typeof IMPACT_KEYS)[number], string>> & { at: string };

/** Reads a "Behavior Applied: Yes | Application Frequency: High | …" line from a coach reply. */
function parseImpact(body: string, at: string): Impact | null {
  if (!/behaviou?r applied\s*:/i.test(body)) return null;
  const clean = body.replace(/\*\*|__/g, "");
  const out: Impact = { at };
  for (const k of IMPACT_KEYS) {
    const pattern = k.replace("Behavior", "Behaviou?r");
    const m = clean.match(new RegExp(`${pattern}\\s*:\\s*([^|\\n]+)`, "i"));
    if (m?.[1]) out[k] = m[1].trim().replace(/[.;,]+$/, "");
  }
  return out;
}

const STOP = new Set(
  "the a an and or to of in on for is are was were be i me my you your it this that with how what can do does did have has at from about please want need would like will could should so if not just get hi hello thanks thank ok okay yes no".split(" "),
);

const pct = (n: number | null) => (n === null ? "—" : `${n.toFixed(0)}%`);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function useCoachData() {
  return useQuery({
    queryKey: ["coach-insights"],
    queryFn: async () => {
      const [msgs, evals, fb, surveys, tna] = await Promise.all([
        supabase.from("coach_messages").select("*").order("created_at", { ascending: true }).limit(10000),
        supabase.from("evaluation_attempts").select("employee_code,phase,score_pct,passed,submitted_at").limit(20000),
        supabase.from("feedback").select("employee_code,overall_rating").limit(20000),
        supabase.from("lnd_survey_responses").select("employee_code").limit(20000),
        supabase.from("tna_assessments").select("employee_code,gap_count,submitted_at").limit(20000),
      ]);
      if (msgs.error) throw msgs.error;
      return {
        msgs: (msgs.data ?? []) as Msg[],
        evals: evals.data ?? [],
        feedback: fb.data ?? [],
        surveys: surveys.data ?? [],
        tna: tna.data ?? [],
      };
    },
  });
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Tag({ v }: { v?: string | undefined }) {
  if (!v) return <span className="text-muted-foreground">—</span>;
  const l = v.toLowerCase();
  const tone =
    /^(high|yes|strong)/.test(l)
        ? "bg-success/15 text-success"
        : /^(low|no|weak|none)/.test(l)
          ? "bg-secondary text-muted-foreground"
          : "bg-primary/15 text-foreground";
  return <span className={`rounded px-1.5 py-0.5 text-xs ${tone}`}>{v}</span>;
}

export function CoachInsights() {
  const { data, isLoading, error } = useCoachData();

  const s = useMemo(() => {
    if (!data) return null;
    const { msgs } = data;
    const userMsgs = msgs.filter((m) => m.role === "user");
    const coachMsgs = msgs.filter((m) => m.role === "coach");
    const ok = coachMsgs.filter((m) => !m.is_error);
    const rated = ok.filter((m) => m.rating !== null);
    const up = rated.filter((m) => m.rating === 1).length;
    const users = new Set(msgs.map((m) => m.user_id));
    const sessions = new Set(msgs.map((m) => m.session_id));

    // Daily volume (last 30 days with activity)
    const byDay = new Map<string, number>();
    userMsgs.forEach((m) => byDay.set(m.created_at.slice(0, 10), (byDay.get(m.created_at.slice(0, 10)) ?? 0) + 1));
    const daily = [...byDay.entries()].sort().slice(-30).map(([day, Messages]) => ({ day: day.slice(5), Messages }));

    // Topics = most frequent meaningful words in employee questions
    const words = new Map<string, number>();
    userMsgs.forEach((m) => {
      new Set(m.body.toLowerCase().match(/[a-z]{4,}/g) ?? []).forEach((w) => {
        if (!STOP.has(w)) words.set(w, (words.get(w) ?? 0) + 1);
      });
    });
    const topics = [...words.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([topic, count]) => ({ topic, count }));

    // Per employee
    type Emp = { code: string; name: string; dept: string; first: string; last: string; msgs: number; sessions: Set<string>; impact: Impact | null };
    const emps = new Map<string, Emp>();
    msgs.forEach((m) => {
      const code = m.employee_code ?? m.user_id.slice(0, 8);
      const e =
        emps.get(code) ??
        { code, name: m.employee_name ?? "—", dept: m.department_name ?? "—", first: m.created_at, last: m.created_at, msgs: 0, sessions: new Set<string>(), impact: null };
      e.last = m.created_at;
      e.sessions.add(m.session_id);
      if (m.role === "user") e.msgs += 1;
      if (m.role === "coach" && !m.is_error) {
        const imp = parseImpact(m.body, m.created_at);
        if (imp) e.impact = imp;
      }
      emps.set(code, e);
    });

    const rows = [...emps.values()].map((e) => {
      const ev = data.evals.filter((x) => x.employee_code === e.code);
      const post = ev.filter((x) => x.phase === "post");
      const before = post.filter((x) => x.submitted_at < e.first).map((x) => Number(x.score_pct));
      const after = post.filter((x) => x.submitted_at >= e.first).map((x) => Number(x.score_pct));
      const fb = data.feedback.filter((x) => x.employee_code === e.code);
      const tna = data.tna.filter((x) => x.employee_code === e.code).sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0];
      return {
        ...e,
        sessionCount: e.sessions.size,
        passed: post.filter((x) => x.passed).length,
        failed: post.filter((x) => !x.passed).length,
        avgScore: avg(post.map((x) => Number(x.score_pct))),
        before: avg(before),
        after: avg(after),
        feedbackCount: fb.length,
        surveyCount: data.surveys.filter((x) => x.employee_code === e.code).length,
        tnaGaps: tna?.gap_count ?? null,
      };
    });
    rows.sort((a, b) => b.last.localeCompare(a.last));

    const withBoth = rows.filter((r) => r.before !== null && r.after !== null);
    const impacts = rows.filter((r) => r.impact);

    return {
      users: users.size,
      sessions: sessions.size,
      questions: userMsgs.length,
      avgResponse: avg(ok.map((m) => m.response_ms ?? 0).filter(Boolean)),
      failRate: coachMsgs.length ? (coachMsgs.filter((m) => m.is_error).length / coachMsgs.length) * 100 : null,
      satisfaction: rated.length ? (up / rated.length) * 100 : null,
      ratedCount: rated.length,
      daily,
      topics,
      rows,
      beforeAvg: avg(withBoth.map((r) => r.before!)),
      afterAvg: avg(withBoth.map((r) => r.after!)),
      compared: withBoth.length,
      impacts,
      atRisk: impacts.filter((r) => /^yes/i.test(r.impact?.["At Risk"] ?? "")).length,
    };
  }, [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading coach insights…</p>;
  if (error || !s) return <p className="text-sm text-destructive">Couldn't load coach insights.</p>;
  if (!s.questions)
    return (
      <SectionCard title="Learning Impact Coach">
        <p className="text-sm text-muted-foreground">No coach conversations recorded yet. Data appears here as employees chat with the coach.</p>
      </SectionCard>
    );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Employees" value={String(s.users)} />
        <Kpi label="Conversations" value={String(s.sessions)} />
        <Kpi label="Questions asked" value={String(s.questions)} />
        <Kpi label="Avg reply time" value={s.avgResponse ? `${(s.avgResponse / 1000).toFixed(1)}s` : "—"} />
        <Kpi label="Satisfaction" value={pct(s.satisfaction)} hint={`${s.ratedCount} rated replies`} />
        <Kpi label="Failed replies" value={pct(s.failRate)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Coach Usage by Day">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={s.daily}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="Messages" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
        <SectionCard title="Common Topics" description="Most frequent words in employee questions — counted from data, no AI.">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={s.topics} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} fontSize={11} />
              <YAxis type="category" dataKey="topic" width={110} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <SectionCard
        title="Before vs After Using the Coach"
        description="Average post-evaluation score before and after each employee's first coach chat (employees with scores on both sides only)."
      >
        {s.compared ? (
          <div className="flex flex-wrap gap-6 text-sm">
            <div><p className="text-muted-foreground">Before</p><p className="text-2xl font-semibold">{pct(s.beforeAvg)}</p></div>
            <div><p className="text-muted-foreground">After</p><p className="text-2xl font-semibold">{pct(s.afterAvg)}</p></div>
            <div><p className="text-muted-foreground">Change</p><p className="text-2xl font-semibold">{((s.afterAvg ?? 0) - (s.beforeAvg ?? 0)).toFixed(1)} pts</p></div>
            <div><p className="text-muted-foreground">Employees compared</p><p className="text-2xl font-semibold">{s.compared}</p></div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Insufficient data yet — needs employees with evaluations both before and after their first coach chat.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Learning Impact by Employee"
        description={`Latest assessment reported by the coach in conversation. ${s.atRisk} employee(s) flagged at risk.`}
      >
        {s.impacts.length ? (
          <div className="overflow-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Employee</th>
                  {IMPACT_KEYS.map((k) => <th key={k} className="py-2 pr-3">{k}</th>)}
                  <th className="py-2 pr-3">Assessed</th>
                </tr>
              </thead>
              <tbody>
                {s.impacts.map((r) => (
                  <tr key={r.code} className="border-b last:border-0">
                    <td className="py-2 pr-3"><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.code}</p></td>
                    {IMPACT_KEYS.map((k) => <td key={k} className="py-2 pr-3"><Tag v={r.impact?.[k]} /></td>)}
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{r.impact?.at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No impact assessments yet. These appear once the coach includes a line like "Behavior Applied: Yes | Application Frequency: High | … | At Risk: No" in its reply.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Employee Performance vs Trainings" description="Everyone who has chatted with the coach.">
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Employee</th>
                <th className="py-2 pr-3">Department</th>
                <th className="py-2 pr-3 text-right">Chats</th>
                <th className="py-2 pr-3 text-right">Questions</th>
                <th className="py-2 pr-3 text-right">Passed / Failed</th>
                <th className="py-2 pr-3 text-right">Avg score</th>
                <th className="py-2 pr-3 text-right">Before → After</th>
                <th className="py-2 pr-3 text-right">Feedback</th>
                <th className="py-2 pr-3 text-right">Surveys</th>
                <th className="py-2 pr-3 text-right">TNA gaps</th>
                <th className="py-2 pr-3">Last chat</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.code} className="border-b last:border-0">
                  <td className="py-2 pr-3"><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.code}</p></td>
                  <td className="py-2 pr-3 text-xs">{r.dept}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.sessionCount}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.msgs}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.passed} / {r.failed}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{pct(r.avgScore)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{pct(r.before)} → {pct(r.after)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.feedbackCount}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.surveyCount}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.tnaGaps ?? "—"}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{r.last.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
