import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { SectionCard } from "@/components/admin/Kpi";
import { StatusSwitch } from "@/components/admin/StatusSwitch";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, useFeedback, useLov, useTrainings, type Training } from "@/lib/data";
import { fmtRating, groupStats } from "@/lib/analytics";
import {
  listTrainingParticipants,
  parseEmployeeCodes,
  resolveEmployeeCodes,
  setTrainingParticipants,
} from "@/lib/training-participants.functions";

export const Route = createFileRoute("/_authenticated/trainings")({
  head: () => ({
    meta: [
      { title: "Manage Trainings | ABHI Learning HUB" },
      {
        name: "description",
        content: "Create, update and deactivate classroom and virtual training sessions.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainingsPage,
});

type Draft = Partial<Training>;

type FilterKey =
  | "gender_name"
  | "department_name"
  | "location_name"
  | "region_name"
  | "wing_name"
  | "designation_name";

type StaffRow = { employee_code: string; status: string } & Record<FilterKey, string | null>;

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: "gender_name", label: "Gender" },
  { key: "department_name", label: "Department" },
  { key: "location_name", label: "Location" },
  { key: "region_name", label: "Region" },
  { key: "wing_name", label: "Wing" },
  { key: "designation_name", label: "Designation" },
];

type CreatedSummary = {
  code: string;
  name: string;
  mandatory: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  venue: string | null;
  trainer: string | null;
  times: string | null;
  departments: string[];
};

const emptyDraft: Draft = {
  training_code: "",
  training_name: "",
  training_type: "classroom",
  training_mandatory: "non_mandatory",
  training_date: new Date().toISOString().slice(0, 10),
  training_end_date: new Date().toISOString().slice(0, 10),
  department_ids: [],
  status: "active",
};

function TrainingsPage() {
  const qc = useQueryClient();
  const { data: trainings = [], isLoading } = useTrainings();
  const { data: trainers = [] } = useLov("trainers");
  const { data: departments = [] } = useLov("departments");
  const { data: feedback = [] } = useFeedback();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [created, setCreated] = useState<CreatedSummary | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [participantsText, setParticipantsText] = useState("");
  const [missing, setMissing] = useState<string[] | null>(null);
  const [checking, setChecking] = useState(false);

  const participantCodes = useMemo(
    () => parseEmployeeCodes(participantsText),
    [participantsText],
  );

  const { data: staff = [] } = useQuery({
    queryKey: ["portal-users-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_users")
        .select(
          "employee_code,status,gender_name,department_name,location_name,region_name,wing_name,designation_name",
        )
        .eq("status", "active")
        .limit(10000);
      if (error) throw error;
      return (data ?? []) as StaffRow[];
    },
  });

  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    gender_name: "",
    department_name: "",
    location_name: "",
    region_name: "",
    wing_name: "",
    designation_name: "",
  });

  const optionsFor = (key: FilterKey) =>
    Array.from(new Set(staff.map((s) => (s[key] ?? "").trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
      .map((v) => ({ value: v, label: v }));

  const matchedStaff = useMemo(
    () =>
      staff.filter((s) =>
        (Object.keys(filters) as FilterKey[]).every(
          (k) => !filters[k] || (s[k] ?? "").trim() === filters[k],
        ),
      ),
    [staff, filters],
  );

  const addCodes = (codes: string[]) => {
    if (!codes.length) {
      toast.error("No employees match the selected filters.");
      return;
    }
    const merged = parseEmployeeCodes([participantsText, ...codes].join("\n"));
    setParticipantsText(merged.join("\n"));
    toast.success(`${codes.length} employee(s) added · ${merged.length} total assigned`);
  };

  const checkIds = async () => {
    if (!participantCodes.length) {
      toast.error("Please paste at least one Employee ID.");
      return;
    }
    setChecking(true);
    try {
      const res = await resolveEmployeeCodes({ data: { codes: participantCodes } });
      if (res.missing.length) setMissing(res.missing);
      else toast.success(`All ${res.found.length} Employee ID(s) found in Employee Accounts.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not check the Employee IDs.");
    } finally {
      setChecking(false);
    }
  };

  const openEditor = async (t?: Training) => {
    setDraft(t ?? emptyDraft);
    setParticipantsText("");
    setOpen(true);
    if (t) {
      try {
        const rows = await listTrainingParticipants({ data: { trainingId: t.id } });
        setParticipantsText(rows.map((r) => r.employee_code).join("\n"));
      } catch {
        /* participants stay empty if they cannot be loaded */
      }
    }
  };

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    feedback.forEach((f) => map.set(f.training_id, (map.get(f.training_id) ?? 0) + 1));
    return map;
  }, [feedback]);

  const ratings = useMemo(() => {
    const stats = groupStats(feedback, (r) => r.training_id);
    return new Map(stats.map((s) => [s.key, s.overall]));
  }, [feedback]);

  const draftSummary = useMemo(() => {
    const depIds = draft.department_ids ?? [];
    return {
      name: draft.training_name?.trim() || "",
      mandatory:
        (draft.training_mandatory ?? "non_mandatory") === "mandatory"
          ? "Mandatory"
          : "Non Mandatory",
      type: (draft.training_type ?? "classroom") === "virtual" ? "Virtual" : "Classroom",
      dateFrom: draft.training_date ?? "",
      dateTo: draft.training_end_date || draft.training_date || "",
      venue: draft.venue?.trim() || null,
      trainer: trainers.find((t) => t.id === draft.trainer_id)?.name ?? null,
      times:
        draft.start_time || draft.end_time
          ? [draft.start_time, draft.end_time].filter(Boolean).join(" – ")
          : null,
      departments: depIds
        .map((id) => departments.find((dep) => dep.id === id)?.name)
        .filter((n): n is string => Boolean(n)),
    };
  }, [draft, trainers, departments]);

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      if (!d.training_name?.trim() || !d.training_date) {
        throw new Error("Training name and start date are required.");
      }
      if (d.training_end_date && d.training_end_date < d.training_date) {
        throw new Error("End date cannot be before start date.");
      }
      const depIds = d.department_ids ?? [];
      const payload = {
        
        training_name: d.training_name.trim(),
        training_type: d.training_type ?? "classroom",
        training_mandatory: d.training_mandatory ?? "non_mandatory",
        training_date: d.training_date,
        training_end_date: d.training_end_date || d.training_date,
        trainer_id: d.trainer_id || null,
        venue: d.venue?.trim() || null,
        description: d.description?.trim() || null,
        start_time: d.start_time || null,
        end_time: d.end_time || null,
        department_ids: depIds,
        department_id: depIds[0] ?? null,
        status: d.status ?? "active",
      };
      if (d.id) {
        const { error } = await supabase.from("trainings").update(payload).eq("id", d.id);
        if (error) throw error;
        await logAudit("update", "training", d.id, { name: payload.training_name });
        const res = await setTrainingParticipants({
          data: { trainingId: d.id, codes: participantCodes },
        });
        return { summary: null, missing: res.missing, assigned: res.assigned };
      }
      const { data, error } = await supabase
        .from("trainings")
        .insert(payload)
        .select("id, training_code")
        .single();
      if (error) throw error;
      await logAudit("create", "training", data?.id, { name: payload.training_name });
      const trainerName = trainers.find((t) => t.id === payload.trainer_id)?.name ?? null;
      const assignment = data?.id
        ? await setTrainingParticipants({
            data: { trainingId: data.id, codes: participantCodes },
          })
        : { assigned: 0, missing: [] as string[] };
      const summary = {
        code: data?.training_code || "—",
        name: payload.training_name,
        mandatory:
          payload.training_mandatory === "mandatory" ? "Mandatory" : "Non Mandatory",
        type: payload.training_type === "virtual" ? "Virtual" : "Classroom",
        dateFrom: payload.training_date,
        dateTo: payload.training_end_date,
        venue: payload.venue,
        trainer: trainerName,
        times:
          payload.start_time || payload.end_time
            ? [payload.start_time, payload.end_time].filter(Boolean).join(" – ")
            : null,
        departments: depIds
          .map((id) => departments.find((dep) => dep.id === id)?.name)
          .filter((n): n is string => Boolean(n)),
      } satisfies CreatedSummary;
      return { summary, missing: assignment.missing, assigned: assignment.assigned };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["trainings"] });
      setOpen(false);
      setDraft(emptyDraft);
      setParticipantsText("");
      if (res.summary) {
        setCreated(res.summary);
      } else {
        toast.success(`Training saved · ${res.assigned} participant(s) assigned`);
      }
      if (res.missing.length) setMissing(res.missing);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("trainings").update({ status }).eq("id", id);
      if (error) throw error;
      await logAudit("update", "training", id, { status });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trainings"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({

    mutationFn: async (t: Training) => {
      if ((counts.get(t.id) ?? 0) > 0) {
        const { error } = await supabase
          .from("trainings")
          .update({ status: "inactive" })
          .eq("id", t.id);
        if (error) throw error;
        await logAudit("deactivate", "training", t.id, { name: t.training_name });
        return "deactivated";
      }
      const { error } = await supabase.from("trainings").delete().eq("id", t.id);
      if (error) throw error;
      await logAudit("delete", "training", t.id, { name: t.training_name });
      return "deleted";
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["trainings"] });
      toast.success(
        result === "deleted"
          ? "Training deleted"
          : "Training has feedback attached and was deactivated instead of deleted.",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = trainings.filter((t) =>
    !search.trim()
      ? true
      : [t.training_name, t.training_code, t.venue]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(search.trim().toLowerCase())),
  );

  const set = (patch: Draft) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Employees can only submit feedback for active trainings.
          </p>
        </div>
        <Button onClick={() => void openEditor()}>
          <Plus className="size-4" /> Add Training
        </Button>
      </div>

      <SectionCard
        title="Trainings"
        action={
          <Input
            placeholder="Search trainings…"
            className="w-56"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Code</th>
                  <th className="py-2 pr-3">Training</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Trainer</th>
                  <th className="py-2 pr-3">Mandatory</th>
                  <th className="py-2 pr-3">Venue</th>
                  <th className="py-2 pr-3">Responses</th>
                  <th className="py-2 pr-3">Avg Rating</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs">{t.training_code || "—"}</td>
                    <td className="py-2 pr-3 font-medium">{t.training_name}</td>
                    <td className="py-2 pr-3 capitalize">{t.training_type}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {t.training_date}
                      {t.training_end_date && t.training_end_date !== t.training_date
                        ? ` → ${t.training_end_date}`
                        : ""}
                    </td>
                    <td className="py-2 pr-3">
                      {trainers.find((x) => x.id === t.trainer_id)?.name ?? "—"}
                    </td>
                    <td className="py-2 pr-3">{t.training_mandatory === "mandatory" ? "Mandatory" : "Non Mandatory"}</td>
                    <td className="py-2 pr-3">{t.venue ?? "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">{counts.get(t.id) ?? 0}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmtRating(ratings.get(t.id) ?? null)}</td>
                    <td className="py-2 pr-3">
                      <StatusSwitch
                        status={t.status}
                        disabled={toggleStatus.isPending}
                        onChange={(status) => toggleStatus.mutate({ id: t.id, status })}
                      />
                    </td>

                    <td className="py-2 pr-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void openEditor(t)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Remove "${t.training_name}"?`)) remove.mutate(t);
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length ? (
              <p className="py-4 text-sm text-muted-foreground">No trainings found.</p>
            ) : null}
          </div>
        )}
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Training" : "Add Training"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Training Code (auto-generated)</Label>
              <Input readOnly value={draft.training_code ?? "Assigned on save"} />

            </div>
            <div className="space-y-1.5">
              <Label>Training Name *</Label>
              <Input
                value={draft.training_name ?? ""}
                onChange={(e) => set({ training_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Training Type *</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={draft.training_type ?? "classroom"}
                onChange={(e) => set({ training_type: e.target.value as Training["training_type"] })}
              >
                <option value="classroom">Classroom</option>
                <option value="virtual">Virtual</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Mandatory / Non Mandatory *</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={draft.training_mandatory ?? "non_mandatory"}
                onChange={(e) =>
                  set({ training_mandatory: e.target.value as Training["training_mandatory"] })
                }
              >
                <option value="mandatory">Mandatory</option>
                <option value="non_mandatory">Non Mandatory</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Date From *</Label>
              <Input
                type="date"
                value={draft.training_date ?? ""}
                onChange={(e) => set({ training_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date To</Label>
              <Input
                type="date"
                min={draft.training_date ?? undefined}
                value={draft.training_end_date ?? ""}
                onChange={(e) => set({ training_end_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={draft.start_time ?? ""}
                onChange={(e) => set({ start_time: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input
                type="time"
                value={draft.end_time ?? ""}
                onChange={(e) => set({ end_time: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Trainer</Label>
              <SearchableSelect
                options={[
                  { value: "", label: "Not assigned" },
                  ...trainers.map((t) => ({ value: t.id, label: t.name })),
                ]}
                value={draft.trainer_id ?? ""}
                onChange={(v) => set({ trainer_id: v })}
                placeholder="Not assigned"
                searchPlaceholder="Search trainer…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{draft.training_type === "virtual" ? "Platform" : "Venue"}</Label>
              <Input value={draft.venue ?? ""} onChange={(e) => set({ venue: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <div className="flex h-9 items-center">
                <StatusSwitch
                  status={draft.status ?? "active"}
                  onChange={(status) => set({ status })}
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Assign Employees (paste Employee IDs from Excel)</Label>
              <Textarea
                rows={4}
                placeholder={"10234\n10235\n10236"}
                value={participantsText}
                onChange={(e) => setParticipantsText(e.target.value)}
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void checkIds()}
                  disabled={checking}
                >
                  {checking ? "Checking…" : "Check Employee IDs"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {participantCodes.length} Employee ID(s) entered. Assigned employees
                  automatically get this training&apos;s participant feedback and evaluation.
                </span>
              </div>

              <div className="rounded-md border p-3 space-y-3">
                <p className="text-sm font-medium">Add employees by filter</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {FILTER_LABELS.map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <SearchableSelect
                        options={[{ value: "", label: `All ${label.toLowerCase()}s` }, ...optionsFor(key)]}
                        value={filters[key]}
                        onChange={(v) => setFilters((f) => ({ ...f, [key]: v }))}
                        placeholder={`All ${label.toLowerCase()}s`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addCodes(matchedStaff.map((s) => s.employee_code))}
                  >
                    Add {matchedStaff.length} matching employee(s)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addCodes(staff.map((s) => s.employee_code))}
                  >
                    Assign to all employees ({staff.length})
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFilters({
                        gender_name: "",
                        department_name: "",
                        location_name: "",
                        region_name: "",
                        wing_name: "",
                        designation_name: "",
                      })
                    }
                  >
                    Clear filters
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setParticipantsText("")}
                  >
                    Clear list
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={draft.description ?? ""}
                onChange={(e) => set({ description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!draft.training_name?.trim() || !draft.training_date) {
                  toast.error("Training name and start date are required.");
                  return;
                }
                if (draft.training_end_date && draft.training_end_date < draft.training_date) {
                  toast.error("End date cannot be before start date.");
                  return;
                }
                if (draft.id) {
                  save.mutate(draft);
                } else {
                  setReviewOpen(true);
                }
              }}
              disabled={save.isPending}
            >
              {save.isPending ? "Saving…" : draft.id ? "Save Training" : "Review & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={(o) => !o && setReviewOpen(false)}>
        <DialogContent className="z-[70] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm training details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              Please recheck the details below before saving. A training code will be
              assigned automatically{" "}
              <span className="font-mono font-semibold">
                {(draft.training_mandatory ?? "non_mandatory") === "mandatory" ? "(M…)" : "(N…)"}
              </span>
              .
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md border p-3 text-sm">
              <dt className="text-muted-foreground">Training</dt>
              <dd className="font-medium">{draftSummary.name || "—"}</dd>
              <dt className="text-muted-foreground">Mandatory</dt>
              <dd className="font-medium">{draftSummary.mandatory}</dd>
              <dt className="text-muted-foreground">Mode</dt>
              <dd className="font-medium">{draftSummary.type}</dd>
              <dt className="text-muted-foreground">Dates</dt>
              <dd className="font-medium">
                {draftSummary.dateFrom}
                {draftSummary.dateTo && draftSummary.dateTo !== draftSummary.dateFrom
                  ? ` → ${draftSummary.dateTo}`
                  : ""}
                {draftSummary.times ? ` (${draftSummary.times})` : ""}
              </dd>
              <dt className="text-muted-foreground">
                {draftSummary.type === "Virtual" ? "Platform" : "Venue"}
              </dt>
              <dd className="font-medium">{draftSummary.venue || "—"}</dd>
              <dt className="text-muted-foreground">Trainer</dt>
              <dd className="font-medium">{draftSummary.trainer || "Not assigned"}</dd>
              <dt className="text-muted-foreground">Departments</dt>
              <dd className="font-medium">
                {draftSummary.departments.length
                  ? draftSummary.departments.join(", ")
                  : "All / not set"}
              </dd>
            </dl>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewOpen(false)}
              disabled={save.isPending}
            >
              Back to edit
            </Button>
            <Button
              onClick={() => {
                setReviewOpen(false);
                save.mutate(draft);
              }}
              disabled={save.isPending}
            >
              {save.isPending ? "Saving…" : "Confirm & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!created} onOpenChange={(o) => !o && setCreated(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Training created successfully</DialogTitle>
          </DialogHeader>
          {created ? (
            <div className="space-y-4">
              <p className="text-sm">
                <span className="font-medium">{created.name}</span> has been created with
                training code{" "}
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm font-semibold">
                  {created.code}
                </span>
                . Please recheck the details below.
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md border p-3 text-sm">
                <dt className="text-muted-foreground">Mandatory</dt>
                <dd className="font-medium">{created.mandatory}</dd>
                <dt className="text-muted-foreground">Mode</dt>
                <dd className="font-medium">{created.type}</dd>
                <dt className="text-muted-foreground">Dates</dt>
                <dd className="font-medium">
                  {created.dateFrom}
                  {created.dateTo && created.dateTo !== created.dateFrom
                    ? ` → ${created.dateTo}`
                    : ""}
                  {created.times ? ` (${created.times})` : ""}
                </dd>
                <dt className="text-muted-foreground">
                  {created.type === "Virtual" ? "Platform" : "Venue"}
                </dt>
                <dd className="font-medium">{created.venue || "—"}</dd>
                <dt className="text-muted-foreground">Trainer</dt>
                <dd className="font-medium">{created.trainer || "Not assigned"}</dd>
                <dt className="text-muted-foreground">Departments</dt>
                <dd className="font-medium">
                  {created.departments.length ? created.departments.join(", ") : "All / not set"}
                </dd>
              </dl>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setCreated(null)}>OK, confirmed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!missing} onOpenChange={(o) => !o && setMissing(null)}>
        <DialogContent className="z-[80] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Employee ID(s) not found</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              {`Employee ID(s) ${(missing ?? []).join(", ")} not found in data base.`}
            </p>
            <p className="text-sm text-muted-foreground">
              All other Employee IDs were matched. Please create the missing accounts in
              Employee Accounts, then assign the training to them.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setMissing(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
