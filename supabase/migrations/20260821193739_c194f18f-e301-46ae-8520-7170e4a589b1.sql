CREATE SCHEMA IF NOT EXISTS private;

ALTER FUNCTION public.has_role(uuid, app_role) SET SCHEMA private;
ALTER FUNCTION private.has_role(uuid, app_role) SET search_path = public, private;

ALTER FUNCTION public.feedback_already_submitted(text, uuid) SET SCHEMA private;
ALTER FUNCTION private.feedback_already_submitted(text, uuid) SET search_path = public, private;

GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION private.feedback_already_submitted(text, uuid) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION private.feedback_already_submitted(text, uuid) TO service_role;