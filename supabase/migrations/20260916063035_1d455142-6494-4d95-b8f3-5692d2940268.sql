CREATE TABLE public.portal_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_code text NOT NULL UNIQUE,
  cnic text,
  name text NOT NULL,
  designation_id uuid REFERENCES public.designations(id),
  department_id uuid REFERENCES public.departments(id),
  location_id uuid REFERENCES public.locations(id),
  region_id uuid REFERENCES public.regions(id),
  wing_id uuid REFERENCES public.wings(id),
  gender_id uuid REFERENCES public.genders(id),
  designation_name text,
  department_name text,
  location_name text,
  region_name text,
  wing_name text,
  gender_name text,
  status text NOT NULL DEFAULT 'active',
  must_change_password boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_users TO authenticated;
GRANT ALL ON public.portal_users TO service_role;

ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own portal record"
ON public.portal_users FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins manage portal users"
ON public.portal_users FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_portal_users_code ON public.portal_users (employee_code);

CREATE TRIGGER u_portal_users BEFORE UPDATE ON public.portal_users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();