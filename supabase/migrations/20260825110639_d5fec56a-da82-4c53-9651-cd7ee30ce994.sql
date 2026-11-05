CREATE TABLE public.evaluation_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text,
  option_d text,
  correct_option text NOT NULL CHECK (correct_option IN ('A','B','C','D')),
  display_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation_questions TO authenticated;
GRANT ALL ON public.evaluation_questions TO service_role;
ALTER TABLE public.evaluation_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin evaluation questions" ON public.evaluation_questions FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER u10 BEFORE UPDATE ON public.evaluation_questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_eval_questions_training ON public.evaluation_questions(training_id);

CREATE TABLE public.evaluation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('pre','post')),
  employee_code text NOT NULL,
  employee_name text NOT NULL,
  designation_id uuid REFERENCES public.designations(id),
  department_id uuid REFERENCES public.departments(id),
  location_id uuid REFERENCES public.locations(id),
  region_id uuid REFERENCES public.regions(id),
  wing_id uuid REFERENCES public.wings(id),
  gender_id uuid REFERENCES public.genders(id),
  designation_name text,
  department_name text,
  location_name text,
  region_name text,
  wing_name text,
  gender_name text,
  training_name text,
  training_code text,
  training_type text,
  training_date date,
  trainer_name text,
  total_questions integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  score_pct numeric NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.evaluation_attempts TO authenticated;
GRANT ALL ON public.evaluation_attempts TO service_role;
ALTER TABLE public.evaluation_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads evaluation attempts" ON public.evaluation_attempts FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin deletes evaluation attempts" ON public.evaluation_attempts FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE UNIQUE INDEX idx_eval_attempt_unique ON public.evaluation_attempts(training_id, phase, lower(employee_code));
CREATE INDEX idx_eval_attempts_training ON public.evaluation_attempts(training_id);

CREATE TABLE public.evaluation_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.evaluation_attempts(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.evaluation_questions(id) ON DELETE SET NULL,
  question_text text,
  selected_option text,
  correct_option text,
  is_correct boolean NOT NULL DEFAULT false
);
GRANT SELECT, DELETE ON public.evaluation_answers TO authenticated;
GRANT ALL ON public.evaluation_answers TO service_role;
ALTER TABLE public.evaluation_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads evaluation answers" ON public.evaluation_answers FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin deletes evaluation answers" ON public.evaluation_answers FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_eval_answers_attempt ON public.evaluation_answers(attempt_id);

INSERT INTO public.app_settings (key, value) VALUES ('passing_percentage', '60'::jsonb)
ON CONFLICT (key) DO NOTHING;