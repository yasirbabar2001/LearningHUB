import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FeedbackRow } from "./analytics";

export type Lov = {
  id: string;
  name: string;
  status: string;
  updated_at?: string;
  employee_code?: string | null;
};
export const LOV_TABLES = [
  "departments",
  "locations",
  "regions",
  "wings",
  "designations",
  "trainers",
  "genders",
] as const;

export type LovTable = (typeof LOV_TABLES)[number];

export type Training = {
  id: string;
  training_code: string | null;
  training_name: string;
  training_type: "classroom" | "virtual";
  training_mandatory: "mandatory" | "non_mandatory";
  training_date: string;
  training_end_date: string | null;
  trainer_id: string | null;
  venue: string | null;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  business_unit: string | null;
  department_id: string | null;
  department_ids: string[];
  location_id: string | null;
  status: string;
};

export type Question = {
  id: string;
  question_text: string;
  category: "venue" | "content" | "trainer" | "overall";
  training_type: "classroom" | "virtual" | "both";
  question_type: "rating" | "yesno" | "choice" | "text";
  options: string[] | null;
  display_order: number;
  status: string;
};

export function useLov(table: LovTable) {
  return useQuery({
    queryKey: ["lov", table],
    queryFn: async () => {
      const columns =
        table === "trainers" ? "id,name,status,updated_at,employee_code" : "id,name,status,updated_at";
      const { data, error } = await (supabase.from(table) as any).select(columns).order("name");
      if (error) throw error;
      return ((data ?? []) as unknown) as Lov[];
    },
  });
}

export function useTrainings() {
  return useQuery({
    queryKey: ["trainings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select("*")
        .order("training_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Training[];
    },
  });
}

export function useQuestions() {
  return useQuery({
    queryKey: ["questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_questions")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as unknown as Question[];
    },
  });
}

export function useFeedback() {
  return useQuery({
    queryKey: ["feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("submitted_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return (data ?? []) as unknown as FeedbackRow[];
    },
  });
}

export type Settings = {
  rating_threshold: number;
  min_sample_size: number;
  allow_multiple_submissions: boolean;
  passing_percentage: number;
  quality_weights: Record<string, Record<string, number>>;
};

export const DEFAULT_SETTINGS: Settings = {
  rating_threshold: 4,
  min_sample_size: 10,
  allow_multiple_submissions: false,
  passing_percentage: 60,
  quality_weights: {
    classroom: { content: 0.35, trainer: 0.35, venue: 0.15, overall: 0.15 },
    virtual: { content: 0.4, trainer: 0.4, overall: 0.2 },
  },
};

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<Settings> => {
      const { data, error } = await supabase.from("app_settings").select("key,value");
      if (error) throw error;
      const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
      return { ...DEFAULT_SETTINGS, ...(map as Partial<Settings>) } as Settings;
    },
  });
}

export function useSaveSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key, value: value as never, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export async function logAudit(
  action: string,
  entity?: string,
  entityId?: string,
  details?: Record<string, unknown>,
) {
  const { data } = await supabase.auth.getUser();
  await supabase.from("audit_logs").insert({
    admin_user_id: data.user?.id ?? null,
    admin_email: data.user?.email ?? null,
    action,
    entity: entity ?? null,
    entity_id: entityId ?? null,
    details: (details ?? null) as never,
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}
