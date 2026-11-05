CREATE OR REPLACE FUNCTION private.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) IN ('yasir.starr2001@gmail.com', 'yasir.babar@abhibank.com')
$$;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'owner'::app_role FROM auth.users u WHERE lower(u.email) = 'yasir.babar@abhibank.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role FROM auth.users u WHERE lower(u.email) = 'yasir.babar@abhibank.com'
ON CONFLICT (user_id, role) DO NOTHING;