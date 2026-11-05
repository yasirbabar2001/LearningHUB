import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Survey = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: string;
  created_at: string;
};

/** Every survey the current viewer can see. Admins see all; the public only sees active ones (RLS). */
export function useSurveys() {
  return useQuery({
    queryKey: ["surveys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surveys")
        .select("id,title,subtitle,description,status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Survey[];
    },
  });
}

export function useSaveSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (survey: Partial<Survey> & { title: string }) => {
      const payload = {
        title: survey.title.trim(),
        subtitle: survey.subtitle?.trim() || null,
        description: survey.description?.trim() || null,
        status: survey.status ?? "active",
      };
      if (survey.id) {
        const { error } = await supabase.from("surveys").update(payload).eq("id", survey.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("surveys").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["surveys"] }),
  });
}

export function useSetSurveyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("surveys").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["surveys"] }),
  });
}

export function useDeleteSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("surveys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["surveys"] }),
  });
}
