ALTER TABLE public.leaderboard_posts
  ADD COLUMN IF NOT EXISTS heart_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dislike_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clap_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.leaderboard_comments
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

UPDATE public.leaderboard_posts p
SET heart_count = counts.heart_count,
    like_count = counts.like_count,
    dislike_count = counts.dislike_count,
    clap_count = counts.clap_count
FROM (
  SELECT post_id,
    count(*) FILTER (WHERE kind = 'heart')::integer AS heart_count,
    count(*) FILTER (WHERE kind = 'like')::integer AS like_count,
    count(*) FILTER (WHERE kind = 'dislike')::integer AS dislike_count,
    count(*) FILTER (WHERE kind = 'clap')::integer AS clap_count
  FROM public.leaderboard_reactions
  GROUP BY post_id
) counts
WHERE p.id = counts.post_id;

UPDATE public.leaderboard_comments c
SET like_count = counts.like_count
FROM (
  SELECT comment_id, count(*)::integer AS like_count
  FROM public.leaderboard_comment_reactions
  WHERE kind = 'like'
  GROUP BY comment_id
) counts
WHERE c.id = counts.comment_id;

CREATE OR REPLACE FUNCTION public.sync_leaderboard_post_reaction_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_post_id uuid := COALESCE(NEW.post_id, OLD.post_id);
  target_kind text := COALESCE(NEW.kind, OLD.kind);
BEGIN
  IF target_kind NOT IN ('heart', 'like', 'dislike', 'clap') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.leaderboard_posts
  SET heart_count = CASE WHEN target_kind = 'heart' THEN (SELECT count(*) FROM public.leaderboard_reactions WHERE post_id = target_post_id AND kind = 'heart') ELSE heart_count END,
      like_count = CASE WHEN target_kind = 'like' THEN (SELECT count(*) FROM public.leaderboard_reactions WHERE post_id = target_post_id AND kind = 'like') ELSE like_count END,
      dislike_count = CASE WHEN target_kind = 'dislike' THEN (SELECT count(*) FROM public.leaderboard_reactions WHERE post_id = target_post_id AND kind = 'dislike') ELSE dislike_count END,
      clap_count = CASE WHEN target_kind = 'clap' THEN (SELECT count(*) FROM public.leaderboard_reactions WHERE post_id = target_post_id AND kind = 'clap') ELSE clap_count END
  WHERE id = target_post_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_leaderboard_post_reaction_count() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_post_reaction_count ON public.leaderboard_reactions;
CREATE TRIGGER sync_post_reaction_count
AFTER INSERT OR DELETE ON public.leaderboard_reactions
FOR EACH ROW EXECUTE FUNCTION public.sync_leaderboard_post_reaction_count();

CREATE OR REPLACE FUNCTION public.sync_leaderboard_comment_reaction_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_comment_id uuid := COALESCE(NEW.comment_id, OLD.comment_id);
BEGIN
  UPDATE public.leaderboard_comments
  SET like_count = (
    SELECT count(*) FROM public.leaderboard_comment_reactions
    WHERE comment_id = target_comment_id AND kind = 'like'
  )
  WHERE id = target_comment_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_leaderboard_comment_reaction_count() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_comment_reaction_count ON public.leaderboard_comment_reactions;
CREATE TRIGGER sync_comment_reaction_count
AFTER INSERT OR DELETE ON public.leaderboard_comment_reactions
FOR EACH ROW EXECUTE FUNCTION public.sync_leaderboard_comment_reaction_count();

DROP POLICY IF EXISTS "read reactions" ON public.leaderboard_reactions;
CREATE POLICY "read own reactions or admin"
ON public.leaderboard_reactions
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "read comment reactions" ON public.leaderboard_comment_reactions;
CREATE POLICY "read own comment reactions or admin"
ON public.leaderboard_comment_reactions
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "create own posts" ON public.leaderboard_posts;
CREATE POLICY "create own pending posts"
ON public.leaderboard_posts
FOR INSERT TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND status = 'pending'
  AND (is_admin_post = false OR private.has_role(auth.uid(), 'admin'))
);

DROP POLICY IF EXISTS "create own comments" ON public.leaderboard_comments;
CREATE POLICY "create own pending comments"
ON public.leaderboard_comments
FOR INSERT TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND status = 'pending'
  AND (is_admin_post = false OR private.has_role(auth.uid(), 'admin'))
);