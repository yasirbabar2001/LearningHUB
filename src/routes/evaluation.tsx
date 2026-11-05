import { EmployeeShell } from "@/components/employee/EmployeeShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import {
  startEvaluation,
  submitEvaluation,
  type EvalQuestion,
  type SubmitEvaluationResult,
} from "@/lib/evaluation.functions";
import { listMyTrainings } from "@/lib/training-participants.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PortalGate, IdentityCard } from "@/components/PortalGate";
import type { PortalUser } from "@/lib/portal-session";

export const Route = createFileRoute("/evaluation")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { training?: string; session?: string } => ({
    ...(typeof s["training"] === "string" ? { training: s["training"] } : {}),
    ...(typeof s["session"] === "string" ? { session: s["session"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Pre & Post Training Evaluation | Learning & Development" },
      {
        name: "description",
        content:
          "Take the pre-training or post-training knowledge evaluation for your L&D training session.",
      },
      { property: "og:title", content: "Pre & Post Training Evaluation" },
      {
        property: "og:description",
        content: "Complete your pre or post training knowledge assessment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EvaluationPage,
});

const OPTION_KEYS = ["A", "B", "C", "D"] as const;
type OptionKey = (typeof OPTION_KEYS)[number];

function EvaluationPage() {
  return <PortalGate>{(user) => <EvaluationFlow user={user} />}</PortalGate>;
}

function EvaluationFlow({ user }: { user: PortalUser }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const emp = {
    employee_code: user.employee_code,
    name: user.name,
    designation_id: user.designation_id,
    department_id: user.department_id,
    location_id: user.location_id,
    region_id: user.region_id,
    wing_id: user.wing_id,
    gender_id: user.gender_id,
  };
  const search = Route.useSearch();
  const sessionId = search.session;
  const [trainingId, setTrainingId] = useState(search.training ?? "");
  const [phase, setPhase] = useState<"pre" | "post">("pre");
  const [questions, setQuestions] = useState<EvalQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [result, setResult] = useState<SubmitEvaluationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [switchCount, setSwitchCount] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const submittedRef = useRef(false);
  const submitRef = useRef<(opts?: { force?: boolean }) => void>(() => {});

  const trainings = useQuery({
    queryKey: ["my-evaluation-trainings"],
    queryFn: async () => (await listMyTrainings()).filter((t) => t.has_evaluation),
  });


  const start = async () => {
    if (!trainingId) {
      toast.error("Please select a training.");
      return;
    }
    setBusy(true);
    try {
      const res = await startEvaluation({ data: { trainingId } });
      setPhase(res.phase);
      setQuestions(res.questions);
      setAnswers({});
      startedAtRef.current = Date.now();
      const end = Date.now() + res.durationMinutes * 60_000;
      setDeadline(end);
      setSecondsLeft(res.durationMinutes * 60);
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to start the evaluation.");
    } finally {
      setBusy(false);
    }
  };

  // Virtual sessions already know the training — skip the intro/selection screens.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!sessionId || !trainingId || step !== 1 || autoStarted.current) return;
    autoStarted.current = true;
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, trainingId, step]);


  const submit = async (opts?: { force?: boolean }) => {
    const force = opts?.force === true;
    if (!force) {
      const unanswered = questions.filter((q) => !answers[q.id]);
      if (unanswered.length) {
        toast.error(`Please answer all ${questions.length} questions.`);
        return;
      }
    }
    if (submittedRef.current) return;
    submittedRef.current = true;
    setBusy(true);

    try {
      const res = await submitEvaluation({
        data: {
          trainingId,
          phase,
          startedAt: startedAtRef.current ?? undefined,
          answers: questions.map((q) => ({
            question_id: q.id,
            selected_option: answers[q.id] ?? null,
          })),
        },
      });
      setResult(res);
      setStep(4);
    } catch (err) {
      submittedRef.current = false;
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  submitRef.current = submit;

  // Anti-cheat: leaving the evaluation screen is limited to 2 warnings.
  // Device notifications do not hide the document, so they are not counted.
  useEffect(() => {
    if (step !== 3) return;
    const onHidden = () => {
      if (document.visibilityState !== "hidden" || submittedRef.current) return;
      setSwitchCount((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          toast.error("Screen switched 3 times. Your evaluation has been submitted automatically.");
          submitRef.current({ force: true });
        } else {
          toast.warning(
            `Warning ${next} of 2: do not leave the evaluation screen. On the next switch your evaluation will be submitted automatically and unanswered questions marked wrong.`,
          );
        }
        return next;
      });
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, [step]);

  // Countdown: auto-submits when the allowed time runs out.
  useEffect(() => {
    if (step !== 3 || deadline === null) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !submittedRef.current) {
        toast.error("Time is up. Your evaluation has been submitted automatically.");
        submitRef.current({ force: true });
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [step, deadline]);

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  const selected = trainings.data?.find((t) => t.id === trainingId);


  return (
    <EmployeeShell title="Training Evaluation" subtitle="Learning &amp; Development Department">
      <div className="mx-auto max-w-4xl">
        {step < 4 ? (
          <ol className="mb-6 flex flex-wrap gap-2 text-xs">
            {["Employee Information", "Training Selection", "Evaluation"].map((s, i) => (
              <li
                key={s}
                className={`rounded-full px-3 py-1 ${
                  step === i + 1
                    ? "bg-primary text-primary-foreground"
                    : step > i + 1
                      ? "bg-success/15 text-success"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {i + 1}. {s}
              </li>
            ))}
          </ol>
        ) : null}

        {step === 1 ? (
          <section className="stat-card space-y-4 p-6">
            <h2 className="font-display text-lg font-semibold">Your details</h2>
            <p className="text-sm text-muted-foreground">
              These details come from your portal account and are recorded with your evaluation.
            </p>
            <IdentityCard user={user} />
            <Button onClick={() => setStep(2)}>Continue</Button>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="stat-card space-y-4 p-6">
            <h2 className="font-display text-lg font-semibold">Select Your Training</h2>
            <p className="text-sm font-medium text-destructive">
              Please re-check the training name carefully before proceeding.
            </p>
            <SearchableSelect
              options={(trainings.data ?? []).map((t) => ({
                value: t.id,
                label: t.training_name,
                hint: `${t.training_code ? `${t.training_code} · ` : ""}${t.training_date}`,
              }))}
              value={trainingId}
              onChange={setTrainingId}
              placeholder="Select training"
              searchPlaceholder="Search training name…"
            />
            {selected ? (
              <p className="text-sm text-muted-foreground">
                {selected.training_type === "classroom" ? "Classroom" : "Virtual"} training on{" "}
                {selected.training_date}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              The system automatically decides whether this is your pre-training or post-training
              evaluation.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={start} disabled={busy}>
                {busy ? "Preparing…" : "Start Evaluation"}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-4">
            <div className="stat-card flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  {phase === "pre" ? "Pre-Training" : "Post-Training"} Evaluation
                </h2>
                <p className="text-sm text-muted-foreground">
                  {questions.length} questions · one attempt only
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
                    secondsLeft <= 60
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  ⏱ {mmss}
                </span>
                <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-primary">
                  {Object.keys(answers).length}/{questions.length} answered
                </span>
              </div>

            </div>

            <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs font-medium">
              <span className="text-red-600 underline">
                Do not leave or switch away from this screen. You get 2 warnings; on the 3rd switch
                your evaluation is submitted automatically and unanswered questions are marked wrong.
              </span>
              {switchCount > 0 ? ` (Warnings used: ${switchCount}/2)` : ""}
            </p>

            {questions.map((q, idx) => (
              <div key={q.id} className="stat-card space-y-3 p-5">
                <p className="text-sm font-medium">
                  {idx + 1}. {q.question_text}
                </p>
                <div className="grid gap-2">
                  {(q.option_order?.length ? q.option_order : [...OPTION_KEYS]).map((key) => {
                    const text =
                      key === "A"
                        ? q.option_a
                        : key === "B"
                          ? q.option_b
                          : key === "C"
                            ? q.option_c
                            : q.option_d;
                    if (!text) return null;
                    const active = answers[q.id] === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: key }))}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
                          active ? "border-accent bg-accent/15 font-medium" : "hover:border-accent"
                        }`}
                      >
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                            active ? "border-accent bg-accent text-primary" : ""
                          }`}
                        >
                          {key}
                        </span>
                        {text}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => submit()} disabled={busy}>
                {busy ? "Submitting…" : "Submit Evaluation"}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 4 && result ? (
          <section className="stat-card space-y-3 p-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h2 className="font-display text-xl font-semibold">
              {result.phase === "pre" ? "Pre" : "Post"}-training evaluation submitted
            </h2>
            <p className="text-3xl font-semibold text-primary">{result.scorePct}%</p>
            <p className="text-sm text-muted-foreground">
              You answered {result.correct} of {result.total} questions correctly.
            </p>
            <p className={`text-sm font-medium ${result.passed ? "text-success" : "text-destructive"}`}>
              {result.passed ? "Passed" : "Below the passing mark"}
            </p>
            {sessionId ? (
              <div className="pt-2">
                <Button asChild>
                  <Link
                    to="/virtual/$id"
                    params={{ id: sessionId }}
                    search={{ step: result.phase === "pre" ? "learn" : result.passed ? "feedback" : "post" }}
                  >
                    {result.phase === "pre"
                      ? "Let's go to learning content →"
                      : result.passed
                        ? "Let's give feedback →"
                        : "Back to session"}
                  </Link>
                </Button>
              </div>
            ) : (
              <Link to="/" className="inline-block pt-2 text-sm font-medium text-primary underline">
                Back to home
              </Link>
            )}
          </section>
        ) : null}
      </div>
    </EmployeeShell>
  );
}
