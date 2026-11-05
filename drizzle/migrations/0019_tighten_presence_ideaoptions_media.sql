DROP POLICY IF EXISTS "presence read" ON public.user_presence;
CREATE POLICY "presence read" ON public.user_presence FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_admin_user(auth.uid())
  OR EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.id = auth.uid() AND pu.status = 'active')
);

DROP POLICY IF EXISTS "signed in read idea options" ON public.idea_options;
CREATE POLICY "signed in read idea options" ON public.idea_options FOR SELECT TO authenticated
USING (
  public.is_admin_user(auth.uid())
  OR EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.id = auth.uid() AND pu.status = 'active')
);

DROP POLICY IF EXISTS "leaderboard media read" ON storage.objects;
CREATE POLICY "leaderboard media read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'leaderboard-media' AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = (auth.uid())::text
    OR owner_id = (auth.uid())::text
    OR (
      EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.id = auth.uid() AND pu.status = 'active')
      AND EXISTS (SELECT 1 FROM public.leaderboard_posts p WHERE p.media_url = objects.name AND p.status = 'approved')
    )
  )
);