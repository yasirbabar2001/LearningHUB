import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePortalEmployee } from "@/lib/portal-identity.server";

const schema = z.object({
  employee: z.object({
    employee_code: z.string().trim().min(1).max(50),
    cnic: z.string().trim().max(20).optional().default(""),
    name: z.string().trim().min(2).max(120),
    designation_id: z.string().uuid().nullable().optional(),
    department_id: z.string().uuid().nullable().optional(),
    location_id: z.string().uuid().nullable().optional(),
    region_id: z.string().uuid().nullable().optional(),
    wing_id: z.string().uuid().nullable().optional(),
    gender_id: z.string().uuid().nullable().optional(),
  }),
  trainingId: z.string().uuid(),
  recommendation: z.boolean(),
  comments: z.object({
    useful: z.string().max(2000).optional().default(""),
    improve: z.string().max(2000).optional().default(""),
    extra: z.string().max(2000).optional().default(""),
  }),
  responses: z
    .array(
      z.object({
        question_id: z.string().uuid(),
        question_text: z.string().max(500),
        category: z.string().max(50),
        rating: z.number().int().min(1).max(5).nullable(),
        answer_text: z.string().max(1000).nullable(),
      }),
    )
    .min(1)
    .max(100),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requirePortalEmployee(context.userId);
    const isSelf =
      data.employee.employee_code.trim().toLowerCase() === me.employee_code.trim().toLowerCase();
    if (isSelf) {
      // Use the verified identity for the employee's own feedback.
      Object.assign(data.employee, {
        employee_code: me.employee_code,
        name: me.name,
        designation_id: me.designation_id,
        department_id: me.department_id,
        location_id: me.location_id,
        region_id: me.region_id,
        wing_id: me.wing_id,
        gender_id: me.gender_id,
      });
    } else {
      // Submitting for someone else is only allowed for onboarding trainers.
      const { data: pu } = await supabaseAdmin
        .from("portal_users")
        .select("onboarding_enabled")
        .eq("id", me.id)
        .maybeSingle();
      if (!pu?.onboarding_enabled) throw new Error("You can only submit your own feedback.");
    }

    const { data: respondent, error: rErr } = await supabaseAdmin
      .from("respondents")
      .insert({
        employee_code: data.employee.employee_code,
        cnic: data.employee.cnic ?? "",
        name: data.employee.name,
        designation_id: data.employee.designation_id ?? null,
        department_id: data.employee.department_id ?? null,
        location_id: data.employee.location_id ?? null,
        region_id: data.employee.region_id ?? null,
        wing_id: data.employee.wing_id ?? null,
        gender_id: data.employee.gender_id ?? null,
      })
      .select("id")
      .single();
    if (rErr || !respondent) {
      console.error("[submitFeedback] respondent", rErr);
      throw new Error("Unable to save your details. Please try again.");
    }

    const { data: fb, error: fErr } = await supabaseAdmin
      .from("feedback")
      .insert({
        respondent_id: respondent.id,
        training_id: data.trainingId,
        recommendation: data.recommendation,
        useful_aspect: data.comments.useful.trim() || null,
        improvement_suggestion: data.comments.improve.trim() || null,
        additional_comments: data.comments.extra.trim() || null,
      })
      .select("id")
      .single();
    if (fErr || !fb) {
      console.error("[submitFeedback] feedback", fErr);
      throw new Error("Unable to submit feedback. Please try again.");
    }

    const { error: respErr } = await supabaseAdmin
      .from("feedback_responses")
      .insert(data.responses.map((r) => ({ ...r, feedback_id: fb.id })));
    if (respErr) {
      console.error("[submitFeedback] responses", respErr);
      throw new Error("Unable to save your answers. Please try again.");
    }

    return { id: fb.id };
  });
