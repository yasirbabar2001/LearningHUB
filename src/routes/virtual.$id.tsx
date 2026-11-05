import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, FileText, PlayCircle, Lock } from "lucide-react";
import { EmployeeShell } from "@/components/employee/EmployeeShell";
import { PortalGate } from "@/components/PortalGate";
import { Button } from "@/components/ui/button";
import { claimCertificate, getContentUrl, getVirtualProgress, markContentViewed, type Certificate } from "@/lib/virtual.functions";
import { CertificateActions, CertificateDialog } from "@/components/virtual/CertificateDialog";
import { ContentViewer } from "@/components/virtual/ContentViewer";

export const Route = createFileRoute("/virtual/$id")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { step?: string } => (typeof s["step"] === "string" ? { step: s["step"] } : {}),
  head: () => ({
    meta: [
      { title: "Virtual Session | ABHI Learning HUB" },
      { name: "description", content: "Work through your virtual training step by step." },
      { property: "og:title", content: "Virtual Session | ABHI Learning HUB" },
      { property: "og:description", content: "Pre-test, content, post-test, feedback and certificate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PortalGate>{() => <Player />}</PortalGate>,
});

function Player() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["virtual", id], queryFn: () => getVirtualProgress({ data: { sessionId: id } }), refetchOnWindowFocus: true });
  const [open, setOpen] = useState<{ id: string; kind: string; url: string } | null>(null);
  const [cert, setCert] = useState<Certificate | null>(null);
  const p = q.data;
  const { step } = Route.useSearch();
  const [autoDone, setAutoDone] = useState(false);

  const allViewed = p ? p.content.every((c) => c.completed) : false;
  const learnDone = p ? (p.post.needsReview ? allViewed : (!p.session.require_all_content || allViewed)) : false;

  useEffect(() => {
    if (p && p.post.passed && p.feedbackDone && !p.certificate) {
      claimCertificate({ data: { sessionId: id } })
        .then((c) => { setCert(c); void qc.invalidateQueries({ queryKey: ["virtual", id] }); })
        .catch((e: Error) => toast.error(e.message));
    }
  }, [p, id, qc]);

  useEffect(() => {
    if (!p || autoDone || !step) return;
    setAutoDone(true);
    document.getElementById(`step-${step}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (step === "learn" && p.pre.done) {
      const next = p.content.find((c) => !c.completed) ?? p.content[0];
      if (next) {
        getContentUrl({ data: { sessionId: id, contentId: next.id } })
          .then(({ url }) => setOpen({ id: next.id, kind: next.kind, url }))
          .catch(() => {});
      }
    }
  }, [p, step, autoDone, id]);

  if (q.isLoading) return <EmployeeShell title="Virtual Sessions" subtitle="Learn, test and earn your certificate"><p className="p-8 text-sm text-muted-foreground">Loading…</p></EmployeeShell>;
  if (q.error || !p) return <EmployeeShell title="Virtual Sessions" subtitle="Learn, test and earn your certificate"><p className="p-8 text-sm text-destructive">{(q.error as Error)?.message}</p></EmployeeShell>;

  const openContent = async (cid: string, kind: string) => {
    try {
      const { url } = await getContentUrl({ data: { sessionId: id, contentId: cid } });
      setOpen({ id: cid, kind, url });
    } catch (e) { toast.error((e as Error).message); }
  };
  const markDone = async (cid: string) => {
    await markContentViewed({ data: { sessionId: id, contentId: cid } });
    await qc.invalidateQueries({ queryKey: ["virtual", id] });
    const next = p.content.find((c) => !c.completed && c.id !== cid);
    if (next) void openContent(next.id, next.kind);
    else { setOpen(null); toast.success("Learning complete — on to the post-test!"); document.getElementById("step-post")?.scrollIntoView({ behavior: "smooth" }); }
  };
  const tid = p.session.training_id;

  const steps = [
    { n: 1, label: "Pre-test", done: p.pre.done, unlocked: true },
    { n: 2, label: "Learn", done: p.pre.done && learnDone, unlocked: p.pre.done },
    { n: 3, label: "Post-test", done: p.post.passed, unlocked: p.pre.done && learnDone },
    { n: 4, label: "Feedback", done: p.feedbackDone, unlocked: p.post.passed },
    { n: 5, label: "Certificate", done: Boolean(p.certificate), unlocked: p.post.passed && p.feedbackDone },
  ];

  return (
    <EmployeeShell title="Virtual Sessions" subtitle="Learn, test and earn your certificate">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <div>
          <Link to="/virtual" className="text-xs underline">← Virtual Sessions</Link>
          <h1 className="mt-1 text-2xl font-bold">{p.session.title}</h1>
          {p.session.description && <p className="text-sm text-muted-foreground">{p.session.description}</p>}
        </div>

        <ol className="grid grid-cols-5 gap-2">
          {steps.map((s) => (
            <li key={s.n} className={`rounded-md border p-2 text-center text-xs ${s.done ? "border-primary bg-primary/15" : s.unlocked ? "bg-card" : "bg-muted text-muted-foreground"}`}>
              <div className="mx-auto mb-1 w-fit">{s.done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : s.unlocked ? <Circle className="h-4 w-4" /> : <Lock className="h-4 w-4" />}</div>
              {s.n}. {s.label}
            </li>
          ))}
        </ol>

        <Section anchor="pre" title="1. Pre-test" done={p.pre.done}>
          {p.pre.done ? <p className="text-sm">Completed — score {Math.round(p.pre.score ?? 0)}%.</p> : (
            <Button asChild><Link to="/evaluation" search={{ training: tid, session: id }}>Start pre-test</Link></Button>
          )}
        </Section>

        <Section anchor="learn" title="2. Learn" done={p.pre.done && learnDone} locked={!p.pre.done}>
          {p.content.length === 0 && <p className="text-sm text-muted-foreground">No content added yet.</p>}
          <ul className="space-y-2">
            {p.content.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-md border p-3">
                {c.kind === "pdf" ? <FileText className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
                <span className="flex-1 text-sm font-medium">{c.title}</span>
                {c.completed && <CheckCircle2 className="h-4 w-4 text-primary" />}
                <Button size="sm" variant="outline" onClick={() => void openContent(c.id, c.kind)}>Open</Button>
              </li>
            ))}
          </ul>
          {open && (
            <div className="mt-4">
              <ContentViewer key={open.url} kind={open.kind} url={open.url} onComplete={() => void markDone(open.id)} />
            </div>
          )}
          {p.post.needsReview && <p className="mt-3 text-sm text-destructive">You've used all 3 post-test attempts. Review every item above again to unlock 3 new attempts.</p>}
          {learnDone && p.content.length > 0 && !p.post.passed && (
            <Button asChild className="mt-4"><Link to="/evaluation" search={{ training: tid, session: id }}>Let's go to the post-test →</Link></Button>
          )}
        </Section>

        <Section anchor="post" title="3. Post-test" done={p.post.passed} locked={!(p.pre.done && learnDone)}>
          {p.post.passed ? <p className="text-sm">Passed — score {Math.round(p.post.score ?? 0)}%.</p> : (
            <>
              {p.post.done && <p className="mb-2 text-sm text-destructive">Not passed yet (last score {Math.round(p.post.score ?? 0)}%). Attempts so far: {p.post.attempts}.</p>}
              {p.post.needsReview
                ? <p className="text-sm text-muted-foreground">All 3 attempts used. Please review the learning content again to unlock 3 new attempts.</p>
                : <Button asChild><Link to="/evaluation" search={{ training: tid, session: id }}>{p.post.done ? `Retake post-test (${p.post.attemptsLeft} attempt${p.post.attemptsLeft === 1 ? "" : "s"} left)` : "Start post-test"}</Link></Button>}
            </>
          )}
        </Section>

        <Section anchor="feedback" title="4. Feedback" done={p.feedbackDone} locked={!p.post.passed}>
          {p.feedbackDone ? <p className="text-sm">Thank you — feedback submitted.</p> : (
            <Button asChild><Link to="/participant-feedback" search={{ training: tid, session: id }}>Give feedback</Link></Button>
          )}
        </Section>

        <Section anchor="certificate" title="5. Certificate" done={Boolean(p.certificate)} locked={!(p.post.passed && p.feedbackDone)}>
          {p.certificate ? <CertificateActions cert={p.certificate} /> : <p className="text-sm text-muted-foreground">Preparing your certificate…</p>}
        </Section>
      </div>
      <CertificateDialog cert={cert} open={Boolean(cert)} onOpenChange={(o) => !o && setCert(null)} />
    </EmployeeShell>
  );
}

function Section({ anchor, title, done, locked, children }: { anchor: string; title: string; done: boolean; locked?: boolean; children: React.ReactNode }) {
  return (
    <section id={`step-${anchor}`} className={`scroll-mt-20 rounded-lg border bg-card p-5 ${locked ? "opacity-60" : ""}`}>
      <h2 className="mb-3 flex items-center gap-2 font-semibold">{done && <CheckCircle2 className="h-4 w-4 text-primary" />}{title}{locked && <Lock className="h-4 w-4" />}</h2>
      {locked ? <p className="text-sm text-muted-foreground">Complete the previous step to unlock.</p> : children}
    </section>
  );
}
