CREATE OR REPLACE FUNCTION public.leaderboard_stamp_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD; adm boolean; is_post boolean := (TG_TABLE_NAME = 'leaderboard_posts');
BEGIN
  NEW.author_user_id := auth.uid();
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin') INTO adm;
  NEW.is_admin_post := COALESCE(adm, false);
  NEW.status := 'pending';
  IF is_post THEN NEW.approved_at := NULL; END IF;

  IF NEW.is_admin_post THEN
    NEW.author_name := 'ABHI L&D Team';
    NEW.author_designation := NULL;
    IF is_post THEN NEW.author_location := NULL; END IF;
  ELSE
    SELECT name, designation_name, location_name INTO p
      FROM public.portal_users WHERE id = auth.uid();
    NEW.author_name := COALESCE(p.name, 'Employee');
    NEW.author_designation := p.designation_name;
    IF is_post THEN NEW.author_location := p.location_name; END IF;
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.leaderboard_stamp_author() FROM public, anon, authenticated;