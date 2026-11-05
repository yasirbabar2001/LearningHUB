import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_IDEAS_SETTINGS, IDEA_STATUSES, type IdeasSettings } from "./ideas-shared";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function roles(userId: string) {
  const db = await admin();
  const [{ data: r }, { data: rv }] = await Promise.all([
    db.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
    db.from("idea_reviewers").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);
  return { isAdmin: Boolean(r), isReviewer: Boolean(rv) };
}

async function requireAdmin(userId: string) {
  const r = await roles(userId);
  if (!r.isAdmin) throw new Error("Only admins can do this.");
}

async function loadSettings(): Promise<IdeasSettings> {
  const db = await admin();
  const { data } = await db.from("app_settings").select("value").eq("key", "ideas_settings").maybeSingle();
  return { ...DEFAULT_IDEAS_SETTINGS, ...((data?.value as Partial<IdeasSettings>) ?? {}) };
}

async function actorName(userId: string) {
  const db = await admin();
  const { data } = await db.from("portal_users").select("name").eq("id", userId).maybeSingle();
  if (data?.name) return data.name;
  const { data: p } = await db.from("profiles").select("full_name,email").eq("id", userId).maybeSingle();
  return p?.full_name ?? p?.email ?? "Admin";
}

async function audit(
  ideaId: string | null,
  actorId: string,
  action: string,
  field?: string | null,
  oldValue?: unknown,
  newValue?: unknown,
  comment?: string | null,
) {
  const db = await admin();
  const s = (v: unknown) => (v === undefined || v === null ? null : typeof v === "string" ? v : JSON.stringify(v));
  await db.from("idea_audit").insert({
    idea_id: ideaId,
    actor_id: actorId,
    actor_name: await actorName(actorId),
    action,
    field: field ?? null,
    old_value: s(oldValue),
    new_value: s(newValue),
    comment: comment ?? null,
  });
}

async function notify(userId: string | null | undefined, title: string, body: string, link = "/ideas") {
  if (!userId) return;
  const db = await admin();
  await db.rpc("notify_user", { _user_id: userId, _kind: "idea", _title: title, _body: body, _link: link });
}

const STOP = new Set(
  "the a an and or of to in for on with by from is are be at as it this that we our can should will into more less use using make".split(" "),
);
function tokens(s: string) {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
      .map((w) => w.replace(/(ing|ed|es|s)$/, "")),
  );
}
function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let i = 0;
  a.forEach((x) => b.has(x) && i++);
  return i / (a.size + b.size - i);
}

/* ---------------- Context & settings ---------------- */

export const getIdeasContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const [settings, r, { data: options }] = await Promise.all([
      loadSettings(),
      roles(context.userId),
      db.from("idea_options").select("*").order("sort_order"),
    ]);
    return { settings, ...r, options: options ?? [] };
  });

export const saveIdeasSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        enabled: z.boolean(),
        allow_anonymous: z.boolean(),
        explore_enabled: z.boolean(),
        leaderboard_enabled: z.boolean(),
        show_comments_to_employee: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await admin();
    const old = await loadSettings();
    await db.from("app_settings").upsert({ key: "ideas_settings", value: data, updated_at: new Date().toISOString() });
    await audit(null, context.userId, "settings_changed", "ideas_settings", old, data);
    return { ok: true };
  });

export const saveIdeaOption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        kind: z.enum(["category", "type", "benefit", "beneficiary", "recognition"]),
        name: z.string().trim().min(2).max(120),
        description: z.string().trim().max(500).nullable().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await admin();
    if (data.id) {
      const { data: old } = await db.from("idea_options").select("*").eq("id", data.id).maybeSingle();
      const { error } = await db
        .from("idea_options")
        .update({ name: data.name, description: data.description ?? null, status: data.status ?? old?.status ?? "active" })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      await audit(null, context.userId, "option_updated", data.kind, old, data);
    } else {
      const { count } = await db.from("idea_options").select("id", { count: "exact", head: true }).eq("kind", data.kind);
      const { error } = await db.from("idea_options").insert({
        kind: data.kind,
        name: data.name,
        description: data.description ?? null,
        sort_order: (count ?? 0) + 1,
      });
      if (error) throw new Error(error.code === "23505" ? "That value already exists." : error.message);
      await audit(null, context.userId, "option_added", data.kind, null, data.name);
    }
    return { ok: true };
  });

