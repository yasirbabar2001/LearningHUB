CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  IF lower(COALESCE(NEW.email, '')) IN ('yasir.starr2001@gmail.com', 'yasir.babar@abhibank.com')
     OR EXISTS (SELECT 1 FROM public.pending_admins pa WHERE pa.email = lower(COALESCE(NEW.email, ''))) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    DELETE FROM public.pending_admins WHERE email = lower(COALESCE(NEW.email, ''));
  END IF;

  RETURN NEW;
END;
$function$;