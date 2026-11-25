-- 023: Prevent users from self-granting the founding-member comp flag.
--
-- profiles' UPDATE RLS policy lets a user edit their own row (any column), and
-- the `authenticated` role holds table-level UPDATE, so without this a user
-- could set their own `comped = true` and grant themselves a permanent free
-- account. Column-level REVOKE doesn't help while a table-level UPDATE grant
-- exists, so enforce it with a trigger instead.
--
-- The function is SECURITY INVOKER (the default), so `current_user` is the role
-- that issued the UPDATE: 'authenticated'/'anon' for app users (blocked here),
-- and 'service_role'/'postgres' for the backend (allowed), which is the only
-- path that should ever set `comped`.

create or replace function public.enforce_comped_admin_only()
returns trigger
language plpgsql
as $$
begin
  if new.comped is distinct from old.comped and current_user in ('authenticated', 'anon') then
    new.comped := old.comped; -- silently preserve the prior value
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_comped_admin_only on public.profiles;
create trigger trg_enforce_comped_admin_only
  before update on public.profiles
  for each row execute function public.enforce_comped_admin_only();
