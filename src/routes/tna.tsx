import { EmployeeShell } from "@/components/employee/EmployeeShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PortalGate } from "@/components/PortalGate";
import type { PortalUser } from "@/lib/portal-session";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  getManagerTeam,
  listTnaCycles,
  submitTnaAssessment,
  type ManagerTeam,
  type TnaStaff,
} from "@/lib/tna.functions";
import { skillApplies } from "@/lib/tna-skills-seed";
import { behaviourFor, RATING_ANCHORS } from "@/lib/tna-skill-behaviours";

export const Route = createFileRoute("/tna")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Training Need Assessment | Learning & Development" },
      {
        name: "description",
        content:
          "Line managers rate the soft and technical skills of their team members for the yearly ABHI Training Need Assessment.",
      },
      { property: "og:title", content: "Training Need Assessment" },
      {
        property: "og:description",
        content: "Submit the yearly training need assessment for your team members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TnaPage,
});

const SCALE = [
  { v: 1, label: "1 — Needs major development" },
  { v: 2, label: "2 — Needs development" },
  { v: 3, label: "3 — Partially proficient" },
  { v: 4, label: "4 — Proficient" },
  { v: 5, label: "5 — Fully proficient / expert" },
];

function TnaPage() {
  return <PortalGate>{(user) => <TnaFlow user={user} />}</PortalGate>;
}

