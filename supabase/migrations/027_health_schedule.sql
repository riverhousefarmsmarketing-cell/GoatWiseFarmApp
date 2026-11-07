-- 027_health_schedule.sql
--
-- Herd health schedule. Owners and managers set up rules ("protocols") once:
--   * interval: every N days since it was last done (hoof trim every 56 days,
--     FAMACHA every 14 days, optionally only in season)
--   * age:      at set ages (kid vaccines at 28 and 56 days old)
--   * yearly:   once a year by a date (CD&T booster by Mar 1)
-- optionally limited to certain sexes, categories, a herd or a group.
--
-- The app works out which animals are due or overdue (src/lib/healthSchedule.ts).
-- Recording it writes a normal health record with protocol_id (and, for age
-- rules, which step), which is what marks it done. baseline_date lets you say
-- "the whole herd was last done on ..." when you set a rule up, so it doesn't
-- show every animal as overdue on day one. Requires 019-026.

begin;

create table if not exists public.health_protocols (
  id                 uuid primary key default gen_random_uuid(),
  farm_id            uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  user_id            uuid default auth.uid() references auth.users(id) on delete set null,
  name               text not null check (length(trim(name)) > 0),
  health_type        text not null default 'vaccination'
                       check (health_type in ('vaccination', 'deworming', 'treatment', 'vet_visit', 'hoof_trim', 'injury', 'illness', 'other', 'observation')),
  medicine_id        uuid references public.medicines(id) on delete set null,
  default_dose       numeric check (default_dose is null or default_dose >= 0),
  default_dose_unit  text,
  route              text,
  schedule_kind      text not null check (schedule_kind in ('interval', 'age', 'yearly')),
  interval_days      integer check (interval_days is null or interval_days between 1 and 3650),
  age_days           integer[],
  yearly_date        text check (yearly_date is null or yearly_date ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
  -- Don't include animals younger than this (e.g. no hoof trims for newborns).
  min_age_days       integer check (min_age_days is null or min_age_days >= 0),
  -- NULL = all.
  sexes              text[],
  categories         text[],
  herd_id            uuid references public.herds(id) on delete set null,
  group_id           uuid references public.groups(id) on delete set null,
  season_start       text check (season_start is null or season_start ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
  season_end         text check (season_end is null or season_end ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
  -- Show as "coming up" this many days ahead.
  lead_days          integer not null default 7 check (lead_days between 0 and 120),
  baseline_date      date,
  active             boolean not null default true,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint health_protocols_kind_fields check (
    (schedule_kind = 'interval' and interval_days is not null)
    or (schedule_kind = 'age' and age_days is not null and cardinality(age_days) between 1 and 12)
    or (schedule_kind = 'yearly' and yearly_date is not null)),
  constraint health_protocols_season_pair check ((season_start is null) = (season_end is null))
);
create index if not exists idx_health_protocols_farm on public.health_protocols (farm_id, active);

alter table public.health_records
  add column if not exists protocol_id   uuid references public.health_protocols(id) on delete set null,
  add column if not exists protocol_step integer check (protocol_step is null or protocol_step >= 0);
create index if not exists idx_health_records_protocol on public.health_records (protocol_id, animal_id, date desc);

alter table public.health_protocols enable row level security;
create policy "Farm members can view the health schedule" on public.health_protocols
  for select to authenticated using (farm_id = (select public.current_farm_id()));
create policy "Owners and managers add health rules" on public.health_protocols
  for insert to authenticated
  with check (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()) and user_id = (select auth.uid()));
create policy "Owners and managers edit health rules" on public.health_protocols
  for update to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()))
  with check (farm_id = (select public.current_farm_id()));
create policy "Owners and managers delete health rules" on public.health_protocols
  for delete to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));

create or replace function public.health_protocols_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'health_protocols' then
    if not (public.row_in_farm('medicines', new.medicine_id, new.farm_id)
        and public.row_in_farm('herds', new.herd_id, new.farm_id)
        and public.row_in_farm('groups', new.group_id, new.farm_id)) then
      raise exception 'That medicine, herd or group is not on this farm';
    end if;
    if new.age_days is not null then
      new.age_days := (select array_agg(distinct a order by a) from unnest(new.age_days) a where a >= 0);
    end if;
    if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  elsif tg_table_name = 'health_records' then
    if not public.row_in_farm('health_protocols', new.protocol_id, new.farm_id) then
      raise exception 'That health rule is not on this farm';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.health_protocols_before_write() from public, anon, authenticated;

drop trigger if exists trg_protocols_before on public.health_protocols;
create trigger trg_protocols_before before insert or update on public.health_protocols
  for each row execute function public.health_protocols_before_write();
drop trigger if exists trg_protocol_ref on public.health_records;
create trigger trg_protocol_ref before insert or update on public.health_records
  for each row execute function public.health_protocols_before_write();
drop trigger if exists trg_audit on public.health_protocols;
create trigger trg_audit after insert or update or delete on public.health_protocols
  for each row execute function public.audit_row_change();

commit;
