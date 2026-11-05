import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TnaCycle = { id: string; year: number; title: string; description: string | null };

export type TnaSkill = {
  id: string;
  skill_type: "soft" | "technical";
  name: string;
  description: string | null;
  department: string | null;
  designation: string | null;
  display_order: number;
};

export type TnaStaff = {
  id: string;
  employee_code: string;
  name: string;
  designation: string | null;
  sub_department: string | null;
  department: string | null;
  branch: string | null;
  region: string | null;
  wing: string | null;
  gender: string | null;
};

export type ManagerTeam = {
  cycle: TnaCycle;
  manager: { employee_code: string; name: string; designation: string | null; department: string | null };
  reportees: TnaStaff[];
  completed: string[];
  skills: TnaSkill[];
};

/** Public list of open TNA cycles. */
export const listTnaCycles = createServerFn({ method: "GET" }).handler(async (): Promise<TnaCycle[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("tna_cycles")
    .select("id,year,title,description")
    .eq("status", "active")
    .order("year", { ascending: false });
  if (error) {
    console.error("[listTnaCycles]", error);
    throw new Error("Unable to load the TNA cycles. Please try again.");
  }
  return (data ?? []) as TnaCycle[];
});

/** True when the signed-in employee has at least one reportee in any active TNA cycle. */
export const isLineManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requirePortalEmployee } = await import("@/lib/portal-identity.server");
    const me = await requirePortalEmployee(context.userId);
    const { data: cycles } = await supabaseAdmin.from("tna_cycles").select("id").eq("status", "active");
    const ids = (cycles ?? []).map((c) => c.id);
    if (!ids.length) return false;
    const { count } = await supabaseAdmin
      .from("tna_staff")
      .select("id", { count: "exact", head: true })
      .in("cycle_id", ids)
      .ilike("manager_code", me.employee_code.trim());
    return (count ?? 0) > 0;
  });

const teamSchema = z.object({
  cycleId: z.string().uuid(),
});

/** Line manager looks up their own reportees for a cycle. */
export const getManagerTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => teamSchema.parse(data))
  .handler(async ({ data, context }): Promise<ManagerTeam> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requirePortalEmployee } = await import("@/lib/portal-identity.server");
    const code = (await requirePortalEmployee(context.userId)).employee_code.trim();

    const { data: cycle } = await supabaseAdmin
      .from("tna_cycles")
      .select("id,year,title,description,status")
      .eq("id", data.cycleId)
      .maybeSingle();
    if (!cycle || cycle.status !== "active") throw new Error("This TNA cycle is not open for submissions.");

    const { data: reportees, error } = await supabaseAdmin
      .from("tna_staff")
      .select("id,employee_code,name,designation,sub_department,department,branch,region,wing,gender")
      .eq("cycle_id", data.cycleId)
      .ilike("manager_code", code)
      .order("name");
    if (error) {
      console.error("[getManagerTeam] reportees", error);
      throw new Error("Unable to load your team. Please try again.");
    }
    if (!reportees?.length) {
      throw new Error(
        "No team members are listed against this Employee ID for this TNA. Please contact the L&D team.",
      );
    }

    const { data: self } = await supabaseAdmin
      .from("tna_staff")
      .select("employee_code,name,designation,department")
      .eq("cycle_id", data.cycleId)
      .ilike("employee_code", code)
      .maybeSingle();

    const { data: done } = await supabaseAdmin
      .from("tna_assessments")
      .select("staff_id")
      .eq("cycle_id", data.cycleId)
      .in(
        "staff_id",
        reportees.map((r) => r.id),
      );

    const { data: skills } = await supabaseAdmin
      .from("tna_skills")
      .select("id,skill_type,name,description,department,designation,display_order")
      .eq("cycle_id", data.cycleId)
      .eq("status", "active")
      .order("skill_type")
      .order("display_order");

    return {
      cycle: { id: cycle.id, year: cycle.year, title: cycle.title, description: cycle.description },
      manager: {
        employee_code: self?.employee_code ?? code,
        name: self?.name ?? "Line Manager",
        designation: self?.designation ?? null,
        department: self?.department ?? null,
      },
      reportees: reportees as TnaStaff[],
      completed: (done ?? []).map((d) => d.staff_id),
      skills: (skills ?? []) as TnaSkill[],
    };
  });

