ALTER TABLE public.portal_users ADD COLUMN IF NOT EXISTS avatar_path text;

DROP POLICY IF EXISTS "Employees upload own profile photo" ON storage.objects;
CREATE POLICY "Employees upload own profile photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Employees view own profile photo" ON storage.objects;
CREATE POLICY "Employees view own profile photo"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Employees update own profile photo" ON storage.objects;
CREATE POLICY "Employees update own profile photo"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Employees delete own profile photo" ON storage.objects;
CREATE POLICY "Employees delete own profile photo"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);