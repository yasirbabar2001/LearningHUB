CREATE TABLE public.surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.surveys TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO authenticated;
GRANT ALL ON public.surveys TO service_role;

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active surveys"
  ON public.surveys FOR SELECT
  USING (status = 'active' OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage surveys"
  ON public.surveys FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER u_surveys BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lnd_survey_responses
  ADD COLUMN survey_id uuid REFERENCES public.surveys(id) ON DELETE SET NULL,
  ADD COLUMN survey_title text;

INSERT INTO public.surveys (title, subtitle, status)
VALUES ('L&D Effectiveness Survey 2026', 'ABHI Microfinance Bank · Learning & Development', 'active');

UPDATE public.lnd_survey_responses
SET survey_id = (SELECT id FROM public.surveys ORDER BY created_at LIMIT 1),
    survey_title = 'L&D Effectiveness Survey 2026'
WHERE survey_id IS NULL;