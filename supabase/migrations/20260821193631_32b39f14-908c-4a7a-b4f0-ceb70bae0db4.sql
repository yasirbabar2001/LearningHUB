REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.feedback_already_submitted(text, uuid) FROM anon, authenticated, PUBLIC;