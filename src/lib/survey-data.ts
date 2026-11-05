import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SurveyResponse = {
  id: string;
  submitted_at: string;
  survey_id: string | null;
  survey_title: string | null;
  employee_code: string | null;
  department_name: string | null;
  designation_name: string | null;
  tenure: string | null;
  ratings: Record<string, number>;
  choices: Record<string, string | string[]>;
  comments: Record<string, string>;
  nps: number | null;
  overall_rating: number | null;
};

export function useSurveyResponses() {
  return useQuery({
    queryKey: ["lnd-survey"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lnd_survey_responses")
        .select("*")
        .order("submitted_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return (data ?? []) as unknown as SurveyResponse[];
    },
  });
}

export function avgOf(rows: SurveyResponse[], id: string): number | null {
  const vals = rows.map((r) => r.ratings?.[id]).filter((v): v is number => typeof v === "number");
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function countsOf(rows: SurveyResponse[], id: string, options: string[]) {
  const map = new Map(options.map((o) => [o, 0]));
  for (const r of rows) {
    const v = r.choices?.[id];
    const list = Array.isArray(v) ? v : v ? [v] : [];
    for (const item of list) map.set(item, (map.get(item) ?? 0) + 1);
  }
  return options.map((o) => ({ option: o, count: map.get(o) ?? 0 }));
}

export function npsScore(rows: SurveyResponse[]): number | null {
  const vals = rows.map((r) => r.nps).filter((v): v is number => typeof v === "number");
  if (!vals.length) return null;
  const promoters = vals.filter((v) => v >= 9).length;
  const detractors = vals.filter((v) => v <= 6).length;
  return ((promoters - detractors) / vals.length) * 100;
}
