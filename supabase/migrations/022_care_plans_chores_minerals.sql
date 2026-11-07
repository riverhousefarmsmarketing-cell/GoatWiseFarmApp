-- 022_care_plans_chores_minerals.sql
--
-- 1. Care plans: feeding, watering and special instructions for a group, a
--    pasture (paddock) or a herd. Plans can be seasonal (e.g. 11-01 to 03-31
--    for a winter hay plan; the range may wrap over New Year), limited to
--    certain weekdays, and paused. Owners and managers write plans; everyone
--    on the farm reads them.
--
-- 2. Chore check-offs: each feeding/watering time a plan sets becomes a chore
--    for that day. Anyone on the farm can tick it off (with an optional note)
--    or undo their tick. One check-off per plan, day and time.
--
-- 3. Mineral refills by pasture: which loose mineral was put out in which
--    pasture, how much, when and by whom. Minerals are feed types in the
--    'mineral' category; an optional "check every N days" on the mineral
--    flags pastures that are due.
--
-- Existing herd feeding schedules are copied into care plans (feed_schedules
-- itself is left untouched).
--
-- Everything here is farm-scoped (migration 019) and recorded in the change
-- history (migration 020). Requires 019-021.

begin;

-- ---------------------------------------------------------------------------
-- 0. Helper: does a referenced row belong to the given farm?
-- ---------------------------------------------------------------------------

create or replace function public.row_in_farm(p_table text, p_id uuid, p_farm uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_ok boolean;
begin
  if p_id is null then return true; end if;
  if p_table not in ('groups', 'paddocks', 'herds', 'feed_types', 'care_plans') then
    raise exception 'row_in_farm: unsupported table %', p_table;
  end if;
  execute format('select exists (select 1 from public.%I where id = $1 and farm_id = $2)', p_table)
    into v_ok using p_id, p_farm;
  return v_ok;
end;
$$;
revoke execute on function public.row_in_farm(text, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Care plans
-- ---------------------------------------------------------------------------

alter table public.feed_types
  add column if not exists check_every_days integer check (check_every_days is null or check_every_days > 0);

create table if not exists public.care_plans (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  user_id       uuid default auth.uid() references auth.users(id) on delete set null,
  kind          text not null check (kind in ('feeding', 'watering', 'instruction')),
  group_id      uuid references public.groups(id) on delete cascade,
  paddock_id    uuid references public.paddocks(id) on delete cascade,
  herd_id       uuid references public.herds(id) on delete cascade,
  title         text not null check (length(trim(title)) > 0),
  amount        numeric check (amount is null or amount >= 0),
  unit          text,
  feed_type_id  uuid references public.feed_types(id) on delete set null,
  -- Times of day as 'HH:MM' (24h). Empty = once, any time that day.
  times         text[] not null default '{}',
  -- 0 = Sunday ... 6 = Saturday. NULL = every day.
  days_of_week  smallint[],
  -- Seasonal window as 'MM-DD'. Both NULL = all year. May wrap (11-01..03-31).
  season_start  text,
  season_end    text,
  active        boolean not null default true,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint care_plans_one_target check (num_nonnulls(group_id, paddock_id, herd_id) = 1),
  constraint care_plans_times_format check (
    cardinality(times) = 0
    or array_to_string(times, ',') ~ '^([01][0-9]|2[0-3]):[0-5][0-9](,([01][0-9]|2[0-3]):[0-5][0-9])*$'),
  constraint care_plans_days_valid check (days_of_week is null or days_of_week <@ array[0,1,2,3,4,5,6]::smallint[]),
  constraint care_plans_season_format check (
    (season_start is null and season_end is null)
    or (season_start is not null and season_end is not null
        and season_start ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
        and season_end ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'))
);
create index if not exists idx_care_plans_farm on public.care_plans (farm_id, active);

alter table public.care_plans enable row level security;
create policy "Farm members can view care plans" on public.care_plans
  for select to authenticated using (farm_id = (select public.current_farm_id()));
create policy "Owners and managers can add care plans" on public.care_plans
  for insert to authenticated
  with check (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()) and user_id = (select auth.uid()));
create policy "Owners and managers can edit care plans" on public.care_plans
  for update to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()))
  with check (farm_id = (select public.current_farm_id()));
create policy "Owners and managers can delete care plans" on public.care_plans
  for delete to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));

-- ---------------------------------------------------------------------------
-- 2. Chore check-offs
-- ---------------------------------------------------------------------------

create table if not exists public.chore_completions (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  care_plan_id  uuid not null references public.care_plans(id) on delete cascade,
  chore_date    date not null,
  -- The plan time this ticks off ('HH:MM'), or '' for an any-time chore.
  slot          text not null default '',
  -- Who did it.
  user_id       uuid default auth.uid() references auth.users(id) on delete set null,
  done_at       timestamptz not null default now(),
  note          text,
  unique (care_plan_id, chore_date, slot)
);
create index if not exists idx_chore_completions_farm_date on public.chore_completions (farm_id, chore_date);

alter table public.chore_completions enable row level security;
create policy "Farm members can view chores done" on public.chore_completions
  for select to authenticated using (farm_id = (select public.current_farm_id()));
create policy "Farm members tick off chores" on public.chore_completions
  for insert to authenticated
  with check (farm_id = (select public.current_farm_id()) and user_id = (select auth.uid()));
