ALTER TABLE public.leaderboard_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.leaderboard_comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS leaderboard_comments_parent_idx ON public.leaderboard_comments(parent_id);
DELETE FROM public.leaderboard_reactions r USING public.leaderboard_reactions r2
  WHERE r.post_id = r2.post_id AND r.user_id = r2.user_id
    AND (r.created_at < r2.created_at OR (r.created_at = r2.created_at AND r.id < r2.id));
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_reactions_one_per_user ON public.leaderboard_reactions(post_id, user_id);