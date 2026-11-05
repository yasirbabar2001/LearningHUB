import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePortalEmployee } from "@/lib/portal-identity.server";
import { loadLearningRecord } from "@/lib/coach-record.server";

/** Summary of the signed-in employee's own learning records. */
export const getCoachLearningRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = await requirePortalEmployee(context.userId);
    return loadLearningRecord(me.employee_code);
  });
