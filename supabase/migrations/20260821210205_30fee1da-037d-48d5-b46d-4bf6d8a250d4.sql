DROP POLICY IF EXISTS "public read settings" ON public.app_settings;
REVOKE SELECT ON public.app_settings FROM anon;
CREATE POLICY "authenticated read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);