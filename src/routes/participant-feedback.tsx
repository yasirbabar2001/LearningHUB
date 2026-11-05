import { supabase } from "@/integrations/supabase/client";
import { EmployeeShell } from "@/components/employee/EmployeeShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { listMyTrainings } from "@/lib/training-participants.functions";
import { checkFeedbackSubmitted } from "@/lib/feedback.functions";
import { submitFeedback } from "@/lib/submit-feedback.functions";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useQuestions, type Question } from "@/lib/data";
import { PortalGate, IdentityCard } from "@/components/PortalGate";
import type { PortalUser } from "@/lib/portal-session";

export const Route = createFileRoute("/participant-feedback")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { training?: string; session?: string } => ({
    ...(typeof s["training"] === "string" ? { training: s["training"] } : {}),
    ...(typeof s["session"] === "string" ? { session: s["session"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Participant Training Feedback | Learning & Development" },
      {
        name: "description",
        content:
          "Submit your feedback for classroom and virtual training sessions conducted by the Learning & Development department.",
      },
      { property: "og:title", content: "Participant Training Feedback | Learning & Development" },
      {
        property: "og:description",
        content: "Share your feedback on classroom and virtual training sessions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmployeePortal,
});

const RATING_LABELS = ["Poor", "Fair", "Good", "Very Good", "Excellent"];

type Step = 1 | 2 | 3 | 4;

function EmployeePortal() {
  return <PortalGate>{(user) => <FeedbackFlow user={user} />}</PortalGate>;
}

function FeedbackFlow({ user }: { user: PortalUser }) {
  const sessionId = Route.useSearch().session;
  const [step, setStep] = useState<Step>(1);
  const emp = {
    employee_code: user.employee_code,
    cnic: user.cnic ?? "",
    name: user.name,
    designation_id: user.designation_id,
    department_id: user.department_id,
    location_id: user.location_id,
    region_id: user.region_id,
    wing_id: user.wing_id,
    gender_id: user.gender_id,
  };
  const [trainingId, setTrainingId] = useState(Route.useSearch().training ?? "");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [recommendation, setRecommendation] = useState<"yes" | "no" | "">("");
  const [comments, setComments] = useState({ useful: "", improve: "", extra: "" });
  const [busy, setBusy] = useState(false);

  const questions = useQuestions();

  const trainings = useQuery({
    queryKey: ["my-trainings"],
    queryFn: () => listMyTrainings(),
  });

  const selected = trainings.data?.find((t) => t.id === trainingId);

  const virtualTrainingIds = useQuery({
    queryKey: ["virtual-session-training-ids"],
    queryFn: async () => {
      const { data } = await supabase.from("virtual_sessions").select("training_id");
      return new Set((data ?? []).map((r) => r.training_id as string));
    },
  });
  const isVirtual =
    !!selected &&
    (!!sessionId ||
      selected.training_type === "virtual" ||
      !!virtualTrainingIds.data?.has(selected.id));

  const visibleQuestions = useMemo<Question[]>(() => {
    if (!selected || !questions.data) return [];
    return questions.data
      .filter(
        (q) =>
          q.status === "active" &&
          (q.training_type === "both" || q.training_type === selected.training_type ||
            (isVirtual && q.training_type === "virtual")) &&
          // Virtual: no trainer questions; portal questions only for virtual.
          (isVirtual ? (q.category as string) !== "trainer" : (q.category as string) !== "portal"),
      )
      .sort((a, b) => a.display_order - b.display_order);
  }, [selected, questions.data, isVirtual]);

  const grouped = useMemo(() => {
    const order = ["venue", "content", "trainer", "portal", "overall"] as const;
    return order
      .map((cat) => ({ cat, items: visibleQuestions.filter((q) => (q.category as string) === cat) }))
      .filter((g) => g.items.length > 0);
  }, [visibleQuestions]);

  const CATEGORY_TITLE: Record<string, string> = {
    venue: "Venue & Facilities",
    content: "Training Content",
    trainer: "Trainer",
    portal: "Portal Experience",
    overall: "Overall",
  };

  const [checking, setChecking] = useState(false);

  const goToQuestionnaire = async () => {
    if (!trainingId) {
      toast.error("Please select a training.");
      return;
    }
    setChecking(true);
    try {
      const { submitted } = await checkFeedbackSubmitted({
        data: { employeeCode: emp.employee_code.trim(), trainingId },
      });
      if (submitted) {
        toast.error("Feedback for this training has already been submitted.");
        return;
      }
      setStep(3);
    } catch (err) {
      console.error("[startFeedback]", err);
      toast.error(
        err instanceof Error ? err.message : "Could not start the feedback form. Please try again.",
      );
    } finally {
      setChecking(false);
    }
  };

  // Virtual sessions already know the training — skip the intro/selection screens.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!sessionId || !trainingId || !selected || step !== 1 || autoStarted.current) return;
    autoStarted.current = true;
    void goToQuestionnaire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, trainingId, selected, step]);


  const submit = async () => {
    const missing = visibleQuestions.filter(
      (q) => q.question_type === "rating" && !ratings[q.id],
    );
    if (missing.length) {
      toast.error(`Please answer all ${visibleQuestions.filter((q) => q.question_type === "rating").length} rating questions.`);
      return;
    }
    if (!recommendation) {
      toast.error("Please indicate whether you would recommend this training.");
      return;
    }
    setBusy(true);
    try {
      await submitFeedback({
        data: {
          employee: {
            employee_code: emp.employee_code.trim().slice(0, 50),
            cnic: emp.cnic.replace(/\D/g, "").slice(0, 13),
            name: emp.name.trim().slice(0, 120),
            designation_id: emp.designation_id!,
            department_id: emp.department_id!,
            location_id: emp.location_id!,
            region_id: emp.region_id!,
            wing_id: emp.wing_id!,
            gender_id: emp.gender_id!,
          },
          trainingId: trainingId!,
          recommendation: recommendation === "yes",
          comments: {
            useful: comments.useful.trim().slice(0, 2000),
            improve: comments.improve.trim().slice(0, 2000),
            extra: comments.extra.trim().slice(0, 2000),
          },
          responses: visibleQuestions.map((q) => ({
            question_id: q.id,
            question_text: q.question_text,
            category: q.category,
            rating: q.question_type === "rating" ? (ratings[q.id] ?? null) : null,
            answer_text:
              q.question_type === "rating" ? null : (texts[q.id]?.slice(0, 1000) || null),
          })),
        },
      });

      setStep(4);

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };


  return (
    <EmployeeShell title="Participant Feedback" subtitle="Training Feedback Portal · Learning &amp; Development">
      <div className="w-full">
        {step < 4 ? (
          <ol className="mb-6 flex flex-wrap gap-2 text-xs">
            {["Employee Information", "Training Selection", "Feedback"].map((s, i) => (
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
              These details come from your portal account and are recorded with your feedback. If
              anything is incorrect, please contact the L&amp;D team.
            </p>
            <IdentityCard user={user} />
            <Button onClick={() => setStep(2)}>Continue</Button>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="stat-card space-y-4 p-6">
            <h2 className="font-display text-lg font-semibold">Training Selection</h2>
            <div className="space-y-1.5">
              <Label>Training Name</Label>
              <SearchableSelect
                options={(trainings.data ?? []).map((t) => ({
                  value: t.id,
                  label: t.training_code ? `${t.training_name} (${t.training_code})` : t.training_name,
                  hint: t.training_date,
                }))}
                value={trainingId}
                onChange={setTrainingId}
                placeholder="Select the training you attended"
                searchPlaceholder="Search by training name, code or date…"
                emptyText="No training matches your search."
              />
              <p className="text-sm font-semibold text-destructive">
                Please recheck the training name, date and trainer carefully before proceeding.
                Feedback submitted against a wrong training cannot be changed.
              </p>
            </div>
            {selected ? (
              <dl className="grid gap-3 rounded-lg bg-secondary p-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Training Type</dt>
                  <dd className="font-medium capitalize">{selected.training_type}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Training Date</dt>
                  <dd className="font-medium">{selected.training_date}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Trainer</dt>
                  <dd className="font-medium">
                    {selected.trainer_name ?? "—"}
                  </dd>
                </div>
              </dl>
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={goToQuestionnaire} disabled={checking}>
                {checking ? "Please wait…" : "Start Feedback"}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 3 && selected ? (
          <section className="space-y-5">
            <div className="stat-card p-4 text-sm">
              <p className="font-medium">{selected.training_name}</p>
              <p className="text-muted-foreground capitalize">
                {selected.training_type} · {selected.training_date} ·{" "}
                {selected.trainer_name ?? "—"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Rating scale: 1 = Poor, 2 = Fair, 3 = Good, 4 = Very Good, 5 = Excellent
              </p>
            </div>

            {grouped.map(({ cat, items }) => (
              <div key={cat} className="stat-card p-5">
                <h3 className="mb-4 font-display text-base font-semibold">
                  {CATEGORY_TITLE[cat]}
                </h3>
                <div className="space-y-4">
                  {items.map((q) => (
                    <div key={q.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <p className="mb-2 text-sm">{q.question_text}</p>
                      {q.question_type === "rating" ? (
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setRatings({ ...ratings, [q.id]: n })}
                              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                                ratings[q.id] === n
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "hover:bg-secondary"
                              }`}
                            >
                              {n} · {RATING_LABELS[n - 1]}
                            </button>
                          ))}
                        </div>
                      ) : q.question_type === "yesno" ? (
                        <div className="flex gap-2">
                          {["Yes", "No"].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setTexts({ ...texts, [q.id]: v })}
                              className={`rounded-md border px-3 py-1.5 text-xs ${
                                texts[q.id] === v
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "hover:bg-secondary"
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      ) : q.question_type === "choice" ? (
                        <SearchableSelect
                          options={(q.options ?? []).map((o) => ({ value: o, label: o }))}
                          value={texts[q.id] ?? ""}
                          onChange={(v) => setTexts({ ...texts, [q.id]: v })}
                          placeholder="Select an option"
                        />
                      ) : (
                        <Textarea
                          maxLength={1000}
                          value={texts[q.id] ?? ""}
                          onChange={(e) => setTexts({ ...texts, [q.id]: e.target.value })}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="stat-card space-y-4 p-5">
              <h3 className="font-display text-base font-semibold">
                Recommendation &amp; Comments
              </h3>
              <div>
                <p className="mb-2 text-sm">
                  Would you recommend this training to other employees?
                </p>
                <div className="flex gap-2">
                  {(["yes", "no"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRecommendation(v)}
                      className={`rounded-md border px-4 py-1.5 text-xs capitalize ${
                        recommendation === v
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-secondary"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>What was the most useful aspect of this training?</Label>
                <Textarea
                  maxLength={2000}
                  value={comments.useful}
                  onChange={(e) => setComments({ ...comments, useful: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>What improvements would you suggest?</Label>
                <Textarea
                  maxLength={2000}
                  value={comments.improve}
                  onChange={(e) => setComments({ ...comments, improve: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Additional comments</Label>
                <Textarea
                  maxLength={2000}
                  value={comments.extra}
                  onChange={(e) => setComments({ ...comments, extra: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={submit} disabled={busy}>
                  {busy ? "Submitting…" : "Submit Feedback"}
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="stat-card p-10 text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h2 className="mt-4 font-display text-xl font-semibold">
              Thank you. Your training feedback has been submitted successfully.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your responses are confidential and will be used by the L&amp;D department to improve
              future trainings.
            </p>
            {sessionId ? (
              <Button asChild>
                <Link to="/virtual/$id" params={{ id: sessionId }} search={{ step: "certificate" }}>
                  Let's get your certificate →
                </Link>
              </Button>
            ) : null}
          </section>
        ) : null}
      </div>
    </EmployeeShell>
  );
}
