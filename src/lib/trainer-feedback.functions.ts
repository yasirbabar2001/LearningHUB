import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePortalEmployee } from "@/lib/portal-identity.server";

const rating = z.number().int().min(1).max(5);

const schema = z.object({
  trainerId: z.string().uuid(),
  trainingId: z.string().uuid(),
  participantsCount: z.number().int().min(0).max(10000),
  ratings: z.object({
    engagement: rating,
    knowledge: rating,
    logistics: rating,
    material: rating,
    time: rating,
    support: rating,
    overall: rating,
  }),
  objectivesAchieved: z.boolean(),
  strengths: z.string().max(2000).optional().default(""),
  challenges: z.string().max(2000).optional().default(""),
  suggestions: z.string().max(2000).optional().default(""),
  additionalComments: z.string().max(2000).optional().default(""),
});

export const submitTrainerFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requirePortalEmployee(context.userId);

    const { data: training, error: tErr } = await supabaseAdmin
      .from("trainings")
      .select("training_name,training_code,training_type,training_date,training_mandatory")
      .eq("id", data.trainingId)
      .maybeSingle();
    if (tErr || !training) throw new Error("Selected training could not be found.");
    const { data: vsess } = await supabaseAdmin
      .from("virtual_sessions")
      .select("id")
      .eq("training_id", data.trainingId)
      .maybeSingle();
    if (training.training_type === "virtual" || vsess) {
      throw new Error("Trainer feedback is not required for virtual trainings.");
    }

    const { data: trainer } = await supabaseAdmin
      .from("trainers")
      .select("name,employee_code,status")
      .eq("id", data.trainerId)
      .maybeSingle();
    // Only the active trainer linked to the signed-in employee may submit.
    if (
      !trainer ||
      trainer.status !== "active" ||
      trainer.employee_code?.trim().toLowerCase() !== me.employee_code.trim().toLowerCase()
    ) {
      throw new Error("Only the assigned trainer can submit this feedback.");
    }

    const r = data.ratings;
    const values = [
      r.engagement,
      r.knowledge,
      r.logistics,
      r.material,
      r.time,
      r.support,
      r.overall,
    ];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    const { data: row, error } = await supabaseAdmin
      .from("trainer_feedback")
      .insert({
        trainer_id: data.trainerId,
        training_id: data.trainingId,
        trainer_name: trainer?.name ?? null,
        training_name: training.training_name,
        training_code: training.training_code,
        training_type: training.training_type,
        training_date: training.training_date,
        training_mandatory: training.training_mandatory,
        participants_count: data.participantsCount,
        engagement_rating: r.engagement,
        knowledge_rating: r.knowledge,
        logistics_rating: r.logistics,
        material_rating: r.material,
        time_rating: r.time,
        support_rating: r.support,
        overall_rating: r.overall,
        avg_rating: Math.round(avg * 100) / 100,
        objectives_achieved: data.objectivesAchieved,
        strengths: data.strengths.trim() || null,
        challenges: data.challenges.trim() || null,
        suggestions: data.suggestions.trim() || null,
        additional_comments: data.additionalComments.trim() || null,
      })
      .select("id")
      .single();

    if (error || !row) {
      console.error("[submitTrainerFeedback]", error);
      throw new Error("Unable to submit trainer feedback. Please try again.");
    }
    return { id: row.id };
  });

export const listPublicTrainers = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ id: string; name: string }[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("trainers")
      .select("id,name")
      .eq("status", "active")
      .order("name");
    return data ?? [];
  },
);
