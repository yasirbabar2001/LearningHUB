import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Plus, Trash2, Upload } from "lucide-react";
import { KpiCard, SectionCard } from "@/components/admin/Kpi";
import { StatusSwitch } from "@/components/admin/StatusSwitch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, useSettings, useTrainings } from "@/lib/data";
import {
  pairStats,
  questionStats,
  useEvaluationAnswers,
  useEvaluationAttempts,
  useEvaluationQuestions,
  type EvaluationQuestion,
} from "@/lib/evaluation-data";
import { exportAnswerSheets, exportEvaluationReport } from "@/lib/evaluation-report";

export const Route = createFileRoute("/_authenticated/evaluations")({
  head: () => ({
    meta: [
      { title: "Pre & Post Evaluation | ABHI Learning HUB" },
      {
        name: "description",
        content:
          "Create MCQ question banks per training and analyse pre versus post training evaluation scores.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EvaluationsPage,
});

function EvaluationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Upload MCQs for each training; employees take the same set before and after the session.
        </p>
      </div>
      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">MCQ Bank</TabsTrigger>
          <TabsTrigger value="analysis">Evaluation Analysis</TabsTrigger>
          <TabsTrigger value="answers">Answer Sheets</TabsTrigger>
        </TabsList>
        <TabsContent value="questions">
          <McqBank />
        </TabsContent>
        <TabsContent value="analysis">
          <Analysis />
        </TabsContent>
        <TabsContent value="answers">
          <AnswerSheets />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const EMPTY = {
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: "A" as "A" | "B" | "C" | "D",
};

function McqBank() {
  const qc = useQueryClient();
  const { data: trainings = [] } = useTrainings();
  const [trainingId, setTrainingId] = useState("");
  const { data: questions = [], isLoading } = useEvaluationQuestions(trainingId || null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ ...EMPTY });
  const fileRef = useRef<HTMLInputElement>(null);
  const [duration, setDuration] = useState("15");
  const selectedTraining = trainings.find((t) => t.id === trainingId) as
    | { eval_duration_minutes?: number | null }
    | undefined;
  useEffect(() => {
    setDuration(String(selectedTraining?.eval_duration_minutes ?? 15));
  }, [trainingId, selectedTraining?.eval_duration_minutes]);
  const saveDuration = useMutation({
    mutationFn: async () => {
      const mins = Number(duration);
      if (!Number.isFinite(mins) || mins < 1 || mins > 300)
        throw new Error("Enter a time between 1 and 300 minutes.");
      const { error } = await supabase
        .from("trainings")
        .update({ eval_duration_minutes: Math.round(mins) })
        .eq("id", trainingId);
      if (error) throw error;
      await logAudit("update", "training", trainingId, { eval_duration_minutes: mins });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trainings"] });
      toast.success("Test time saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["evaluation-questions", trainingId] });


  const add = useMutation({
    mutationFn: async (d: typeof EMPTY) => {
      if (!trainingId) throw new Error("Select a training first.");
      if (!d.question_text.trim()) throw new Error("Question text is required.");
      if (!d.option_a.trim() || !d.option_b.trim())
        throw new Error("At least options A and B are required.");
      if (d.correct_option === "C" && !d.option_c.trim())
        throw new Error("Option C is empty but marked correct.");
      if (d.correct_option === "D" && !d.option_d.trim())
        throw new Error("Option D is empty but marked correct.");
      const { error } = await supabase.from("evaluation_questions").insert({
        training_id: trainingId,
        question_text: d.question_text.trim(),
        option_a: d.option_a.trim(),
        option_b: d.option_b.trim(),
        option_c: d.option_c.trim() || null,
        option_d: d.option_d.trim() || null,
        correct_option: d.correct_option,
        display_order: questions.length + 1,
      });
      if (error) throw error;
      await logAudit("create", "evaluation_question", undefined, { training_id: trainingId });
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setDraft({ ...EMPTY });
      toast.success("Question added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<EvaluationQuestion> }) => {
      const { error } = await supabase.from("evaluation_questions").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("evaluation_questions").delete().eq("id", id);
      if (error) throw error;
      await logAudit("delete", "evaluation_question", id);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Question deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importXlsx = useMutation({
    mutationFn: async (file: File) => {
      if (!trainingId) throw new Error("Select a training first.");
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]!];
      if (!sheet) throw new Error("The file has no worksheets.");
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
      const payload: Record<string, unknown>[] = [];
      let order = questions.length;
      for (const row of rows) {
        const cells = (row ?? []).map((c) => (c == null ? "" : String(c).trim()));
        const [q, a, b, c, d, correct] = cells;
        if (!q || !a || !b) continue;
        if (/^question/i.test(q)) continue;
        const key = (correct ?? "").toUpperCase().replace(/[^ABCD]/g, "").slice(0, 1);
        if (!key) continue;
        order += 1;
        payload.push({
          training_id: trainingId,
          question_text: q.slice(0, 1000),
          option_a: a,
          option_b: b,
          option_c: c || null,
          option_d: d || null,
          correct_option: key,
          display_order: order,
        });
      }
      if (!payload.length)
        throw new Error(
          "No valid rows found. Use columns: Question, Option A, Option B, Option C, Option D, Correct (A/B/C/D).",
        );
      const { error } = await supabase.from("evaluation_questions").insert(payload as never);
      if (error) throw error;
      await logAudit("import", "evaluation_question", trainingId, { count: payload.length });
      return payload.length;
    },
    onSuccess: (n) => {
      invalidate();
      toast.success(`Imported ${n} question(s)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ["Question", "Option A", "Option B", "Option C", "Option D", "Correct (A/B/C/D)"],
      ["What does KYC stand for?", "Know Your Customer", "Keep Your Cash", "", "", "A"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MCQs");
    XLSX.writeFile(wb, "mcq-upload-template.xlsx");
  };

  return (
    <SectionCard
      title="MCQ Bank"
      description="The same questions are used for the pre and post evaluation of the selected training."
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Training</Label>
          <SearchableSelect
            options={trainings.map((t) => ({
              value: t.id,
              label: t.training_name,
              hint: `${t.training_code ? `${t.training_code} · ` : ""}${t.training_date}`,
            }))}
            value={trainingId}
            onChange={setTrainingId}
            placeholder="Select training"
            searchPlaceholder="Search training name…"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Time allowed for the test (minutes)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              max={300}
              value={duration}
              disabled={!trainingId}
              onChange={(e) => setDuration(e.target.value)}
            />
            <Button
              variant="outline"
              disabled={!trainingId || saveDuration.isPending}
              onClick={() => saveDuration.mutate()}
            >
              {saveDuration.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            A countdown starts when the employee begins; the test submits automatically at zero. The
            post evaluation stays locked for 5 minutes after the pre evaluation.
          </p>
        </div>
      </div>


      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => setOpen(true)} disabled={!trainingId}>
          <Plus className="size-4" /> Add MCQ
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importXlsx.mutate(f);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={!trainingId || importXlsx.isPending}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="size-4" /> {importXlsx.isPending ? "Importing…" : "Upload Excel"}
        </Button>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="size-4" /> Template
        </Button>
      </div>

      {!trainingId ? (
        <p className="text-sm text-muted-foreground">Select a training to manage its MCQs.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {questions.map((q, idx) => (
            <div key={q.id} className="space-y-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1 text-sm font-medium">
                  {idx + 1}. {q.question_text}
                </span>
                <StatusSwitch
                  status={q.status}
                  onChange={(status) => patch.mutate({ id: q.id, values: { status } })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => confirm("Delete this question?") && remove.mutate(q.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
              <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                {(["A", "B", "C", "D"] as const).map((k) => {
                  const text =
                    k === "A"
                      ? q.option_a
                      : k === "B"
                        ? q.option_b
                        : k === "C"
                          ? q.option_c
                          : q.option_d;
                  if (!text) return null;
                  return (
                    <span
                      key={k}
                      className={
                        q.correct_option === k ? "font-medium text-success" : undefined
                      }
                    >
                      {k}. {text} {q.correct_option === k ? "✓" : ""}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          {!questions.length ? (
            <p className="p-3 text-sm text-muted-foreground">
              No MCQs for this training yet. Add them manually or upload an Excel file.
            </p>
          ) : null}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add MCQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Question *</Label>
              <Input
                value={draft.question_text}
                onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["A", "B", "C", "D"] as const).map((k) => (
                <div key={k} className="space-y-1.5">
                  <Label>
                    Option {k} {k === "A" || k === "B" ? "*" : ""}
                  </Label>
                  <Input
                    value={draft[`option_${k.toLowerCase()}` as "option_a"]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [`option_${k.toLowerCase()}`]: e.target.value,
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Correct Answer</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={draft.correct_option}
                onChange={(e) =>
                  setDraft({ ...draft, correct_option: e.target.value as "A" })
                }
              >
                {(["A", "B", "C", "D"] as const).map((k) => (
                  <option key={k} value={k}>
                    Option {k}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => add.mutate(draft)} disabled={add.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

const DIMENSIONS = [
  { id: "training", label: "Training", key: (r: { training_name: string | null }) => r.training_name },
  { id: "trainer", label: "Trainer", key: (r: { trainer_name: string | null }) => r.trainer_name },
  {
    id: "department",
    label: "Department",
    key: (r: { department_name: string | null }) => r.department_name,
  },
  { id: "region", label: "Region", key: (r: { region_name: string | null }) => r.region_name },
  {
    id: "location",
    label: "Branch / Location",
    key: (r: { location_name: string | null }) => r.location_name,
  },
  { id: "wing", label: "Wing", key: (r: { wing_name: string | null }) => r.wing_name },
  {
    id: "designation",
    label: "Designation",
    key: (r: { designation_name: string | null }) => r.designation_name,
  },
  { id: "gender", label: "Gender", key: (r: { gender_name: string | null }) => r.gender_name },
] as const;

function Analysis() {
  const { data: rows = [], isLoading } = useEvaluationAttempts();
  const { data: settings } = useSettings();
  const [dim, setDim] = useState<string>("training");
  const active = DIMENSIONS.find((d) => d.id === dim)!;
  const stats = useMemo(() => pairStats(rows, active.key), [rows, active]);

  const pre = rows.filter((r) => r.phase === "pre");
  const post = rows.filter((r) => r.phase === "post");
  const mean = (a: typeof rows) =>
    a.length ? a.reduce((s, r) => s + Number(r.score_pct), 0) / a.length : null;
  const preAvg = mean(pre);
  const postAvg = mean(post);
  const passRate = post.length ? (post.filter((r) => r.passed).length / post.length) * 100 : null;
  const fmt = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Pre-Training Average" value={fmt(preAvg)} sub={`${pre.length} attempts`} />
        <KpiCard label="Post-Training Average" value={fmt(postAvg)} sub={`${post.length} attempts`} />
        <KpiCard
          label="Knowledge Gain"
          value={preAvg != null && postAvg != null ? fmt(postAvg - preAvg) : "—"}
          sub="Post minus pre"
        />
        <KpiCard
          label="Post Pass Rate"
          value={fmt(passRate)}
          sub={`Passing mark ${settings?.passing_percentage ?? 60}%`}
        />
      </div>

      <SectionCard
        title="Pre vs Post Comparison"
        description="Average evaluation scores grouped by the selected dimension."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {DIMENSIONS.map((d) => (
            <Button
              key={d.id}
              size="sm"
              variant={dim === d.id ? "default" : "outline"}
              onClick={() => setDim(d.id)}
            >
              {d.label}
            </Button>
          ))}
          <Button
            size="sm"
            className="ml-auto"
            disabled={!rows.length}
            onClick={() => exportEvaluationReport(rows)}
          >
            <Download className="size-4" /> Download Excel Report
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !stats.length ? (
          <p className="text-sm text-muted-foreground">No evaluations submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="p-2">{active.label}</th>
                  <th className="p-2">Pre</th>
                  <th className="p-2">Post</th>
                  <th className="p-2">Pre Avg</th>
                  <th className="p-2">Post Avg</th>
                  <th className="p-2">Improvement</th>
                  <th className="p-2">Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.key} className="border-b last:border-0">
                    <td className="p-2 font-medium">{s.key}</td>
                    <td className="p-2">{s.preCount}</td>
                    <td className="p-2">{s.postCount}</td>
                    <td className="p-2">{fmt(s.preAvg)}</td>
                    <td className="p-2">{fmt(s.postAvg)}</td>
                    <td
                      className={`p-2 font-medium ${
                        s.improvement == null
                          ? ""
                          : s.improvement >= 0
                            ? "text-success"
                            : "text-destructive"
                      }`}
                    >
                      {s.improvement == null
                        ? "—"
                        : `${s.improvement >= 0 ? "+" : ""}${s.improvement.toFixed(1)}%`}
                    </td>
                    <td className="p-2">{fmt(s.passRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent Attempts">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="p-2">Date</th>
                <th className="p-2">Phase</th>
                <th className="p-2">Employee</th>
                <th className="p-2">Training</th>
                <th className="p-2">Score</th>
                <th className="p-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-2">{new Date(r.submitted_at).toLocaleDateString()}</td>
                  <td className="p-2 capitalize">{r.phase}</td>
                  <td className="p-2">
                    {r.employee_name} <span className="text-muted-foreground">({r.employee_code})</span>
                  </td>
                  <td className="p-2">{r.training_name ?? "—"}</td>
                  <td className="p-2">
                    {r.correct_count}/{r.total_questions} · {Number(r.score_pct).toFixed(1)}%
                  </td>
                  <td className={`p-2 ${r.passed ? "text-success" : "text-destructive"}`}>
                    {r.passed ? "Pass" : "Fail"}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="p-3 text-sm text-muted-foreground" colSpan={6}>
                    No evaluations submitted yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function pct(correct: number, total: number) {
  return total ? `${((correct / total) * 100).toFixed(0)}%` : "—";
}

function AnswerSheets() {
  const { data: trainings = [] } = useTrainings();
  const [trainingId, setTrainingId] = useState("");
  const [search, setSearch] = useState("");
  const [openAttempt, setOpenAttempt] = useState<string | null>(null);
  const { data, isLoading } = useEvaluationAnswers(trainingId || null);

  const attempts = data?.attempts ?? [];
  const answers = data?.answers ?? [];
  const stats = useMemo(() => questionStats(attempts, answers), [attempts, answers]);
  const trainingLabel =
    trainings.find((t) => t.id === trainingId)?.training_name ?? "Selected training";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return attempts;
    return attempts.filter(
      (a) =>
        a.employee_code.toLowerCase().includes(q) || a.employee_name.toLowerCase().includes(q),
    );
  }, [attempts, search]);

  const byAttempt = useMemo(() => {
    const m = new Map<string, typeof answers>();
    for (const ans of answers) {
      const list = m.get(ans.attempt_id) ?? [];
      list.push(ans);
      m.set(ans.attempt_id, list);
    }
    return m;
  }, [answers]);

  return (
    <div className="space-y-5">
      <SectionCard
        title="Question-wise Performance"
        description="Where employees struggle most — pick a training to see every question and how many answered it correctly."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="min-w-[260px] flex-1">
            <SearchableSelect
              options={trainings.map((t) => ({
                value: t.id,
                label: t.training_name,
                hint: `${t.training_code ? `${t.training_code} · ` : ""}${t.training_date}`,
              }))}
              value={trainingId}
              onChange={(v) => {
                setTrainingId(v);
                setOpenAttempt(null);
              }}
              placeholder="Select training"
            />
          </div>
          <Button
            size="sm"
            disabled={!answers.length}
            onClick={() => exportAnswerSheets(trainingLabel, attempts, answers)}
          >
            <Download className="size-4" /> Download Excel
          </Button>
        </div>

        {!trainingId ? (
          <p className="text-sm text-muted-foreground">Select a training to begin.</p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !stats.length ? (
          <p className="text-sm text-muted-foreground">No evaluations submitted for this training yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="p-2">#</th>
                  <th className="p-2">Question</th>
                  <th className="p-2">Correct</th>
                  <th className="p-2">Pre correct</th>
                  <th className="p-2">Post correct</th>
                  <th className="p-2">Change</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((q, i) => {
                  const pre = q.preTotal ? (q.preCorrect / q.preTotal) * 100 : null;
                  const post = q.postTotal ? (q.postCorrect / q.postTotal) * 100 : null;
                  const weak = post != null ? post < 60 : pre != null && pre < 60;
                  return (
                    <tr key={q.questionId} className="border-b last:border-0 align-top">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2">
                        {q.questionText}
                        {weak ? (
                          <span className="ml-2 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">
                            Needs attention
                          </span>
                        ) : null}
                      </td>
                      <td className="p-2 font-medium">{q.correctOption ?? "—"}</td>
                      <td className="p-2">
                        {pct(q.preCorrect, q.preTotal)}
                        <span className="text-xs text-muted-foreground"> ({q.preTotal})</span>
                      </td>
                      <td className="p-2">
                        {pct(q.postCorrect, q.postTotal)}
                        <span className="text-xs text-muted-foreground"> ({q.postTotal})</span>
                      </td>
                      <td className="p-2">
                        {pre != null && post != null ? `${(post - pre).toFixed(0)} pts` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Employee-wise Answer Sheets"
        description="Open any attempt to see every question with the answer given and the correct answer."
      >
        <div className="mb-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee ID or name"
            className="max-w-xs"
          />
        </div>
        {!trainingId ? (
          <p className="text-sm text-muted-foreground">Select a training above.</p>
        ) : !filtered.length ? (
          <p className="text-sm text-muted-foreground">No attempts found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((a) => {
              const rows = byAttempt.get(a.id) ?? [];
              const open = openAttempt === a.id;
              return (
                <div key={a.id} className="rounded-lg border">
                  <button
                    type="button"
                    onClick={() => setOpenAttempt(open ? null : a.id)}
                    className="flex w-full flex-wrap items-center gap-3 p-3 text-left text-sm"
                  >
                    <span className="font-medium">{a.employee_name}</span>
                    <span className="text-xs text-muted-foreground">{a.employee_code}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase">
                      {a.phase === "pre" ? "Pre" : "Post"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {a.designation_name ?? ""} {a.department_name ? `· ${a.department_name}` : ""}
                    </span>
                    <span className="ml-auto text-sm font-semibold">
                      {a.correct_count}/{a.total_questions} · {Number(a.score_pct).toFixed(0)}%
                    </span>
                  </button>
                  {open ? (
                    <div className="overflow-x-auto border-t">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                            <th className="p-2">#</th>
                            <th className="p-2">Question</th>
                            <th className="p-2">Answered</th>
                            <th className="p-2">Correct</th>
                            <th className="p-2">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, i) => (
                            <tr key={r.id} className="border-b last:border-0 align-top">
                              <td className="p-2 text-muted-foreground">{i + 1}</td>
                              <td className="p-2">{r.question_text ?? "—"}</td>
                              <td className="p-2">{r.selected_option ?? "Not answered"}</td>
                              <td className="p-2">{r.correct_option ?? "—"}</td>
                              <td
                                className={`p-2 font-medium ${
                                  r.is_correct ? "text-accent" : "text-destructive"
                                }`}
                              >
                                {r.is_correct ? "Correct" : "Wrong"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
