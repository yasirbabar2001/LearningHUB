import { z } from "zod";

export const surveySubmissionSchema = z.object({
  survey_id: z.string().uuid().nullable().optional(),
  employee_code: z.string().trim().max(50).nullable().optional(),
  department_id: z.string().uuid().nullable().optional(),
  designation_id: z.string().uuid().nullable().optional(),
  tenure: z.string().trim().max(60).nullable().optional(),
  ratings: z.record(z.string(), z.number().int().min(0).max(10)),
  choices: z.record(z.string(), z.union([z.string(), z.array(z.string().max(120))])),
  comments: z.record(z.string(), z.string().max(4000)),
  nps: z.number().int().min(0).max(10).nullable().optional(),
  overall_rating: z.number().int().min(1).max(5).nullable().optional(),
});

export type SurveySubmission = z.infer<typeof surveySubmissionSchema>;
