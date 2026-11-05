import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const startSchema = z.object({
  trainingId: z.string().uuid(),
});

export type EvalQuestion = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  option_order?: ("A" | "B" | "C" | "D")[];
};

export type StartEvaluationResult = {
  phase: "pre" | "post";
  questions: EvalQuestion[];
  passingPct: number;
  durationMinutes: number;
};

/** Minutes a participant must wait after the pre evaluation before the post evaluation opens. */
export const POST_EVAL_LOCK_MINUTES = 5;

export const startEvaluation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => startSchema.parse(data))
  .handler(async ({ data, context }): Promise<StartEvaluationResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requirePortalEmployee } = await import("@/lib/portal-identity.server");
    const me = await requirePortalEmployee(context.userId);

    const { data: attempts, error: aErr } = await supabaseAdmin
      .from("evaluation_attempts")
      .select("phase,submitted_at")
      .eq("training_id", data.trainingId)
      .ilike("employee_code", me.employee_code.trim());
    if (aErr) {
      console.error("[startEvaluation] attempts", aErr);
      throw new Error("Unable to check your evaluation status. Please try again.");
    }

    const taken = new Set((attempts ?? []).map((a) => a.phase));
    if (taken.has("pre") && taken.has("post")) {
      const { getRetakeState } = await import("@/lib/virtual-retake.server");
      const rs = await getRetakeState(data.trainingId, me.employee_code, context.userId);
      if (!rs.isVirtual || rs.passed) {
        throw new Error("You have already completed both the pre and post evaluation for this training.");
      }
      if (rs.needsReview) {
        throw new Error("You've used all 3 post-test attempts. Please review all the learning content again to unlock 3 new attempts.");
      }
    }
    const phase: "pre" | "post" = taken.has("pre") ? "post" : "pre";

    if (phase === "post") {
      const preAt = (attempts ?? [])
        .filter((a) => a.phase === "pre")
        .map((a) => new Date(a.submitted_at).getTime())
        .sort((a, b) => b - a)[0];
      if (preAt) {
        const unlockAt = preAt + POST_EVAL_LOCK_MINUTES * 60_000;
        const leftMs = unlockAt - Date.now();
        if (leftMs > 0) {
          const mins = Math.ceil(leftMs / 60_000);
          throw new Error(
            `The post evaluation unlocks ${POST_EVAL_LOCK_MINUTES} minutes after your pre evaluation. Please try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
          );
        }
      }
    }

    const { data: questions, error: qErr } = await supabaseAdmin
      .from("evaluation_questions")
      .select("id,question_text,option_a,option_b,option_c,option_d")
      .eq("training_id", data.trainingId)
      .eq("status", "active")
      .order("display_order");
    if (qErr) {
      console.error("[startEvaluation] questions", qErr);
      throw new Error("Unable to load the evaluation questions. Please try again.");
    }
    if (!questions?.length) {
      throw new Error("No evaluation questions have been set up for this training yet.");
    }

    const { data: setting } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "passing_percentage")
      .maybeSingle();
    const passingPct = Number(setting?.value ?? 60) || 60;

    const { data: training } = await supabaseAdmin
      .from("trainings")
      .select("eval_duration_minutes")
      .eq("id", data.trainingId)
      .maybeSingle();
    const durationMinutes = Number(training?.eval_duration_minutes ?? 15) || 15;

    // Randomise the quiz for every attempt: question order, and the order the
    // options are shown in (each option keeps its own letter, so grading is unaffected).
    const shuffle = <T,>(arr: T[]): T[] => {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    };

    const randomised = shuffle(questions).map((q) => ({
      ...q,
      option_order: shuffle(
        (["A", "B", "C", "D"] as const).filter((k) =>
          k === "A"
            ? Boolean(q.option_a)
            : k === "B"
              ? Boolean(q.option_b)
              : k === "C"
                ? Boolean(q.option_c)
                : Boolean(q.option_d),
        ),
      ),
    }));

    return { phase, questions: randomised, passingPct, durationMinutes };
  });


const submitSchema = z.object({
  trainingId: z.string().uuid(),
  phase: z.enum(["pre", "post"]),
  startedAt: z.number().int().optional(),
  answers: z
    .array(
      z.object({
        question_id: z.string().uuid(),
        selected_option: z.enum(["A", "B", "C", "D"]).nullable(),
      }),
    )
    .min(1)
    .max(200),
});

export type SubmitEvaluationResult = {
  total: number;
  correct: number;
  scorePct: number;
  passed: boolean;
  phase: "pre" | "post";
};

export const submitEvaluation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data, context }): Promise<SubmitEvaluationResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requirePortalEmployee } = await import("@/lib/portal-identity.server");
    const me = await requirePortalEmployee(context.userId);
    const emp = { ...me, name: me.name };

    const { count: existing } = await supabaseAdmin
      .from("evaluation_attempts")
      .select("id", { count: "exact", head: true })
      .eq("training_id", data.trainingId)
      .eq("phase", data.phase)
      .ilike("employee_code", emp.employee_code.trim());
    if ((existing ?? 0) > 0) {
      let allowRetake = false;
      if (data.phase === "post") {
        const { getRetakeState } = await import("@/lib/virtual-retake.server");
        const rs = await getRetakeState(data.trainingId, emp.employee_code, context.userId);
        if (rs.isVirtual && !rs.passed && rs.needsReview) {
          throw new Error("You've used all 3 post-test attempts. Please review all the learning content again to unlock 3 new attempts.");
        }
        allowRetake = rs.isVirtual && !rs.passed;
      }
      if (!allowRetake) throw new Error(`You have already submitted the ${data.phase} evaluation for this training.`);
    }

    if (data.phase === "post") {
      const { data: preRows } = await supabaseAdmin
        .from("evaluation_attempts")
        .select("submitted_at")
        .eq("training_id", data.trainingId)
        .eq("phase", "pre")
        .ilike("employee_code", emp.employee_code.trim())
        .order("submitted_at", { ascending: false })
        .limit(1);
      const preAt = preRows?.[0]?.submitted_at;
      if (preAt) {
        const leftMs =
          new Date(preAt).getTime() + POST_EVAL_LOCK_MINUTES * 60_000 - Date.now();
        if (leftMs > 0) {
          const mins = Math.ceil(leftMs / 60_000);
          throw new Error(
            `The post evaluation is locked for ${POST_EVAL_LOCK_MINUTES} minutes after the pre evaluation. Please try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
          );
        }
      }
    }

    const { data: questions, error: qErr } = await supabaseAdmin
      .from("evaluation_questions")
      .select("id,question_text,correct_option")
      .eq("training_id", data.trainingId)
      .eq("status", "active");
    if (qErr || !questions?.length) {
      console.error("[submitEvaluation] questions", qErr);
      throw new Error("Unable to grade this evaluation. Please try again.");
    }

    const [training, designation, department, location, region, wing, gender] = await Promise.all([
      supabaseAdmin
        .from("trainings")
        .select("training_name,training_code,training_type,training_date,trainers(name)")
        .eq("id", data.trainingId)
        .maybeSingle(),
      emp.designation_id
        ? supabaseAdmin
            .from("designations")
            .select("name")
            .eq("id", emp.designation_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      emp.department_id
        ? supabaseAdmin.from("departments").select("name").eq("id", emp.department_id).maybeSingle()
        : Promise.resolve({ data: null }),
      emp.location_id
        ? supabaseAdmin.from("locations").select("name").eq("id", emp.location_id).maybeSingle()
        : Promise.resolve({ data: null }),
      emp.region_id
        ? supabaseAdmin.from("regions").select("name").eq("id", emp.region_id).maybeSingle()
        : Promise.resolve({ data: null }),
      emp.wing_id
        ? supabaseAdmin.from("wings").select("name").eq("id", emp.wing_id).maybeSingle()
        : Promise.resolve({ data: null }),
      emp.gender_id
        ? supabaseAdmin.from("genders").select("name").eq("id", emp.gender_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const graded = questions.map((q) => {
      const picked = data.answers.find((a) => a.question_id === q.id)?.selected_option ?? null;
      return {
        question_id: q.id,
        question_text: q.question_text,
        selected_option: picked,
        correct_option: q.correct_option,
        is_correct: picked === q.correct_option,
      };
    });
    const total = graded.length;
    const correct = graded.filter((g) => g.is_correct).length;
    const scorePct = total ? Math.round((correct / total) * 10000) / 100 : 0;

    const { data: setting } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "passing_percentage")
      .maybeSingle();
    const passingPct = Number(setting?.value ?? 60) || 60;

    const { data: attempt, error: insErr } = await supabaseAdmin
      .from("evaluation_attempts")
      .insert({
        training_id: data.trainingId,
        phase: data.phase,
        // Client-reported start, clamped to the last 4 hours and never in the future.
        started_at: data.startedAt && data.startedAt <= Date.now() && data.startedAt > Date.now() - 4 * 3600_000
          ? new Date(data.startedAt).toISOString() : null,
        employee_code: emp.employee_code.trim(),
        employee_name: emp.name.trim(),
        designation_id: emp.designation_id ?? null,
        department_id: emp.department_id ?? null,
        location_id: emp.location_id ?? null,
        region_id: emp.region_id ?? null,
        wing_id: emp.wing_id ?? null,
        gender_id: emp.gender_id ?? null,
        designation_name: designation.data?.name ?? null,
        department_name: department.data?.name ?? null,
        location_name: location.data?.name ?? null,
        region_name: region.data?.name ?? null,
        wing_name: wing.data?.name ?? null,
        gender_name: gender.data?.name ?? null,
        training_name: training.data?.training_name ?? null,
        training_code: training.data?.training_code ?? null,
        training_type: training.data?.training_type ?? null,
        training_date: training.data?.training_date ?? null,
        trainer_name:
          (training.data?.trainers as { name: string } | null | undefined)?.name ?? null,
        total_questions: total,
        correct_count: correct,
        score_pct: scorePct,
        passed: scorePct >= passingPct,
      })
      .select("id")
      .single();
    if (insErr || !attempt) {
      console.error("[submitEvaluation] attempt", insErr);
      throw new Error("Unable to save your evaluation. Please try again.");
    }

    const { error: ansErr } = await supabaseAdmin
      .from("evaluation_answers")
      .insert(graded.map((g) => ({ ...g, attempt_id: attempt.id })));
    if (ansErr) console.error("[submitEvaluation] answers", ansErr);

    return { total, correct, scorePct, passed: scorePct >= passingPct, phase: data.phase };
  });

export type EvalTraining = {
  id: string;
  training_code: string | null;
  training_name: string;
  training_type: string;
  training_date: string;
};

/** Public list of active trainings that actually have evaluation questions set up. */
export const listEvaluationTrainings = createServerFn({ method: "GET" }).handler(
  async (): Promise<EvalTraining[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: qs } = await supabaseAdmin
      .from("evaluation_questions")
      .select("training_id")
      .eq("status", "active");
    const ids = [...new Set((qs ?? []).map((q) => q.training_id))];
    if (!ids.length) return [];

    const { data, error } = await supabaseAdmin
      .from("trainings")
      .select("id,training_code,training_name,training_type,training_date")
      .eq("status", "active")
      .in("id", ids)
      .order("training_date", { ascending: false });
    if (error) {
      console.error("[listEvaluationTrainings]", error);
      throw new Error("Unable to load trainings. Please try again.");
    }
    return (data ?? []) as EvalTraining[];
  },
);
