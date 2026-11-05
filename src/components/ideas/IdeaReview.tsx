import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  addIdeaComment,
  getCommentAttachmentUrl,
  getIdeaDetail,
  getIdeasContext,
  saveIdeaAssessment,
  saveIdeaImpact,
  saveIdeaImplementation,
  setIdeaRecognition,
  updateIdeaAdmin,
} from "@/lib/ideas.functions";
import { IDEA_STATUSES, IMPACT_LEVELS, IMPL_TIMES, LMH, statusTone, type IdeaOption } from "@/lib/ideas-shared";

function toB64(file: File) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h3 className="mb-3 font-display font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Sel({ value, onChange, options, placeholder = "—" }: { value: string | null | undefined; onChange: (v: string | null) => void; options: readonly string[]; placeholder?: string }) {
  return (
    <select
      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

const numOrNull = (v: string) => (v.trim() === "" || isNaN(Number(v)) ? null : Number(v));

export function IdeaReview({ id }: { id: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["idea", id], queryFn: () => getIdeaDetail({ data: { id } }) });
  const { data: ctx } = useQuery({ queryKey: ["ideas-ctx"], queryFn: () => getIdeasContext(), staleTime: 60_000 });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["idea", id] });
    qc.invalidateQueries({ queryKey: ["ideas-all"] });
  };
  const onErr = (e: Error) => toast.error(e.message);

  const [status, setStatus] = useState<string>("");
  const [statusComment, setStatusComment] = useState("");
  const [assign, setAssign] = useState({ assigned_function: "", assigned_owner: "", assigned_reviewer: "", target_date: "" });
  const [ass, setAss] = useState<Record<string, string | null>>({});
  const [comment, setComment] = useState({ body: "", internal: true, file: null as File | null });
  const [impl, setImpl] = useState<Record<string, string>>({});
  const [impact, setImpact] = useState<Record<string, string>>({});
  const [rec, setRec] = useState({ id: "", period: "" });

  useEffect(() => {
    if (!data) return;
    const i = data.idea;
    setStatus(i.status);
    setAssign({
      assigned_function: i.assigned_function ?? "",
      assigned_owner: i.assigned_owner ?? "",
      assigned_reviewer: i.assigned_reviewer ?? "",
      target_date: i.target_date ?? "",
    });
    const a = (data.assessment ?? {}) as Record<string, unknown>;
    setAss(Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v == null ? null : String(v)])));
    const m = (data.implementation ?? {}) as Record<string, unknown>;
    setImpl(Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v == null ? "" : String(v)])));
    const p = (data.impact ?? {}) as Record<string, unknown>;
    setImpact(Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v == null ? "" : String(v)])));
  }, [data]);

  const statusM = useMutation({
    mutationFn: () => updateIdeaAdmin({ data: { id, status: status as (typeof IDEA_STATUSES)[number], comment: statusComment } }),
    onSuccess: () => {
      toast.success("Status updated");
      setStatusComment("");
      refresh();
    },
    onError: onErr,
  });
  const assignM = useMutation({
    mutationFn: () =>
      updateIdeaAdmin({
        data: {
          id,
          assigned_function: assign.assigned_function || null,
          assigned_owner: assign.assigned_owner || null,
          assigned_reviewer: assign.assigned_reviewer || null,
          target_date: assign.target_date || null,
        },
      }),
    onSuccess: () => {
      toast.success("Assignment saved");
      refresh();
    },
    onError: onErr,
  });
  const publicM = useMutation({
    mutationFn: (v: boolean) => updateIdeaAdmin({ data: { id, is_public: v } }),
    onSuccess: refresh,
    onError: onErr,
  });
  const assM = useMutation({
    mutationFn: () =>
      saveIdeaAssessment({
        data: {
          idea_id: id,
          strategic: ass['strategic'] as never, customer: ass['customer'] as never, business: ass['business'] as never,
          financial: ass['financial'] as never, operational: ass['operational'] as never, risk: ass['risk'] as never,
          complexity: ass['complexity'] as never, final_impact: ass['final_impact'] as never,
          estimated_cost: numOrNull(ass['estimated_cost'] ?? ""),
          estimated_saving: numOrNull(ass['estimated_saving'] ?? ""),
          estimated_revenue: numOrNull(ass['estimated_revenue'] ?? ""),
          implementation_time: ass['implementation_time'] ?? null,
        },
      }),
    onSuccess: () => {
      toast.success("Assessment saved");
      refresh();
    },
    onError: onErr,
  });
  const commentM = useMutation({
    mutationFn: async () => {
      const f = comment.file;
      return addIdeaComment({
        data: {
          idea_id: id,
          body: comment.body,
          is_internal: comment.internal,
          attachment: f ? { name: f.name, type: f.type, base64: await toB64(f) } : null,
        },
      });
    },
    onSuccess: () => {
      setComment({ body: "", internal: true, file: null });
      refresh();
    },
    onError: onErr,
  });
  const implM = useMutation({
    mutationFn: () =>
      saveIdeaImplementation({
        data: {
          idea_id: id,
          owner: impl['owner'] || null,
          supporting_department: impl['supporting_department'] || null,
          start_date: impl['start_date'] || null,
          target_date: impl['target_date'] || null,
          actual_date: impl['actual_date'] || null,
          budget: numOrNull(impl['budget'] ?? ""),
          actual_cost: numOrNull(impl['actual_cost'] ?? ""),
          estimated_benefit: numOrNull(impl['estimated_benefit'] ?? ""),
          actual_benefit: numOrNull(impl['actual_benefit'] ?? ""),
          status: impl['status'] || null,
          notes: impl['notes'] || null,
        },
      }),
    onSuccess: () => {
      toast.success("Implementation saved");
      refresh();
    },
    onError: onErr,
  });
  const IMPACT_NUM = [
    ["est_annual_saving", "Estimated annual saving (PKR)"],
    ["actual_annual_saving", "Actual annual saving (PKR)"],
    ["est_revenue", "Estimated revenue (PKR)"],
    ["actual_revenue", "Actual revenue (PKR)"],
    ["hours_saved", "Hours saved"],
    ["processes_simplified", "Processes simplified"],
    ["tat_reduction_pct", "TAT reduction %"],
    ["manual_steps_eliminated", "Manual steps eliminated"],
    ["customers_affected", "Customers affected"],
    ["customer_tat_improvement_pct", "Customer TAT improvement %"],
    ["complaint_reduction_pct", "Complaint reduction %"],
    ["csat_improvement_pct", "Customer satisfaction improvement %"],
    ["employee_hours_saved", "Employee hours saved"],
    ["productivity_improvement_pct", "Productivity improvement %"],
    ["risks_reduced", "Risks reduced"],
    ["loss_prevented", "Fraud/operational loss prevented (PKR)"],
  ] as const;
  const impactM = useMutation({
    mutationFn: () =>
      saveIdeaImpact({
        data: {
          idea_id: id,
          ...Object.fromEntries(IMPACT_NUM.map(([k]) => [k, numOrNull(impact[k] ?? "")])),
          employee_experience: impact['employee_experience'] || null,
          control_improvements: impact['control_improvements'] || null,
        } as never,
      }),
    onSuccess: () => {
      toast.success("Impact recorded");
      refresh();
    },
    onError: onErr,
  });
  const recM = useMutation({
    mutationFn: (p: { add?: boolean; removeId?: string }) =>
      setIdeaRecognition({
        data: p.removeId ? { idea_id: id, remove_id: p.removeId } : { idea_id: id, recognition_id: rec.id, period: rec.period || null },
      }),
    onSuccess: () => {
      setRec({ id: "", period: "" });
      refresh();
    },
    onError: onErr,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading idea…</p>;
  if (error || !data) return <p className="text-sm text-destructive">{(error as Error)?.message ?? "Idea not found."}</p>;
  const { idea, role } = data;
  const isAdmin = role.isAdmin;
  const recognitionOpts = ((ctx?.options ?? []) as IdeaOption[]).filter((o) => o.kind === "recognition" && o.status === "active");

  const info: [string, string | null | undefined][] = [
    ["Category", idea.category],
    ["Type", idea.type],
    ["Employee", idea.is_anonymous ? `${idea.employee_name}${isAdmin ? " (submitted anonymously)" : ""}` : idea.employee_name],
    ["Employee ID", idea.employee_code],
    ["Designation", idea.designation_name],
    ["Department", idea.department_name],
    ["Location", idea.location_name],
    ["Region", idea.region_name],
    ["Wing", idea.wing_name],
    ["Line manager", idea.manager_name],
    ["Submitted", new Date(idea.submitted_at).toLocaleString()],
    ["Expected impact (employee)", idea.expected_impact],
    ["Where to implement", idea.implement_scope],
    ["Complexity (employee)", idea.complexity],
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{idea.ref_no}</span>
          <span className={`rounded-full border px-2 py-0.5 text-xs ${statusTone(idea.status)}`}>{idea.status}</span>
          {data.recognitions.map((r) => (
            <span key={r.id} className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold">
              🏆 {r.recognition_name}
              {r.period ? ` (${r.period})` : ""}
            </span>
          ))}
        </div>
        <h2 className="mt-2 font-display text-xl font-semibold">{idea.title}</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
          {info.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v || "—"}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">PROBLEM / OPPORTUNITY</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{idea.problem}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">PROPOSED SOLUTION</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{idea.solution}</p>
          </div>
        </div>
        <p className="mt-3 text-sm">
          <span className="text-xs font-semibold text-muted-foreground">BENEFITS: </span>
          {idea.benefits.join(", ") || "—"}
        </p>
        <p className="text-sm">
          <span className="text-xs font-semibold text-muted-foreground">WHO BENEFITS: </span>
          {idea.beneficiaries.join(", ") || "—"}
        </p>
        {data.attachmentUrl && (
          <a href={data.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline">
            <Paperclip className="size-4" /> {idea.attachment_name ?? "Attachment"}
          </a>
        )}
      </section>

      {isAdmin && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Status">
            <div className="space-y-2">
              <Sel value={status} onChange={(v) => setStatus(v ?? idea.status)} options={IDEA_STATUSES} />
              <Textarea rows={2} placeholder="Comment / reason (required)" value={statusComment} onChange={(e) => setStatusComment(e.target.value)} />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={idea.is_public} onCheckedChange={(v) => publicM.mutate(v)} /> Show in Explore Ideas
                </label>
                <Button size="sm" disabled={status === idea.status || statusM.isPending} onClick={() => statusM.mutate()}>
                  Update status
                </Button>
              </div>
            </div>
          </Card>
          <Card title="Ownership & Assignment">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Assigned function / department</Label>
                <Input value={assign.assigned_function} onChange={(e) => setAssign({ ...assign, assigned_function: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Assigned owner / project owner</Label>
                <Input value={assign.assigned_owner} onChange={(e) => setAssign({ ...assign, assigned_owner: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Reviewer</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={assign.assigned_reviewer}
                  onChange={(e) => setAssign({ ...assign, assigned_reviewer: e.target.value })}
                >
                  <option value="">—</option>
                  {data.reviewers.map((r) => (
                    <option key={r.user_id} value={r.user_id}>
                      {r.name} ({r.employee_code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Target date</Label>
                <Input type="date" value={assign.target_date} onChange={(e) => setAssign({ ...assign, target_date: e.target.value })} />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" disabled={assignM.isPending} onClick={() => assignM.mutate()}>
                Save assignment
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Card title="Assessment">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["strategic", "Strategic alignment"],
              ["customer", "Customer impact"],
              ["business", "Business impact"],
              ["financial", "Financial impact"],
              ["operational", "Operational impact"],
              ["risk", "Risk / control benefit"],
              ["complexity", "Implementation complexity"],
            ] as const
          ).map(([k, l]) => (
            <div key={k}>
              <Label className="text-xs">{l}</Label>
              <Sel value={ass[k]} onChange={(v) => setAss({ ...ass, [k]: v })} options={LMH} />
            </div>
          ))}
          <div>
            <Label className="text-xs">Final impact rating</Label>
            <Sel value={ass['final_impact']} onChange={(v) => setAss({ ...ass, final_impact: v })} options={IMPACT_LEVELS} />
          </div>
          {(
            [
              ["estimated_cost", "Estimated cost (PKR)"],
              ["estimated_saving", "Estimated annual saving (PKR)"],
              ["estimated_revenue", "Estimated revenue impact (PKR)"],
            ] as const
          ).map(([k, l]) => (
            <div key={k}>
              <Label className="text-xs">{l}</Label>
              <Input type="number" value={ass[k] ?? ""} onChange={(e) => setAss({ ...ass, [k]: e.target.value })} />
            </div>
          ))}
          <div>
            <Label className="text-xs">Implementation time</Label>
            <Sel value={ass['implementation_time']} onChange={(v) => setAss({ ...ass, implementation_time: v })} options={IMPL_TIMES} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" disabled={assM.isPending} onClick={() => assM.mutate()}>
            Save assessment
          </Button>
        </div>
      </Card>

      <Card title="Reviewer Comments">
        <div className="space-y-2">
          <Textarea rows={3} placeholder="Add a comment or recommendation…" value={comment.body} onChange={(e) => setComment({ ...comment, body: e.target.value })} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={!comment.internal} onCheckedChange={(v) => setComment({ ...comment, internal: !v })} /> Visible to employee
              </label>
              <label className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground">
                <Paperclip className="size-4" /> {comment.file?.name ?? "Attach"}
                <input type="file" className="hidden" onChange={(e) => setComment({ ...comment, file: e.target.files?.[0] ?? null })} />
              </label>
            </div>
            <Button size="sm" disabled={!comment.body.trim() || commentM.isPending} onClick={() => commentM.mutate()}>
              Add comment
            </Button>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {data.comments.map((c) => (
            <li key={c.id} className="rounded-md bg-secondary p-3 text-sm">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{c.author_name}</span> · {new Date(c.created_at).toLocaleString()} ·{" "}
                {c.is_internal ? "Internal" : "Visible to employee"}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
              {c.attachment_path && (
                <button
                  type="button"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold underline"
                  onClick={async () => {
                    const url = await getCommentAttachmentUrl({ data: { path: c.attachment_path! } });
                    if (url) window.open(url, "_blank", "noopener");
                  }}
                >
                  <Paperclip className="size-3" /> {c.attachment_name}
                </button>
              )}
            </li>
          ))}
          {!data.comments.length && <li className="text-sm text-muted-foreground">No comments yet.</li>}
        </ul>
      </Card>

      {isAdmin && (
        <>
          <Card title="Implementation Tracking">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["owner", "Implementation owner", "text"],
                  ["supporting_department", "Supporting department", "text"],
                  ["status", "Status", "text"],
                  ["start_date", "Start date", "date"],
                  ["target_date", "Target completion", "date"],
                  ["actual_date", "Actual completion", "date"],
                  ["budget", "Budget (PKR)", "number"],
                  ["actual_cost", "Actual cost (PKR)", "number"],
                  ["estimated_benefit", "Estimated benefit (PKR)", "number"],
                  ["actual_benefit", "Actual benefit (PKR)", "number"],
                ] as const
              ).map(([k, l, t]) => (
                <div key={k}>
                  <Label className="text-xs">{l}</Label>
                  <Input type={t} value={impl[k] ?? ""} onChange={(e) => setImpl({ ...impl, [k]: e.target.value })} />
                </div>
              ))}
              <div className="sm:col-span-2 lg:col-span-4">
                <Label className="text-xs">Implementation notes</Label>
                <Textarea rows={2} value={impl['notes'] ?? ""} onChange={(e) => setImpl({ ...impl, notes: e.target.value })} />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" disabled={implM.isPending} onClick={() => implM.mutate()}>
                Save implementation
              </Button>
            </div>
          </Card>

          <Card title="Impact Measurement">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {IMPACT_NUM.map(([k, l]) => (
                <div key={k}>
                  <Label className="text-xs">{l}</Label>
                  <Input type="number" value={impact[k] ?? ""} onChange={(e) => setImpact({ ...impact, [k]: e.target.value })} />
                </div>
              ))}
              <div className="sm:col-span-2">
                <Label className="text-xs">Employee experience improvement</Label>
                <Input value={impact['employee_experience'] ?? ""} onChange={(e) => setImpact({ ...impact, employee_experience: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Control improvements</Label>
                <Input value={impact['control_improvements'] ?? ""} onChange={(e) => setImpact({ ...impact, control_improvements: e.target.value })} />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" disabled={impactM.isPending} onClick={() => impactM.mutate()}>
                Save impact
              </Button>
            </div>
          </Card>

          <Card title="Recognition">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-48">
                <Label className="text-xs">Recognition</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={rec.id} onChange={(e) => setRec({ ...rec, id: e.target.value })}>
                  <option value="">Choose…</option>
                  {recognitionOpts.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Period (e.g. Sep 2026 / Q3 2026)</Label>
                <Input value={rec.period} onChange={(e) => setRec({ ...rec, period: e.target.value })} />
              </div>
              <Button size="sm" disabled={!rec.id || recM.isPending} onClick={() => recM.mutate({ add: true })}>
                Award
              </Button>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {data.recognitions.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-md bg-secondary px-3 py-1.5">
                  <span>
                    🏆 {r.recognition_name} {r.period ? `(${r.period})` : ""}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => recM.mutate({ removeId: r.id })}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Audit Trail">
            <div className="max-h-80 overflow-auto">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1.5">When</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Previous</th>
                    <th>New</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {data.audit.map((a) => (
                    <tr key={a.id} className="border-b align-top last:border-0">
                      <td className="whitespace-nowrap py-1.5">{new Date(a.created_at).toLocaleString()}</td>
                      <td>{a.actor_name}</td>
                      <td>
                        {a.action}
                        {a.field ? ` (${a.field})` : ""}
                      </td>
                      <td className="max-w-40 truncate" title={a.old_value ?? ""}>
                        {a.old_value ?? "—"}
                      </td>
                      <td className="max-w-40 truncate" title={a.new_value ?? ""}>
                        {a.new_value ?? "—"}
                      </td>
                      <td>{a.comment ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
