CREATE TABLE public.lnd_survey_responses (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  employee_code text,
  department_id uuid references public.departments(id),
  department_name text,
  designation_id uuid references public.designations(id),
  designation_name text,
  tenure text,
  ratings jsonb not null default '{}'::jsonb,
  choices jsonb not null default '{}'::jsonb,
  comments jsonb not null default '{}'::jsonb,
  nps integer,
  overall_rating integer
);

GRANT SELECT, DELETE ON public.lnd_survey_responses TO authenticated;
GRANT ALL ON public.lnd_survey_responses TO service_role;

ALTER TABLE public.lnd_survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin reads survey" ON public.lnd_survey_responses FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "admin deletes survey" ON public.lnd_survey_responses FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));

CREATE INDEX lnd_survey_responses_submitted_at_idx ON public.lnd_survey_responses (submitted_at DESC);