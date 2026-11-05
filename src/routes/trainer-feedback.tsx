import { EmployeeShell } from "@/components/employee/EmployeeShell";
import { PortalGate } from "@/components/PortalGate";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePortalUser } from "@/lib/portal-session";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { submitTrainerFeedback } from "@/lib/trainer-feedback.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";

export const Route = createFileRoute("/trainer-feedback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Trainer Feedback Form | Learning & Development" },
      {
        name: "description",
        content:
          "Trainers share their assessment of participant engagement, logistics, material and overall effectiveness of the session they delivered.",
      },
      { property: "og:title", content: "Trainer Feedback Form | Learning & Development" },
      {
        property: "og:description",
        content: "Trainer assessment of delivered classroom and virtual training sessions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrainerFeedbackPage,
});

const RATING_LABELS = ["Poor", "Fair", "Good", "Very Good", "Excellent"];

const RATING_QUESTIONS = [
  { key: "engagement", text: "Participants were engaged and actively took part in the session." },
  { key: "knowledge", text: "Participants had the prerequisite knowledge for this training." },
  {
    key: "logistics",
    text: "Venue, equipment and logistics (or platform and connectivity for virtual) were adequate.",
  },
  { key: "material", text: "Training material and content were adequate for the objectives." },
  { key: "time", text: "Time allocated for the session was sufficient to cover the content." },
  { key: "support", text: "Coordination and support received from the L&D team was satisfactory." },
  { key: "overall", text: "Overall effectiveness of the session as delivered." },
] as const;

type RatingKey = (typeof RATING_QUESTIONS)[number]["key"];

