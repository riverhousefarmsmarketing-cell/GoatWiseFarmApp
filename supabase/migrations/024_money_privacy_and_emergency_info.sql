-- 024_money_privacy_and_emergency_info.sql
--
-- 1. Money is owner/manager only. Workers can no longer read or change
--    transactions, and the change history hides money entries from them
--    (it records old and new amounts). Requires 019-020.
--
-- 2. Emergency info: one page per farm with tap-to-call contacts (vet,
--    after-hours vet, neighbours...), the farm address and directions for
--    emergency services, and where medicine and supplies are kept. Everyone
--    on the farm can read it; owners and managers keep it up to date.

begin;

-- ---------------------------------------------------------------------------
-- 1. Money privacy
-- ---------------------------------------------------------------------------

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'transactions' loop
    execute format('drop policy %I on public.transactions', pol.policyname);
  end loop;
end $$;

create policy "Owners and managers can view money" on public.transactions
  for select to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));
create policy "Owners and managers can add money entries" on public.transactions
  for insert to authenticated
  with check (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()) and user_id = (select auth.uid()));
create policy "Owners and managers can edit money entries" on public.transactions
  for update to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()))
  with check (farm_id = (select public.current_farm_id()));
create policy "Owners and managers can delete money entries" on public.transactions
  for delete to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));

drop policy if exists "Farm members can view history" on public.audit_log;
create policy "Farm members can view history" on public.audit_log
  for select to authenticated
  using (farm_id = (select public.current_farm_id())
         and (table_name <> 'transactions' or (select public.is_farm_manager())));

-- A worker's pending deletion request could carry a copy of a money row;
-- they can no longer create one (they can't see money), but keep old ones
-- private too.
drop policy if exists "Farm members can view deletion requests" on public.deletion_requests;
create policy "Farm members can view deletion requests" on public.deletion_requests
  for select to authenticated
  using (farm_id = (select public.current_farm_id())
         and (table_name <> 'transactions' or (select public.is_farm_manager())));

-- ---------------------------------------------------------------------------
-- 2. Emergency info
-- ---------------------------------------------------------------------------

create table if not exists public.farm_emergency_info (
  farm_id            uuid primary key default public.current_farm_id() references public.farms(id) on delete cascade,
  address            text,
  -- How to find the place: gate code, which driveway, where to park.
  directions         text,
  medicine_location  text,
  supplies_location  text,
  notes              text,
  updated_by         uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at         timestamptz not null default now()
);

create table if not exists public.emergency_contacts (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  -- e.g. "Vet", "After-hours vet", "Neighbour", "Farrier"
  role        text,
  phone       text,
  alt_phone   text,
  notes       text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_emergency_contacts_farm on public.emergency_contacts (farm_id, sort_order);

alter table public.farm_emergency_info enable row level security;
alter table public.emergency_contacts  enable row level security;

create policy "Farm members can read emergency info" on public.farm_emergency_info
  for select to authenticated using (farm_id = (select public.current_farm_id()));
create policy "Owners and managers set emergency info" on public.farm_emergency_info
  for insert to authenticated
  with check (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));
create policy "Owners and managers update emergency info" on public.farm_emergency_info
  for update to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()))
  with check (farm_id = (select public.current_farm_id()));

create policy "Farm members can read emergency contacts" on public.emergency_contacts
  for select to authenticated using (farm_id = (select public.current_farm_id()));
create policy "Owners and managers add emergency contacts" on public.emergency_contacts
  for insert to authenticated
  with check (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));
create policy "Owners and managers edit emergency contacts" on public.emergency_contacts
  for update to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()))
  with check (farm_id = (select public.current_farm_id()));
create policy "Owners and managers remove emergency contacts" on public.emergency_contacts
  for delete to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));

-- audit_row_change() keys history by the row's id; this table's key is
-- farm_id, which it also records, so that's enough to find it.
do $$
declare t text;
begin
  foreach t in array array['farm_emergency_info', 'emergency_contacts'] loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t);
  end loop;
end $$;

commit;
