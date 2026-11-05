drop policy if exists "leaderboard media read" on storage.objects;
drop policy if exists "leaderboard media upload" on storage.objects;

create policy "leaderboard media read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'leaderboard-media'
  and (
    private.has_role(auth.uid(), 'admin'::app_role)
    or (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.leaderboard_posts p
      where p.media_url = storage.objects.name
        and p.status = 'approved'
    )
  )
);

create policy "leaderboard media upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'leaderboard-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);