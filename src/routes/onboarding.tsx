import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { EmployeeShell } from "@/components/employee/EmployeeShell";
import { PortalGate } from "@/components/PortalGate";
import type { PortalUser } from "@/lib/portal-session";
import { useLov, useQuestions, type Question } from "@/lib/data";
import { regionWingForLocation } from "@/lib/branch-region-map";
import { supabase } from "@/integrations/supabase/client";
import { submitFeedback } from "@/lib/submit-feedback.functions";
import {
  attachOnboardingFeedback,
  submitOnboardingAttendance,
} from "@/lib/onboarding.functions";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Onboarding Attendance | ABHI Learning HUB" },
      {
        name: "description",
        content:
          "Record new joiner attendance for the ABHI onboarding session and collect trainee feedback on the spot.",
      },
      { property: "og:title", content: "Onboarding Attendance | ABHI Learning HUB" },
      {
        property: "og:description",
        content: "Capture new joiner details and trainee feedback for onboarding sessions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingPage,
});

const RATING_LABELS = ["Poor", "Fair", "Good", "Very Good", "Excellent"];
const CATEGORY_TITLE: Record<string, string> = {
  venue: "Venue & Facilities",
  content: "Training Content",
  trainer: "Trainer",
  overall: "Overall",
};

function OnboardingPage() {
  return (
    <PortalGate>
      {(user) => (
        <EmployeeShell
          title="Onboarding Attendance"
          subtitle="Onboarding Session · new joiner attendance & trainee feedback"
        >
          {user.onboarding_enabled ? (
            <OnboardingFlow user={user} />
          ) : (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">This screen is not available for you.</p>
              <p className="mt-1">
                Onboarding attendance can only be recorded by employees approved by the L&amp;D team.
                Please contact Learning &amp; Development if you need access.
              </p>
            </div>
          )}
        </EmployeeShell>
      )}
    </PortalGate>
  );
}

type Step = 1 | 2 | 3;

