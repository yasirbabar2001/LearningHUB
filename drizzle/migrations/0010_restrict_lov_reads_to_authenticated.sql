-- Internal org directories should not be readable by anonymous visitors.
DROP POLICY IF EXISTS "public active departments" ON public.departments;
CREATE POLICY "authenticated active departments" ON public.departments
  FOR SELECT TO authenticated
  USING ((status = 'active') OR private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "public active regions" ON public.regions;
CREATE POLICY "authenticated active regions" ON public.regions
  FOR SELECT TO authenticated
  USING ((status = 'active') OR private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "public active wings" ON public.wings;
CREATE POLICY "authenticated active wings" ON public.wings
  FOR SELECT TO authenticated
  USING ((status = 'active') OR private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "public active designations" ON public.designations;
CREATE POLICY "authenticated active designations" ON public.designations
  FOR SELECT TO authenticated
  USING ((status = 'active') OR private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "public active locations" ON public.locations;
CREATE POLICY "authenticated active locations" ON public.locations
  FOR SELECT TO authenticated
  USING ((status = 'active') OR private.has_role(auth.uid(), 'admin'::app_role));

-- Survey questions: signed-in users only, and only active ones for non-admins.
DROP POLICY IF EXISTS "public read survey questions" ON public.survey_questions;
CREATE POLICY "authenticated active survey questions" ON public.survey_questions
  FOR SELECT TO authenticated
  USING ((status = 'active') OR private.has_role(auth.uid(), 'admin'::app_role));

REVOKE SELECT ON public.departments, public.regions, public.wings,
  public.designations, public.locations, public.survey_questions FROM anon;
GRANT SELECT ON public.departments, public.regions, public.wings,
  public.designations, public.locations, public.survey_questions TO authenticated;