CREATE TABLE public.leaderboard_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid NOT NULL DEFAULT auth.uid(),
  is_admin_post boolean NOT NULL DEFAULT false,
  author_name text NOT NULL DEFAULT '',
  author_designation text,
  author_location text,
  body text,
  media_url text,
  media_type text CHECK (media_type IN ('image','video')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.leaderboard_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.leaderboard_posts(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL DEFAULT auth.uid(),
  is_admin_post boolean NOT NULL DEFAULT false,
  author_name text NOT NULL DEFAULT '',
  author_designation text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.leaderboard_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.leaderboard_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL CHECK (kind IN ('heart','like','dislike','clap')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, kind)
);

CREATE INDEX leaderboard_posts_status_idx ON public.leaderboard_posts (status, created_at DESC);
CREATE INDEX leaderboard_comments_post_idx ON public.leaderboard_comments (post_id, created_at);
CREATE INDEX leaderboard_reactions_post_idx ON public.leaderboard_reactions (post_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaderboard_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaderboard_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaderboard_reactions TO authenticated;
GRANT ALL ON public.leaderboard_posts TO service_role;
GRANT ALL ON public.leaderboard_comments TO service_role;
GRANT ALL ON public.leaderboard_reactions TO service_role;

ALTER TABLE public.leaderboard_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read approved or own posts" ON public.leaderboard_posts
  FOR SELECT TO authenticated
  USING (status = 'approved' OR author_user_id = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY "create own posts" ON public.leaderboard_posts
  FOR INSERT TO authenticated WITH CHECK (author_user_id = auth.uid());
CREATE POLICY "admins manage posts" ON public.leaderboard_posts
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete posts" ON public.leaderboard_posts
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));

CREATE POLICY "read approved or own comments" ON public.leaderboard_comments
  FOR SELECT TO authenticated
  USING (status = 'approved' OR author_user_id = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY "create own comments" ON public.leaderboard_comments
  FOR INSERT TO authenticated WITH CHECK (author_user_id = auth.uid());
CREATE POLICY "admins manage comments" ON public.leaderboard_comments
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete comments" ON public.leaderboard_comments
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));

CREATE POLICY "read reactions" ON public.leaderboard_reactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "add own reaction" ON public.leaderboard_reactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "remove own reaction" ON public.leaderboard_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.leaderboard_stamp_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD; adm boolean;
BEGIN
  NEW.author_user_id := auth.uid();
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin') INTO adm;
  NEW.is_admin_post := COALESCE(adm, false);
  NEW.status := 'pending';
  NEW.approved_at := NULL;

  IF NEW.is_admin_post THEN
    NEW.author_name := 'ABHI L&D Team';
    NEW.author_designation := NULL;
    IF TG_TABLE_NAME = 'leaderboard_posts' THEN NEW.author_location := NULL; END IF;
  ELSE
    SELECT name, designation_name, location_name INTO p
      FROM public.portal_users WHERE id = auth.uid();
    NEW.author_name := COALESCE(p.name, 'Employee');
    NEW.author_designation := p.designation_name;
    IF TG_TABLE_NAME = 'leaderboard_posts' THEN NEW.author_location := p.location_name; END IF;
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.leaderboard_stamp_author() FROM public, anon, authenticated;

CREATE TRIGGER stamp_author BEFORE INSERT ON public.leaderboard_posts
  FOR EACH ROW EXECUTE FUNCTION public.leaderboard_stamp_author();
CREATE TRIGGER stamp_author BEFORE INSERT ON public.leaderboard_comments
  FOR EACH ROW EXECUTE FUNCTION public.leaderboard_stamp_author();

CREATE TRIGGER u_leaderboard_posts BEFORE UPDATE ON public.leaderboard_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER u_leaderboard_comments BEFORE UPDATE ON public.leaderboard_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();