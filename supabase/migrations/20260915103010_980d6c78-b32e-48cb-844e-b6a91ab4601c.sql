ALTER TABLE public.training_calendar ADD COLUMN IF NOT EXISTS skills_covered text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.training_calendar_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.tna_cycles(id) ON DELETE CASCADE,
  calendar_id uuid REFERENCES public.training_calendar(id) ON DELETE CASCADE,
  year integer NOT NULL,
  program_name text NOT NULL,
  employee_code text NOT NULL,
  employee_name text NOT NULL,
  designation text,
  department text,
  sub_department text,
  branch text,
  region text,
  wing text,
  skills text[] NOT NULL DEFAULT '{}',
  avg_rating numeric,
  priority text NOT NULL DEFAULT 'medium',
  month integer NOT NULL,
  quarter integer NOT NULL,
  training_date date NOT NULL,
  delivery_mode text NOT NULL DEFAULT 'classroom',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_calendar_participants TO authenticated;
GRANT ALL ON public.training_calendar_participants TO service_role;

ALTER TABLE public.training_calendar_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view calendar participants"
  ON public.training_calendar_participants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage calendar participants"
  ON public.training_calendar_participants FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_tcp_cycle ON public.training_calendar_participants (cycle_id);
CREATE INDEX IF NOT EXISTS idx_tcp_year_month ON public.training_calendar_participants (year, month);

CREATE TRIGGER u_training_calendar_participants
  BEFORE UPDATE ON public.training_calendar_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();