function TrainerFeedbackPage() {
  const [trainerId, setTrainerId] = useState("");
  const [trainingId, setTrainingId] = useState("");
  const [participants, setParticipants] = useState("");
  const [ratings, setRatings] = useState<Partial<Record<RatingKey, number>>>({});
  const [objectives, setObjectives] = useState<"yes" | "no" | "">("");
  const [text, setText] = useState({
    strengths: "",
    challenges: "",
    suggestions: "",
    extra: "",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const portalUser = usePortalUser();

  const trainers = useQuery({
    queryKey: ["public-trainers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainers")
        .select("id,name,employee_code")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const trainings = useQuery({
    queryKey: ["public-trainings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select("id,training_code,training_name,training_type,training_date,venue,trainers(name)")
        .eq("status", "active")
        .neq("training_type", "virtual")
        .order("training_date", { ascending: false });
      if (error) throw error;
      // Virtual (self-paced) trainings have no trainer feedback.
      const { data: vs } = await supabase.from("virtual_sessions").select("training_id");
      const virtualIds = new Set((vs ?? []).map((r) => r.training_id as string));
      return (data ?? []).filter((t) => !virtualIds.has(t.id));
    },
  });

  // Autofill the trainer's own name from their signed-in employee ID.
  useEffect(() => {
    const code = portalUser.data?.employee_code?.trim().toLowerCase();
    if (!code || trainerId || !trainers.data?.length) return;
    const match = trainers.data.find((t) => t.employee_code?.trim().toLowerCase() === code);
    if (match) setTrainerId(match.id);
  }, [portalUser.data, trainers.data, trainerId]);

  const selected = trainings.data?.find((t) => t.id === trainingId);

  const submit = async () => {
    const count = Number(participants);
    if (!trainerId) {
      toast.error("Please select your name.");
      return;
    }
    if (!trainingId) {
      toast.error("Please select the training you delivered.");
      return;
    }
    if (!participants || Number.isNaN(count) || count < 0) {
      toast.error("Please enter the number of participants.");
      return;
    }
    if (RATING_QUESTIONS.some((q) => !ratings[q.key])) {
      toast.error("Please answer all rating questions.");
      return;
    }
    if (!objectives) {
      toast.error("Please indicate whether the objectives were achieved.");
      return;
    }

    setBusy(true);
    try {
      await submitTrainerFeedback({
        data: {
          trainerId,
          trainingId,
          participantsCount: Math.min(10000, Math.round(count)),
          ratings: {
            engagement: ratings.engagement!,
            knowledge: ratings.knowledge!,
            logistics: ratings.logistics!,
            material: ratings.material!,
            time: ratings.time!,
            support: ratings.support!,
            overall: ratings.overall!,
          },
          objectivesAchieved: objectives === "yes",
          strengths: text.strengths.trim().slice(0, 2000),
          challenges: text.challenges.trim().slice(0, 2000),
          suggestions: text.suggestions.trim().slice(0, 2000),
          additionalComments: text.extra.trim().slice(0, 2000),
        },
      });
      setDone(true);
    } catch (err) {
      console.error("[submitTrainerFeedback]", err);
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PortalGate>
      {() => (
        <EmployeeShell title="Trainer Feedback" subtitle="Training Feedback Portal · Learning & Development">
          <div>
        {done ? (
          <section className="stat-card p-10 text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h2 className="mt-4 font-display text-xl font-semibold">
              Thank you. Your trainer feedback has been submitted successfully.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your assessment will help the L&amp;D department improve future sessions.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Delivered more than one session of this training? You can submit feedback again for
              the same training.
            </p>
            <Button
              className="mt-5"
              onClick={() => {
                setParticipants("");
                setRatings({});
                setObjectives("");
                setText({ strengths: "", challenges: "", suggestions: "", extra: "" });
                setDone(false);
              }}
            >
              Submit feedback for another session
            </Button>
          </section>
        ) : (
          <div className="space-y-5">
            <section className="stat-card space-y-4 p-6">
              <h2 className="font-display text-lg font-semibold">Session Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Trainer Name</Label>
                  <SearchableSelect
                    options={(trainers.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
                    value={trainerId}
                    onChange={setTrainerId}
                    placeholder="Select your name"
                    searchPlaceholder="Search trainer…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Number of Participants</Label>
                  <Input
                    inputMode="numeric"
                    value={participants}
                    placeholder="e.g. 25"
                    onChange={(e) => setParticipants(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Training Name</Label>
                  <SearchableSelect
                    options={(trainings.data ?? []).map((t) => ({
                      value: t.id,
                      label: t.training_code
                        ? `${t.training_name} (${t.training_code})`
                        : t.training_name,
                      hint: t.training_date,
                    }))}
                    value={trainingId}
                    onChange={setTrainingId}
                    placeholder="Select the training you delivered"
                    searchPlaceholder="Search by training name, code or date…"
                    emptyText="No training matches your search."
                  />
                  <p className="text-sm font-semibold text-destructive">
                    Please recheck the training name and date carefully before proceeding.
                    Feedback submitted against a wrong training cannot be changed.
                  </p>
                </div>
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
                    <dt className="text-xs text-muted-foreground">Venue / Platform</dt>
                    <dd className="font-medium">{selected.venue ?? "—"}</dd>
                  </div>
                </dl>
              ) : null}
            </section>

            <section className="stat-card p-5">
              <h3 className="mb-1 font-display text-base font-semibold">Session Assessment</h3>
              <p className="mb-4 text-xs text-muted-foreground">
                Rating scale: 1 = Poor, 2 = Fair, 3 = Good, 4 = Very Good, 5 = Excellent
              </p>
              <div className="space-y-4">
                {RATING_QUESTIONS.map((q) => (
                  <div key={q.key} className="border-b pb-4 last:border-0 last:pb-0">
                    <p className="mb-2 text-sm">{q.text}</p>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRatings({ ...ratings, [q.key]: n })}
                          className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                            ratings[q.key] === n
                              ? "border-primary bg-primary text-primary-foreground"
                              : "hover:bg-secondary"
                          }`}
                        >
                          {n} · {RATING_LABELS[n - 1]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="stat-card space-y-4 p-5">
              <h3 className="font-display text-base font-semibold">Outcome &amp; Comments</h3>
              <div>
                <p className="mb-2 text-sm">Were the training objectives achieved?</p>
                <div className="flex gap-2">
                  {(["yes", "no"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setObjectives(v)}
                      className={`rounded-md border px-4 py-1.5 text-xs capitalize ${
                        objectives === v
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
                <Label>Key strengths of this session</Label>
                <Textarea
                  maxLength={2000}
                  value={text.strengths}
                  onChange={(e) => setText({ ...text, strengths: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Challenges faced during delivery</Label>
                <Textarea
                  maxLength={2000}
                  value={text.challenges}
                  onChange={(e) => setText({ ...text, challenges: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Suggestions for improvement</Label>
                <Textarea
                  maxLength={2000}
                  value={text.suggestions}
                  onChange={(e) => setText({ ...text, suggestions: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Additional comments</Label>
                <Textarea
                  maxLength={2000}
                  value={text.extra}
                  onChange={(e) => setText({ ...text, extra: e.target.value })}
                />
              </div>
              <Button onClick={submit} disabled={busy}>
                {busy ? "Submitting…" : "Submit Trainer Feedback"}
              </Button>
            </section>
          </div>
        )}
          </div>
        </EmployeeShell>
      )}
    </PortalGate>
  );
}