function TnaFlow({ user }: { user: PortalUser }) {
  const [cycleId, setCycleId] = useState("");
  const managerCode = user.employee_code;
  const [team, setTeam] = useState<ManagerTeam | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [active, setActive] = useState<TnaStaff | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);

  const cycles = useQuery({ queryKey: ["tna-cycles"], queryFn: () => listTnaCycles() });

  const skills = useMemo(
    () => (team && active ? team.skills.filter((s) => skillApplies(s, active)) : []),
    [team, active],
  );
  const softSkills = skills.filter((s) => s.skill_type === "soft");
  const techSkills = skills.filter((s) => s.skill_type === "technical");

  const load = async () => {
    if (!cycleId) {
      toast.error("Please select the TNA cycle.");
      return;
    }
    if (!managerCode.trim()) {
      toast.error("Please enter your Employee ID.");
      return;
    }
    setBusy(true);
    try {
      const res = await getManagerTeam({ data: { cycleId } });
      setTeam(res);
      setDone(res.completed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to load your team.");
    } finally {
      setBusy(false);
    }
  };

  const openStaff = (s: TnaStaff) => {
    setActive(s);
    setRatings({});
    setComments("");
    window.scrollTo({ top: 0 });
  };

  const submit = async () => {
    if (!team || !active) return;
    const missing = skills.filter((s) => ratings[s.id] === undefined);
    if (missing.length) {
      toast.error(`Please rate all ${skills.length} skills (or mark them Not Applicable) before submitting.`);
      return;
    }
    const applicable = skills.filter((s) => (ratings[s.id] ?? 0) > 0);
    if (!applicable.length) {
      toast.error("At least one skill must be rated. Not every skill can be Not Applicable.");
      return;
    }
    setBusy(true);
    try {
      await submitTnaAssessment({
        data: {
          cycleId: team.cycle.id,
          staffId: active.id,
          comments: comments.trim() || null,
          ratings: applicable.map((s) => ({ skill_id: s.id, rating: ratings[s.id]! })),
        },
      });
      setDone((d) => [...d, active.id]);
      setActive(null);
      toast.success("TNA submitted for this team member.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to submit this TNA.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <EmployeeShell
      title="Training Need Assessment"
      subtitle="Learning &amp; Development Department"
    >
      <div className="pb-16">
        {!team ? (
          <div className="stat-card mx-auto max-w-lg space-y-4 p-6">
            <div>
              <h2 className="font-display text-lg font-semibold">Training Need Assessment</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Signed in as {user.name} ({user.employee_code}). Select the cycle to see your team
                members and rate their skills.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>TNA cycle</Label>
              <SearchableSelect
                options={(cycles.data ?? []).map((c) => ({ value: c.id, label: `${c.year} — ${c.title}` }))}
                value={cycleId}
                onChange={setCycleId}
                placeholder="Select the TNA cycle"
                searchPlaceholder="Search cycles…"
              />
              {cycles.isFetched && !cycles.data?.length ? (
                <p className="text-xs text-destructive">No TNA cycle is open at the moment.</p>
              ) : null}
            </div>
            <Button className="w-full" onClick={load} disabled={busy}>
              <Users className="size-4" /> {busy ? "Loading…" : "Show my team"}
            </Button>
          </div>
        ) : !active ? (
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="stat-card p-5">
              <p className="font-display text-lg font-semibold">{team.manager.name}</p>
              <p className="text-sm text-muted-foreground">
                {team.manager.designation ?? "Line Manager"}
                {team.manager.department ? ` • ${team.manager.department}` : ""} • {team.cycle.year}{" "}
                {team.cycle.title}
              </p>
              <p className="mt-2 text-sm">
                {done.length} of {team.reportees.length} team members assessed.
              </p>
            </div>
            <div className="divide-y rounded-lg border bg-card">
              {team.reportees.map((r) => {
                const isDone = done.includes(r.id);
                return (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-medium">
                        {r.name} <span className="text-muted-foreground">({r.employee_code})</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[r.designation, r.department, r.branch].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                    {isDone ? (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-success">
                        <CheckCircle2 className="size-4" /> Submitted
                      </span>
                    ) : (
                      <Button size="sm" onClick={() => openStaff(r)}>
                        Rate skills
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            <Button variant="outline" onClick={() => setTeam(null)}>
              <ChevronLeft className="size-4" /> Change Employee ID
            </Button>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="stat-card p-5">
              <p className="font-display text-lg font-semibold">{active.name}</p>
              <p className="text-sm text-muted-foreground">
                {[active.employee_code, active.designation, active.department, active.branch]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Rate every skill from 1 (needs major development) to 5 (fully proficient). Ratings of 3 or
                below are treated as a training need. If a technical competency does not apply to this
                employee, mark it <span className="font-medium">Not Applicable</span> — it is left out of
                their scores and the rest are averaged.
              </p>
            </div>

            <div className="stat-card p-5">
              <h3 className="font-display font-semibold">What each rating means</h3>
              <ul className="mt-2 space-y-1.5">
                {RATING_ANCHORS.map((a) => (
                  <li key={a.value} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {a.value} — {a.label}:
                    </span>{" "}
                    {a.meaning}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Each competency below lists the behaviours you should look for. Rate on what the person
                actually does at work, not on their job title.
              </p>
            </div>

            {[
              { title: "Soft Skills — Vision, Mission & Core Values", list: softSkills },
              { title: "Technical Skills", list: techSkills },
            ].map(({ title, list }) =>
              list.length ? (
                <div key={title} className="stat-card p-5">
                  <h3 className="font-display font-semibold">{title}</h3>
                  <div className="mt-3 divide-y">
                    {list.map((s) => (
                      <div key={s.id} className="py-3">
                        <p className="text-sm font-medium">{s.name}</p>
                        {(() => {
                          const behaviour = s.description ?? behaviourFor(s.name);
                          return behaviour ? (
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                              <span className="font-medium text-foreground">Behaviours: </span>
                              {behaviour}
                            </p>
                          ) : null;
                        })()}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {SCALE.map((o) => (
                            <button
                              key={o.v}
                              type="button"
                              onClick={() => setRatings((r) => ({ ...r, [s.id]: o.v }))}
                              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                                ratings[s.id] === o.v
                                  ? "border-accent bg-accent/20 font-medium text-primary"
                                  : "hover:border-accent"
                              }`}
                            >
                              {o.label}
                            </button>
                          ))}
                          {s.skill_type === "technical" ? (
                            <button
                              type="button"
                              onClick={() => setRatings((r) => ({ ...r, [s.id]: 0 }))}
                              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                                ratings[s.id] === 0
                                  ? "border-destructive bg-destructive/10 font-medium text-destructive"
                                  : "hover:border-destructive"
                              }`}
                            >
                              Not Applicable
                            </button>
                          ) : null}
                        </div>
                        {ratings[s.id] === 0 ? (
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            Excluded from this employee&apos;s TNA scores.
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null,
            )}

            <div className="stat-card space-y-2 p-5">
              <Label>Additional comments (optional)</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Any specific training or development need for this team member…"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={submit} disabled={busy}>
                {busy ? "Submitting…" : "Submit TNA"}
              </Button>
              <Button variant="outline" onClick={() => setActive(null)} disabled={busy}>
                Back to my team
              </Button>
            </div>
          </div>
        )}
      </div>
    </EmployeeShell>
  );
}