function OnboardingFlow({ user }: { user: PortalUser }) {
  const [step, setStep] = useState<Step>(1);
  const designations = useLov("designations");
  const locations = useLov("locations");
  const questions = useQuestions();
  const fileRef = useRef<HTMLInputElement>(null);

  const [cnic, setCnic] = useState("");
  const [name, setName] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [venueId, setVenueId] = useState("");
  const [trainingDate, setTrainingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [trainingId, setTrainingId] = useState<string | null>(null);

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [recommendation, setRecommendation] = useState<"yes" | "no" | "">("");
  const [comments, setComments] = useState({ useful: "", improve: "", extra: "" });

  const activeLocations = (locations.data ?? []).filter((l) => l.status === "active");
  const activeDesignations = (designations.data ?? []).filter((d) => d.status === "active");
  const location = activeLocations.find((l) => l.id === locationId);
  const derived = location ? regionWingForLocation(location.name) : null;

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const visibleQuestions = useMemo<Question[]>(
    () =>
      (questions.data ?? [])
        .filter(
          (q) => q.status === "active" && (q.training_type === "both" || q.training_type === "classroom"),
        )
        .sort((a, b) => a.display_order - b.display_order),
    [questions.data],
  );

  const grouped = useMemo(() => {
    const order = ["venue", "content", "trainer", "overall"] as const;
    return order
      .map((cat) => ({ cat, items: visibleQuestions.filter((q) => q.category === cat) }))
      .filter((g) => g.items.length > 0);
  }, [visibleQuestions]);

  const saveAttendance = async () => {
    if (!/^\d{13}$/.test(cnic)) {
      toast.error("CNIC must be exactly 13 digits.");
      return;
    }
    if (name.trim().length < 2) {
      toast.error("Please enter the new joiner's name.");
      return;
    }
    if (!designationId || !locationId || !venueId || !trainingDate) {
      toast.error("Please complete designation, location, venue and training date.");
      return;
    }
    setBusy(true);
    try {
      let photoPath: string | null = null;
      if (file) {
        const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("onboarding-photos").upload(path, file, {
          upsert: true,
          contentType: file.type || "image/jpeg",
        });
        if (error) throw new Error("Could not upload the training picture.");
        photoPath = path;
      }

      const venue = activeLocations.find((l) => l.id === venueId);
      const res = await submitOnboardingAttendance({
        data: {
          cnic,
          name: name.trim(),
          designation_id: designationId,
          designation_name: activeDesignations.find((d) => d.id === designationId)?.name ?? null,
          location_id: locationId,
          location_name: location?.name ?? null,
          region_name: derived?.region ?? null,
          wing_name: derived?.wing ?? null,
          training_date: trainingDate,
          venue_location_id: venueId,
          venue_name: venue?.name ?? null,
          photo_path: photoPath,
        },
      });
      setAttendanceId(res.id);
      setTrainingId(res.trainingId);
      setStep(2);
      toast.success("New joiner recorded. Please hand the device to the trainee.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitTraineeFeedback = async () => {
    if (!trainingId || !attendanceId) return;
    const missing = visibleQuestions.filter((q) => q.question_type === "rating" && !ratings[q.id]);
    if (missing.length) {
      toast.error("Please answer all rating questions.");
      return;
    }
    if (!recommendation) {
      toast.error("Please indicate whether you would recommend this session.");
      return;
    }
    setBusy(true);
    try {
      const { id: feedbackId } = await submitFeedback({
        data: {
          employee: {
            employee_code: cnic,
            cnic,
            name: name.trim().slice(0, 120),
            designation_id: designationId || null,
            department_id: null,
            location_id: locationId || null,
            region_id: null,
            wing_id: null,
            gender_id: null,
          },
          trainingId,
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
            answer_text: q.question_type === "rating" ? null : (texts[q.id]?.slice(0, 1000) || null),
          })),
        },
      });
      await attachOnboardingFeedback({ data: { attendanceId, feedbackId } });
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    setCnic("");
    setName("");
    setDesignationId("");
    setLocationId("");
    setVenueId("");
    setFile(null);
    setAttendanceId(null);
    setTrainingId(null);
    setRatings({});
    setTexts({});
    setRecommendation("");
    setComments({ useful: "", improve: "", extra: "" });
    setStep(1);
  };

  if (step === 3) {
    return (
      <section className="stat-card p-10 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" />
        <h2 className="mt-4 font-display text-xl font-semibold">
          Onboarding attendance and trainee feedback recorded.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The record has been added to the Onboarding Session report.
        </p>
        <Button className="mt-5" onClick={resetAll}>
          Add another new joiner
        </Button>
      </section>
    );
  }

  if (step === 2) {
    return (
      <section className="space-y-5">
        <div className="stat-card p-4 text-sm">
          <p className="font-medium">Trainee Feedback · Onboarding Session</p>
          <p className="text-muted-foreground">
            {name} · {trainingDate} · Trainer: {user.name}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Rating scale: 1 = Poor, 2 = Fair, 3 = Good, 4 = Very Good, 5 = Excellent
          </p>
        </div>

        {grouped.map(({ cat, items }) => (
          <div key={cat} className="stat-card p-5">
            <h3 className="mb-4 font-display text-base font-semibold">{CATEGORY_TITLE[cat]}</h3>
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
          <h3 className="font-display text-base font-semibold">Recommendation &amp; Comments</h3>
          <div>
            <p className="mb-2 text-sm">Would you recommend this session to other new joiners?</p>
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
            <Label>What was the most useful aspect of this session?</Label>
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
          <Button onClick={submitTraineeFeedback} disabled={busy}>
            {busy ? "Submitting…" : "Submit Feedback"}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="stat-card space-y-4 p-6">
      <div>
        <h2 className="font-display text-lg font-semibold">New Joiner Detail</h2>
        <p className="text-sm text-muted-foreground">
          Training Name: <span className="font-medium text-foreground">Onboarding Session</span> ·
          Trainer: <span className="font-medium text-foreground">{user.name}</span> (
          {user.employee_code})
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>CNIC (13 digits)</Label>
          <Input
            inputMode="numeric"
            maxLength={13}
            value={cnic}
            onChange={(e) => setCnic(e.target.value.replace(/\D/g, "").slice(0, 13))}
            placeholder="3520212345671"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </div>
        <div className="space-y-1.5">
          <Label>Designation</Label>
          <SearchableSelect
            options={activeDesignations.map((d) => ({ value: d.id, label: d.name }))}
            value={designationId}
            onChange={setDesignationId}
            placeholder="Select designation"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Location / Branch</Label>
          <SearchableSelect
            options={activeLocations.map((l) => ({ value: l.id, label: l.name }))}
            value={locationId}
            onChange={setLocationId}
            placeholder="Select branch"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Region (auto)</Label>
          <Input readOnly value={derived?.region ?? ""} placeholder="Select a branch first" />
        </div>
        <div className="space-y-1.5">
          <Label>Wing (auto)</Label>
          <Input readOnly value={derived?.wing ?? ""} placeholder="Select a branch first" />
        </div>
        <div className="space-y-1.5">
          <Label>Training Date</Label>
          <Input
            type="date"
            value={trainingDate}
            onChange={(e) => setTrainingDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Training Venue</Label>
          <SearchableSelect
            options={activeLocations.map((l) => ({ value: l.id, label: l.name }))}
            value={venueId}
            onChange={setVenueId}
            placeholder="Select venue"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Upload Training Picture</Label>
        {preview ? (
          <div className="relative w-fit">
            <img src={preview} alt="Training" className="max-h-56 rounded-lg border object-cover" />
            <button
              type="button"
              onClick={() => setFile(null)}
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
              aria-label="Remove picture"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="size-4" /> Choose picture
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <Button onClick={saveAttendance} disabled={busy}>
        {busy ? "Saving…" : "Submit"}
      </Button>
    </section>
  );
}
