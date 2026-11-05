ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS training_mandatory text NOT NULL DEFAULT 'non_mandatory';
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS training_mandatory text;

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

  SELECT tr.training_name, tr.training_code, tr.training_type, tr.training_date,
         tr.training_mandatory, tn.name AS trainer_name
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
  NEW.training_mandatory := t.training_mandatory;
  NEW.trainer_name := t.trainer_name;
  RETURN NEW;
END; $function$;

UPDATE public.feedback f SET training_mandatory = tr.training_mandatory
FROM public.trainings tr WHERE tr.id = f.training_id AND f.training_mandatory IS NULL;