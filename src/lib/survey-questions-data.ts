import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  SURVEY_QUESTIONS,
  SURVEY_SECTIONS,
  SURVEY_SECTION_TITLES,
  type SurveyQuestion,
  type SurveyQuestionType,
} from "@/lib/survey-spec";

export type SurveyQuestionRow = {
  id: string;
  code: string;
  num: number;
  question_text: string;
  qtype: string;
  options: string[] | null;
  scale_labels: string[] | null;
  max_select: number | null;
  section: string;
  section_title: string | null;
  optional: boolean;
  status: string;
  display_order: number;
};

const SECTION_NOTES = Object.fromEntries(SURVEY_SECTIONS.map((s) => [s.key, s.note ?? null]));

export type SurveySection = { key: string; title: string; note?: string | null };

function toSpec(row: SurveyQuestionRow): SurveyQuestion {
  return {
    id: row.code,
    num: row.num,
    text: row.question_text,
    type: row.qtype as SurveyQuestionType,
    ...(row.options ? { options: row.options } : {}),
    ...(row.scale_labels ? { scaleLabels: row.scale_labels } : {}),
    ...(row.max_select ? { maxSelect: row.max_select } : {}),
    section: row.section,
    optional: row.optional,
  };
}

/** All survey questions as stored by the admin (falls back to the built-in set when empty). */
export function useSurveyQuestionRows(includeInactive = false) {
  return useQuery({
    queryKey: ["survey-questions", includeInactive],
    queryFn: async () => {
      const q = supabase
        .from("survey_questions")
        .select(
          "id,code,num,question_text,qtype,options,scale_labels,max_select,section,section_title,optional,status,display_order",
        )
        .order("display_order");
      const { data, error } = includeInactive ? await q : await q.eq("status", "active");
      if (error) throw error;
      return (data ?? []) as unknown as SurveyQuestionRow[];
    },
  });
}

/** Live question list + sections for the employee survey and the admin report. */
export function useSurveyQuestions() {
  const rows = useSurveyQuestionRows();

  const questions = useMemo<SurveyQuestion[]>(() => {
    if (!rows.data) return [];
    if (!rows.data.length) return SURVEY_QUESTIONS;
    return rows.data.map(toSpec);
  }, [rows.data]);

  const sections = useMemo<SurveySection[]>(() => {
    const seen = new Map<string, SurveySection>();
    const titleOf = (key: string, custom?: string | null) =>
      custom || SURVEY_SECTION_TITLES[key] || "Additional Questions";
    if (!rows.data?.length) {
      return SURVEY_SECTIONS.map((s) => ({ key: s.key, title: s.title, note: s.note ?? null }));
    }
    for (const r of rows.data) {
      if (!seen.has(r.section)) {
        seen.set(r.section, {
          key: r.section,
          title: titleOf(r.section, r.section_title),
          note: SECTION_NOTES[r.section] ?? null,
        });
      }
    }
    return [...seen.values()];
  }, [rows.data]);

  return { questions, sections, isLoading: rows.isLoading };
}

export function useSaveSurveyQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      question_text: string;
      qtype: string;
      section: string;
      section_title?: string | null;
      options?: string[] | null;
      optional?: boolean;
    }) => {
      const text = input.question_text.trim();
      if (!text) throw new Error("Please enter the question.");
      const { data: last } = await supabase
        .from("survey_questions")
        .select("num,display_order")
        .order("display_order", { ascending: false })
        .limit(1);
      const prev = last?.[0];
      const { error } = await supabase.from("survey_questions").insert({
        code: `custom_${Date.now().toString(36)}`,
        num: (prev?.num ?? 0) + 1,
        question_text: text,
        qtype: input.qtype,
        options: (input.options?.length ? input.options : null) as never,
        scale_labels: null,
        section: input.section,
        section_title: input.section_title?.trim() || null,
        optional: input.optional ?? false,
        display_order: (prev?.display_order ?? 0) + 10,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["survey-questions"] }),
  });
}

export function useSetSurveyQuestionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("survey_questions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["survey-questions"] }),
  });
}

export function useDeleteSurveyQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("survey_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["survey-questions"] }),
  });
}
