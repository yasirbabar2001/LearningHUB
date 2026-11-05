
REVOKE EXECUTE ON FUNCTION public.notify_training_assigned() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_feedback_submitted() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_leaderboard_post() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid,text,text,text,text) FROM public, anon, authenticated;
