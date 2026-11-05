DROP POLICY IF EXISTS "anyone submits feedback" ON public.feedback;
DROP POLICY IF EXISTS "anyone submits responses" ON public.feedback_responses;
DROP POLICY IF EXISTS "anyone submits respondent" ON public.respondents;

REVOKE INSERT ON public.feedback FROM anon, authenticated;
REVOKE INSERT ON public.feedback_responses FROM anon, authenticated;
REVOKE INSERT ON public.respondents FROM anon, authenticated;

GRANT ALL ON public.feedback TO service_role;
GRANT ALL ON public.feedback_responses TO service_role;
GRANT ALL ON public.respondents TO service_role;