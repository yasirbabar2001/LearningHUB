/** Post-test retake rules for virtual sessions: 3 attempts per round; after 3 fails the
 *  employee must re-view all session content (after the last attempt) to unlock 3 more. */
export const ATTEMPTS_PER_ROUND = 3;

export type RetakeState = {
  isVirtual: boolean;
  passed: boolean;
  attempts: number;
  attemptsLeft: number; // left in current round (0 when review needed)
  needsReview: boolean;
  lastPostAt: string | null;
  reviewedIds: Set<string>;
};

export async function getRetakeState(trainingId: string, employeeCode: string, userId: string): Promise<RetakeState> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: session }, { data: posts }] = await Promise.all([
    supabaseAdmin.from("virtual_sessions").select("id").eq("training_id", trainingId).eq("status", "active").maybeSingle(),
    supabaseAdmin.from("evaluation_attempts").select("passed,submitted_at").eq("training_id", trainingId).eq("phase", "post")
      .ilike("employee_code", employeeCode.trim()).order("submitted_at", { ascending: false }),
  ]);
  const list = posts ?? [];
  const passed = list.some((p) => p.passed);
  const attempts = list.length;
  const lastPostAt = list[0]?.submitted_at ?? null;
  const base = { isVirtual: Boolean(session), passed, attempts, lastPostAt, reviewedIds: new Set<string>() };
  if (!session || passed || attempts === 0 || attempts % ATTEMPTS_PER_ROUND !== 0) {
    return { ...base, needsReview: false, attemptsLeft: ATTEMPTS_PER_ROUND - (attempts % ATTEMPTS_PER_ROUND) };
  }
  const [{ data: content }, { data: views }] = await Promise.all([
    supabaseAdmin.from("virtual_session_content").select("id").eq("session_id", session.id),
    supabaseAdmin.from("virtual_content_views").select("content_id,updated_at,completed").eq("user_id", userId),
  ]);
  const ids = (content ?? []).map((c) => c.id);
  const last = new Date(lastPostAt!).getTime();
  const reviewedIds = new Set((views ?? []).filter((v) => v.completed && new Date(v.updated_at).getTime() > last).map((v) => v.content_id));
  const reviewed = ids.every((id) => reviewedIds.has(id));
  return { ...base, reviewedIds, needsReview: !reviewed, attemptsLeft: reviewed ? ATTEMPTS_PER_ROUND : 0 };
}
