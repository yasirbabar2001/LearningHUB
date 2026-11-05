import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePortalEmployee } from "@/lib/portal-identity.server";

const schema = z.object({
  employeeCode: z.string().trim().min(1).max(50),
  trainingId: z.string().uuid(),
});

export const checkFeedbackSubmitted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }): Promise<{ submitted: boolean }> => {
    // Always check the signed-in employee's own history, never a caller-chosen code.
    const me = await requirePortalEmployee(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: setting } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "allow_multiple_submissions")
      .maybeSingle();
    if (setting?.value === true) return { submitted: false };

    const { count, error } = await supabaseAdmin
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .eq("training_id", data.trainingId)
      .eq("employee_code", me.employee_code);
    if (error) {
      console.error("[checkFeedbackSubmitted]", error);
      throw new Error("Unable to verify submission status.");
    }
    return { submitted: (count ?? 0) > 0 };
  });

