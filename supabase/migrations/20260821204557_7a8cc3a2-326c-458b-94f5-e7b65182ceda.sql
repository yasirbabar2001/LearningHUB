CREATE TABLE public.trainer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES public.trainers(id),
  training_id uuid NOT NULL REFERENCES public.trainings(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  trainer_name text,
  training_name text,
  training_code text,
  training_type text,
  training_date date,
  training_mandatory text,
  participants_count integer,
  engagement_rating integer,
  knowledge_rating integer,
  logistics_rating integer,
  material_rating integer,
  time_rating integer,
  support_rating integer,
  overall_rating integer,
  avg_rating numeric,
  objectives_achieved boolean,
  strengths text,
  challenges text,
  suggestions text,
  additional_comments text
);

GRANT SELECT, DELETE ON public.trainer_feedback TO authenticated;
GRANT ALL ON public.trainer_feedback TO service_role;

ALTER TABLE public.trainer_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin reads trainer feedback" ON public.trainer_feedback
FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin deletes trainer feedback" ON public.trainer_feedback
FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));