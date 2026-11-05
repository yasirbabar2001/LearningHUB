ALTER TABLE public.trainings
  ALTER COLUMN training_code DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS training_end_date date,
  ADD COLUMN IF NOT EXISTS department_ids uuid[] NOT NULL DEFAULT '{}';

UPDATE public.trainings SET training_end_date = training_date WHERE training_end_date IS NULL;
UPDATE public.trainings SET department_ids = ARRAY[department_id] WHERE department_id IS NOT NULL AND cardinality(department_ids) = 0;