export const setIdeaReviewer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ employeeCode: z.string().trim().min(1).max(40), add: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await admin();
    const { data: pu } = await db
      .from("portal_users")
      .select("id,name,employee_code")
      .ilike("employee_code", data.employeeCode)
      .maybeSingle();
    if (!pu) throw new Error("No employee account found with that ID.");
    if (data.add) {
      await db.from("idea_reviewers").upsert({ user_id: pu.id, employee_code: pu.employee_code, name: pu.name });
    } else {
      await db.from("idea_reviewers").delete().eq("user_id", pu.id);
    }
    await audit(null, context.userId, data.add ? "reviewer_added" : "reviewer_removed", "reviewer", null, pu.employee_code);
    return { ok: true };
  });

export const listIdeaReviewers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const db = await admin();
    const { data } = await db.from("idea_reviewers").select("*").order("name");
    return data ?? [];
  });

/* ---------------- Employee ---------------- */

export const findSimilarIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ title: z.string().max(300), problem: z.string().max(5000), solution: z.string().max(5000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const r0 = await roles(context.userId);
    let q = db
      .from("ideas")
      .select("id,ref_no,title,problem,solution,status,submitted_at,category_id");
    // Employees only compare against public ideas and their own; admins/reviewers see all.
    if (!r0.isAdmin && !r0.isReviewer) q = q.or(`is_public.eq.true,user_id.eq.${context.userId}`);
    const { data: rows } = await q
      .order("submitted_at", { ascending: false })
      .limit(2000);
    const { data: cats } = await db.from("idea_options").select("id,name").eq("kind", "category");
    const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
    const mine = tokens(`${data.title} ${data.title} ${data.problem} ${data.solution}`);
    return (rows ?? [])
      .map((r) => ({
        title: r.title,
        category: catName.get(r.category_id ?? "") ?? "—",
        submitted_at: r.submitted_at,
        status: r.status,
        score: jaccard(mine, tokens(`${r.title} ${r.title} ${r.problem} ${r.solution}`)),
      }))
      .filter((r) => r.score >= 0.18)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  });

const submitSchema = z.object({
  category_id: z.string().uuid(),
  type_id: z.string().uuid(),
  title: z.string().trim().min(5).max(200),
  problem: z.string().trim().min(10).max(5000),
  solution: z.string().trim().min(10).max(5000),
  benefit_ids: z.array(z.string().uuid()).max(20),
  beneficiary_ids: z.array(z.string().uuid()).max(20),
  expected_impact: z.enum(["Low", "Medium", "High", "Transformational"]),
  implement_scope: z.enum(["Branch", "Region", "Wing", "Head Office", "Bank-wide"]).nullable(),
  complexity: z.enum(["Easy", "Moderate", "Complex", "Not Sure"]).nullable(),
  is_anonymous: z.boolean(),
  attachment: z
    .object({ name: z.string().max(200), type: z.string().max(120), base64: z.string().max(14_500_000) })
    .nullable(),
});

