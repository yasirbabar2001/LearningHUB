import { EmployeeShell } from "@/components/employee/EmployeeShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PortalGate, IdentityCard } from "@/components/PortalGate";
import type { PortalUser } from "@/lib/portal-session";
import { submitSurvey } from "@/lib/survey.functions";
import { useSurveys } from "@/lib/surveys-data";
import { TENURE_OPTIONS, type SurveyQuestion } from "@/lib/survey-spec";
import { useSurveyQuestions } from "@/lib/survey-questions-data";

export const Route = createFileRoute("/survey")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "L&D Effectiveness Survey 2026 | ABHI Microfinance Bank" },
      {
        name: "description",
        content:
          "Share your feedback on the effectiveness, relevance and business impact of ABHI Microfinance Bank's learning and development initiatives.",
      },
      { property: "og:title", content: "L&D Effectiveness Survey 2026" },
      {
        property: "og:description",
        content: "Help ABHI L&D make future learning initiatives more practical and relevant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SurveyPage,
});

function SurveyPage() {
  return <PortalGate>{(user) => <SurveyFlow user={user} />}</PortalGate>;
}

function SurveyFlow({ user }: { user: PortalUser }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [surveyId, setSurveyId] = useState("");
  const [tenure, setTenure] = useState("");
  const profile = {
    employee_code: user.employee_code,
    department_id: user.department_id ?? "",
    designation_id: user.designation_id ?? "",
    tenure,
  };
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [choices, setChoices] = useState<Record<string, string | string[]>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const { data: surveys = [], isLoading: surveysLoading } = useSurveys();
  const activeSurveys = useMemo(() => surveys.filter((s) => s.status === "active"), [surveys]);
  const selectedSurvey =
    activeSurveys.find((s) => s.id === surveyId) ??
    (activeSurveys.length === 1 ? activeSurveys[0] : undefined);


  const { questions: surveyQuestions, sections: surveySections } = useSurveyQuestions();

  const required = useMemo(
    () => surveyQuestions.filter((q) => !q.optional),
    [surveyQuestions],
  );

  const answered = (q: SurveyQuestion) => {
    if (q.type === "long") return true;
    if (q.type === "nps") return typeof ratings[q.id] === "number";
    if (q.type === "choice") return typeof choices[q.id] === "string" && choices[q.id] !== "";
    if (q.type === "multi") return Array.isArray(choices[q.id]) && (choices[q.id] as string[]).length > 0;
    return typeof ratings[q.id] === "number";
  };

  const missing = required.filter((q) => !answered(q));

  const toggleMulti = (q: SurveyQuestion, option: string) => {
    setChoices((prev) => {
      const cur = (prev[q.id] as string[] | undefined) ?? [];
      const has = cur.includes(option);
      if (!has && q.maxSelect && cur.length >= q.maxSelect) {
        toast.error(`You can select up to ${q.maxSelect} options for this question.`);
        return prev;
      }
      return { ...prev, [q.id]: has ? cur.filter((o) => o !== option) : [...cur, option] };
    });
  };

  const submit = async () => {
    const first = missing[0];
    if (first) {
      toast.error(`Please answer question ${first.num} before submitting.`);
      document
        .getElementById(`q-${first.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    try {
      const npsQ = surveyQuestions.find((q) => q.type === "nps");
      const overallQ = surveyQuestions.find((q) => q.type === "stars");
      await submitSurvey({
        data: {
          survey_id: selectedSurvey?.id ?? null,
          employee_code: profile.employee_code.trim() || null,
          department_id: profile.department_id || null,
          designation_id: profile.designation_id || null,
          tenure: profile.tenure || null,
          ratings,
          choices,
          comments,
          nps: (npsQ ? ratings[npsQ.id] : null) ?? null,
          overall_rating: (overallQ ? ratings[overallQ.id] : null) ?? null,
        },
      });
      setStep(3);
      window.scrollTo({ top: 0 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to submit your survey.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <EmployeeShell
      title={selectedSurvey?.title ?? "L&D Effectiveness Survey 2026"}
      subtitle={selectedSurvey?.subtitle ?? "ABHI Microfinance Bank · Learning & Development"}
    >
      <div className="mx-auto max-w-3xl">
        {step === 1 && !surveysLoading && !activeSurveys.length ? (
          <section className="stat-card space-y-3 p-8 text-center">
            <h2 className="font-display text-xl font-semibold">No survey is open right now</h2>
            <p className="text-sm text-muted-foreground">
              There is currently no active survey. Please check back later or contact the Learning
              &amp; Development team.
            </p>
            <Link to="/" className="inline-block">
              <Button variant="outline">Back to home</Button>
            </Link>
          </section>
        ) : null}

        {step === 1 && activeSurveys.length ? (
          <section className="stat-card space-y-4 p-6">
            <h2 className="font-display text-xl font-semibold">Survey Introduction</h2>

            {activeSurveys.length > 1 ? (
              <div className="space-y-1.5 rounded-lg border bg-muted/30 p-4">
                <Label>Select the survey you want to complete</Label>
                <SearchableSelect
                  options={activeSurveys.map((s) => ({ value: s.id, label: s.title }))}
                  value={selectedSurvey?.id ?? ""}
                  onChange={setSurveyId}
                  placeholder="Select survey"
                />
                {selectedSurvey?.description ? (
                  <p className="pt-1 text-xs text-muted-foreground">{selectedSurvey.description}</p>
                ) : null}
              </div>
            ) : selectedSurvey?.description ? (
              <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                {selectedSurvey.description}
              </p>
            ) : null}
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Dear Colleague,</p>
              <p>
                Learning &amp; Development (L&amp;D) is continuously working to enhance employee
                capabilities through training programs, learning initiatives, onboarding, digital
                learning, and other development interventions.
              </p>
              <p>
                We are conducting this survey to understand the effectiveness, relevance,
                accessibility, and business impact of our L&amp;D initiatives and to identify areas
                where we can improve.
              </p>
              <p>
                Your honest feedback will help us make future learning initiatives more practical,
                relevant, and aligned with your role and business requirements.
              </p>
              <p className="font-medium text-foreground">Estimated completion time: 5–7 minutes.</p>
              <p>Please provide your honest feedback based on your actual experience.</p>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-display font-semibold">Section 1 — Employee Profile</h3>
              <IdentityCard user={user} />
              <div className="space-y-1.5 sm:max-w-md">
                <Label>How long have you been working with ABHI Microfinance Bank?</Label>
                <SearchableSelect
                  options={TENURE_OPTIONS.map((t) => ({ value: t, label: t }))}
                  value={tenure}
                  onChange={setTenure}
                  placeholder="Select tenure"
                />
              </div>
            </div>

            <Button
              onClick={() => {
                if (!selectedSurvey) {
                  toast.error("Please select a survey to continue.");
                  return;
                }
                if (!tenure) {
                  toast.error("Please select your tenure.");
                  return;
                }
                setStep(2);
                window.scrollTo({ top: 0 });
              }}
            >
              Start Survey
            </Button>
          </section>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            {surveySections.map((section) => {
              const qs = surveyQuestions.filter((q) => q.section === section.key);
              if (!qs.length) return null;
              return (
                <section key={section.key} className="stat-card space-y-5 p-6">
                  <div>
                    <h2 className="font-display text-lg font-semibold">{section.title}</h2>
                    {section.note ? (
                      <p className="mt-1 text-xs text-muted-foreground">{section.note}</p>
                    ) : null}
                  </div>
                  {qs.map((q) => (
                    <QuestionField
                      key={q.id}
                      q={q}
                      ratings={ratings}
                      choices={choices}
                      comments={comments}
                      setRating={(v) => setRatings((p) => ({ ...p, [q.id]: v }))}
                      setChoice={(v) => setChoices((p) => ({ ...p, [q.id]: v }))}
                      toggleMulti={(o) => toggleMulti(q, o)}
                      setComment={(v) => setComments((p) => ({ ...p, [q.id]: v }))}
                    />
                  ))}
                </section>
              );
            })}

            <div className="flex flex-wrap items-center gap-3 pb-10">
              <Button onClick={submit} disabled={busy}>
                {busy ? "Submitting…" : "Submit Survey"}
              </Button>
              <Button variant="outline" onClick={() => setStep(1)} disabled={busy}>
                Back
              </Button>
              {missing.length ? (
                <p className="text-xs text-destructive">
                  {missing.length} required question{missing.length > 1 ? "s" : ""} remaining.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <section className="stat-card space-y-4 p-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-primary" />
            <h2 className="font-display text-xl font-semibold">Thank you for your feedback!</h2>
            <p className="text-sm text-muted-foreground">
              Your responses have been recorded and will help the Learning &amp; Development team
              improve future initiatives.
            </p>
            <Link to="/" className="inline-block">
              <Button variant="outline">Back to home</Button>
            </Link>
          </section>
        ) : null}
      </div>
    </EmployeeShell>
  );
}

function QuestionField({
  q,
  ratings,
  choices,
  comments,
  setRating,
  setChoice,
  toggleMulti,
  setComment,
}: {
  q: SurveyQuestion;
  ratings: Record<string, number>;
  choices: Record<string, string | string[]>;
  comments: Record<string, string>;
  setRating: (v: number) => void;
  setChoice: (v: string) => void;
  toggleMulti: (option: string) => void;
  setComment: (v: string) => void;
}) {
  const selectedMulti = (choices[q.id] as string[] | undefined) ?? [];

  return (
    <div id={`q-${q.id}`} className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0">
      <p className="text-sm font-medium">
        {q.num}. {q.text}
        {q.optional ? <span className="ml-1 text-xs text-muted-foreground">(optional)</span> : null}
      </p>

      {q.type === "scale5" || q.type === "stars" ? (
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setRating(v)}
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                ratings[q.id] === v
                  ? "border-accent bg-accent text-accent-foreground font-medium"
                  : "hover:border-accent"
              }`}
            >
              {q.type === "stars" ? "★ " : ""}
              {v}
              {q.scaleLabels ? ` — ${q.scaleLabels[v - 1]}` : ""}
            </button>
          ))}
        </div>
      ) : null}

      {q.type === "nps" ? (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 11 }, (_, i) => i).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setRating(v)}
              className={`size-9 rounded-md border text-xs transition-colors ${
                ratings[q.id] === v
                  ? "border-accent bg-accent text-accent-foreground font-medium"
                  : "hover:border-accent"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      ) : null}

      {q.type === "choice" ? (
        <div className="flex flex-wrap gap-2">
          {(q.options ?? []).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setChoice(o)}
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                choices[q.id] === o
                  ? "border-accent bg-accent text-accent-foreground font-medium"
                  : "hover:border-accent"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      ) : null}

      {q.type === "multi" ? (
        <>
          {q.maxSelect ? (
            <p className="text-xs text-muted-foreground">
              Select up to {q.maxSelect} ({selectedMulti.length} selected)
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {(q.options ?? []).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => toggleMulti(o)}
                className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                  selectedMulti.includes(o)
                    ? "border-accent bg-accent text-accent-foreground font-medium"
                    : "hover:border-accent"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {q.type === "long" ? (
        <Textarea
          rows={3}
          value={comments[q.id] ?? ""}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Your response…"
        />
      ) : null}
    </div>
  );
}
