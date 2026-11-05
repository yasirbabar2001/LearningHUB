CREATE OR REPLACE FUNCTION public.is_admin_user(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'admin');
$$;
REVOKE ALL ON FUNCTION public.is_admin_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.leaderboard_stamp_author()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p RECORD; adm boolean; is_post boolean := (TG_TABLE_NAME = 'leaderboard_posts');
BEGIN
  NEW.author_user_id := auth.uid();
  adm := public.is_admin_user(auth.uid());
  -- Admins post as the L&D Team only when they ask to (admin screen); otherwise under their own name.
  NEW.is_admin_post := COALESCE(adm, false) AND COALESCE(NEW.is_admin_post, false);
  NEW.status := 'pending';
  IF is_post THEN NEW.approved_at := NULL; END IF;
  IF NEW.is_admin_post THEN
    NEW.author_name := 'ABHI L&D Team';
    NEW.author_designation := NULL;
    IF is_post THEN NEW.author_location := NULL; END IF;
  ELSE
    SELECT name, designation_name, location_name INTO p FROM public.portal_users WHERE id = auth.uid();
    NEW.author_name := COALESCE(p.name, 'Employee');
    NEW.author_designation := p.designation_name;
    IF is_post THEN NEW.author_location := p.location_name; END IF;
  END IF;
  RETURN NEW;
END; $function$;

ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS team_admin_id uuid;
DROP POLICY IF EXISTS "dm send" ON public.direct_messages;
CREATE POLICY "dm send" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id
    AND (
      (team_admin_id IS NULL AND EXISTS (SELECT 1 FROM public.portal_users WHERE id = recipient_id AND status = 'active'))
      OR (team_admin_id = sender_id AND public.is_admin_user(sender_id))
      OR (team_admin_id = recipient_id AND public.is_admin_user(recipient_id))
    ));

CREATE OR REPLACE FUNCTION public.dm_guard_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.sender_id := OLD.sender_id; NEW.recipient_id := OLD.recipient_id;
  NEW.body := OLD.body; NEW.created_at := OLD.created_at; NEW.team_admin_id := OLD.team_admin_id;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.dm_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n text; tgt text;
BEGIN
  IF NEW.team_admin_id IS NOT NULL AND NEW.team_admin_id = NEW.sender_id THEN
    n := 'ABHI L&D Team'; tgt := '/leaderboard?chat=team:' || NEW.sender_id;
  ELSIF NEW.team_admin_id IS NOT NULL THEN
    SELECT name INTO n FROM public.portal_users WHERE id = NEW.sender_id;
    tgt := '/leaderboard-admin?chat=' || NEW.sender_id;
  ELSE
    SELECT name INTO n FROM public.portal_users WHERE id = NEW.sender_id;
    tgt := '/leaderboard?chat=' || NEW.sender_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = NEW.recipient_id AND kind = 'message'
      AND read_at IS NULL AND link = tgt) THEN
    PERFORM public.notify_user(NEW.recipient_id, 'message', 'New ABHI Chat message from ' || COALESCE(n, 'an employee'),
      left(NEW.body, 120), tgt);
  END IF;
  RETURN NEW;
END; $$;