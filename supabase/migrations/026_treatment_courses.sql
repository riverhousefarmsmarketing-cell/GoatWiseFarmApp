-- 026_treatment_courses.sql
--
-- Treatment courses: "Penicillin, 3 ml IM, 8am and 6pm, for 5 days" for one
-- animal. Each scheduled dose is ticked off by whoever gives it (stamped with
-- who and when), or marked skipped with a reason, so a missed dose shows up
-- when several people share the work.
--
-- Starting a course also writes ONE health record for it (type 'treatment').
-- Its date is the course's last planned day, so the existing withdrawal
-- tracking (date + withdrawal_days) covers the whole course and the period
-- after it. If the course is stopped early, the record moves to the last
-- dose actually given.
--
-- Anyone on the farm can start a course and give doses; deleting a course
-- follows the approval rules. Requires 019-025.

begin;

create table if not exists public.treatment_courses (
  id                uuid primary key default gen_random_uuid(),
  farm_id           uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  user_id           uuid default auth.uid() references auth.users(id) on delete set null,
  animal_id         uuid not null references public.animals(id) on delete cascade,
  medicine_id       uuid references public.medicines(id) on delete set null,
  medicine_lot_id   uuid references public.medicine_lots(id) on delete set null,
  medication        text not null check (length(trim(medication)) > 0),
  -- What it's for, e.g. "Mastitis, left side"
  reason            text,
  dose              numeric check (dose is null or dose >= 0),
  dose_unit         text,
  route             text,
  times             text[] not null,
  every_n_days      integer not null default 1 check (every_n_days between 1 and 30),
  start_date        date not null default current_date,
  days              integer not null check (days between 1 and 365),
  withdrawal_days   integer check (withdrawal_days is null or withdrawal_days >= 0),
  prescribed_by     text,
  notes             text,
  status            text not null default 'active' check (status in ('active', 'completed', 'stopped')),
  stopped_reason    text,
  stopped_by        uuid references auth.users(id) on delete set null,
  stopped_at        timestamptz,
  health_record_id  uuid references public.health_records(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint treatment_courses_times check (
    cardinality(times) between 1 and 12
    and array_to_string(times, ',') ~ '^([01][0-9]|2[0-3]):[0-5][0-9](,([01][0-9]|2[0-3]):[0-5][0-9])*$')
);
create index if not exists idx_treatment_courses_farm on public.treatment_courses (farm_id, status);
create index if not exists idx_treatment_courses_animal on public.treatment_courses (animal_id);

create table if not exists public.course_doses (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  course_id        uuid not null references public.treatment_courses(id) on delete cascade,
  dose_date        date not null,
  slot             text not null check (slot ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  -- Who gave it (or skipped it).
  user_id          uuid default auth.uid() references auth.users(id) on delete set null,
  given_at         timestamptz not null default now(),
  amount           numeric check (amount is null or amount >= 0),
  dose_unit        text,
  medicine_lot_id  uuid references public.medicine_lots(id) on delete set null,
  skipped          boolean not null default false,
  note             text,
  unique (course_id, dose_date, slot)
);
create index if not exists idx_course_doses_farm_date on public.course_doses (farm_id, dose_date);

alter table public.health_records
  add column if not exists treatment_course_id uuid references public.treatment_courses(id) on delete set null;

-- Policies -----------------------------------------------------------------

alter table public.treatment_courses enable row level security;
create policy "Farm members can view" on public.treatment_courses
  for select to authenticated using (farm_id = (select public.current_farm_id()));
create policy "Farm members can add" on public.treatment_courses
  for insert to authenticated
  with check (farm_id = (select public.current_farm_id()) and user_id = (select auth.uid()));
create policy "Farm members can edit" on public.treatment_courses
  for update to authenticated
  using (farm_id = (select public.current_farm_id()))
  with check (farm_id = (select public.current_farm_id()));
create policy "Owners and managers can delete" on public.treatment_courses
  for delete to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));

