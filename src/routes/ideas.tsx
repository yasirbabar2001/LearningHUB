import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Compass, Lightbulb, ListChecks, Paperclip, Plus, Trophy, ClipboardCheck } from "lucide-react";
import { PortalGate } from "@/components/PortalGate";
import { EmployeeShell } from "@/components/employee/EmployeeShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  findSimilarIdeas,
  getIdeasContext,
  getIdeasLeaderboard,
  listAllIdeas,
  listExploreIdeas,
  listMyIdeas,
  submitIdea,
} from "@/lib/ideas.functions";
import {
  COMPLEXITIES,
  IMPACT_LEVELS,
  MAX_ATTACHMENT_BYTES,
  ALLOWED_ATTACHMENT,
  SCOPES,
  statusTone,
  type IdeaOption,
} from "@/lib/ideas-shared";
import { IdeaReview } from "@/components/ideas/IdeaReview";

const search = z.object({
  view: z.enum(["home", "submit", "mine", "explore", "review", "leaderboard"]).optional(),
  id: z.string().optional(),
});

export const Route = createFileRoute("/ideas")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "ABHI IDEAS | ABHI Learning HUB" },
      { name: "description", content: "Share ideas to make ABHI simpler, smarter and better — Keh Do ABHI!" },
      { property: "og:title", content: "ABHI IDEAS | ABHI Learning HUB" },
      { property: "og:description", content: "Employee innovation and ideas platform for ABHI Microfinance Bank." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IdeasPage,
});

export function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function IdeasPage() {
  const { view = "home", id } = Route.useSearch();
  return (
    <PortalGate>
      {() => (
        <EmployeeShell title="ABHI IDEAS" subtitle={"Have an idea? Keh Do ABHI!"}>
          <IdeasBody view={view} id={id} />
        </EmployeeShell>
      )}
    </PortalGate>
  );
}

function useIdeasCtx() {
  return useQuery({ queryKey: ["ideas-ctx"], queryFn: () => getIdeasContext(), staleTime: 60_000 });
}

function IdeasBody({ view, id }: { view: string; id?: string | undefined }) {
  const { data: ctx, isLoading } = useIdeasCtx();
  if (isLoading || !ctx) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!ctx.settings.enabled && !ctx.isAdmin)
    return <div className="rounded-lg border bg-card p-6 text-sm">{"ABHI IDEAS is currently not available. Please check back later."}</div>;
  const back = view !== "home" && (
    <Link to="/ideas" search={{}} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> ABHI IDEAS home
    </Link>
  );
  return (
    <div className="space-y-4">
      {back}
      {view === "home" && <Landing ctx={ctx} />}
      {view === "submit" && <SubmitForm ctx={ctx} />}
      {view === "mine" && <MyIdeas />}
      {view === "explore" && <Explore />}
      {view === "leaderboard" && <Leaderboard />}
      {view === "review" && (id ? <IdeaReview id={id} /> : <ReviewerList />)}
    </div>
  );
}

type Ctx = Awaited<ReturnType<typeof getIdeasContext>>;

