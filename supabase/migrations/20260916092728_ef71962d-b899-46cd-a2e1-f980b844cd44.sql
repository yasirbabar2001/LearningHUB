CREATE TABLE public.training_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  employee_code text NOT NULL,
  employee_name text,
  portal_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX training_participants_unique ON public.training_participants (training_id, lower(employee_code));
CREATE INDEX training_participants_code_idx ON public.training_participants (lower(employee_code));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_participants TO authenticated;
GRANT ALL ON public.training_participants TO service_role;

ALTER TABLE public.training_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin training participants" ON public.training_participants
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER u_training_participants BEFORE UPDATE ON public.training_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();