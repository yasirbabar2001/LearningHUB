CREATE TABLE public.profile_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_code text,
  employee_name text,
  status text NOT NULL DEFAULT 'pending',
  avatar_path text,
  designation_id uuid REFERENCES public.designations(id),
  department_id uuid REFERENCES public.departments(id),
  location_id uuid REFERENCES public.locations(id),
  region_id uuid REFERENCES public.regions(id),
  wing_id uuid REFERENCES public.wings(id),
  designation_name text,
  department_name text,
  location_name text,
  region_name text,
  wing_name text,
  current_designation_name text,
  current_department_name text,
  current_location_name text,
  current_region_name text,
  current_wing_name text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_change_requests TO authenticated;
GRANT ALL ON public.profile_change_requests TO service_role;

ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile change requests"
  ON public.profile_change_requests FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

CREATE POLICY "Admins manage profile change requests"
  ON public.profile_change_requests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE INDEX profile_change_requests_status_idx ON public.profile_change_requests (status, created_at DESC);
CREATE UNIQUE INDEX profile_change_requests_one_pending_idx ON public.profile_change_requests (user_id) WHERE status = 'pending';

CREATE TRIGGER u_profile_change_requests BEFORE UPDATE ON public.profile_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();