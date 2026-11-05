CREATE TABLE public.coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  employee_code text,
  employee_name text,
  department_name text,
  designation_name text,
  session_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user','coach')),
  body text NOT NULL,
  is_error boolean NOT NULL DEFAULT false,
  response_ms integer,
  rating smallint CHECK (rating IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coach_messages_user_idx ON public.coach_messages (user_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.coach_messages TO authenticated;
GRANT ALL ON public.coach_messages TO service_role;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach own insert" ON public.coach_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "coach own or admin read" ON public.coach_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()));
CREATE POLICY "coach own rate" ON public.coach_messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.coach_messages_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.user_id := auth.uid();
    NEW.created_at := now();
    NEW.rating := NULL;
    SELECT employee_code, name, department_name, designation_name INTO p FROM public.portal_users WHERE id = auth.uid();
    NEW.employee_code := p.employee_code; NEW.employee_name := p.name;
    NEW.department_name := p.department_name; NEW.designation_name := p.designation_name;
  ELSE
    -- Only the rating may change, and only on coach replies.
    NEW.id := OLD.id; NEW.user_id := OLD.user_id; NEW.employee_code := OLD.employee_code;
    NEW.employee_name := OLD.employee_name; NEW.department_name := OLD.department_name;
    NEW.designation_name := OLD.designation_name; NEW.session_id := OLD.session_id;
    NEW.role := OLD.role; NEW.body := OLD.body; NEW.is_error := OLD.is_error;
    NEW.response_ms := OLD.response_ms; NEW.created_at := OLD.created_at;
    IF OLD.role <> 'coach' THEN NEW.rating := OLD.rating; END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER coach_messages_guard BEFORE INSERT OR UPDATE ON public.coach_messages
  FOR EACH ROW EXECUTE FUNCTION public.coach_messages_guard();