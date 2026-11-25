-- 019: Make the `photos` storage bucket private and remove the public read policy.
--
-- Before this, the bucket was public AND storage.objects carried a
-- "Public can view photos" SELECT policy with no owner check
-- (qual: bucket_id = 'photos'). Storage policies are OR'd, so that single
-- permissive policy nullified the owner-scoped "Users can view own photos"
-- policy: anyone holding the (client-shipped) anon key could list and read
-- EVERY user's photos across all farms. Only reads leaked — uploads were
-- always namespaced under `${user_id}/` and the INSERT/UPDATE/DELETE policies
-- enforce ownership.
--
-- After this migration, photos are served to the browser via short-lived
-- signed URLs generated per request from each row's storage path
-- (see src/lib/photoUrls.ts). Deploy the app change together with this
-- migration: flipping the bucket private without the signed-URL code would
-- break image display, and shipping the code without this migration leaves
-- the leak open.

-- 1) Bucket no longer serves public object URLs.
update storage.buckets set public = false where id = 'photos';

-- 2) Drop the blanket public read policy that bypassed per-user isolation.
drop policy if exists "Public can view photos" on storage.objects;

-- 3) Ensure the owner-scoped read policy exists (recreate only if missing, so
--    environments that somehow lack it are healed without disturbing the one
--    already in place).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can view own photos'
  ) then
    create policy "Users can view own photos" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'photos'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
  end if;
end $$;
