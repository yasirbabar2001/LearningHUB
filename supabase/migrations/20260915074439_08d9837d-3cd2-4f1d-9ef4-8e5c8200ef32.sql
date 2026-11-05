CREATE TABLE public.tna_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, title)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tna_cycles TO authenticated;
GRANT SELECT ON public.tna_cycles TO anon;
GRANT ALL ON public.tna_cycles TO service_role;
ALTER TABLE public.tna_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages tna cycles" ON public.tna_cycles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "public reads active tna cycles" ON public.tna_cycles FOR SELECT TO anon, authenticated
  USING (status = 'active' OR private.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER u_tna_cycles BEFORE UPDATE ON public.tna_cycles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.tna_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.tna_cycles(id) ON DELETE CASCADE,
  skill_type text NOT NULL DEFAULT 'soft',
  name text NOT NULL,
  description text,
  designation text,
  department text,
  display_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tna_skills_cycle ON public.tna_skills(cycle_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tna_skills TO authenticated;
GRANT ALL ON public.tna_skills TO service_role;
ALTER TABLE public.tna_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages tna skills" ON public.tna_skills FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER u_tna_skills BEFORE UPDATE ON public.tna_skills FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.tna_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.tna_cycles(id) ON DELETE CASCADE,
  employee_code text NOT NULL,
  name text NOT NULL,
  designation text,
  sub_department text,
  department text,
  branch text,
  region text,
  wing text,
  gender text,
  manager_code text,
  manager_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, employee_code)
);
CREATE INDEX idx_tna_staff_manager ON public.tna_staff(cycle_id, manager_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tna_staff TO authenticated;
GRANT ALL ON public.tna_staff TO service_role;
ALTER TABLE public.tna_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages tna staff" ON public.tna_staff FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER u_tna_staff BEFORE UPDATE ON public.tna_staff FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.tna_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.tna_cycles(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.tna_staff(id) ON DELETE CASCADE,
  employee_code text NOT NULL,
  employee_name text NOT NULL,
  designation text,
  sub_department text,
  department text,
  branch text,
  region text,
  wing text,
  gender text,
  manager_code text,
  manager_name text,
  avg_soft numeric,
  avg_technical numeric,
  avg_overall numeric,
  gap_count integer NOT NULL DEFAULT 0,
  comments text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, staff_id)
);
CREATE INDEX idx_tna_assessments_cycle ON public.tna_assessments(cycle_id);
GRANT SELECT, DELETE ON public.tna_assessments TO authenticated;
GRANT ALL ON public.tna_assessments TO service_role;
ALTER TABLE public.tna_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads tna assessments" ON public.tna_assessments FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin deletes tna assessments" ON public.tna_assessments FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.tna_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.tna_assessments(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.tna_cycles(id) ON DELETE CASCADE,
  skill_id uuid REFERENCES public.tna_skills(id) ON DELETE SET NULL,
  skill_name text NOT NULL,
  skill_type text NOT NULL,
  rating integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tna_ratings_cycle ON public.tna_ratings(cycle_id);
GRANT SELECT, DELETE ON public.tna_ratings TO authenticated;
GRANT ALL ON public.tna_ratings TO service_role;
ALTER TABLE public.tna_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads tna ratings" ON public.tna_ratings FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin deletes tna ratings" ON public.tna_ratings FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.training_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.tna_cycles(id) ON DELETE CASCADE,
  year integer NOT NULL,
  skill_name text NOT NULL,
  skill_type text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  priority_score numeric NOT NULL DEFAULT 0,
  affected_count integer NOT NULL DEFAULT 0,
  avg_rating numeric,
  audience text,
  month integer NOT NULL DEFAULT 1,
  quarter integer NOT NULL DEFAULT 1,
  delivery_mode text NOT NULL DEFAULT 'classroom',
  notes text,
  status text NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_training_calendar_cycle ON public.training_calendar(cycle_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_calendar TO authenticated;
GRANT SELECT ON public.training_calendar TO anon;
GRANT ALL ON public.training_calendar TO service_role;
ALTER TABLE public.training_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages training calendar" ON public.training_calendar FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "public reads calendar of active cycles" ON public.training_calendar FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.tna_cycles c WHERE c.id = training_calendar.cycle_id AND c.status = 'active')
         OR private.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER u_training_calendar BEFORE UPDATE ON public.training_calendar FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();