create policy "Farm members edit their own chore notes" on public.chore_completions
  for update to authenticated
  using (farm_id = (select public.current_farm_id()) and (user_id = (select auth.uid()) or (select public.is_farm_manager())))
  with check (farm_id = (select public.current_farm_id()));
-- Un-ticking is undoing your own check-off (managers may undo anyone's). It
-- is still recorded in the change history.
create policy "Members undo their own check-offs" on public.chore_completions
  for delete to authenticated
  using (farm_id = (select public.current_farm_id()) and (user_id = (select auth.uid()) or (select public.is_farm_manager())));

-- ---------------------------------------------------------------------------
-- 3. Mineral refills by pasture
-- ---------------------------------------------------------------------------

create table if not exists public.mineral_refills (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  -- Who refilled it.
  user_id       uuid default auth.uid() references auth.users(id) on delete set null,
  paddock_id    uuid not null references public.paddocks(id) on delete cascade,
  -- RESTRICT: a mineral with refill history can't vanish and take it along.
  feed_type_id  uuid not null references public.feed_types(id) on delete restrict,
  amount        numeric not null check (amount > 0),
  unit          text not null,
  refilled_on   date not null default current_date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_mineral_refills_lookup on public.mineral_refills (farm_id, paddock_id, feed_type_id, refilled_on desc);

-- Same rules as every other farm record (019): members add and edit, only
-- owners and managers delete (workers request it, 020).
alter table public.mineral_refills enable row level security;
create policy "Farm members can view" on public.mineral_refills
  for select to authenticated using (farm_id = (select public.current_farm_id()));
create policy "Farm members can add" on public.mineral_refills
  for insert to authenticated
  with check (farm_id = (select public.current_farm_id()) and user_id = (select auth.uid()));
create policy "Farm members can edit" on public.mineral_refills
  for update to authenticated
  using (farm_id = (select public.current_farm_id()))
  with check (farm_id = (select public.current_farm_id()));
create policy "Owners and managers can delete" on public.mineral_refills
  for delete to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));

create or replace function public.is_deletable_table(p_table text)
returns boolean
language sql
immutable
as $$
  select p_table = any (array[
    'herds', 'animals', 'groups', 'animal_groups', 'health_records',
    'inspections', 'breeding_records', 'kidding_records', 'kid_records',
    'milk_records', 'weight_records', 'transactions', 'feed_types',
    'feed_inventory', 'feed_schedules', 'feed_usage', 'breeding_plans',
    'guardians', 'guardian_health_records', 'guardian_vaccinations',
    'predation_events', 'photos', 'herd_transfers', 'paddocks', 'paddock_moves',
    'mineral_refills'
  ]);
$$;

-- ---------------------------------------------------------------------------
-- 4. Referenced groups/pastures/herds/minerals/plans must be on the same farm
-- ---------------------------------------------------------------------------

create or replace function public.check_same_farm_refs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'care_plans' then
    if not (public.row_in_farm('groups', new.group_id, new.farm_id)
        and public.row_in_farm('paddocks', new.paddock_id, new.farm_id)
        and public.row_in_farm('herds', new.herd_id, new.farm_id)
        and public.row_in_farm('feed_types', new.feed_type_id, new.farm_id)) then
      raise exception 'That group, pasture, herd or feed is not on this farm';
    end if;
  elsif tg_table_name = 'chore_completions' then
    if not public.row_in_farm('care_plans', new.care_plan_id, new.farm_id) then
      raise exception 'That care plan is not on this farm';
    end if;
  elsif tg_table_name = 'mineral_refills' then
    if not (public.row_in_farm('paddocks', new.paddock_id, new.farm_id)
        and public.row_in_farm('feed_types', new.feed_type_id, new.farm_id)) then
      raise exception 'That pasture or mineral is not on this farm';
    end if;
  end if;
  if tg_op = 'UPDATE' and tg_table_name <> 'chore_completions' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.check_same_farm_refs() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['care_plans', 'chore_completions', 'mineral_refills'] loop
    execute format('drop trigger if exists trg_same_farm on public.%I', t);
    execute format('create trigger trg_same_farm before insert or update on public.%I for each row execute function public.check_same_farm_refs()', t);
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Copy existing herd feeding schedules into care plans
-- ---------------------------------------------------------------------------

insert into public.care_plans (farm_id, user_id, kind, herd_id, title, amount, unit, times, active, notes, created_at)
select fs.farm_id,
       fs.user_id,
       'feeding',
       fs.herd_id,
       fs.feed_type,
       fs.quantity_per_feeding,
       fs.unit,
       coalesce(
         (select array_agg(t order by t)
            from jsonb_array_elements_text(case when jsonb_typeof(fs.feeding_times) = 'array' then fs.feeding_times else '[]'::jsonb end) t
           where t ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
         '{}'),
       fs.status = 'active' and (fs.end_date is null or fs.end_date >= current_date),
       fs.notes,
       fs.created_at
  from public.feed_schedules fs
 where not exists (
   select 1 from public.care_plans cp
    where cp.herd_id = fs.herd_id and cp.kind = 'feeding' and cp.title = fs.feed_type and cp.farm_id = fs.farm_id
 );

commit;
