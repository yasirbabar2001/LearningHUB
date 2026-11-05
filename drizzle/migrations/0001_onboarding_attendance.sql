CREATE TABLE public.onboarding_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_user_id uuid NOT NULL,
  trainer_employee_code text,
  trainer_name text,
  trainer_designation text,
  trainer_location text,
  cnic text NOT NULL,
  new_joiner_name text NOT NULL,
  designation_id uuid REFERENCES public.designations(id),
  designation_name text,
  location_id uuid REFERENCES public.locations(id),
  location_name text,
  region_name text,
  wing_name text,
  training_date date NOT NULL,
  venue_location_id uuid REFERENCES public.locations(id),
  venue_name text,
  photo_path text,
  training_id uuid REFERENCES public.trainings(id),
  feedback_id uuid REFERENCES public.feedback(id),
  feedback_submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.onboarding_attendance TO authenticated;
GRANT ALL ON public.onboarding_attendance TO service_role;

ALTER TABLE public.onboarding_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own onboarding rows" ON public.onboarding_attendance
  FOR SELECT TO authenticated USING (trainer_user_id = auth.uid());

CREATE POLICY "admin onboarding rows" ON public.onboarding_attendance
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER u_onboarding_attendance BEFORE UPDATE ON public.onboarding_attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "onboarding photos insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'onboarding-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "onboarding photos read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'onboarding-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.has_role(auth.uid(), 'admin')));