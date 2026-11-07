-- 028_watch_list_concerns_labs_deaths.sql
--
-- 1. Watch list / sick pen: an animal can be flagged "watch closely" or
--    "isolated" (sick pen / quarantine) with a note. Anyone can set or clear
--    it; who and when are stamped.
-- 2. Concerns: anyone can report a problem ("Daisy is limping", optional
--    photo and urgency). Owners and managers acknowledge and resolve them;
--    every step is stamped.
-- 3. Lab tests: CAE, CL, Johne's, fecal egg counts and more, per animal.
-- 4. Death records: date, cause category, details and necropsy findings on
--    the animal itself (status 'deceased').
--
-- Everything is farm-scoped and in the change history. Requires 019-027.

begin;

-- ---------------------------------------------------------------------------
-- 1. Watch list
-- ---------------------------------------------------------------------------

alter table public.animals
  add column if not exists care_status       text not null default 'normal' check (care_status in ('normal', 'watch', 'isolated')),
  add column if not exists care_status_note  text,
  add column if not exists care_status_since timestamptz,
  add column if not exists care_status_by    uuid references auth.users(id) on delete set null,
  -- 4. Death records
  add column if not exists death_date        date,
  add column if not exists death_category    text check (death_category is null or death_category in
                                                ('illness', 'injury', 'predator', 'kidding', 'old_age', 'euthanasia', 'unknown', 'other')),
  add column if not exists death_cause       text,
  add column if not exists necropsy_done     boolean not null default false,
  add column if not exists necropsy_findings text;
create index if not exists idx_animals_care_status on public.animals (farm_id, care_status) where care_status <> 'normal';

create or replace function public.animals_care_status_stamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.care_status <> 'normal' then
      new.care_status_since := now(); new.care_status_by := auth.uid();
    else
      new.care_status_since := null; new.care_status_by := null;
    end if;
  elsif new.care_status is distinct from old.care_status then
    if new.care_status = 'normal' then
      new.care_status_since := null; new.care_status_by := null; new.care_status_note := null;
    else
      new.care_status_since := now(); new.care_status_by := auth.uid();
    end if;
  else
    new.care_status_since := old.care_status_since; new.care_status_by := old.care_status_by;
  end if;
  -- A dead or sold animal is no longer on the watch list.
  if new.status in ('deceased', 'sold', 'culled') then
    new.care_status := 'normal'; new.care_status_since := null; new.care_status_by := null; new.care_status_note := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.animals_care_status_stamp() from public, anon, authenticated;

drop trigger if exists trg_animals_care_status on public.animals;
create trigger trg_animals_care_status before insert or update on public.animals
  for each row execute function public.animals_care_status_stamp();

-- ---------------------------------------------------------------------------
-- 2. Concerns
-- ---------------------------------------------------------------------------

create table if not exists public.concern_reports (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  -- Who reported it.
  user_id          uuid default auth.uid() references auth.users(id) on delete set null,
  animal_id        uuid references public.animals(id) on delete set null,
  description      text not null check (length(trim(description)) > 0),
  urgency          text not null default 'normal' check (urgency in ('low', 'normal', 'urgent')),
  photo_url        text,
  photo_path       text,
  status           text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  acknowledged_by  uuid references auth.users(id) on delete set null,
  acknowledged_at  timestamptz,
  resolved_by      uuid references auth.users(id) on delete set null,
  resolved_at      timestamptz,
  resolution_note  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_concern_reports_farm on public.concern_reports (farm_id, status, created_at desc);

alter table public.concern_reports enable row level security;
create policy "Farm members can view concerns" on public.concern_reports
  for select to authenticated using (farm_id = (select public.current_farm_id()));
create policy "Farm members report concerns" on public.concern_reports
  for insert to authenticated
  with check (farm_id = (select public.current_farm_id()) and user_id = (select auth.uid()) and status = 'open');
-- The reporter can add detail; owners and managers move it along.
create policy "Reporters and managers update concerns" on public.concern_reports
  for update to authenticated
  using (farm_id = (select public.current_farm_id()) and (user_id = (select auth.uid()) or (select public.is_farm_manager())))
  with check (farm_id = (select public.current_farm_id()));
create policy "Owners and managers delete concerns" on public.concern_reports
  for delete to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));

