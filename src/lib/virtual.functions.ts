import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type VirtualContent = { id: string; title: string; kind: "pdf" | "video"; completed: boolean };
export type VirtualProgress = {
  session: { id: string; title: string; description: string | null; training_id: string; training_name: string; require_all_content: boolean };
  content: VirtualContent[];
  pre: { done: boolean; score: number | null };
  post: { done: boolean; passed: boolean; score: number | null; attempts: number; attemptsLeft: number; needsReview: boolean };
  feedbackDone: boolean;
  certificate: Certificate | null;
};
export type Certificate = {
  cert_no: string; employee_code: string; employee_name: string; designation_name: string | null;
  training_name: string; certificate_title: string; signatory_name: string | null;
  signatory_designation: string | null; score_pct: number | null; issued_at: string;
};

async function assigned(employeeCode: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("training_participants").select("training_id").ilike("employee_code", employeeCode.trim());
  return new Set((data ?? []).map((r) => r.training_id));
}

async function loadProgress(userId: string, sessionId: string): Promise<VirtualProgress> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { requirePortalEmployee } = await import("@/lib/portal-identity.server");
  const me = await requirePortalEmployee(userId);
  const { data: s } = await supabaseAdmin
    .from("virtual_sessions").select("id,title,description,training_id,require_all_content,status,trainings(training_name)")
    .eq("id", sessionId).maybeSingle();
  if (!s || s.status !== "active") throw new Error("This virtual session is not available.");
  if (!(await assigned(me.employee_code)).has(s.training_id)) throw new Error("This session is not assigned to you.");

  const [content, views, attempts, fb, cert] = await Promise.all([
    supabaseAdmin.from("virtual_session_content").select("id,title,kind").eq("session_id", s.id).order("display_order"),
    supabaseAdmin.from("virtual_content_views").select("content_id,completed").eq("user_id", userId),
    supabaseAdmin.from("evaluation_attempts").select("phase,score_pct,passed,submitted_at").eq("training_id", s.training_id).ilike("employee_code", me.employee_code.trim()).order("submitted_at", { ascending: false }),
    supabaseAdmin.from("feedback").select("id").eq("training_id", s.training_id).ilike("employee_code", me.employee_code.trim()).limit(1),
    supabaseAdmin.from("certificates").select("*").eq("user_id", userId).eq("session_id", s.id).eq("revoked", false).maybeSingle(),
  ]);
  const { getRetakeState } = await import("@/lib/virtual-retake.server");
  const rs = await getRetakeState(s.training_id, me.employee_code, userId);
  // While a review is required, only content re-viewed after the last attempt counts as done.
  const done = rs.needsReview ? rs.reviewedIds : new Set((views.data ?? []).filter((v) => v.completed).map((v) => v.content_id));
  const pre = (attempts.data ?? []).find((a) => a.phase === "pre");
  const posts = (attempts.data ?? []).filter((a) => a.phase === "post");
  const bestPost = posts.find((a) => a.passed) ?? posts[0];
  return {
    session: { id: s.id, title: s.title, description: s.description, training_id: s.training_id, require_all_content: s.require_all_content,
      training_name: (s.trainings as { training_name: string } | null)?.training_name ?? s.title },
    content: (content.data ?? []).map((c) => ({ id: c.id, title: c.title, kind: c.kind as "pdf" | "video", completed: done.has(c.id) })),
    pre: { done: Boolean(pre), score: pre ? Number(pre.score_pct) : null },
    post: { done: Boolean(bestPost), passed: Boolean(bestPost?.passed), score: bestPost ? Number(bestPost.score_pct) : null,
      attempts: rs.attempts, attemptsLeft: rs.attemptsLeft, needsReview: rs.needsReview },
    feedbackDone: Boolean(fb.data?.length),
    certificate: (cert.data as Certificate | null) ?? null,
  };
}