function Landing({ ctx }: { ctx: Ctx }) {
  const cards = [
    { view: "submit", icon: Plus, title: "Submit an Idea", text: "Create a new idea in under 3 minutes." },
    { view: "mine", icon: ListChecks, title: "My Ideas", text: "Track your ideas and their current status." },
    ...(ctx.settings.explore_enabled
      ? [{ view: "explore", icon: Compass, title: "Explore Ideas", text: "See selected ideas and their implementation status." }]
      : []),
    ...(ctx.settings.leaderboard_enabled
      ? [{ view: "leaderboard", icon: Trophy, title: "Ideas Leaderboard", text: "Top innovators across ABHI." }]
      : []),
    ...(ctx.isReviewer
      ? [{ view: "review", icon: ClipboardCheck, title: "Ideas to Review", text: "Ideas assigned to you for assessment." }]
      : []),
  ] as const;
  return (
    <>
      <section className="overflow-hidden rounded-xl bg-sidebar p-6 text-sidebar-foreground sm:p-8">
        <div className="flex items-center gap-2 text-primary">
          <Lightbulb className="size-6" />
          <span className="font-display text-sm font-semibold tracking-widest">ABHI IDEAS</span>
        </div>
        <h2 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">{"Your idea can make ABHI better."}</h2>
        <p className="mt-2 max-w-2xl text-sm text-sidebar-foreground/75">
          {"Share an idea to improve our customers' experience, simplify our processes, reduce costs, strengthen controls, enable our people, or create new opportunities."}
        </p>
        <Button asChild className="mt-5">
          <Link to="/ideas" search={{ view: "submit" }}>
            <Plus className="size-4" /> Submit an Idea
          </Link>
        </Button>
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.view}
            to="/ideas"
            search={{ view: c.view as "home" }}
            className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary"
          >
            <c.icon className="size-6 text-primary" />
            <h3 className="mt-3 font-display font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary"
      }`}
    >
      {children}
    </button>
  );
}

function SubmitForm({ ctx }: { ctx: Ctx }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const opts = (k: IdeaOption["kind"]) =>
    (ctx.options as IdeaOption[]).filter((o) => o.kind === k && o.status === "active");
  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    category_id: "",
    type_id: "",
    title: "",
    problem: "",
    solution: "",
    benefit_ids: [] as string[],
    beneficiary_ids: [] as string[],
    expected_impact: "" as string,
    implement_scope: null as string | null,
    complexity: null as string | null,
    is_anonymous: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [similar, setSimilar] = useState<Awaited<ReturnType<typeof findSimilarIdeas>> | null>(null);
  const [done, setDone] = useState<{ id: string; ref_no: string | null } | null>(null);
  const toggle = (k: "benefit_ids" | "beneficiary_ids", id: string) =>
    setF((p) => ({ ...p, [k]: p[k].includes(id) ? p[k].filter((x) => x !== id) : [...p[k], id] }));

  const step1ok = f.category_id && f.type_id && f.title.trim().length >= 5 && f.problem.trim().length >= 10 && f.solution.trim().length >= 10;
  const step2ok = f.expected_impact && f.benefit_ids.length > 0;

  const goStep2 = async () => {
    if (!step1ok) {
      toast.error("Please choose a category and type, and fill in the title, problem and solution.");
      return;
    }
    setStep(2);
    try {
      setSimilar(await findSimilarIdeas({ data: { title: f.title, problem: f.problem, solution: f.solution } }));
    } catch {
      setSimilar([]);
    }
  };

  const submit = useMutation({
    mutationFn: async () => {
      let attachment = null;
      if (file) attachment = { name: file.name, type: file.type, base64: await fileToBase64(file) };
      return submitIdea({
        data: {
          ...f,
          expected_impact: f.expected_impact as (typeof IMPACT_LEVELS)[number],
          implement_scope: f.implement_scope as (typeof SCOPES)[number] | null,
          complexity: f.complexity as (typeof COMPLEXITIES)[number] | null,
          attachment,
        },
      });
    },
    onSuccess: (r) => {
      setDone(r);
      qc.invalidateQueries({ queryKey: ["my-ideas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (done)
    return (
      <div className="mx-auto max-w-xl rounded-xl border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h2 className="mt-3 font-display text-2xl font-semibold">Idea Submitted Successfully!</h2>
        <p className="mt-2 text-sm text-muted-foreground">{"Thank you for sharing your idea with ABHI. Your idea has been submitted for review."}</p>
        <p className="mt-4 rounded-md bg-secondary px-4 py-3 font-mono text-lg font-semibold">Reference No: {done.ref_no}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => navigate({ to: "/ideas", search: { view: "mine" } })}>View My Idea</Button>
          <Button
            variant="outline"
            onClick={() => {
              setDone(null);
              setStep(1);
              setFile(null);
              setSimilar(null);
              setF({ ...f, title: "", problem: "", solution: "", benefit_ids: [], beneficiary_ids: [], expected_impact: "" });
            }}
          >
            Submit Another Idea
          </Button>
          <Button variant="ghost" onClick={() => navigate({ to: "/leaderboard" })}>
            Back to ABHI Learning HUB
          </Button>
        </div>
      </div>
    );

  const steps = ["Basic Idea", "Benefits", "Optional Details"];
  return (
    <div className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="mb-5 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          {steps.map((s, i) => (
            <span key={s} className={i + 1 <= step ? "font-semibold text-foreground" : ""}>
              {i + 1}. {s}
            </span>
          ))}
        </div>
        <Progress value={(step / 3) * 100} />
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <Label>Idea category *</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {opts("category").map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.description ?? ""}
                  onClick={() => setF({ ...f, category_id: c.id })}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    f.category_id === c.id ? "border-primary bg-primary/10" : "hover:border-primary"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {c.code ? `${c.code}. ` : ""}
                    {c.name}
                  </p>
                  {c.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Idea type *</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {opts("type").map((t) => (
                <Chip key={t.id} active={f.type_id === t.id} onClick={() => setF({ ...f, type_id: t.id })}>
                  {t.name}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <Label>Idea title *</Label>
            <Input
              maxLength={200}
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
              placeholder="e.g. Digitize Branch Customer Feedback Collection"
            />
          </div>
          <div>
            <Label>{"What problem are you trying to solve or what opportunity do you see? *"}</Label>
            <Textarea rows={4} maxLength={5000} value={f.problem} onChange={(e) => setF({ ...f, problem: e.target.value })} />
          </div>
          <div>
            <Label>{"What is your proposed idea or solution? *"}</Label>
            <Textarea rows={4} maxLength={5000} value={f.solution} onChange={(e) => setF({ ...f, solution: e.target.value })} />
          </div>
          <div className="flex justify-end">
            <Button onClick={goStep2}>Next: Benefits</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          {similar && similar.length > 0 && (
            <div className="rounded-lg border border-primary bg-primary/10 p-4">
              <p className="text-sm font-semibold">{"We found similar ideas already submitted."}</p>
              <p className="text-xs text-muted-foreground">{"You can still continue — your idea will be submitted as usual."}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {similar.map((s, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{s.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.category} · {new Date(s.submitted_at).toLocaleDateString()}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusTone(s.status)}`}>{s.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <Label>Expected benefit * (choose all that apply)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {opts("benefit").map((b) => (
                <Chip key={b.id} active={f.benefit_ids.includes(b.id)} onClick={() => toggle("benefit_ids", b.id)}>
                  {b.name}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <Label>Expected impact *</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {IMPACT_LEVELS.map((l) => (
                <Chip key={l} active={f.expected_impact === l} onClick={() => setF({ ...f, expected_impact: l })}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <Label>Who will benefit?</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {opts("beneficiary").map((b) => (
                <Chip key={b.id} active={f.beneficiary_ids.includes(b.id)} onClick={() => toggle("beneficiary_ids", b.id)}>
                  {b.name}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => (step2ok ? setStep(3) : toast.error("Choose at least one benefit and the expected impact."))}>
              Next: Optional Details
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <Label>Where can the idea be implemented?</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SCOPES.map((s) => (
                <Chip key={s} active={f.implement_scope === s} onClick={() => setF({ ...f, implement_scope: f.implement_scope === s ? null : s })}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <Label>Estimated implementation complexity</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {COMPLEXITIES.map((s) => (
                <Chip key={s} active={f.complexity === s} onClick={() => setF({ ...f, complexity: f.complexity === s ? null : s })}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <Label>Attachment (optional — PDF, Word, Excel, PowerPoint or image, max 10 MB)</Label>
            <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-sm hover:border-primary">
              <Paperclip className="size-4" />
              {file ? file.name : "Choose a file"}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.txt"
                onChange={(e) => {
                  const fl = e.target.files?.[0] ?? null;
                  if (fl && (!ALLOWED_ATTACHMENT.test(fl.name) || fl.size > MAX_ATTACHMENT_BYTES)) {
                    toast.error("Please choose an allowed file up to 10 MB.");
                    return;
                  }
                  setFile(fl);
                }}
              />
            </label>
          </div>
          {ctx.settings.allow_anonymous && (
            <div className="flex items-center gap-3 rounded-md bg-secondary p-3">
              <Switch checked={f.is_anonymous} onCheckedChange={(v) => setF({ ...f, is_anonymous: v })} />
              <div className="text-sm">
                <p className="font-medium">Submit anonymously</p>
                <p className="text-xs text-muted-foreground">{"Your name is hidden from reviewers and other employees; only authorised administrators can see it."}</p>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{"Your employee details (ID, name, designation, department, location, region, wing and line manager) are attached automatically from your profile."}</p>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button disabled={submit.isPending} onClick={() => submit.mutate()}>
              {submit.isPending ? "Submitting…" : "Submit Idea"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MyIdeas() {
  const { data = [], isLoading } = useQuery({ queryKey: ["my-ideas"], queryFn: () => listMyIdeas() });
  const count = (fn: (s: string) => boolean) => data.filter((i) => fn(i.status)).length;
  const kpis = [
    ["Total Ideas", data.length],
    ["Under Review", count((s) => s === "Submitted" || s.startsWith("Under"))],
    ["Shortlisted", count((s) => ["Shortlisted", "Pilot / Proof of Concept", "Approved for Implementation", "Implementation in Progress"].includes(s))],
    ["Implemented", count((s) => s === "Implemented")],
    ["Not Pursued", count((s) => s === "Not Pursued")],
  ] as const;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {kpis.map(([l, v]) => (
          <div key={l} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="font-display text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data.length ? (
        <div className="rounded-lg border bg-card p-6 text-center text-sm">
          {"You haven't submitted any ideas yet. "}
          <Link to="/ideas" search={{ view: "submit" }} className="font-semibold text-primary underline">
            Submit your first idea
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((i) => (
            <div key={i.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{i.ref_no}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusTone(i.status)}`}>{i.status}</span>
                {i.recognitions.map((r) => (
                  <span key={r} className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-semibold">
                    🏆 {r}
                  </span>
                ))}
              </div>
              <h3 className="mt-1 font-semibold">{i.title}</h3>
              <p className="text-xs text-muted-foreground">
                {i.category} · {new Date(i.submitted_at).toLocaleDateString()}
              </p>
              {i.latest_comment && (
                <p className="mt-2 rounded-md bg-secondary p-2 text-sm">
                  <span className="text-xs font-semibold">{i.latest_comment.author_name ?? "Reviewer"}: </span>
                  {i.latest_comment.body}
                </p>
              )}
              {i.implementation && (i.implementation.status || i.implementation.notes) && (
                <p className="mt-2 text-sm">
                  <span className="text-xs font-semibold">Implementation outcome: </span>
                  {[i.implementation.status, i.implementation.notes].filter(Boolean).join(" — ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Explore() {
  const { data = [], isLoading } = useQuery({ queryKey: ["explore-ideas"], queryFn: () => listExploreIdeas() });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data.length) return <p className="rounded-lg border bg-card p-6 text-sm">No ideas have been shared publicly yet.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {data.map((i) => (
        <div key={i.id} className="rounded-lg border bg-card p-4">
          <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusTone(i.status)}`}>{i.status}</span>
          <h3 className="mt-2 font-semibold">{i.title}</h3>
          <p className="text-xs text-muted-foreground">
            {i.category} · {i.by}
            {i.department ? ` · ${i.department}` : ""}
          </p>
          <p className="mt-2 line-clamp-3 text-sm">{i.solution}</p>
        </div>
      ))}
    </div>
  );
}

function Leaderboard() {
  const { data = [] } = useQuery({ queryKey: ["ideas-leaderboard"], queryFn: () => getIdeasLeaderboard() });
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 font-display font-semibold">Ideas Leaderboard</h3>
      <p className="mb-3 text-xs text-muted-foreground">{"Points: 1 per idea, +3 when shortlisted or in progress, +10 when implemented, +5 per recognition."}</p>
      {!data.length ? (
        <p className="text-sm text-muted-foreground">No entries yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2">#</th>
              <th>Name</th>
              <th>Department</th>
              <th>Ideas</th>
              <th>Implemented</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2">{i + 1}</td>
                <td className="font-medium">{r.name}</td>
                <td>{r.department ?? "—"}</td>
                <td>{r.ideas}</td>
                <td>{r.implemented}</td>
                <td className="font-semibold">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ReviewerList() {
  const { data = [], isLoading } = useQuery({ queryKey: ["ideas-assigned"], queryFn: () => listAllIdeas() });
  const rows = useMemo(() => data, [data]);
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!rows.length) return <p className="rounded-lg border bg-card p-6 text-sm">No ideas are assigned to you right now.</p>;
  return (
    <div className="space-y-2">
      {rows.map((i) => (
        <Link key={i.id} to="/ideas" search={{ view: "review", id: i.id }} className="block rounded-lg border bg-card p-4 hover:border-primary">
          <span className="font-mono text-xs text-muted-foreground">{i.ref_no}</span>{" "}
          <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusTone(i.status)}`}>{i.status}</span>
          <p className="font-semibold">{i.title}</p>
          <p className="text-xs text-muted-foreground">{i.category}</p>
        </Link>
      ))}
    </div>
  );
}
