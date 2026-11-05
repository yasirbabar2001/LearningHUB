CREATE OR REPLACE FUNCTION private.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'yasir.starr2001@gmail.com'
$$;

REVOKE EXECUTE ON FUNCTION private.is_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_owner() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;

CREATE POLICY "owner manages roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (private.is_owner())
WITH CHECK (private.is_owner());

DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()) OR private.is_owner());

CREATE POLICY "owner reads all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (private.is_owner());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  IF lower(COALESCE(NEW.email, '')) = 'yasir.starr2001@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;