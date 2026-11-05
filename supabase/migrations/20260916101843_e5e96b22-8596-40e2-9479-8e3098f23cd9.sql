
-- 1. Comment reactions -------------------------------------------------
CREATE TABLE public.leaderboard_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.leaderboard_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id, kind)
);
GRANT SELECT, INSERT, DELETE ON public.leaderboard_comment_reactions TO authenticated;
GRANT ALL ON public.leaderboard_comment_reactions TO service_role;
ALTER TABLE public.leaderboard_comment_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read comment reactions" ON public.leaderboard_comment_reactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "own comment reactions insert" ON public.leaderboard_comment_reactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own comment reactions delete" ON public.leaderboard_comment_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 2. Notifications ------------------------------------------------------
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications read" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY "own notifications update" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _kind text, _title text, _body text, _link text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  SELECT _user_id, _kind, _title, _body, _link WHERE _user_id IS NOT NULL;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid,text,text,text,text) FROM public, anon, authenticated;

-- new training assigned
CREATE OR REPLACE FUNCTION public.notify_training_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid; t RECORD;
BEGIN
  uid := NEW.portal_user_id;
  IF uid IS NULL THEN
    SELECT id INTO uid FROM public.portal_users WHERE lower(employee_code) = lower(NEW.employee_code);
  END IF;
  IF uid IS NULL THEN RETURN NEW; END IF;
  SELECT training_name, training_code, training_date, training_type INTO t
    FROM public.trainings WHERE id = NEW.training_id;
  PERFORM public.notify_user(uid, 'training',
    'New Training Scheduled',
    COALESCE(t.training_name,'A training') || ' (' || COALESCE(t.training_code,'') || ') on ' ||
      COALESCE(to_char(t.training_date,'DD Mon YYYY'),'a date to be announced'),
    '/participant-feedback');
  RETURN NEW;
END; $$;
CREATE TRIGGER notify_training_assigned AFTER INSERT ON public.training_participants
  FOR EACH ROW EXECUTE FUNCTION public.notify_training_assigned();

-- feedback submitted
CREATE OR REPLACE FUNCTION public.notify_feedback_submitted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
  SELECT id INTO uid FROM public.portal_users WHERE lower(employee_code) = lower(COALESCE(NEW.employee_code,''));
  IF uid IS NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_user(uid, 'feedback', 'Feedback Submitted',
    'Thank you — your feedback for ' || COALESCE(NEW.training_name,'the training') || ' has been recorded.', NULL);
  RETURN NEW;
END; $$;
CREATE TRIGGER notify_feedback_submitted AFTER INSERT ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.notify_feedback_submitted();

-- leaderboard post created / approved (never on rejection)
CREATE OR REPLACE FUNCTION public.notify_leaderboard_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_user(NEW.author_user_id, 'post_pending',
      'Your post on Leaderboard posted for admin approval',
      'It will go live once the L&D team approves it.', '/leaderboard');
  ELSIF NEW.status = 'approved' AND COALESCE(OLD.status,'') <> 'approved' THEN
    PERFORM public.notify_user(NEW.author_user_id, 'post_approved',
      'Your post has been approved and now live on Leaderboard', NULL, '/leaderboard');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER notify_leaderboard_post AFTER INSERT OR UPDATE ON public.leaderboard_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_leaderboard_post();