export const listMyVirtualSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requirePortalEmployee } = await import("@/lib/portal-identity.server");
    const me = await requirePortalEmployee(context.userId);
    const ids = [...(await assigned(me.employee_code))];
    if (!ids.length) return [];
    const { data } = await supabaseAdmin.from("virtual_sessions").select("id,title,description,training_id").eq("status", "active").in("training_id", ids).order("created_at", { ascending: false });
    const { data: certs } = await supabaseAdmin.from("certificates").select("session_id").eq("user_id", context.userId).eq("revoked", false);
    const got = new Set((certs ?? []).map((c) => c.session_id));
    return (data ?? []).map((s) => ({ ...s, completed: got.has(s.id) }));
  });

export const getVirtualProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => loadProgress(context.userId, data.sessionId));

export const getContentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sessionId: z.string().uuid(), contentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const p = await loadProgress(context.userId, data.sessionId);
    if (!p.pre.done) throw new Error("Please complete the pre-test first.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin.from("virtual_session_content").select("storage_path,session_id").eq("id", data.contentId).maybeSingle();
    if (!c || c.session_id !== data.sessionId) throw new Error("Content not found.");
    const { data: signed, error } = await supabaseAdmin.storage.from("virtual-content").createSignedUrl(c.storage_path, 60 * 60 * 2);
    if (error || !signed) throw new Error("Unable to open this content.");
    return { url: signed.signedUrl };
  });

export const markContentViewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sessionId: z.string().uuid(), contentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const p = await loadProgress(context.userId, data.sessionId);
    if (!p.content.some((c) => c.id === data.contentId)) throw new Error("Content not found.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("portal_users").select("employee_code").eq("id", context.userId).maybeSingle();
    await supabaseAdmin.from("virtual_content_views").upsert({
      user_id: context.userId, content_id: data.contentId, employee_code: me?.employee_code ?? null, completed: true, updated_at: new Date().toISOString(),
    });
    return { ok: true };
  });

/** Issues the certificate only when the post-test is passed and feedback is submitted. */
export const claimCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<Certificate> => {
    const p = await loadProgress(context.userId, data.sessionId);
    if (p.certificate) return p.certificate;
    if (!p.post.passed) throw new Error("You need to pass the post-test to earn the certificate.");
    if (!p.feedbackDone) throw new Error("Please submit your feedback first.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("portal_users").select("employee_code,name,designation_name").eq("id", context.userId).single();
    const { data: s } = await supabaseAdmin.from("virtual_sessions").select("certificate_title,signatory_name,signatory_designation").eq("id", data.sessionId).single();
    const { data: cert, error } = await supabaseAdmin.from("certificates").insert({
      user_id: context.userId, session_id: data.sessionId, training_id: p.session.training_id,
      employee_code: me!.employee_code, employee_name: me!.name, designation_name: me!.designation_name,
      training_name: p.session.training_name, certificate_title: s!.certificate_title,
      signatory_name: s!.signatory_name, signatory_designation: s!.signatory_designation, score_pct: p.post.score,
    }).select("*").single();
    if (error || !cert) throw new Error("Unable to issue the certificate. Please try again.");
    await supabaseAdmin.rpc("notify_user", { _user_id: context.userId, _kind: "certificate", _title: "Certificate earned 🎓",
      _body: `Your certificate for ${p.session.training_name} is ready.`, _link: `/virtual/${data.sessionId}` });
    return cert as Certificate;
  });

export const listMyCertificates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("certificates").select("*").eq("user_id", context.userId).eq("revoked", false).order("issued_at", { ascending: false });
    return (data ?? []) as Certificate[];
  });

/** Public certificate check — returns only what's printed on the certificate. */
export const verifyCertificate = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ certNo: z.string().max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin.from("certificates")
      .select("cert_no,employee_name,training_name,certificate_title,issued_at,revoked").eq("cert_no", data.certNo.toUpperCase()).maybeSingle();
    return c ?? null;
  });
