-- 019_shared_farms.sql
--
-- Shared farm accounts: several people (owner, managers, workers) share ONE
-- farm's records, each with their own login.
--
-- Before this migration every row belonged to a single auth user and every
-- RLS policy was `user_id = auth.uid()`. After it:
--
--   * public.farms            one row per farm
--   * public.farm_members     who belongs to which farm, with a role
--   * public.farm_invites     one-time invite links (token stored as a hash)
--   * profiles.current_farm_id  the farm the user is working in right now
--   * every data table gets   farm_id (defaults to the caller's current farm)
--     and its policies become `farm_id = current_farm_id()`.
--
-- user_id stays on every row and keeps meaning "who created it". It is no
-- longer how access is decided, and it no longer cascades: deleting a person's
-- login must never delete the farm records they entered, so the FK becomes
-- ON DELETE SET NULL.
--
-- New rows must be stamped with the person creating them (user_id =
-- auth.uid()), so "created by" can't be forged.
--
-- Deleting rows is limited to owners and managers here. Workers ask for a
-- deletion instead (migration 020).
--
-- Existing data: each existing user gets their own farm (named from their
-- farm_name), becomes its owner, and all their rows move into it. Nothing is
-- shared with anyone until an owner sends an invite.

begin;

-- ---------------------------------------------------------------------------
-- 1. Farms, members, invites
-- ---------------------------------------------------------------------------

create table if not exists public.farms (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(trim(name)) > 0),
  -- Exempt from any future subscription charges (e.g. RiverHouse Farms' own
  -- farm). There is no billing yet; this is the switch billing will honour.
  complimentary boolean not null default false,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.farm_members (
  id         uuid primary key default gen_random_uuid(),
  farm_id    uuid not null references public.farms(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('owner', 'manager', 'worker')),
  joined_at  timestamptz not null default now(),
  unique (farm_id, user_id)
);
create index if not exists idx_farm_members_user on public.farm_members (user_id);

create table if not exists public.farm_invites (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null references public.farms(id) on delete cascade,
  role          text not null check (role in ('manager', 'worker')),
  -- Who the link is for, so the owner can tell links apart ("Jake").
  label         text,
  token_hash    text not null unique,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '14 days',
  accepted_by   uuid references auth.users(id) on delete set null,
  accepted_at   timestamptz,
  revoked_at    timestamptz
);
create index if not exists idx_farm_invites_farm on public.farm_invites (farm_id);

alter table public.profiles
  add column if not exists current_farm_id uuid references public.farms(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 2. Helpers. SECURITY DEFINER so policies can call them without recursing
--    through farm_members' own RLS. All pin search_path.
-- ---------------------------------------------------------------------------

-- The farm the caller is working in: their chosen farm if they still belong
-- to it, otherwise their oldest membership (owner first). NULL if none.
create or replace function public.current_farm_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.current_farm_id
       from public.profiles p
       join public.farm_members m
         on m.farm_id = p.current_farm_id and m.user_id = p.id
      where p.id = auth.uid()),
    (select m.farm_id
       from public.farm_members m
      where m.user_id = auth.uid()
      order by (m.role = 'owner') desc, m.joined_at
      limit 1)
  );
$$;

create or replace function public.farm_role(p_farm_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role from public.farm_members m
   where m.farm_id = p_farm_id and m.user_id = auth.uid();
$$;

create or replace function public.current_farm_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.farm_role(public.current_farm_id());
$$;

-- Owner or manager of the current farm.
create or replace function public.is_farm_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_farm_role() in ('owner', 'manager'), false);
$$;

revoke execute on function public.current_farm_id()      from public, anon;
revoke execute on function public.farm_role(uuid)        from public, anon;
revoke execute on function public.current_farm_role()    from public, anon;
revoke execute on function public.is_farm_manager()      from public, anon;
grant  execute on function public.current_farm_id()      to authenticated;
grant  execute on function public.farm_role(uuid)        to authenticated;
grant  execute on function public.current_farm_role()    to authenticated;
grant  execute on function public.is_farm_manager()      to authenticated;

-- ---------------------------------------------------------------------------
-- 3. One farm per existing user
-- ---------------------------------------------------------------------------

do $$
declare
  u record;
  v_farm uuid;
