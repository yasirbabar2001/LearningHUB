CREATE TABLE IF NOT EXISTS public.pending_admins (
  email text PRIMARY KEY,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.pending_admins TO authenticated;
GRANT ALL ON public.pending_admins TO service_role;

ALTER TABLE public.pending_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages pending admins" ON public.pending_admins;
CREATE POLICY "owner manages pending admins" ON public.pending_admins
  FOR ALL TO authenticated
  USING (private.is_owner()) WITH CHECK (private.is_owner());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  IF lower(COALESCE(NEW.email, '')) = 'yasir.starr2001@gmail.com'
     OR EXISTS (SELECT 1 FROM public.pending_admins pa WHERE pa.email = lower(COALESCE(NEW.email, ''))) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    DELETE FROM public.pending_admins WHERE email = lower(COALESCE(NEW.email, ''));
  END IF;

  RETURN NEW;
END; $function$;