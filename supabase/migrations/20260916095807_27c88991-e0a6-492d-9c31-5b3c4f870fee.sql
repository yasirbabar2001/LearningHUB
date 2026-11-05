CREATE POLICY "leaderboard media upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'leaderboard-media');
CREATE POLICY "leaderboard media read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'leaderboard-media');
CREATE POLICY "leaderboard media delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'leaderboard-media' AND private.has_role(auth.uid(),'admin'));