CREATE OR REPLACE FUNCTION public.lookup_employee_names(_codes text[])
RETURNS TABLE(employee_code text, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pu.employee_code, pu.name FROM public.portal_users pu
  WHERE auth.uid() IS NOT NULL AND pu.employee_code = ANY(_codes) AND pu.status = 'active';
$$;
REVOKE ALL ON FUNCTION public.lookup_employee_names(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_employee_names(text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_employees(_q text)
RETURNS TABLE(id uuid, employee_code text, name text, designation_name text, location_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pu.id, pu.employee_code, pu.name, pu.designation_name, pu.location_name
  FROM public.portal_users pu
  WHERE auth.uid() IS NOT NULL AND pu.status = 'active' AND length(trim(_q)) > 0
    AND (pu.employee_code ILIKE trim(_q) || '%' OR pu.name ILIKE '%' || trim(_q) || '%')
  ORDER BY pu.employee_code LIMIT 20;
$$;
REVOKE ALL ON FUNCTION public.search_employees(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_employees(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.employees_by_ids(_ids uuid[])
RETURNS TABLE(id uuid, employee_code text, name text, designation_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pu.id, pu.employee_code, pu.name, pu.designation_name FROM public.portal_users pu
  WHERE auth.uid() IS NOT NULL AND pu.id = ANY(_ids);
$$;
REVOKE ALL ON FUNCTION public.employees_by_ids(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employees_by_ids(uuid[]) TO authenticated;

CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX direct_messages_pair_idx ON public.direct_messages(sender_id, recipient_id, created_at);
CREATE INDEX direct_messages_recipient_idx ON public.direct_messages(recipient_id, read_at);
GRANT SELECT, INSERT, UPDATE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dm read own" ON public.direct_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "dm send" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id
    AND EXISTS (SELECT 1 FROM public.portal_users WHERE id = recipient_id AND status = 'active'));
CREATE POLICY "dm mark read" ON public.direct_messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

-- recipients may only change read_at
CREATE OR REPLACE FUNCTION public.dm_guard_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.sender_id := OLD.sender_id; NEW.recipient_id := OLD.recipient_id;
  NEW.body := OLD.body; NEW.created_at := OLD.created_at;
  RETURN NEW;
END; $$;
CREATE TRIGGER dm_guard_update BEFORE UPDATE ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.dm_guard_update();

CREATE OR REPLACE FUNCTION public.dm_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n text;
BEGIN
  SELECT name INTO n FROM public.portal_users WHERE id = NEW.sender_id;
  IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = NEW.recipient_id AND kind = 'message'
      AND read_at IS NULL AND link = '/messages?to=' || NEW.sender_id) THEN
    PERFORM public.notify_user(NEW.recipient_id, 'message', 'New message from ' || COALESCE(n, 'an employee'),
      left(NEW.body, 120), '/messages?to=' || NEW.sender_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER dm_notify AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.dm_notify();