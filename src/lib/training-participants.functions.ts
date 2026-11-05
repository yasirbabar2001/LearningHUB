import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Splits a pasted block of Employee IDs (Excel column, commas, spaces) into clean codes. */
export function parseEmployeeCodes(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\s,;|]+/)) {
    const code = part.trim();
    if (!code) continue;
    const key = code.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(code);
  }
  return out;
}

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const sb = context.supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (a: string, b: string) => {
          eq: (a: string, b: string) => { maybeSingle: () => Promise<{ data: unknown }> };
        };
      };
    };
  };
  const { data } = await sb
    .from("user_roles")
    .select("id")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Only administrators can manage training participants.");
}

export type ResolvedEmployee = { id: string; employee_code: string; name: string };
export type ResolveResult = { found: ResolvedEmployee[]; missing: string[] };

/** Matches pasted Employee IDs against Employee Accounts; reports any that do not exist. */
export const resolveEmployeeCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ codes: z.array(z.string().trim().min(1).max(50)).max(5000) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<ResolveResult> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const codes = [...new Set(data.codes.map((c) => c.trim()).filter(Boolean))];
    if (!codes.length) return { found: [], missing: [] };

    const { data: rows, error } = await supabaseAdmin
      .from("portal_users")
      .select("id,employee_code,name")
      .in("employee_code", codes);
    if (error) throw new Error(error.message);

    const byKey = new Map(
      (rows ?? []).map((r) => [r.employee_code.trim().toLowerCase(), r]),
    );
    const found: ResolvedEmployee[] = [];
    const missing: string[] = [];
    for (const code of codes) {
      const hit = byKey.get(code.toLowerCase());
      if (hit) found.push({ id: hit.id, employee_code: hit.employee_code, name: hit.name });
      else missing.push(code);
    }
    return { found, missing };
  });

/** Replaces the assigned participants of a training with the given Employee IDs. */
export const setTrainingParticipants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        trainingId: z.string().uuid(),
        codes: z.array(z.string().trim().min(1).max(50)).max(5000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ assigned: number; missing: string[] }> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const codes = [...new Set(data.codes.map((c) => c.trim()).filter(Boolean))];

    const { data: rows } = await supabaseAdmin
      .from("portal_users")
      .select("id,employee_code,name")
      .in("employee_code", codes.length ? codes : ["__none__"]);
    const byKey = new Map((rows ?? []).map((r) => [r.employee_code.trim().toLowerCase(), r]));
    const missing = codes.filter((c) => !byKey.has(c.toLowerCase()));

    await supabaseAdmin.from("training_participants").delete().eq("training_id", data.trainingId);

    const payload = codes
      .map((c) => byKey.get(c.toLowerCase()))
      .filter((r): r is { id: string; employee_code: string; name: string } => Boolean(r))
      .map((r) => ({
        training_id: data.trainingId,
        employee_code: r.employee_code,
        employee_name: r.name,
        portal_user_id: r.id,
      }));

    if (payload.length) {
      const { error } = await supabaseAdmin.from("training_participants").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { assigned: payload.length, missing };
  });

export type TrainingParticipant = { employee_code: string; employee_name: string | null };

export const listTrainingParticipants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ trainingId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<TrainingParticipant[]> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("training_participants")
      .select("employee_code,employee_name")
      .eq("training_id", data.trainingId)
      .order("employee_code");
    if (error) throw new Error(error.message);
    return (rows ?? []) as TrainingParticipant[];
  });

export type AssignedTraining = {
  id: string;
  training_code: string | null;
  training_name: string;
  training_type: string;
  training_date: string;
  venue: string | null;
  trainer_name: string | null;
  has_evaluation: boolean;
};

/** Trainings the signed-in employee has been assigned to (feedback + evaluation). */
export const listMyTrainings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AssignedTraining[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as { userId: string }).userId;

    const { data: me } = await supabaseAdmin
      .from("portal_users")
      .select("employee_code")
      .eq("id", userId)
      .maybeSingle();
    if (!me?.employee_code) return [];

    const { data: links } = await supabaseAdmin
      .from("training_participants")
      .select("training_id")
      .ilike("employee_code", me.employee_code.trim());
    const ids = [...new Set((links ?? []).map((l) => l.training_id))];
    if (!ids.length) return [];

    const { data: rows, error } = await supabaseAdmin
      .from("trainings")
      .select("id,training_code,training_name,training_type,training_date,venue,trainers(name)")
      .eq("status", "active")
      .in("id", ids)
      .order("training_date", { ascending: false });
    if (error) throw new Error("Unable to load your trainings. Please try again.");

    const { data: qs } = await supabaseAdmin
      .from("evaluation_questions")
      .select("training_id")
      .eq("status", "active")
      .in("training_id", ids);
    const withQuestions = new Set((qs ?? []).map((q) => q.training_id));

    return (rows ?? []).map((t) => ({
      id: t.id,
      training_code: t.training_code,
      training_name: t.training_name,
      training_type: t.training_type,
      training_date: t.training_date,
      venue: t.venue,
      trainer_name: (t.trainers as { name: string } | null)?.name ?? null,
      has_evaluation: withQuestions.has(t.id),
    }));
  });