const submitSchema = z.object({
  cycleId: z.string().uuid(),
  staffId: z.string().uuid(),
  comments: z.string().trim().max(2000).optional().nullable(),
  ratings: z
    .array(
      z.object({
        skill_id: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
      }),
    )
    .min(1)
    .max(200),
});

/** Line manager submits the TNA rating sheet for one reportee. */
export const submitTnaAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requirePortalEmployee } = await import("@/lib/portal-identity.server");
    const managerCode = (await requirePortalEmployee(context.userId)).employee_code;

    const { data: cycle } = await supabaseAdmin
      .from("tna_cycles")
      .select("id,status")
      .eq("id", data.cycleId)
      .maybeSingle();
    if (!cycle || cycle.status !== "active") throw new Error("This TNA cycle is closed.");

    const { data: staff } = await supabaseAdmin
      .from("tna_staff")
      .select("*")
      .eq("id", data.staffId)
      .eq("cycle_id", data.cycleId)
      .maybeSingle();
    if (!staff) throw new Error("This team member is not part of the selected TNA.");
    if ((staff.manager_code ?? "").trim().toLowerCase() !== managerCode.trim().toLowerCase()) {
      throw new Error("You can only submit a TNA for your own team members.");
    }

    const { count: existing } = await supabaseAdmin
      .from("tna_assessments")
      .select("id", { count: "exact", head: true })
      .eq("cycle_id", data.cycleId)
      .eq("staff_id", data.staffId);
    if ((existing ?? 0) > 0) throw new Error("A TNA has already been submitted for this team member.");

    const { data: skills } = await supabaseAdmin
      .from("tna_skills")
      .select("id,name,skill_type")
      .eq("cycle_id", data.cycleId)
      .eq("status", "active");
    const byId = new Map((skills ?? []).map((s) => [s.id, s]));

    const rows = data.ratings
      .filter((r) => byId.has(r.skill_id))
      .map((r) => {
        const s = byId.get(r.skill_id)!;
        return { skill_id: s.id, skill_name: s.name, skill_type: s.skill_type, rating: r.rating };
      });
    if (!rows.length) throw new Error("No valid skill ratings were submitted.");

    const avg = (list: typeof rows) =>
      list.length ? Math.round((list.reduce((a, b) => a + b.rating, 0) / list.length) * 100) / 100 : null;
    const soft = rows.filter((r) => r.skill_type === "soft");
    const tech = rows.filter((r) => r.skill_type === "technical");

    const { data: assessment, error: aErr } = await supabaseAdmin
      .from("tna_assessments")
      .insert({
        cycle_id: data.cycleId,
        staff_id: data.staffId,
        employee_code: staff.employee_code,
        employee_name: staff.name,
        designation: staff.designation,
        sub_department: staff.sub_department,
        department: staff.department,
        branch: staff.branch,
        region: staff.region,
        wing: staff.wing,
        gender: staff.gender,
        manager_code: staff.manager_code,
        manager_name: staff.manager_name,
        avg_soft: avg(soft),
        avg_technical: avg(tech),
        avg_overall: avg(rows),
        gap_count: rows.filter((r) => r.rating <= 3).length,
        comments: data.comments ?? null,
      })
      .select("id")
      .single();
    if (aErr || !assessment) {
      console.error("[submitTnaAssessment] assessment", aErr);
      throw new Error("Unable to save this TNA. Please try again.");
    }

    const { error: rErr } = await supabaseAdmin
      .from("tna_ratings")
      .insert(rows.map((r) => ({ ...r, assessment_id: assessment.id, cycle_id: data.cycleId })));
    if (rErr) console.error("[submitTnaAssessment] ratings", rErr);

    return { ok: true, staffId: data.staffId };
  });

/** True when the signed-in employee is listed as an active trainer. */
export const isTrainer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requirePortalEmployee } = await import("@/lib/portal-identity.server");
    const me = await requirePortalEmployee(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("trainers")
      .select("id")
      .eq("status", "active")
      .ilike("employee_code", me.employee_code.trim())
      .limit(1);
    if (error) {
      console.error("[isTrainer]", error);
      return false;
    }
    return (rows ?? []).length > 0;
  });
