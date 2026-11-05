CREATE TABLE public.genders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.genders TO authenticated;
GRANT SELECT ON public.genders TO anon;
GRANT ALL ON public.genders TO service_role;
ALTER TABLE public.genders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin genders" ON public.genders FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "public active genders" ON public.genders FOR SELECT TO anon, authenticated USING ((status = 'active') OR has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER u9 BEFORE UPDATE ON public.genders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.genders (name) VALUES ('Male'), ('Female');

ALTER TABLE public.respondents ADD COLUMN gender_id uuid REFERENCES public.genders(id);
ALTER TABLE public.feedback ADD COLUMN gender_name text;

CREATE OR REPLACE FUNCTION public.feedback_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r RECORD; t RECORD;
BEGIN
  SELECT rs.employee_code, rs.name,
         d.name AS designation_name, dp.name AS department_name,
         l.name AS location_name, rg.name AS region_name, w.name AS wing_name,
         g.name AS gender_name
    INTO r
  FROM public.respondents rs
  LEFT JOIN public.designations d ON d.id = rs.designation_id
  LEFT JOIN public.departments dp ON dp.id = rs.department_id
  LEFT JOIN public.locations l ON l.id = rs.location_id
  LEFT JOIN public.regions rg ON rg.id = rs.region_id
  LEFT JOIN public.wings w ON w.id = rs.wing_id
  LEFT JOIN public.genders g ON g.id = rs.gender_id
  WHERE rs.id = NEW.respondent_id;

  SELECT tr.training_name, tr.training_code, tr.training_type, tr.training_date, tn.name AS trainer_name
    INTO t
  FROM public.trainings tr LEFT JOIN public.trainers tn ON tn.id = tr.trainer_id
  WHERE tr.id = NEW.training_id;

  NEW.employee_code := r.employee_code;
  NEW.employee_name := r.name;
  NEW.designation_name := r.designation_name;
  NEW.department_name := r.department_name;
  NEW.location_name := r.location_name;
  NEW.region_name := r.region_name;
  NEW.wing_name := r.wing_name;
  NEW.gender_name := r.gender_name;
  NEW.training_name := t.training_name;
  NEW.training_code := t.training_code;
  NEW.training_type := t.training_type;
  NEW.training_date := t.training_date;
  NEW.trainer_name := t.trainer_name;
  RETURN NEW;
END; $function$;

UPDATE public.respondents SET gender_id = (SELECT id FROM public.genders WHERE name = 'Male') WHERE gender_id IS NULL;
UPDATE public.feedback SET gender_name = 'Male' WHERE gender_name IS NULL;