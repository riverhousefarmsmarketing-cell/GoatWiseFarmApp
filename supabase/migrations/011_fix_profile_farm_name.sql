-- 011: persist the farm name captured at signup
--
-- The signup form collects a farm name and passes it through as auth metadata,
-- but it never reached public.profiles:
--
--   1. handle_new_user() inserted only (id, email), creating the row first.
--   2. useAuth.signUp() then tried to INSERT the same profile again, this time
--      with farm_name. That hit the primary key and errored -- and the result
--      was never checked, so it failed silently.
--
-- Net effect: every profile in the table has farm_name NULL. The values were
-- never lost, they just stayed in auth.users.raw_user_meta_data. This reads
-- them at insert time and backfills the rows already created.
--
-- Also pins search_path, clearing the `function_search_path_mutable` advisor
-- warning on this function.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, farm_name)
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'farm_name'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill existing profiles from the metadata captured at their signup.
update public.profiles p
set farm_name = nullif(trim(u.raw_user_meta_data ->> 'farm_name'), ''),
    updated_at = now()
from auth.users u
where u.id = p.id
  and p.farm_name is null
  and nullif(trim(u.raw_user_meta_data ->> 'farm_name'), '') is not null;
