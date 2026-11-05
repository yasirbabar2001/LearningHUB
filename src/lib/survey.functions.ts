import { createServerFn } from "@tanstack/react-start";
import { surveySubmissionSchema } from "@/lib/survey.schema";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePortalEmployee } from "@/lib/portal-identity.server";

export const submitSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => surveySubmissionSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requirePortalEmployee(context.userId);

    const [dept, desig, survey] = await Promise.all([
      data.department_id
        ? supabaseAdmin.from("departments").select("name").eq("id", data.department_id).maybeSingle()
        : Promise.resolve({ data: null }),
      data.designation_id
        ? supabaseAdmin
            .from("designations")
            .select("name")
            .eq("id", data.designation_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      data.survey_id
        ? supabaseAdmin
            .from("surveys")
            .select("id,title,status")
            .eq("id", data.survey_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const surveyRow = (survey as { data: { id: string; title: string; status: string } | null })
      .data;
    if (data.survey_id && (!surveyRow || surveyRow.status !== "active")) {
      throw new Error("This survey is no longer accepting responses.");
    }

    const { error } = await supabaseAdmin.from("lnd_survey_responses").insert({
      survey_id: surveyRow?.id ?? null,
      survey_title: surveyRow?.title ?? null,
      employee_code: me.employee_code,
      department_id: data.department_id ?? null,
      department_name: dept.data?.name ?? null,
      designation_id: data.designation_id ?? null,
      designation_name: desig.data?.name ?? null,
      tenure: data.tenure ?? null,
      ratings: data.ratings as never,
      choices: data.choices as never,
      comments: data.comments as never,
      nps: data.nps ?? null,
      overall_rating: data.overall_rating ?? null,
    });
    if (error) {
      console.error("[submitSurvey]", error);
      throw new Error("Unable to submit your survey. Please try again.");
    }
    return { ok: true };
  });