alter table public.course_doses enable row level security;
create policy "Farm members can view doses" on public.course_doses
  for select to authenticated using (farm_id = (select public.current_farm_id()));
create policy "Farm members record doses" on public.course_doses
  for insert to authenticated
  with check (farm_id = (select public.current_farm_id()) and user_id = (select auth.uid()));
create policy "Members edit their own dose notes" on public.course_doses
  for update to authenticated
  using (farm_id = (select public.current_farm_id()) and (user_id = (select auth.uid()) or (select public.is_farm_manager())))
  with check (farm_id = (select public.current_farm_id()));
create policy "Members undo their own doses" on public.course_doses
  for delete to authenticated
  using (farm_id = (select public.current_farm_id()) and (user_id = (select auth.uid()) or (select public.is_farm_manager())));

-- Helpers --------------------------------------------------------------------

-- How many doses a course plans in total.
create or replace function public.course_planned_doses(p_days integer, p_every integer, p_times text[])
returns integer
language sql
immutable
as $$
  select ((p_days + p_every - 1) / p_every) * cardinality(p_times);
$$;

-- The last day a course has a dose on.
create or replace function public.course_last_day(p_start date, p_days integer, p_every integer)
returns date
language sql
immutable
as $$
  select p_start + ((p_days - 1) / p_every) * p_every;
$$;

-- Triggers -------------------------------------------------------------------

create or replace function public.treatment_courses_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.row_in_farm('animals', new.animal_id, new.farm_id)
      and public.row_in_farm('medicines', new.medicine_id, new.farm_id)
      and public.row_in_farm('medicine_lots', new.medicine_lot_id, new.farm_id)) then
    raise exception 'That animal, medicine or lot is not on this farm';
  end if;

  new.times := (select array_agg(distinct t order by t) from unnest(new.times) t);

  if tg_op = 'INSERT' then
    new.status := 'active';
    new.stopped_by := null; new.stopped_at := null; new.stopped_reason := null;
    new.health_record_id := null;
    return new;
  end if;

  new.farm_id := old.farm_id;
  new.user_id := old.user_id;
  -- Only the course's own health record (written by the after-insert
  -- trigger) can be linked, and only once.
  if not (old.health_record_id is null
          and exists (select 1 from public.health_records
                       where id = new.health_record_id and treatment_course_id = new.id)) then
    new.health_record_id := old.health_record_id;
  end if;
  if new.status = 'stopped' and old.status <> 'stopped' then
    new.stopped_by := auth.uid();
    new.stopped_at := now();
  elsif new.status <> 'stopped' then
    new.stopped_by := null; new.stopped_at := null;
  else
    new.stopped_by := old.stopped_by; new.stopped_at := old.stopped_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Keep the course's single health record in step with the course.
create or replace function public.treatment_courses_after_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record   uuid;
  v_last_day date := public.course_last_day(new.start_date, new.days, new.every_n_days);
  v_summary  text := format('Treatment course: %s day(s) from %s at %s%s',
                            new.days, to_char(new.start_date, 'Mon DD, YYYY'), array_to_string(new.times, ', '),
                            case when new.every_n_days > 1 then format(', every %s days', new.every_n_days) else '' end);
  v_given    date;
