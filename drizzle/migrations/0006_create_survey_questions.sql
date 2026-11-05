CREATE TABLE public.survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  num integer NOT NULL DEFAULT 0,
  question_text text NOT NULL,
  qtype text NOT NULL DEFAULT 'scale5',
  options jsonb,
  scale_labels jsonb,
  max_select integer,
  section text NOT NULL DEFAULT 'custom',
  section_title text,
  optional boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.survey_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_questions TO authenticated;
GRANT ALL ON public.survey_questions TO service_role;

ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read survey questions"
  ON public.survey_questions FOR SELECT
  USING (true);

CREATE POLICY "admin survey questions"
  ON public.survey_questions FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER u_survey_questions BEFORE UPDATE ON public.survey_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();