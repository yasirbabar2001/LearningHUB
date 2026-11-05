GRANT INSERT ON public.respondents TO anon, authenticated;
GRANT INSERT ON public.feedback TO anon, authenticated;
GRANT INSERT ON public.feedback_responses TO anon, authenticated;
GRANT SELECT, DELETE ON public.respondents TO authenticated;
GRANT SELECT, DELETE ON public.feedback TO authenticated;
GRANT SELECT, DELETE ON public.feedback_responses TO authenticated;
GRANT ALL ON public.respondents TO service_role;
GRANT ALL ON public.feedback TO service_role;
GRANT ALL ON public.feedback_responses TO service_role;