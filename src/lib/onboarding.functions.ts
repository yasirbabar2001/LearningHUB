import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ONBOARDING_TRAINING_NAME = "Onboarding Session";

async function ensureOnboardingTraining(trainingDate: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("trainings")
    .select("id")
    .eq("training_name", ONBOARDING_TRAINING_NAME)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await supabaseAdmin
    .from("trainings")
    .insert({
      training_name: ONBOARDING_TRAINING_NAME,
      training_type: "classroom",
      training_mandatory: "mandatory",
      training_date: trainingDate,
      status: "active",
    })
    .select("id")
    .single();
  if (error || !created) throw new Error("Unable to prepare the Onboarding Session record.");
  return created.id;
}

const attendanceSchema = z.object({
  cnic: z.string().trim().regex(/^\d{13}$/),
  name: z.string().trim().min(2).max(120),
  designation_id: z.string().uuid().nullable(),
  designation_name: z.string().max(160).nullable(),
  location_id: z.string().uuid().nullable(),
  location_name: z.string().max(160).nullable(),
  region_name: z.string().max(160).nullable(),
  wing_name: z.string().max(160).nullable(),
  training_date: z.string().min(4).max(20),
  venue_location_id: z.string().uuid().nullable(),
  venue_name: z.string().max(160).nullable(),
  photo_path: z.string().max(400).nullable(),
});

export type OnboardingAttendanceInput = z.infer<typeof attendanceSchema>;

export const submitOnboardingAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => attendanceSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ id: string; trainingId: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: trainer } = await supabaseAdmin
      .from("portal_users")
      .select("employee_code,name,designation_name,location_name,onboarding_enabled")
      .eq("id", context.userId)
      .maybeSingle();
    if (!trainer?.onboarding_enabled) {
      throw new Error("You are not authorised to record onboarding attendance.");
    }

    const trainingId = await ensureOnboardingTraining(data.training_date);

    const { data: row, error } = await supabaseAdmin
      .from("onboarding_attendance")
      .insert({
        trainer_user_id: context.userId,
        trainer_employee_code: trainer?.employee_code ?? null,
        trainer_name: trainer?.name ?? null,
        trainer_designation: trainer?.designation_name ?? null,
        trainer_location: trainer?.location_name ?? null,
        cnic: data.cnic,
        new_joiner_name: data.name,
        designation_id: data.designation_id,
        designation_name: data.designation_name,
        location_id: data.location_id,
        location_name: data.location_name,
        region_name: data.region_name,
        wing_name: data.wing_name,
        training_date: data.training_date,
        venue_location_id: data.venue_location_id,
        venue_name: data.venue_name,
        photo_path: data.photo_path,
        training_id: trainingId,
      })
      .select("id")
      .single();
    if (error || !row) {
      console.error("[submitOnboardingAttendance]", error);
      throw new Error("Unable to save the new joiner details. Please try again.");
    }
    return { id: row.id, trainingId };
  });

export const attachOnboardingFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ attendanceId: z.string().uuid(), feedbackId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("onboarding_attendance")
      .update({ feedback_id: data.feedbackId, feedback_submitted_at: new Date().toISOString() })
      .eq("id", data.attendanceId)
      .eq("trainer_user_id", context.userId);
    if (error) throw new Error("Unable to link the trainee feedback.");
    return { ok: true };
  });

/** Admin only: permanently removes an onboarding attendance record and its picture. */
export const deleteOnboardingAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(1000) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ deleted: number }> => {
    const { data: adminRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRow) throw new Error("Only administrators can delete onboarding records.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("onboarding_attendance")
      .select("photo_path")
      .in("id", data.ids);
    const paths = (rows ?? []).flatMap((r) => (r.photo_path ? [r.photo_path] : []));
    if (paths.length) {
      await supabaseAdmin.storage.from("onboarding-photos").remove(paths).catch(() => undefined);
    }
    const { error } = await supabaseAdmin
      .from("onboarding_attendance")
      .delete()
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { deleted: data.ids.length };
  });

export type OnboardingReportRow = {
  id: string;
  created_at: string;
  trainer_employee_code: string | null;
  trainer_name: string | null;
  trainer_designation: string | null;
  trainer_location: string | null;
  cnic: string;
  new_joiner_name: string;
  designation_name: string | null;
  location_name: string | null;
  region_name: string | null;
  wing_name: string | null;
  training_date: string;
  venue_name: string | null;
  photo_url: string | null;
  feedback_submitted_at: string | null;
  content_rating: number | null;
  trainer_rating: number | null;
  venue_rating: number | null;
  overall_rating: number | null;
  quality_score: number | null;
  recommendation: boolean | null;
  useful_aspect: string | null;
  improvement_suggestion: string | null;
  additional_comments: string | null;
};

export const listOnboardingAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OnboardingReportRow[]> => {
    const { data: adminRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRow) throw new Error("Only administrators can view the onboarding report.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("onboarding_attendance")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const feedbackIds = (rows ?? []).flatMap((r) => (r.feedback_id ? [r.feedback_id] : []));
    const feedbackMap = new Map<string, Record<string, unknown>>();
    if (feedbackIds.length) {
      const { data: fb } = await supabaseAdmin
        .from("feedback")
        .select(
          "id,content_rating,trainer_rating,venue_rating,overall_rating,quality_score,recommendation,useful_aspect,improvement_suggestion,additional_comments",
        )
        .in("id", feedbackIds);
      for (const f of fb ?? []) feedbackMap.set(f.id, f as Record<string, unknown>);
    }

    const paths = (rows ?? []).flatMap((r) => (r.photo_path ? [r.photo_path] : []));
    const signedMap = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await supabaseAdmin.storage
        .from("onboarding-photos")
        .createSignedUrls(paths, 60 * 60);
      paths.forEach((p, i) => {
        const url = signed?.[i]?.signedUrl;
        if (url) signedMap.set(p, url);
      });
    }

    return (rows ?? []).map((r) => {
      const f = (r.feedback_id ? feedbackMap.get(r.feedback_id) : undefined) ?? {};
      const num = (k: string) => (f[k] === null || f[k] === undefined ? null : Number(f[k]));
      const str = (k: string) => (typeof f[k] === "string" ? (f[k] as string) : null);
      return {
        id: r.id,
        created_at: r.created_at,
        trainer_employee_code: r.trainer_employee_code,
        trainer_name: r.trainer_name,
        trainer_designation: r.trainer_designation,
        trainer_location: r.trainer_location,
        cnic: r.cnic,
        new_joiner_name: r.new_joiner_name,
        designation_name: r.designation_name,
        location_name: r.location_name,
        region_name: r.region_name,
        wing_name: r.wing_name,
        training_date: r.training_date,
        venue_name: r.venue_name,
        photo_url: r.photo_path ? (signedMap.get(r.photo_path) ?? null) : null,
        feedback_submitted_at: r.feedback_submitted_at,
        content_rating: num("content_rating"),
        trainer_rating: num("trainer_rating"),
        venue_rating: num("venue_rating"),
        overall_rating: num("overall_rating"),
        quality_score: num("quality_score"),
        recommendation:
          typeof f["recommendation"] === "boolean" ? (f["recommendation"] as boolean) : null,
        useful_aspect: str("useful_aspect"),
        improvement_suggestion: str("improvement_suggestion"),
        additional_comments: str("additional_comments"),
      };
    });
  });
