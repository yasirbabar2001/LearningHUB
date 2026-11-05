
-- Backfill existing trainings with sequential codes
WITH ranked AS (
  SELECT id,
         training_mandatory,
         row_number() OVER (PARTITION BY training_mandatory ORDER BY created_at, id) AS rn
  FROM public.trainings
)
UPDATE public.trainings t
SET training_code = CASE WHEN r.training_mandatory = 'mandatory' THEN 'M' ELSE 'N' END
                    || lpad(r.rn::text, 4, '0')
FROM ranked r
WHERE t.id = r.id;

CREATE SEQUENCE IF NOT EXISTS public.training_code_mandatory_seq;
CREATE SEQUENCE IF NOT EXISTS public.training_code_non_mandatory_seq;

SELECT setval('public.training_code_mandatory_seq',
  GREATEST(1, (SELECT count(*) FROM public.trainings WHERE training_mandatory = 'mandatory')),
  (SELECT count(*) FROM public.trainings WHERE training_mandatory = 'mandatory') > 0);
SELECT setval('public.training_code_non_mandatory_seq',
  GREATEST(1, (SELECT count(*) FROM public.trainings WHERE training_mandatory <> 'mandatory')),
  (SELECT count(*) FROM public.trainings WHERE training_mandatory <> 'mandatory') > 0);

GRANT USAGE, SELECT ON SEQUENCE public.training_code_mandatory_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.training_code_non_mandatory_seq TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_training_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.training_mandatory = 'mandatory' THEN
      NEW.training_code := 'M' || lpad(nextval('public.training_code_mandatory_seq')::text, 4, '0');
    ELSE
      NEW.training_code := 'N' || lpad(nextval('public.training_code_non_mandatory_seq')::text, 4, '0');
    END IF;
  ELSE
    NEW.training_code := OLD.training_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trainings_assign_code ON public.trainings;
CREATE TRIGGER trainings_assign_code
BEFORE INSERT OR UPDATE ON public.trainings
FOR EACH ROW EXECUTE FUNCTION public.assign_training_code();

CREATE UNIQUE INDEX IF NOT EXISTS trainings_training_code_key ON public.trainings (training_code);
