-- 025_medicine_cabinet.sql
--
-- Medicine cabinet: the farm's medicines (with default dose, route and
-- withdrawal periods) and the lots on hand (lot number, expiry date, how much
-- is left). Health records can say which medicine and which lot was used, so
-- a recall or a bad batch can be traced to the animals that got it.
--
-- Same rules as other farm records (019/020): everyone adds and edits, only
-- owners and managers delete (workers request it). Everything is in the
-- change history. Requires 019-023.

begin;

create table if not exists public.medicines (
  id                     uuid primary key default gen_random_uuid(),
  farm_id                uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  user_id                uuid default auth.uid() references auth.users(id) on delete set null,
  name                   text not null check (length(trim(name)) > 0),
  kind                   text not null default 'other'
                           check (kind in ('vaccine', 'dewormer', 'antibiotic', 'anti_inflammatory', 'vitamin_mineral', 'topical', 'other')),
  active_ingredient      text,
  -- e.g. "1 ml per 25 lb", "2 ml SQ, booster in 4 weeks"
  dose_notes             text,
  default_dose           numeric check (default_dose is null or default_dose >= 0),
  default_dose_unit      text,
  route                  text,
  -- What lots are counted in: ml, doses, tablets, boluses, g...
  stock_unit             text not null default 'ml',
  meat_withdrawal_days   integer check (meat_withdrawal_days is null or meat_withdrawal_days >= 0),
  milk_withdrawal_days   integer check (milk_withdrawal_days is null or milk_withdrawal_days >= 0),
  storage                text not null default 'room' check (storage in ('room', 'fridge', 'freezer')),
  prescription_required  boolean not null default false,
  -- Flag "low" when the total left across lots drops to this.
  low_stock_level        numeric check (low_stock_level is null or low_stock_level >= 0),
  active                 boolean not null default true,
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists idx_medicines_farm on public.medicines (farm_id, active);
create unique index if not exists medicines_farm_name_idx on public.medicines (farm_id, lower(name));

create table if not exists public.medicine_lots (
  id                  uuid primary key default gen_random_uuid(),
  farm_id             uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  user_id             uuid default auth.uid() references auth.users(id) on delete set null,
  -- RESTRICT: a medicine with lots can't disappear and take its lots along.
  medicine_id         uuid not null references public.medicines(id) on delete restrict,
  lot_number          text,
  expiry_date         date,
  quantity_received   numeric check (quantity_received is null or quantity_received >= 0),
  quantity_remaining  numeric check (quantity_remaining is null or quantity_remaining >= 0),
  received_on         date default current_date,
  supplier            text,
  cost                numeric check (cost is null or cost >= 0),
  status              text not null default 'in_stock' check (status in ('in_stock', 'finished', 'discarded')),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_medicine_lots_medicine on public.medicine_lots (medicine_id, status);
create index if not exists idx_medicine_lots_farm on public.medicine_lots (farm_id, status, expiry_date);

alter table public.health_records
  add column if not exists medicine_id     uuid references public.medicines(id) on delete set null,
  add column if not exists medicine_lot_id uuid references public.medicine_lots(id) on delete set null;
create index if not exists idx_health_records_medicine_lot on public.health_records (medicine_lot_id);

alter table public.restock_requests
  add column if not exists medicine_id uuid references public.medicines(id) on delete set null;

-- Standard farm-record policies.
do $$
declare t text;
begin
  foreach t in array array['medicines', 'medicine_lots'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Farm members can view" on public.%I for select to authenticated using (farm_id = (select public.current_farm_id()))', t);
    execute format('create policy "Farm members can add" on public.%I for insert to authenticated with check (farm_id = (select public.current_farm_id()) and user_id = (select auth.uid()))', t);
    execute format('create policy "Farm members can edit" on public.%I for update to authenticated using (farm_id = (select public.current_farm_id())) with check (farm_id = (select public.current_farm_id()))', t);
    execute format('create policy "Owners and managers can delete" on public.%I for delete to authenticated using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()))', t);
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t);
  end loop;
end $$;

-- row_in_farm() now also knows medicines and lots (and the tables later
-- health migrations reference).
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
  if p_table not in ('groups', 'paddocks', 'herds', 'feed_types', 'care_plans',
                     'medicines', 'medicine_lots', 'animals', 'health_records',
                     'treatment_courses', 'health_protocols') then
    raise exception 'row_in_farm: unsupported table %', p_table;
  end if;
  execute format('select exists (select 1 from public.%I where id = $1 and farm_id = $2)', p_table)
    into v_ok using p_id, p_farm;
  return v_ok;
end;
$$;
revoke execute on function public.row_in_farm(text, uuid, uuid) from public, anon, authenticated;

create or replace function public.medicine_refs_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'medicine_lots' then
    if not public.row_in_farm('medicines', new.medicine_id, new.farm_id) then
      raise exception 'That medicine is not on this farm';
    end if;
    -- Running out marks the lot finished.
    if new.quantity_remaining = 0 and new.status = 'in_stock' then
      new.status := 'finished';
    end if;
  elsif tg_table_name = 'health_records' then
    if not (public.row_in_farm('medicines', new.medicine_id, new.farm_id)
        and public.row_in_farm('medicine_lots', new.medicine_lot_id, new.farm_id)) then
      raise exception 'That medicine or lot is not on this farm';
    end if;
  elsif tg_table_name = 'restock_requests' then
    if not public.row_in_farm('medicines', new.medicine_id, new.farm_id) then
      raise exception 'That medicine is not on this farm';
    end if;
  end if;
  if tg_op = 'UPDATE' and tg_table_name in ('medicines', 'medicine_lots') then
    new.updated_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.medicine_refs_check() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['medicines', 'medicine_lots', 'health_records', 'restock_requests'] loop
    execute format('drop trigger if exists trg_medicine_refs on public.%I', t);
    execute format('create trigger trg_medicine_refs before insert or update on public.%I for each row execute function public.medicine_refs_check()', t);
  end loop;
end $$;

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
    'mineral_refills', 'medicines', 'medicine_lots',
    'treatment_courses', 'health_protocols', 'lab_tests'
  ]);
$$;

commit;
