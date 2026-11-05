import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { KpiCard, SectionCard } from "@/components/admin/Kpi";
import { StatusSwitch } from "@/components/admin/StatusSwitch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  useDeleteSurvey,
  useSaveSurvey,
  useSetSurveyStatus,
  useSurveys,
} from "@/lib/surveys-data";
import {
  avgOf,
  countsOf,
  npsScore,
  useSurveyResponses,
  type SurveyResponse,
} from "@/lib/survey-data";
import { exportSurveyReport } from "@/lib/survey-report";
import {
  useDeleteSurveyQuestion,
  useSaveSurveyQuestion,
  useSetSurveyQuestionStatus,
  useSurveyQuestionRows,
  useSurveyQuestions,
} from "@/lib/survey-questions-data";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/survey-report")({
  head: () => ({
    meta: [
      { title: "L&D Survey Report | ABHI Learning HUB" },
      {
        name: "description",
        content:
          "Detailed analysis of the ABHI L&D Effectiveness Survey: scores by section, question, department and open feedback.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SurveyAdminPage,
});

const f2 = (v: number | null) => (v == null ? "—" : v.toFixed(2));

function SurveyAdminPage() {
  const { data: allRows = [], isLoading } = useSurveyResponses();
  const [tab, setTab] = useState<"overview" | "questions" | "choices" | "demographics" | "comments">(
    "overview",
  );
  const [surveyFilter, setSurveyFilter] = useState("all");
  const { data: surveys = [] } = useSurveys();
  const rows = useMemo(
    () => (surveyFilter === "all" ? allRows : allRows.filter((r) => r.survey_id === surveyFilter)),
    [allRows, surveyFilter],
  );


  const { questions: allQuestions, sections: allSections } = useSurveyQuestions();
  const RATING_QUESTIONS = useMemo(
    () => allQuestions.filter((q) => q.type === "scale5" || q.type === "stars"),
    [allQuestions],
  );
  const CHOICE_QUESTIONS = useMemo(
    () => allQuestions.filter((q) => q.type === "choice" || q.type === "multi"),
    [allQuestions],
  );
  const TEXT_QUESTIONS = useMemo(
    () => allQuestions.filter((q) => q.type === "long"),
    [allQuestions],
  );

  const overallAvg = useMemo(() => {
    const v = rows.map((r) => r.overall_rating).filter((x): x is number => typeof x === "number");
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }, [rows]);

  const sectionAverages = useMemo(() => {
    return allSections.map((s) => {
      const vals = RATING_QUESTIONS.filter((q) => q.section === s.key)
        .map((q) => avgOf(rows, q.id))
        .filter((v): v is number => v != null);
      return {
        title: s.title,
        avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
      };
    }).filter((s) => s.avg != null);
  }, [rows, allSections, RATING_QUESTIONS]);

  const TABS = [
    ["overview", "Overview"],
    ["questions", "Question Scores"],
    ["choices", "Choice Analysis"],
    ["demographics", "Demographics"],
    ["comments", "Open Feedback"],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            ABHI Microfinance Bank — Learning &amp; Development Effectiveness Survey 2026
          </p>
        </div>
        <Button size="sm" disabled={!rows.length} onClick={() => exportSurveyReport(rows, allQuestions)}>
          <FileSpreadsheet className="size-4" />{" "}
          {rows.length ? `Download Excel (${rows.length} responses)` : "No responses yet"}
        </Button>
      </div>

      <ManageSurveys />

      <div className="no-print flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Showing results for:</span>
        <div className="w-72">
          <SearchableSelect
            options={[
              { value: "all", label: `All surveys (${allRows.length} responses)` },
              ...surveys.map((s) => ({
                value: s.id,
                label: `${s.title}${s.status === "active" ? "" : " (off)"}`,
              })),
            ]}
            value={surveyFilter}
            onChange={setSurveyFilter}
            placeholder="Select survey"
          />
        </div>
      </div>


      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Responses" value={String(rows.length)} />
        <KpiCard label="Overall Effectiveness" value={`${f2(overallAvg)} / 5`} tone="success" />
        <KpiCard label="Learning NPS" value={f2(npsScore(rows))} tone="accent" />
        <KpiCard
          label="Satisfaction (Q48)"
          value={`${f2(avgOf(rows, "q48"))} / 5`}
        />
      </div>

      <div className="no-print flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={tab === id ? "default" : "outline"}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading responses…</p> : null}

      {tab === "overview" ? (
        <SectionCard title="Section averages" description="Average score per survey section (out of 5).">
          <div className="space-y-2">
            {sectionAverages.length ? (
              sectionAverages.map((s) => (
                <div key={s.title} className="flex items-center gap-3">
                  <p className="w-72 shrink-0 text-sm">{s.title}</p>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${((s.avg ?? 0) / 5) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm tabular-nums">{f2(s.avg)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No survey responses yet.</p>
            )}
          </div>
        </SectionCard>
      ) : null}

      {tab === "questions" ? (
        <SectionCard title="Question scores" description="Average rating for every scored question.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Question</th>
                  <th className="py-2 pr-3">Responses</th>
                  <th className="py-2 pr-3">Average / 5</th>
                </tr>
              </thead>
              <tbody>
                {RATING_QUESTIONS.map((q) => {
                  const answered = rows.filter(
                    (r) => typeof r.ratings?.[q.id] === "number",
                  ).length;
                  return (
                    <tr key={q.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 tabular-nums">{q.num}</td>
                      <td className="py-2 pr-3">{q.text}</td>
                      <td className="py-2 pr-3 tabular-nums">{answered}</td>
                      <td className="py-2 pr-3 font-medium tabular-nums">{f2(avgOf(rows, q.id))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {tab === "choices" ? (
        <div className="space-y-5">
          {CHOICE_QUESTIONS.map((q) => {
            const counts = countsOf(rows, q.id, q.options ?? []).sort((a, b) => b.count - a.count);
            const max = Math.max(1, ...counts.map((c) => c.count));
            return (
              <SectionCard key={q.id} title={`Q${q.num}. ${q.text}`}>
                <div className="space-y-2">
                  {counts.map((c) => (
                    <div key={c.option} className="flex items-center gap-3">
                      <p className="w-64 shrink-0 text-sm">{c.option}</p>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${(c.count / max) * 100}%` }}
                        />
                      </div>
                      <span className="w-20 text-right text-sm tabular-nums">
                        {c.count} ({rows.length ? Math.round((c.count / rows.length) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            );
          })}
        </div>
      ) : null}

      {tab === "demographics" ? (
        <div className="space-y-5">
          <DemoTable rows={rows} label="Department" keyFn={(r) => r.department_name} />
          <DemoTable rows={rows} label="Designation" keyFn={(r) => r.designation_name} />
          <DemoTable rows={rows} label="Tenure" keyFn={(r) => r.tenure} />
        </div>
      ) : null}

      {tab === "comments" ? (
        <div className="space-y-5">
          {TEXT_QUESTIONS.map((q) => {
            const answers = rows
              .map((r) => ({ text: r.comments?.[q.id]?.trim(), id: r.id, code: r.employee_code }))
              .filter((a) => a.text);
            return (
              <SectionCard
                key={q.id}
                title={`Q${q.num}. ${q.text}`}
                description={`${answers.length} response${answers.length === 1 ? "" : "s"}`}
              >
                {answers.length ? (
                  <ul className="space-y-2">
                    {answers.map((a) => (
                      <li key={a.id} className="rounded-md border bg-muted/30 p-3 text-sm">
                        <p>{a.text}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {a.code || "Anonymous"}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No responses yet.</p>
                )}
              </SectionCard>
            );
          })}
        </div>
      ) : null}

      <ManageSurveyQuestions />

      <p className="text-xs text-muted-foreground">
        Survey covers {allQuestions.length} questions across {allSections.length + 1}{" "}
        sections.
      </p>
    </div>
  );
}

function DemoTable({
  rows,
  label,
  keyFn,
}: {
  rows: SurveyResponse[];
  label: string;
  keyFn: (r: SurveyResponse) => string | null;
}) {
  const map = new Map<string, { n: number; sum: number; cnt: number }>();
  for (const r of rows) {
    const k = keyFn(r) ?? "Not specified";
    const e = map.get(k) ?? { n: 0, sum: 0, cnt: 0 };
    e.n += 1;
    if (typeof r.overall_rating === "number") {
      e.sum += r.overall_rating;
      e.cnt += 1;
    }
    map.set(k, e);
  }
  const list = [...map].sort((a, b) => b[1].n - a[1].n);
  return (
    <SectionCard title={`${label}-wise responses`}>
      {list.length ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">{label}</th>
              <th className="py-2 pr-3">Responses</th>
              <th className="py-2 pr-3">Avg overall / 5</th>
            </tr>
          </thead>
          <tbody>
            {list.map(([k, v]) => (
              <tr key={k} className="border-b last:border-0">
                <td className="py-2 pr-3 font-medium">{k}</td>
                <td className="py-2 pr-3 tabular-nums">{v.n}</td>
                <td className="py-2 pr-3 tabular-nums">{v.cnt ? (v.sum / v.cnt).toFixed(2) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted-foreground">No survey responses yet.</p>
      )}
    </SectionCard>
  );
}

function ManageSurveys() {
  const { data: surveys = [], isLoading } = useSurveys();
  const save = useSaveSurvey();
  const setStatus = useSetSurveyStatus();
  const remove = useDeleteSurvey();
  const [form, setForm] = useState({ title: "", subtitle: "", description: "" });

  const add = async () => {
    if (!form.title.trim()) {
      toast.error("Please enter a survey title.");
      return;
    }
    try {
      await save.mutateAsync({ ...form, status: "active" });
      setForm({ title: "", subtitle: "", description: "" });
      toast.success("Survey created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create survey.");
    }
  };

  return (
    <SectionCard
      title="Manage Surveys"
      description="Run multiple survey rounds using the same question set. Only surveys switched On are available to employees."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Survey title</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. L&D Effectiveness Survey 2027"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Subtitle (optional)</Label>
          <Input
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            placeholder="ABHI Microfinance Bank · L&D"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Note for employees (optional)</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Shown on the survey intro page"
          />
        </div>
      </div>
      <Button size="sm" className="mt-3" onClick={add} disabled={save.isPending}>
        <Plus className="size-4" /> Add Survey
      </Button>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">Survey</th>
              <th className="py-2 pr-3">Created</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {surveys.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="py-2 pr-3">
                  <p className="font-medium">{s.title}</p>
                  {s.subtitle ? (
                    <p className="text-xs text-muted-foreground">{s.subtitle}</p>
                  ) : null}
                </td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString()}
                </td>
                <td className="py-2 pr-3">
                  <StatusSwitch
                    status={s.status}
                    disabled={setStatus.isPending}
                    onChange={(status) => setStatus.mutate({ id: s.id, status })}
                  />
                </td>
                <td className="py-2 pr-3 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete "${s.title}"? Its responses will be kept.`))
                        remove.mutate(s.id);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {!surveys.length && !isLoading ? (
              <tr>
                <td colSpan={4} className="py-3 text-sm text-muted-foreground">
                  No surveys yet — add one above.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

const QTYPES = [
  { value: "scale5", label: "Rating 1-5" },
  { value: "stars", label: "Star rating" },
  { value: "choice", label: "Single choice" },
  { value: "multi", label: "Multiple choice" },
  { value: "long", label: "Long text" },
];

function ManageSurveyQuestions() {
  const { data: rows = [], isLoading } = useSurveyQuestionRows(true);
  const { sections } = useSurveyQuestions();
  const save = useSaveSurveyQuestion();
  const setStatus = useSetSurveyQuestionStatus();
  const remove = useDeleteSurveyQuestion();
  const [form, setForm] = useState({
    question_text: "",
    qtype: "scale5",
    section: sections[0]?.key ?? "custom",
    section_title: "",
    options: "",
    optional: false,
  });

  const add = async () => {
    try {
      await save.mutateAsync({
        question_text: form.question_text,
        qtype: form.qtype,
        section: form.section || "custom",
        section_title: form.section_title,
        options: form.options
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean),
        optional: form.optional,
      });
      setForm({ ...form, question_text: "", options: "" });
      toast.success("Question added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to add the question.");
    }
  };

  const needsOptions = form.qtype === "choice" || form.qtype === "multi";

  return (
    <SectionCard
      title="Manage Survey Questions"
      description="Add your own questions or remove existing ones. Only questions switched On appear in the employee survey."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Question</Label>
          <Textarea
            rows={2}
            value={form.question_text}
            onChange={(e) => setForm({ ...form, question_text: e.target.value })}
            placeholder="e.g. The training helped me perform my role better."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Answer type</Label>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={form.qtype}
            onChange={(e) => setForm({ ...form, qtype: e.target.value })}
          >
            {QTYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Section</Label>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
          >
            {sections.map((s) => (
              <option key={s.key} value={s.key}>
                {s.title}
              </option>
            ))}
            <option value="custom">Additional Questions</option>
          </select>
        </div>
        {needsOptions ? (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Answer options (one per line)</Label>
            <Textarea
              rows={3}
              value={form.options}
              onChange={(e) => setForm({ ...form, options: e.target.value })}
            />
          </div>
        ) : null}
      </div>
      <Button size="sm" className="mt-3" onClick={add} disabled={save.isPending}>
        <Plus className="size-4" /> Add Question
      </Button>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Question</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => (
              <tr key={q.id} className="border-b last:border-0">
                <td className="py-2 pr-3 tabular-nums">{q.num}</td>
                <td className="py-2 pr-3">{q.question_text}</td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {QTYPES.find((t) => t.value === q.qtype)?.label ?? q.qtype}
                </td>
                <td className="py-2 pr-3">
                  <StatusSwitch
                    status={q.status}
                    disabled={setStatus.isPending}
                    onChange={(status) => setStatus.mutate({ id: q.id, status })}
                  />
                </td>
                <td className="py-2 pr-3 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Delete this question? Existing answers are kept."))
                        remove.mutate(q.id);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {!rows.length && !isLoading ? (
              <tr>
                <td colSpan={5} className="py-3 text-sm text-muted-foreground">
                  No questions yet — add one above.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