export const submitIdea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => submitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const settings = await loadSettings();
    if (!settings.enabled) throw new Error("ABHI IDEAS is currently switched off.");
    const { requirePortalEmployee } = await import("@/lib/portal-identity.server");
    const me = await requirePortalEmployee(context.userId);
    const db = await admin();
    const { data: pu } = await db
      .from("portal_users")
      .select("designation_name,department_name,location_name,region_name,wing_name")
      .eq("id", me.id)
      .single();
    const { data: mgr } = await db
      .from("tna_staff")
      .select("manager_name,manager_code")
      .ilike("employee_code", me.employee_code)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let attachment_path: string | null = null;
    let attachment_name: string | null = null;
    if (data.attachment) {
      if (!/\.(pdf|docx?|xlsx?|csv|pptx?|png|jpe?g|webp|gif|txt)$/i.test(data.attachment.name))
        throw new Error("That file type is not allowed.");
      const bytes = Buffer.from(data.attachment.base64, "base64");
      if (bytes.length > 10 * 1024 * 1024) throw new Error("Attachment must be 10 MB or smaller.");
      const ext = data.attachment.name.split(".").pop();
      attachment_path = `${me.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await db.storage
        .from("idea-attachments")
        .upload(attachment_path, bytes, { contentType: data.attachment.type || "application/octet-stream" });
      if (upErr) throw new Error("Could not upload the attachment.");
      attachment_name = data.attachment.name;
    }

    const { data: row, error } = await db
      .from("ideas")
      .insert({
        user_id: me.id,
        is_anonymous: settings.allow_anonymous ? data.is_anonymous : false,
        employee_code: me.employee_code,
        employee_name: me.name,
        designation_name: pu?.designation_name ?? null,
        department_name: pu?.department_name ?? null,
        location_name: pu?.location_name ?? null,
        region_name: pu?.region_name ?? null,
        wing_name: pu?.wing_name ?? null,
        manager_name: mgr?.manager_name ?? null,
        category_id: data.category_id,
        type_id: data.type_id,
        title: data.title,
        problem: data.problem,
        solution: data.solution,
        benefit_ids: data.benefit_ids,
        beneficiary_ids: data.beneficiary_ids,
        expected_impact: data.expected_impact,
        implement_scope: data.implement_scope,
        complexity: data.complexity,
        attachment_path,
        attachment_name,
      })
      .select("id,ref_no")
      .single();
    if (error || !row) throw new Error("Could not submit your idea. Please try again.");
    await audit(row.id, context.userId, "created", "status", null, "Submitted");
    await notify(me.id, "Idea Submitted", `Your idea ${row.ref_no} has been submitted for review.`);
    const [{ data: admins }, { data: reviewers }] = await Promise.all([
      db.from("user_roles").select("user_id").eq("role", "admin"),
      db.from("idea_reviewers").select("user_id"),
    ]);
    const ids = new Set([...(admins ?? []), ...(reviewers ?? [])].map((x) => x.user_id));
    ids.delete(me.id);
    await Promise.all(
      [...ids].map((u) => notify(u, "New idea submitted", `${row.ref_no}: ${data.title}`, `/ideas-review/${row.id}`)),
    );
    return row;
  });

export const listMyIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const settings = await loadSettings();
    const { data: ideas } = await db
      .from("ideas")
      .select("id,ref_no,title,status,submitted_at,category_id,expected_impact")
      .eq("user_id", context.userId)
      .order("submitted_at", { ascending: false });
    const ids = (ideas ?? []).map((i) => i.id);
    if (!ids.length) return [];
    const [{ data: cats }, { data: comments }, { data: impl }, { data: rec }] = await Promise.all([
      db.from("idea_options").select("id,name").eq("kind", "category"),
      settings.show_comments_to_employee
        ? db
            .from("idea_comments")
            .select("idea_id,body,author_name,created_at")
            .in("idea_id", ids)
            .eq("is_internal", false)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as { idea_id: string; body: string; author_name: string | null; created_at: string }[] }),
      db.from("idea_implementations").select("idea_id,status,actual_benefit,notes").in("idea_id", ids),
      db.from("idea_recognitions").select("idea_id,recognition_name").in("idea_id", ids),
    ]);
    const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
    return (ideas ?? []).map((i) => ({
      ...i,
      category: catName.get(i.category_id ?? "") ?? "—",
      latest_comment: (comments ?? []).find((c) => c.idea_id === i.id) ?? null,
      implementation: (impl ?? []).find((x) => x.idea_id === i.id) ?? null,
      recognitions: (rec ?? []).filter((x) => x.idea_id === i.id).map((x) => x.recognition_name),
    }));
  });

export const listExploreIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const settings = await loadSettings();
    if (!settings.explore_enabled) return [];
    const db = await admin();
    const { data } = await db
      .from("ideas")
      .select("id,ref_no,title,solution,status,submitted_at,category_id,is_anonymous,employee_name,department_name")
      .eq("is_public", true)
      .order("submitted_at", { ascending: false })
      .limit(200);
    const { data: cats } = await db.from("idea_options").select("id,name").eq("kind", "category");
    const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
    return (data ?? []).map((i) => ({
      id: i.id,
      ref_no: i.ref_no,
      title: i.title,
      solution: i.solution,
      status: i.status,
      submitted_at: i.submitted_at,
      category: catName.get(i.category_id ?? "") ?? "—",
      by: i.is_anonymous ? "Anonymous" : i.employee_name,
      department: i.is_anonymous ? null : i.department_name,
    }));
  });

export const getIdeasLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const settings = await loadSettings();
    if (!settings.leaderboard_enabled) return [];
    const db = await admin();
    const { data } = await db.from("ideas").select("id,user_id,employee_name,department_name,status,is_anonymous").limit(10000);
    const { data: rec } = await db.from("idea_recognitions").select("idea_id");
    const recCount = new Map<string, number>();
    (rec ?? []).forEach((r) => recCount.set(r.idea_id, (recCount.get(r.idea_id) ?? 0) + 1));
    const score = new Map<string, { name: string; department: string | null; points: number; implemented: number; ideas: number }>();
    (data ?? []).forEach((i) => {
      if (i.is_anonymous) return;
      const s = score.get(i.user_id) ?? { name: i.employee_name ?? "", department: i.department_name, points: 0, implemented: 0, ideas: 0 };
      s.ideas += 1;
      s.points += 1;
      if (["Shortlisted", "Pilot / Proof of Concept", "Approved for Implementation", "Implementation in Progress"].includes(i.status)) s.points += 3;
      if (i.status === "Implemented") {
        s.points += 10;
        s.implemented += 1;
      }
      s.points += (recCount.get(i.id) ?? 0) * 5;
      score.set(i.user_id, s);
    });
    return [...score.values()].sort((a, b) => b.points - a.points).slice(0, 20);
  });

/* ---------------- Admin / reviewer ---------------- */

export const listAllIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await roles(context.userId);
    if (!r.isAdmin && !r.isReviewer) throw new Error("Not allowed.");
    const db = await admin();
    let q = db.from("ideas").select("*").order("submitted_at", { ascending: false }).limit(10000);
    if (!r.isAdmin) q = q.eq("assigned_reviewer", context.userId);
    const [{ data: ideas }, { data: opts }, { data: ass }, { data: impl }, { data: imp }] = await Promise.all([
      q,
      db.from("idea_options").select("id,name,kind"),
      db.from("idea_assessments").select("*"),
      db.from("idea_implementations").select("*"),
      db.from("idea_impacts").select("*"),
    ]);
    const name = new Map((opts ?? []).map((o) => [o.id, o.name]));
    return (ideas ?? []).map((i) => {
      const a = (ass ?? []).find((x) => x.idea_id === i.id);
      const m = (impl ?? []).find((x) => x.idea_id === i.id);
      const p = (imp ?? []).find((x) => x.idea_id === i.id);
      const masked = i.is_anonymous && !r.isAdmin;
      return {
        ...i,
        employee_code: masked ? null : i.employee_code,
        employee_name: masked ? "Anonymous" : i.employee_name,
        category: name.get(i.category_id ?? "") ?? "—",
        type: name.get(i.type_id ?? "") ?? "—",
        benefits: i.benefit_ids.map((b) => name.get(b)).filter(Boolean) as string[],
        beneficiaries: i.beneficiary_ids.map((b) => name.get(b)).filter(Boolean) as string[],
        final_impact: a?.final_impact ?? null,
        assessed_complexity: a?.complexity ?? null,
        financial_level: a?.financial ?? null,
        estimated_cost: a?.estimated_cost ?? null,
        estimated_saving: a?.estimated_saving ?? p?.est_annual_saving ?? null,
        estimated_revenue: a?.estimated_revenue ?? p?.est_revenue ?? null,
        actual_saving: p?.actual_annual_saving ?? null,
        actual_revenue: p?.actual_revenue ?? null,
        impl_status: m?.status ?? null,
        impl_owner: m?.owner ?? null,
      };
    });
  });

export const getIdeaDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const r = await roles(context.userId);
    const db = await admin();
    const { data: idea } = await db.from("ideas").select("*").eq("id", data.id).maybeSingle();
    if (!idea) throw new Error("Idea not found.");
    if (!r.isAdmin && !(r.isReviewer && idea.assigned_reviewer === context.userId)) throw new Error("Not allowed.");
    const [{ data: opts }, { data: assessment }, { data: comments }, { data: impl }, { data: impact }, { data: rec }, { data: log }, { data: reviewers }] =
      await Promise.all([
        db.from("idea_options").select("id,name"),
        db.from("idea_assessments").select("*").eq("idea_id", data.id).maybeSingle(),
        db.from("idea_comments").select("*").eq("idea_id", data.id).order("created_at", { ascending: false }),
        db.from("idea_implementations").select("*").eq("idea_id", data.id).maybeSingle(),
        db.from("idea_impacts").select("*").eq("idea_id", data.id).maybeSingle(),
        db.from("idea_recognitions").select("*").eq("idea_id", data.id).order("created_at", { ascending: false }),
        db.from("idea_audit").select("*").eq("idea_id", data.id).order("created_at", { ascending: false }),
        db.from("idea_reviewers").select("user_id,name,employee_code").order("name"),
      ]);
    const name = new Map((opts ?? []).map((o) => [o.id, o.name]));
    let attachmentUrl: string | null = null;
    if (idea.attachment_path) {
      const { data: s } = await db.storage.from("idea-attachments").createSignedUrl(idea.attachment_path, 3600);
      attachmentUrl = s?.signedUrl ?? null;
    }
    const masked = idea.is_anonymous && !r.isAdmin;
    return {
      role: r,
      idea: {
        ...idea,
        employee_code: masked ? null : idea.employee_code,
        employee_name: masked ? "Anonymous" : idea.employee_name,
        category: name.get(idea.category_id ?? "") ?? "—",
        type: name.get(idea.type_id ?? "") ?? "—",
        benefits: idea.benefit_ids.map((b) => name.get(b)).filter(Boolean) as string[],
        beneficiaries: idea.beneficiary_ids.map((b) => name.get(b)).filter(Boolean) as string[],
      },
      attachmentUrl,
      assessment,
      comments: comments ?? [],
      implementation: impl,
      impact,
      recognitions: rec ?? [],
      audit: r.isAdmin ? (log ?? []) : [],
      reviewers: r.isAdmin ? (reviewers ?? []) : [],
    };
  });

export const updateIdeaAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(IDEA_STATUSES).optional(),
        comment: z.string().trim().max(2000).optional(),
        assigned_function: z.string().trim().max(160).nullable().optional(),
        assigned_owner: z.string().trim().max(160).nullable().optional(),
        assigned_reviewer: z.string().uuid().nullable().optional(),
        target_date: z.string().nullable().optional(),
        is_public: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await admin();
    const { data: old } = await db.from("ideas").select("*").eq("id", data.id).single();
    if (!old) throw new Error("Idea not found.");
    const patch: any = {};
    const fields = ["status", "assigned_function", "assigned_owner", "assigned_reviewer", "target_date", "is_public"] as const;
    for (const f of fields) {
      if (data[f] !== undefined && data[f] !== (old as Record<string, unknown>)[f]) patch[f] = data[f];
    }
    if (patch.status && !data.comment) throw new Error("Please add a comment/reason for the status change.");
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await db.from("ideas").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    for (const [f, v] of Object.entries(patch)) {
      await audit(data.id, context.userId, f === "status" ? "status_changed" : "updated", f, (old as Record<string, unknown>)[f], v, f === "status" ? data.comment : null);
    }
    if (patch.status) {
      const s = patch.status as string;
      const title =
        s === "Shortlisted" ? "Your idea has been shortlisted" : s === "Approved for Implementation" ? "Your idea has been approved" : s === "Implemented" ? "Your idea has been implemented" : "Idea status updated";
      await notify(old.user_id, title, `${old.ref_no}: ${old.title} is now "${s}".`);
    }
    if (patch.assigned_reviewer) {
      await notify(patch.assigned_reviewer as string, "Idea assigned to you", `${old.ref_no}: ${old.title}`, `/ideas?view=review`);
    }
    return { ok: true };
  });

const lmh = z.enum(["Low", "Medium", "High"]).nullable().optional();
const num = z.number().finite().nullable().optional();

export const saveIdeaAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        idea_id: z.string().uuid(),
        strategic: lmh, customer: lmh, business: lmh, financial: lmh, operational: lmh, risk: lmh, complexity: lmh,
        final_impact: z.enum(["Low", "Medium", "High", "Transformational"]).nullable().optional(),
        estimated_cost: num, estimated_saving: num, estimated_revenue: num,
        implementation_time: z.string().max(40).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const r = await roles(context.userId);
    const db = await admin();
    const { data: idea } = await db.from("ideas").select("assigned_reviewer").eq("id", data.idea_id).single();
    if (!r.isAdmin && !(r.isReviewer && idea?.assigned_reviewer === context.userId)) throw new Error("Not allowed.");
    const { data: old } = await db.from("idea_assessments").select("*").eq("idea_id", data.idea_id).maybeSingle();
    const { error } = await db
      .from("idea_assessments")
      .upsert({ ...data, assessed_by: context.userId, updated_at: new Date().toISOString() } as never);
    if (error) throw new Error(error.message);
    await audit(data.idea_id, context.userId, "assessment_saved", "assessment", old, data);
    return { ok: true };
  });

export const addIdeaComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        idea_id: z.string().uuid(),
        body: z.string().trim().min(1).max(3000),
        is_internal: z.boolean(),
        attachment: z.object({ name: z.string().max(200), type: z.string().max(120), base64: z.string().max(14_500_000) }).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const r = await roles(context.userId);
    const db = await admin();
    const { data: idea } = await db.from("ideas").select("assigned_reviewer,user_id,ref_no,title").eq("id", data.idea_id).single();
    if (!idea) throw new Error("Idea not found.");
    if (!r.isAdmin && !(r.isReviewer && idea.assigned_reviewer === context.userId)) throw new Error("Not allowed.");
    let attachment_path: string | null = null;
    if (data.attachment) {
      if (!/\.(pdf|docx?|xlsx?|csv|pptx?|png|jpe?g|webp|gif|txt)$/i.test(data.attachment.name)) throw new Error("That file type is not allowed.");
      const bytes = Buffer.from(data.attachment.base64, "base64");
      if (bytes.length > 10 * 1024 * 1024) throw new Error("Attachment must be 10 MB or smaller.");
      attachment_path = `comments/${data.idea_id}/${Date.now()}.${data.attachment.name.split(".").pop()}`;
      await db.storage.from("idea-attachments").upload(attachment_path, bytes, { contentType: data.attachment.type });
    }
    const { error } = await db.from("idea_comments").insert({
      idea_id: data.idea_id,
      author_id: context.userId,
      author_name: await actorName(context.userId),
      body: data.body,
      is_internal: data.is_internal,
      attachment_path,
      attachment_name: data.attachment?.name ?? null,
    });
    if (error) throw new Error(error.message);
    await audit(data.idea_id, context.userId, "comment_added", data.is_internal ? "internal" : "visible", null, data.body);
    const settings = await loadSettings();
    if (!data.is_internal && settings.show_comments_to_employee)
      await notify(idea.user_id, "New comment on your idea", `${idea.ref_no}: ${data.body.slice(0, 120)}`);
    return { ok: true };
  });

export const getCommentAttachmentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ path: z.string().startsWith("comments/") }).parse(d))
  .handler(async ({ data, context }) => {
    const r = await roles(context.userId);
    if (!r.isAdmin && !r.isReviewer) throw new Error("Not allowed.");
    const db = await admin();
    // Only sign paths that belong to a recorded comment the caller may see.
    const { data: c } = await db
      .from("idea_comments")
      .select("idea_id,ideas!inner(assigned_reviewer)")
      .eq("attachment_path", data.path)
      .maybeSingle();
    if (!c) throw new Error("Not allowed.");
    const assigned = (c as unknown as { ideas: { assigned_reviewer: string | null } }).ideas?.assigned_reviewer;
    if (!r.isAdmin && assigned !== context.userId) throw new Error("Not allowed.");
    const { data: s } = await db.storage.from("idea-attachments").createSignedUrl(data.path, 3600);
    return s?.signedUrl ?? null;
  });

export const saveIdeaImplementation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        idea_id: z.string().uuid(),
        owner: z.string().max(160).nullable().optional(),
        supporting_department: z.string().max(160).nullable().optional(),
        start_date: z.string().nullable().optional(),
        target_date: z.string().nullable().optional(),
        actual_date: z.string().nullable().optional(),
        budget: num, actual_cost: num, estimated_benefit: num, actual_benefit: num,
        status: z.string().max(60).nullable().optional(),
        notes: z.string().max(3000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await admin();
    const { data: old } = await db.from("idea_implementations").select("*").eq("idea_id", data.idea_id).maybeSingle();
    const { error } = await db.from("idea_implementations").upsert({ ...data, updated_at: new Date().toISOString() } as never);
    if (error) throw new Error(error.message);
    await audit(data.idea_id, context.userId, "implementation_updated", "implementation", old, data);
    return { ok: true };
  });

export const saveIdeaImpact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        idea_id: z.string().uuid(),
        est_annual_saving: num, actual_annual_saving: num, est_revenue: num, actual_revenue: num,
        hours_saved: num, processes_simplified: num, tat_reduction_pct: num, manual_steps_eliminated: num,
        customers_affected: num, customer_tat_improvement_pct: num, complaint_reduction_pct: num, csat_improvement_pct: num,
        employee_hours_saved: num, productivity_improvement_pct: num, employee_experience: z.string().max(1000).nullable().optional(),
        risks_reduced: num, control_improvements: z.string().max(1000).nullable().optional(), loss_prevented: num,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await admin();
    const { data: old } = await db.from("idea_impacts").select("*").eq("idea_id", data.idea_id).maybeSingle();
    const clean = { ...data } as Record<string, unknown>;
    for (const k of ["processes_simplified", "manual_steps_eliminated", "customers_affected", "risks_reduced"])
      if (typeof clean[k] === "number") clean[k] = Math.round(clean[k] as number);
    const { error } = await db.from("idea_impacts").upsert({ ...(clean as typeof data), updated_at: new Date().toISOString() } as never);
    if (error) throw new Error(error.message);
    await audit(data.idea_id, context.userId, "impact_recorded", "impact", old, data);
    return { ok: true };
  });

export const setIdeaRecognition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        idea_id: z.string().uuid(),
        recognition_id: z.string().uuid().optional(),
        period: z.string().max(40).nullable().optional(),
        remove_id: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await admin();
    if (data.remove_id) {
      await db.from("idea_recognitions").delete().eq("id", data.remove_id);
      await audit(data.idea_id, context.userId, "recognition_removed", "recognition", data.remove_id, null);
      return { ok: true };
    }
    const { data: opt } = await db.from("idea_options").select("name").eq("id", data.recognition_id!).single();
    if (!opt) throw new Error("Recognition type not found.");
    await db.from("idea_recognitions").insert({
      idea_id: data.idea_id,
      recognition_id: data.recognition_id ?? null,
      recognition_name: opt.name,
      period: data.period ?? null,
      awarded_by: context.userId,
    });
    const { data: idea } = await db.from("ideas").select("user_id,ref_no").eq("id", data.idea_id).single();
    await audit(data.idea_id, context.userId, "recognition_added", "recognition", null, opt.name);
    await notify(idea?.user_id, `Congratulations — ${opt.name}!`, `Your idea ${idea?.ref_no} has been recognised.`);
    return { ok: true };
  });