create or replace function public.concern_reports_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.row_in_farm('animals', new.animal_id, new.farm_id) then
    raise exception 'That animal is not on this farm';
  end if;
  if tg_op = 'INSERT' then
    new.acknowledged_by := null; new.acknowledged_at := null;
    new.resolved_by := null; new.resolved_at := null;
    new.created_at := now();
    return new;
  end if;
  new.user_id := old.user_id; new.created_at := old.created_at; new.farm_id := old.farm_id;
  -- Only owners and managers change the status.
  if new.status is distinct from old.status and not public.is_farm_manager() then
    new.status := old.status;
  end if;
  if new.status is distinct from old.status then
    if new.status = 'acknowledged' then
      new.acknowledged_by := auth.uid(); new.acknowledged_at := now();
      new.resolved_by := null; new.resolved_at := null;
    elsif new.status = 'resolved' then
      new.resolved_by := auth.uid(); new.resolved_at := now();
      new.acknowledged_by := coalesce(old.acknowledged_by, auth.uid());
      new.acknowledged_at := coalesce(old.acknowledged_at, now());
    else
      new.acknowledged_by := null; new.acknowledged_at := null;
      new.resolved_by := null; new.resolved_at := null;
    end if;
  else
    new.acknowledged_by := old.acknowledged_by; new.acknowledged_at := old.acknowledged_at;
    new.resolved_by := old.resolved_by; new.resolved_at := old.resolved_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.concern_reports_before_write() from public, anon, authenticated;

drop trigger if exists trg_concerns_before on public.concern_reports;
create trigger trg_concerns_before before insert or update on public.concern_reports
  for each row execute function public.concern_reports_before_write();

-- ---------------------------------------------------------------------------
-- 3. Lab tests
-- ---------------------------------------------------------------------------

create table if not exists public.lab_tests (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  user_id      uuid default auth.uid() references auth.users(id) on delete set null,
  animal_id    uuid not null references public.animals(id) on delete cascade,
  test_type    text not null check (test_type in
                 ('cae', 'cl', 'johnes', 'fecal_egg_count', 'brucellosis', 'tb', 'q_fever', 'pregnancy', 'selenium', 'copper', 'other')),
  test_name    text,
  sample_date  date not null default current_date,
  result_date  date,
  result       text not null default 'pending' check (result in ('pending', 'negative', 'positive', 'inconclusive', 'value')),
  -- For numeric results, e.g. a fecal egg count of 1200 epg.
  value        numeric,
  value_unit   text,
  lab_name     text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_lab_tests_farm on public.lab_tests (farm_id, test_type, sample_date desc);
create index if not exists idx_lab_tests_animal on public.lab_tests (animal_id, sample_date desc);

alter table public.lab_tests enable row level security;
create policy "Farm members can view" on public.lab_tests
  for select to authenticated using (farm_id = (select public.current_farm_id()));
create policy "Farm members can add" on public.lab_tests
  for insert to authenticated with check (farm_id = (select public.current_farm_id()) and user_id = (select auth.uid()));
create policy "Farm members can edit" on public.lab_tests
  for update to authenticated using (farm_id = (select public.current_farm_id())) with check (farm_id = (select public.current_farm_id()));
create policy "Owners and managers can delete" on public.lab_tests
  for delete to authenticated using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));

create or replace function public.lab_tests_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.row_in_farm('animals', new.animal_id, new.farm_id) then
    raise exception 'That animal is not on this farm';
  end if;
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end;
$$;
revoke execute on function public.lab_tests_before_write() from public, anon, authenticated;
drop trigger if exists trg_lab_tests_before on public.lab_tests;
create trigger trg_lab_tests_before before insert or update on public.lab_tests
  for each row execute function public.lab_tests_before_write();

do $$
declare t text;
begin
  foreach t in array array['concern_reports', 'lab_tests'] loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t);
  end loop;
end $$;

commit;