begin
  if tg_op = 'INSERT' then
    insert into public.health_records (
      farm_id, user_id, animal_id, type, date, treatment, medication, dosage, dosage_unit, route,
      withdrawal_days, notes, medicine_id, medicine_lot_id, treatment_course_id)
    values (
      new.farm_id, new.user_id, new.animal_id, 'treatment', v_last_day, new.reason, new.medication, new.dose,
      new.dose_unit, new.route, new.withdrawal_days,
      concat_ws(E'\n', v_summary, case when new.prescribed_by is not null then 'Prescribed by ' || new.prescribed_by end, new.notes),
      new.medicine_id, new.medicine_lot_id, new.id)
    returning id into v_record;
    update public.treatment_courses set health_record_id = v_record where id = new.id;
    return null;
  end if;

  if new.health_record_id is null then return null; end if;

  if new.status = 'stopped' and old.status <> 'stopped' then
    select max(dose_date) into v_given from public.course_doses where course_id = new.id and not skipped;
    update public.health_records
       set date = coalesce(v_given, new.start_date),
           notes = concat_ws(E'\n', notes, format('Stopped early on %s%s', to_char(now(), 'Mon DD, YYYY'),
                                                 case when new.stopped_reason is not null then ': ' || new.stopped_reason else '' end))
     where id = new.health_record_id;
  elsif (new.start_date, new.days, new.every_n_days, new.times, new.medication, new.dose, new.dose_unit, new.route, new.withdrawal_days, new.reason)
        is distinct from
        (old.start_date, old.days, old.every_n_days, old.times, old.medication, old.dose, old.dose_unit, old.route, old.withdrawal_days, old.reason)
        and new.status <> 'stopped' then
    update public.health_records
       set date = v_last_day, treatment = new.reason, medication = new.medication, dosage = new.dose,
           dosage_unit = new.dose_unit, route = new.route, withdrawal_days = new.withdrawal_days
     where id = new.health_record_id;
  end if;
  return null;
end;
$$;

-- Doses: belong to a course on the same farm, fall on a planned day and time,
-- and completing the last one completes the course.
create or replace function public.course_doses_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_course public.treatment_courses%rowtype;
begin
  select * into v_course from public.treatment_courses where id = new.course_id and farm_id = new.farm_id;
  if v_course.id is null then raise exception 'That treatment course is not on this farm'; end if;
  if not public.row_in_farm('medicine_lots', new.medicine_lot_id, new.farm_id) then
    raise exception 'That lot is not on this farm';
  end if;
  if new.dose_date < v_course.start_date
     or new.dose_date > public.course_last_day(v_course.start_date, v_course.days, v_course.every_n_days)
     or (new.dose_date - v_course.start_date) % v_course.every_n_days <> 0
     or not (new.slot = any (v_course.times)) then
    raise exception 'That is not one of the course''s scheduled doses';
  end if;
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id; new.given_at := old.given_at;
    new.course_id := old.course_id; new.dose_date := old.dose_date; new.slot := old.slot;
  else
    new.given_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.course_doses_after_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_id uuid := coalesce(new.course_id, old.course_id);
  v_course    public.treatment_courses%rowtype;
  v_done      integer;
begin
  select * into v_course from public.treatment_courses where id = v_course_id;
  if v_course.id is null or v_course.status = 'stopped' then return null; end if;
  select count(*) into v_done from public.course_doses where course_id = v_course_id;
  if v_done >= public.course_planned_doses(v_course.days, v_course.every_n_days, v_course.times) then
    update public.treatment_courses set status = 'completed' where id = v_course_id and status = 'active';
  else
    update public.treatment_courses set status = 'active' where id = v_course_id and status = 'completed';
  end if;
  return null;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array['treatment_courses_before_write()', 'treatment_courses_after_write()',
                           'course_doses_before_write()', 'course_doses_after_write()'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

drop trigger if exists trg_courses_before on public.treatment_courses;
create trigger trg_courses_before before insert or update on public.treatment_courses
  for each row execute function public.treatment_courses_before_write();
drop trigger if exists trg_courses_after on public.treatment_courses;
create trigger trg_courses_after after insert or update on public.treatment_courses
  for each row execute function public.treatment_courses_after_write();
drop trigger if exists trg_doses_before on public.course_doses;
create trigger trg_doses_before before insert or update on public.course_doses
  for each row execute function public.course_doses_before_write();
drop trigger if exists trg_doses_after on public.course_doses;
create trigger trg_doses_after after insert or delete on public.course_doses
  for each row execute function public.course_doses_after_write();

do $$
declare t text;
begin
  foreach t in array array['treatment_courses', 'course_doses'] loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t);
  end loop;
end $$;

commit;
