CREATE OR REPLACE FUNCTION public.dm_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n text;
BEGIN
  SELECT name INTO n FROM public.portal_users WHERE id = NEW.sender_id;
  IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = NEW.recipient_id AND kind = 'message'
      AND read_at IS NULL AND link = '/leaderboard?chat=' || NEW.sender_id) THEN
    PERFORM public.notify_user(NEW.recipient_id, 'message', 'New ABHI Chat message from ' || COALESCE(n, 'an employee'),
      left(NEW.body, 120), '/leaderboard?chat=' || NEW.sender_id);
  END IF;
  RETURN NEW;
END; $$;