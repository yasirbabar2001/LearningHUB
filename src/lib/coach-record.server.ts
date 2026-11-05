/** Loads the signed-in employee's own learning records (server-only). */
export async function loadLearningRecord(employeeCode: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const code = employeeCode;

  const [evals, fb, surveys, tna] = await Promise.all([
    supabaseAdmin
      .from("evaluation_attempts")
      .select("training_name,training_date,phase,score_pct,passed,correct_count,total_questions,submitted_at")
      .eq("employee_code", code)
      .order("submitted_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("feedback")
      .select("training_name,training_date,trainer_name,overall_rating,content_rating,trainer_rating,useful_aspect,improvement_suggestion,submitted_at")
      .eq("employee_code", code)
      .order("submitted_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("lnd_survey_responses")
      .select("survey_title,overall_rating,nps,submitted_at")
      .eq("employee_code", code)
      .order("submitted_at", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("tna_assessments")
      .select("id,avg_overall,avg_soft,avg_technical,gap_count,manager_name,comments,submitted_at")
      .eq("employee_code", code)
      .order("submitted_at", { ascending: false })
      .limit(3),
  ]);

  let tnaGaps: { skill: string; type: string; rating: number }[] = [];
  const latest = tna.data?.[0];
  if (latest) {
    const { data } = await supabaseAdmin
      .from("tna_ratings")
      .select("skill_name,skill_type,rating")
      .eq("assessment_id", latest.id)
      .order("rating");
    tnaGaps = (data ?? [])
      .filter((r) => r.rating > 0 && r.rating <= 2)
      .map((r) => ({ skill: r.skill_name, type: r.skill_type, rating: r.rating }));
  }

  // Coach only discusses the employee's 3 most recent training sessions.
  // (All records stay in the database for admin reporting.)
  const sessions = new Map<string, string>();
  for (const r of [...(evals.data ?? []), ...(fb.data ?? [])]) {
    const key = `${r.training_name ?? ""}|${r.training_date ?? ""}`;
    const when = r.training_date ?? r.submitted_at ?? "";
    if (!sessions.has(key) || (sessions.get(key) ?? "") < when) sessions.set(key, when);
  }
  const recent = new Set(
    [...sessions.entries()].sort((a, b) => b[1].localeCompare(a[1])).slice(0, 3).map(([k]) => k),
  );
  const keep = (r: { training_name: string | null; training_date: string | null }) =>
    recent.has(`${r.training_name ?? ""}|${r.training_date ?? ""}`);

  return {
    recentTrainingSessions: [...recent].map((k) => {
      const [name, date] = k.split("|");
      return { training_name: name, training_date: date };
    }),
    evaluations: (evals.data ?? []).filter(keep),
    feedback: (fb.data ?? []).filter(keep),
    surveys: surveys.data ?? [],
    tna: (tna.data ?? []).map(({ id: _id, ...rest }) => rest),
    tnaSkillGaps: tnaGaps,
  };
}