begin
  for u in
    select au.id,
           coalesce(nullif(trim(p.farm_name), ''),
                    nullif(trim(au.raw_user_meta_data ->> 'farm_name'), ''),
                    split_part(coalesce(au.email, 'My'), '@', 1) || '''s Farm') as farm_name
      from auth.users au
      left join public.profiles p on p.id = au.id
     where not exists (select 1 from public.farm_members m where m.user_id = au.id)
  loop
    insert into public.farms (name, created_by) values (u.farm_name, u.id)
    returning id into v_farm;
    insert into public.farm_members (farm_id, user_id, role) values (v_farm, u.id, 'owner');
    update public.profiles set current_farm_id = v_farm where id = u.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. farm_id on every data table, backfilled, and farm-scoped policies
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  pol record;
  tables text[] := array[
    'herds', 'animals', 'groups', 'animal_groups', 'health_records',
    'inspections', 'breeding_records', 'kidding_records', 'kid_records',
    'milk_records', 'weight_records', 'transactions', 'feed_types',
    'feed_inventory', 'feed_schedules', 'feed_usage', 'breeding_plans',
    'guardians', 'guardian_health_records', 'guardian_vaccinations',
    'predation_events', 'photos', 'herd_transfers', 'paddocks', 'paddock_moves'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      raise notice 'skipping missing table %', t;
      continue;
    end if;

    execute format('alter table public.%I add column if not exists farm_id uuid references public.farms(id) on delete cascade', t);
    execute format(
      'update public.%I d set farm_id = coalesce(
           (select pr.current_farm_id from public.profiles pr where pr.id = d.user_id),
           (select m.farm_id from public.farm_members m where m.user_id = d.user_id order by m.joined_at limit 1))
         where d.farm_id is null', t);
    execute format('alter table public.%I alter column farm_id set default public.current_farm_id()', t);
    execute format('alter table public.%I alter column farm_id set not null', t);
    execute format('create index if not exists %I on public.%I (farm_id)', 'idx_' || t || '_farm_id', t);

    -- user_id now means "created by": keep it, stop it cascading, default it.
    execute format('alter table public.%I alter column user_id drop not null', t);
    execute format('alter table public.%I alter column user_id set default auth.uid()', t);
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_user_id_fkey');
    execute format('alter table public.%I add constraint %I foreign key (user_id) references auth.users(id) on delete set null', t, t || '_user_id_fkey');

    -- Replace every existing (own-row) policy.
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;

    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Farm members can view" on public.%I for select to authenticated using (farm_id = (select public.current_farm_id()))', t);
    -- New rows go into your current farm and are stamped as created by you
    -- (user_id defaults to you; naming someone else is refused).
    execute format('create policy "Farm members can add" on public.%I for insert to authenticated with check (farm_id = (select public.current_farm_id()) and user_id = (select auth.uid()))', t);
    execute format('create policy "Farm members can edit" on public.%I for update to authenticated using (farm_id = (select public.current_farm_id())) with check (farm_id = (select public.current_farm_id()))', t);
    execute format('create policy "Owners and managers can delete" on public.%I for delete to authenticated using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()))', t);
  end loop;
end $$;

-- Taking an animal out of a group removes its animal_groups link row. That is
-- an edit to the group, not deleting a farm record, so any member may do it
-- (it is still recorded in the change history).
drop policy if exists "Owners and managers can delete" on public.animal_groups;
create policy "Farm members can change group membership" on public.animal_groups
  for delete to authenticated
  using (farm_id = (select public.current_farm_id()));

-- ---------------------------------------------------------------------------
-- 5. RLS for the new tables. Writes to members/invites go through the
--    functions below, never directly.
-- ---------------------------------------------------------------------------

alter table public.farms        enable row level security;
alter table public.farm_members enable row level security;
alter table public.farm_invites enable row level security;

create policy "Members can view their farms" on public.farms
  for select to authenticated
  using (exists (select 1 from public.farm_members m where m.farm_id = farms.id and m.user_id = (select auth.uid())));
create policy "Owners can rename their farm" on public.farms
  for update to authenticated
  using ((select public.farm_role(farms.id)) = 'owner')
  with check ((select public.farm_role(farms.id)) = 'owner');

create policy "Members can view their farm's members" on public.farm_members
  for select to authenticated
  using (farm_id = (select public.current_farm_id()) or user_id = (select auth.uid()));

create policy "Owners and managers can view invites" on public.farm_invites
  for select to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));

-- The client may change ONLY the farm name; complimentary is set by us.
revoke update on public.farms from authenticated;
grant  update (name) on public.farms to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Signup: join the invited farm, or start a new one
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_farm_name text := nullif(trim(new.raw_user_meta_data ->> 'farm_name'), '');
  v_token     text := nullif(trim(new.raw_user_meta_data ->> 'invite_token'), '');
  v_invite    public.farm_invites%rowtype;
  v_farm      uuid;
begin
  insert into public.profiles (id, email, farm_name, display_name)
  values (new.id, new.email, v_farm_name,
          nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''))
  on conflict (id) do nothing;

  if v_token is not null then
    select * into v_invite from public.farm_invites
     where token_hash = encode(digest(v_token, 'sha256'), 'hex')
       and accepted_at is null and revoked_at is null and expires_at > now()
     for update;
  end if;

  if v_invite.id is not null then
    insert into public.farm_members (farm_id, user_id, role)
    values (v_invite.farm_id, new.id, v_invite.role)
    on conflict (farm_id, user_id) do nothing;
    update public.farm_invites set accepted_by = new.id, accepted_at = now() where id = v_invite.id;
    v_farm := v_invite.farm_id;
  else
    insert into public.farms (name, created_by)
    values (coalesce(v_farm_name, split_part(coalesce(new.email, 'My'), '@', 1) || '''s Farm'), new.id)
    returning id into v_farm;
    insert into public.farm_members (farm_id, user_id, role) values (v_farm, new.id, 'owner');
  end if;

  update public.profiles set current_farm_id = v_farm where id = new.id;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Farm functions the app calls
-- ---------------------------------------------------------------------------

-- Every farm the caller belongs to, flagging the current one.
create or replace function public.get_my_farms()
returns table (farm_id uuid, name text, role text, complimentary boolean, is_current boolean)
language sql
stable
security definer
set search_path = public
as $$
  select f.id, f.name, m.role, f.complimentary, f.id = public.current_farm_id()
    from public.farm_members m
    join public.farms f on f.id = m.farm_id
   where m.user_id = auth.uid()
   order by f.id = public.current_farm_id() desc, f.name;
$$;

-- People on the current farm, with names (profiles RLS only exposes your own).
create or replace function public.get_farm_members()
returns table (user_id uuid, role text, email text, display_name text, joined_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, m.role, p.email, coalesce(nullif(trim(p.display_name), ''), split_part(p.email, '@', 1)), m.joined_at
    from public.farm_members m
    left join public.profiles p on p.id = m.user_id
   where m.farm_id = public.current_farm_id()
   order by case m.role when 'owner' then 0 when 'manager' then 1 else 2 end, m.joined_at;
$$;

create or replace function public.switch_farm(p_farm_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.farm_role(p_farm_id) is null then
    raise exception 'You are not a member of that farm';
  end if;
  update public.profiles set current_farm_id = p_farm_id where id = auth.uid();
end;
$$;

-- For someone who was removed from their only farm and wants their own.
create or replace function public.create_my_farm(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_farm uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Farm name is required'; end if;
  insert into public.farms (name, created_by) values (trim(p_name), auth.uid()) returning id into v_farm;
  insert into public.farm_members (farm_id, user_id, role) values (v_farm, auth.uid(), 'owner');
  update public.profiles set current_farm_id = v_farm where id = auth.uid();
  return v_farm;
end;
$$;

-- Returns the plaintext token ONCE; only its hash is stored. Owners may invite
-- managers or workers; managers may invite workers.
create or replace function public.create_farm_invite(p_role text, p_label text default null)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role  text := public.current_farm_role();
  v_token text := encode(gen_random_bytes(24), 'hex');
begin
  if v_role is null or v_role = 'worker' then
    raise exception 'Only owners and managers can invite people';
  end if;
  if p_role not in ('manager', 'worker') then
    raise exception 'Invalid role';
  end if;
  if p_role = 'manager' and v_role <> 'owner' then
    raise exception 'Only the owner can invite managers';
  end if;
  insert into public.farm_invites (farm_id, role, label, token_hash, created_by)
  values (public.current_farm_id(), p_role, nullif(trim(p_label), ''),
          encode(digest(v_token, 'sha256'), 'hex'), auth.uid());
  return v_token;
end;
$$;

create or replace function public.revoke_farm_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_farm_manager() then raise exception 'Only owners and managers can cancel invites'; end if;
  update public.farm_invites set revoked_at = now()
   where id = p_invite_id and farm_id = public.current_farm_id() and accepted_at is null;
end;
$$;

-- What the join page shows before sign-in. Reveals only the farm name and
-- role, and only to someone holding the token.
create or replace function public.get_invite_info(p_token text)
returns table (farm_name text, role text, valid boolean)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select f.name, i.role,
         (i.accepted_at is null and i.revoked_at is null and i.expires_at > now())
    from public.farm_invites i
    join public.farms f on f.id = i.farm_id
   where i.token_hash = encode(digest(p_token, 'sha256'), 'hex');
$$;

-- For people who already have a login: join the farm and switch to it.
create or replace function public.accept_farm_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_invite public.farm_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_invite from public.farm_invites
   where token_hash = encode(digest(p_token, 'sha256'), 'hex')
   for update;
  if v_invite.id is null then raise exception 'This invite link is not valid'; end if;
  if v_invite.accepted_by = auth.uid() then
    update public.profiles set current_farm_id = v_invite.farm_id where id = auth.uid();
    return v_invite.farm_id;
  end if;
  if v_invite.accepted_at is not null or v_invite.revoked_at is not null or v_invite.expires_at <= now() then
    raise exception 'This invite link has expired or was already used';
  end if;
  insert into public.farm_members (farm_id, user_id, role)
  values (v_invite.farm_id, auth.uid(), v_invite.role)
  on conflict (farm_id, user_id) do nothing;
  update public.farm_invites set accepted_by = auth.uid(), accepted_at = now() where id = v_invite.id;
  update public.profiles set current_farm_id = v_invite.farm_id where id = auth.uid();
  return v_invite.farm_id;
end;
$$;

create or replace function public.set_member_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_farm uuid := public.current_farm_id();
begin
  if public.current_farm_role() <> 'owner' then raise exception 'Only the owner can change roles'; end if;
  if p_role not in ('owner', 'manager', 'worker') then raise exception 'Invalid role'; end if;
  if p_role <> 'owner'
     and (select role from public.farm_members where farm_id = v_farm and user_id = p_user_id) = 'owner'
     and (select count(*) from public.farm_members where farm_id = v_farm and role = 'owner') <= 1 then
    raise exception 'A farm must keep at least one owner';
  end if;
  update public.farm_members set role = p_role where farm_id = v_farm and user_id = p_user_id;
end;
$$;

-- Owners remove anyone but the last owner; anyone may leave (except the last owner).
create or replace function public.remove_farm_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_farm uuid := public.current_farm_id();
begin
  if p_user_id <> auth.uid() and public.current_farm_role() <> 'owner' then
    raise exception 'Only the owner can remove people';
  end if;
  if (select role from public.farm_members where farm_id = v_farm and user_id = p_user_id) = 'owner'
     and (select count(*) from public.farm_members where farm_id = v_farm and role = 'owner') <= 1 then
    raise exception 'A farm must keep at least one owner';
  end if;
  delete from public.farm_members where farm_id = v_farm and user_id = p_user_id;
  update public.profiles set current_farm_id = null where id = p_user_id and current_farm_id = v_farm;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'get_my_farms()', 'get_farm_members()', 'switch_farm(uuid)', 'create_my_farm(text)',
    'create_farm_invite(text, text)', 'revoke_farm_invite(uuid)', 'accept_farm_invite(text)',
    'set_member_role(uuid, text)', 'remove_farm_member(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
-- The join page calls this before the visitor has signed in.
revoke execute on function public.get_invite_info(text) from public;
grant  execute on function public.get_invite_info(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Photos in storage live under <uploader's user id>/... . Let owners and
--    managers remove a teammate's photo files too (e.g. after approving a
--    deletion), not just their own.
-- ---------------------------------------------------------------------------

drop policy if exists "Farm managers can delete teammates' photos" on storage.objects;
create policy "Farm managers can delete teammates' photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (select public.is_farm_manager())
    and exists (
      select 1 from public.farm_members m
       where m.farm_id = (select public.current_farm_id())
         and m.user_id::text = (storage.foldername(name))[1]
    )
  );

commit;
