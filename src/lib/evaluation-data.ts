import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EvaluationQuestion = {
  id: string;
  training_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  correct_option: "A" | "B" | "C" | "D";
  display_order: number;
  status: string;
};

export type EvaluationAttempt = {
  id: string;
  training_id: string;
  phase: "pre" | "post";
  employee_code: string;
  employee_name: string;
  designation_name: string | null;
  department_name: string | null;
  location_name: string | null;
  region_name: string | null;
  wing_name: string | null;
  gender_name: string | null;
  training_name: string | null;
  training_code: string | null;
  training_type: string | null;
  training_date: string | null;
  trainer_name: string | null;
  total_questions: number;
  correct_count: number;
  score_pct: number;
  passed: boolean;
  submitted_at: string;
};

export function useEvaluationQuestions(trainingId: string | null) {
  return useQuery({
    queryKey: ["evaluation-questions", trainingId],
    enabled: !!trainingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluation_questions")
        .select("*")
        .eq("training_id", trainingId!)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as unknown as EvaluationQuestion[];
    },
  });
}

export function useEvaluationAttempts() {
  return useQuery({
    queryKey: ["evaluation-attempts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluation_attempts")
        .select("*")
        .order("submitted_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return (data ?? []) as unknown as EvaluationAttempt[];
    },
  });
}

export type PairedStat = {
  key: string;
  preCount: number;
  postCount: number;
  preAvg: number | null;
  postAvg: number | null;
  improvement: number | null;
  passRate: number | null;
};

export function pairStats(
  rows: EvaluationAttempt[],
  keyFn: (r: EvaluationAttempt) => string | null,
): PairedStat[] {
  const map = new Map<string, EvaluationAttempt[]>();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    const list = map.get(k) ?? [];
    list.push(r);
    map.set(k, list);
  }
  return [...map.entries()]
    .map(([key, list]) => {
      const pre = list.filter((r) => r.phase === "pre");
      const post = list.filter((r) => r.phase === "post");
      const mean = (a: EvaluationAttempt[]) =>
        a.length ? a.reduce((s, r) => s + Number(r.score_pct), 0) / a.length : null;
      const preAvg = mean(pre);
      const postAvg = mean(post);
      return {
        key,
        preCount: pre.length,
        postCount: post.length,
        preAvg,
        postAvg,
        improvement: preAvg != null && postAvg != null ? postAvg - preAvg : null,
        passRate: post.length ? (post.filter((r) => r.passed).length / post.length) * 100 : null,
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

export type EvaluationAnswer = {
  id: string;
  attempt_id: string;
  question_id: string | null;
  question_text: string | null;
  selected_option: string | null;
  correct_option: string | null;
  is_correct: boolean;
};

/** All answers for every attempt of one training (admin only). */
export function useEvaluationAnswers(trainingId: string | null) {
  return useQuery({
    queryKey: ["evaluation-answers", trainingId],
    enabled: !!trainingId,
    queryFn: async () => {
      const { data: attempts, error: aErr } = await supabase
        .from("evaluation_attempts")
        .select("*")
        .eq("training_id", trainingId!)
        .order("submitted_at", { ascending: false })
        .limit(5000);
      if (aErr) throw aErr;
      const list = (attempts ?? []) as unknown as EvaluationAttempt[];
      if (!list.length) return { attempts: list, answers: [] as EvaluationAnswer[] };

      const answers: EvaluationAnswer[] = [];
      const ids = list.map((a) => a.id);
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await supabase
          .from("evaluation_answers")
          .select("*")
          .in("attempt_id", ids.slice(i, i + 200));
        if (error) throw error;
        answers.push(...((data ?? []) as unknown as EvaluationAnswer[]));
      }
      return { attempts: list, answers };
    },
  });
}

export type QuestionStat = {
  questionId: string;
  questionText: string;
  correctOption: string | null;
  preTotal: number;
  preCorrect: number;
  postTotal: number;
  postCorrect: number;
};

export function questionStats(
  attempts: EvaluationAttempt[],
  answers: EvaluationAnswer[],
): QuestionStat[] {
  const phaseOf = new Map(attempts.map((a) => [a.id, a.phase]));
  const map = new Map<string, QuestionStat>();
  for (const ans of answers) {
    const key = ans.question_id ?? ans.question_text ?? "unknown";
    const stat =
      map.get(key) ??
      ({
        questionId: key,
        questionText: ans.question_text ?? "(question removed)",
        correctOption: ans.correct_option,
        preTotal: 0,
        preCorrect: 0,
        postTotal: 0,
        postCorrect: 0,
      } as QuestionStat);
    const phase = phaseOf.get(ans.attempt_id);
    if (phase === "post") {
      stat.postTotal += 1;
      if (ans.is_correct) stat.postCorrect += 1;
    } else {
      stat.preTotal += 1;
      if (ans.is_correct) stat.preCorrect += 1;
    }
    map.set(key, stat);
  }
  return [...map.values()];
}
