-- 030_people_hours_pay.sql
--
-- People on the farm, with or without a GoatWise login, plus hours and pay.
--
--   * farm_people: everyone who works on the farm. People with a login get a
--     profile automatically; family and helpers who won't use the app are
--     added by the owner or a manager. Everyone on the farm can see names
--     (so jobs can be given to them); only owners and managers edit.
--   * person_pay: pay type and rate. Owners and managers only.
--   * time_entries: hours worked. Owners and managers enter them for anyone;
--     a person with a login can log and see their own (until paid).
--   * pay_payments: payments made. Owners and managers record them; the
--     person can see their own. Recording a payment marks the hours it covers
--     as paid.
--   * Paper sheets: chores, doses and assignments can record which person
--     did them (person_id / completed_by_person_id), so the owner can enter
--     what family ticked off on a printed sheet. user_id still records who
--     entered it.
--   * assignment_people: jobs given to people without a login.
--
-- This is record keeping, not payroll: no tax or withholding.
-- Requires 019-029.

begin;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table if not exists public.farm_people (
  id                 uuid primary key default gen_random_uuid(),
  farm_id            uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  -- Their GoatWise login, if they have one.
  user_id            uuid references auth.users(id) on delete set null,
  name               text not null check (length(trim(name)) > 0),
  kind               text not null default 'employee' check (kind in ('family', 'employee', 'volunteer', 'contractor', 'other')),
  phone              text,
  email              text,
  emergency_contact  text,
  start_date         date,
  end_date           date,
  active             boolean not null default true,
  notes              text,
  created_by         uuid default auth.uid() references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_farm_people_farm on public.farm_people (farm_id, active);
create unique index if not exists uq_farm_people_login on public.farm_people (farm_id, user_id) where user_id is not null;

alter table public.farm_people enable row level security;
create policy "Farm members can see who works here" on public.farm_people
  for select to authenticated using (farm_id = (select public.current_farm_id()));
create policy "Owners and managers add people" on public.farm_people
  for insert to authenticated with check (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));
create policy "Owners and managers edit people" on public.farm_people
  for update to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()))
  with check (farm_id = (select public.current_farm_id()));
create policy "Owners and managers remove people" on public.farm_people
  for delete to authenticated using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));

-- A login on this farm can only be linked to one profile, and only a login
-- that belongs to the farm.
create or replace function public.farm_people_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null
     and not exists (select 1 from public.farm_members where farm_id = new.farm_id and user_id = new.user_id) then
    raise exception 'That login is not on this farm';
  end if;
  if tg_op = 'UPDATE' then
    new.farm_id := old.farm_id; new.created_by := old.created_by; new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.farm_people_before_write() from public, anon, authenticated;
drop trigger if exists trg_farm_people_before on public.farm_people;
create trigger trg_farm_people_before before insert or update on public.farm_people
  for each row execute function public.farm_people_before_write();

-- Everyone who joins a farm gets a profile; existing members get one now.
create or replace function public.farm_members_create_person()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.farm_people (farm_id, user_id, name, email, kind, created_by)
  select new.farm_id, new.user_id,
         coalesce(nullif(trim(p.display_name), ''), split_part(coalesce(p.email, 'Team member'), '@', 1)),
         p.email,
         case when new.role = 'owner' then 'family' else 'employee' end,
         new.user_id
    from (select 1) one left join public.profiles p on p.id = new.user_id
  on conflict (farm_id, user_id) where user_id is not null do nothing;
  return null;
end;
$$;
revoke execute on function public.farm_members_create_person() from public, anon, authenticated;
drop trigger if exists trg_member_person on public.farm_members;
create trigger trg_member_person after insert on public.farm_members
  for each row execute function public.farm_members_create_person();

insert into public.farm_people (farm_id, user_id, name, email, kind, created_by)
select m.farm_id, m.user_id,
       coalesce(nullif(trim(p.display_name), ''), split_part(coalesce(p.email, 'Team member'), '@', 1)),
       p.email,
       case when m.role = 'owner' then 'family' else 'employee' end,
       m.user_id
  from public.farm_members m
  left join public.profiles p on p.id = m.user_id
on conflict (farm_id, user_id) where user_id is not null do nothing;

-- Helpers for policies (SECURITY DEFINER: no recursion through RLS).
create or replace function public.person_farm_id(p_person uuid)
returns uuid language sql stable security definer set search_path = public
as $$ select farm_id from public.farm_people where id = p_person; $$;

create or replace function public.is_my_person(p_person uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.farm_people where id = p_person and user_id = auth.uid()); $$;

revoke execute on function public.person_farm_id(uuid) from public, anon;
revoke execute on function public.is_my_person(uuid) from public, anon;
grant execute on function public.person_farm_id(uuid) to authenticated;
grant execute on function public.is_my_person(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Pay settings (owners and managers only)
-- ---------------------------------------------------------------------------

create table if not exists public.person_pay (
  person_id   uuid primary key references public.farm_people(id) on delete cascade,
  farm_id     uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  pay_type    text not null default 'hourly' check (pay_type in ('hourly', 'daily', 'salary', 'per_task', 'unpaid')),
  -- Per hour / per day / per pay period / per task, depending on pay_type.
  rate        numeric check (rate is null or rate >= 0),
  notes       text,
  updated_by  uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);
alter table public.person_pay enable row level security;
create policy "Owners and managers manage pay" on public.person_pay
  for all to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()))
  with check (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager())
              and public.person_farm_id(person_id) = farm_id);

-- ---------------------------------------------------------------------------
-- Payments (needed before time_entries references it)
-- ---------------------------------------------------------------------------

create table if not exists public.pay_payments (
  id              uuid primary key default gen_random_uuid(),
  farm_id         uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  person_id       uuid not null references public.farm_people(id) on delete cascade,
  paid_on         date not null default current_date,
  amount          numeric not null check (amount >= 0),
  period_start    date,
  period_end      date,
  hours           numeric check (hours is null or hours >= 0),
  method          text,
  notes           text,
  transaction_id  uuid references public.transactions(id) on delete set null,
  user_id         uuid default auth.uid() references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint pay_payments_period check (period_start is null or period_end is null or period_start <= period_end)
);
create index if not exists idx_pay_payments_person on public.pay_payments (person_id, paid_on desc);

alter table public.pay_payments enable row level security;
create policy "Managers see payments; people see their own" on public.pay_payments
  for select to authenticated
  using (farm_id = (select public.current_farm_id()) and ((select public.is_farm_manager()) or public.is_my_person(person_id)));
create policy "Owners and managers record payments" on public.pay_payments
  for insert to authenticated
  with check (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager())
              and public.person_farm_id(person_id) = farm_id and user_id = (select auth.uid()));
create policy "Owners and managers edit payments" on public.pay_payments
  for update to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()))
  with check (farm_id = (select public.current_farm_id()));
create policy "Owners and managers delete payments" on public.pay_payments
  for delete to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));

-- ---------------------------------------------------------------------------
-- Hours
-- ---------------------------------------------------------------------------

create table if not exists public.time_entries (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  person_id        uuid not null references public.farm_people(id) on delete cascade,
  work_date        date not null default current_date,
  start_time       time,
  end_time         time,
  break_minutes    integer not null default 0 check (break_minutes between 0 and 1440),
  hours            numeric not null check (hours > 0 and hours <= 24),
  task             text,
  notes            text,
  -- Who typed it in.
  user_id          uuid default auth.uid() references auth.users(id) on delete set null,
  paid_payment_id  uuid references public.pay_payments(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_time_entries_person on public.time_entries (person_id, work_date desc);
create index if not exists idx_time_entries_farm on public.time_entries (farm_id, work_date desc);

alter table public.time_entries enable row level security;
create policy "Managers see all hours; people see their own" on public.time_entries
  for select to authenticated
  using (farm_id = (select public.current_farm_id()) and ((select public.is_farm_manager()) or public.is_my_person(person_id)));
create policy "Managers log anyone's hours; people log their own" on public.time_entries
  for insert to authenticated
  with check (farm_id = (select public.current_farm_id()) and user_id = (select auth.uid()) and paid_payment_id is null
              and public.person_farm_id(person_id) = farm_id
              and ((select public.is_farm_manager()) or public.is_my_person(person_id)));
create policy "Managers edit hours; people edit their own unpaid hours" on public.time_entries
  for update to authenticated
  using (farm_id = (select public.current_farm_id())
         and ((select public.is_farm_manager()) or (public.is_my_person(person_id) and paid_payment_id is null)))
  with check (farm_id = (select public.current_farm_id()));
create policy "Managers delete hours; people delete their own unpaid hours" on public.time_entries
  for delete to authenticated
  using (farm_id = (select public.current_farm_id())
         and ((select public.is_farm_manager()) or (public.is_my_person(person_id) and paid_payment_id is null)));

-- Work out hours from start/end (minus break) when both are given; keep
-- people from moving their own entries to someone else or marking them paid.
create or replace function public.time_entries_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_minutes numeric;
begin
  if new.start_time is not null and new.end_time is not null then
    v_minutes := extract(epoch from (new.end_time - new.start_time)) / 60;
    if v_minutes <= 0 then v_minutes := v_minutes + 1440; end if;  -- past midnight
    new.hours := round(greatest(v_minutes - coalesce(new.break_minutes, 0), 0) / 60.0, 2);
  end if;
  if new.hours is null or new.hours <= 0 then
    raise exception 'Hours must be more than zero';
  end if;
  if tg_op = 'UPDATE' then
    new.farm_id := old.farm_id; new.user_id := old.user_id; new.created_at := old.created_at;
    if not public.is_farm_manager() then
      new.person_id := old.person_id;
      new.paid_payment_id := old.paid_payment_id;
    end if;
    new.updated_at := now();
  end if;
  if new.paid_payment_id is not null
     and not exists (select 1 from public.pay_payments where id = new.paid_payment_id and person_id = new.person_id and farm_id = new.farm_id) then
    raise exception 'That payment is for someone else';
  end if;
  return new;
end;
$$;
revoke execute on function public.time_entries_before_write() from public, anon, authenticated;
drop trigger if exists trg_time_entries_before on public.time_entries;
create trigger trg_time_entries_before before insert or update on public.time_entries
  for each row execute function public.time_entries_before_write();

-- Recording a payment for a period marks that person's unpaid hours in the
-- period as paid by it.
create or replace function public.pay_payments_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.period_start is not null and new.period_end is not null then
    update public.time_entries
       set paid_payment_id = new.id
     where person_id = new.person_id and farm_id = new.farm_id and paid_payment_id is null
       and work_date between new.period_start and new.period_end;
  end if;
  return null;
end;
$$;
revoke execute on function public.pay_payments_after_insert() from public, anon, authenticated;
drop trigger if exists trg_pay_payments_after on public.pay_payments;
create trigger trg_pay_payments_after after insert on public.pay_payments
  for each row execute function public.pay_payments_after_insert();

-- ---------------------------------------------------------------------------
-- Who actually did it (for paper sheets) and jobs for people without a login
-- ---------------------------------------------------------------------------

alter table public.chore_completions add column if not exists person_id uuid references public.farm_people(id) on delete set null;
alter table public.course_doses      add column if not exists person_id uuid references public.farm_people(id) on delete set null;
alter table public.assignments       add column if not exists completed_by_person_id uuid references public.farm_people(id) on delete set null;

create or replace function public.check_person_ref()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Read through jsonb: the column name differs per table, and plpgsql
  -- rejects a field the row type doesn't have even in an untaken branch.
  v_person uuid := (to_jsonb(new) ->> case tg_table_name when 'assignments' then 'completed_by_person_id' else 'person_id' end)::uuid;
begin
  if v_person is not null and public.person_farm_id(v_person) is distinct from new.farm_id then
    raise exception 'That person is not on this farm';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_person_ref() from public, anon, authenticated;
do $$
declare t text;
begin
  foreach t in array array['chore_completions', 'course_doses', 'assignments'] loop
    execute format('drop trigger if exists trg_person_ref on public.%I', t);
    execute format('create trigger trg_person_ref before insert or update on public.%I for each row execute function public.check_person_ref()', t);
  end loop;
end $$;

create table if not exists public.assignment_people (
  assignment_id  uuid not null references public.assignments(id) on delete cascade,
  person_id      uuid not null references public.farm_people(id) on delete cascade,
  primary key (assignment_id, person_id)
);
create index if not exists idx_assignment_people_person on public.assignment_people (person_id);
alter table public.assignment_people enable row level security;
create policy "Farm members can see who jobs are for" on public.assignment_people
  for select to authenticated
  using (public.assignment_farm_id(assignment_id) = (select public.current_farm_id()));
create policy "Owners and managers give jobs to people" on public.assignment_people
  for insert to authenticated
  with check ((select public.is_farm_manager())
              and public.assignment_farm_id(assignment_id) = (select public.current_farm_id())
              and public.person_farm_id(person_id) = (select public.current_farm_id()));
create policy "Owners and managers take jobs back" on public.assignment_people
  for delete to authenticated
  using ((select public.is_farm_manager()) and public.assignment_farm_id(assignment_id) = (select public.current_farm_id()));

-- Repeating assignments carry their people along (extends 021's trigger).
create or replace function public.assignments_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_id  uuid;
  v_base     date;
  v_next_due date;
begin
  if new.status = 'done' and old.status <> 'done' and new.recurrence <> 'none'
     and not exists (select 1 from public.assignments where repeated_from = new.id) then
    v_base := coalesce(new.due_date, current_date);
    v_next_due := case new.recurrence
      when 'daily'   then v_base + 1
      when 'weekly'  then v_base + 7
      when 'monthly' then (v_base + interval '1 month')::date
    end;
    insert into public.assignments (farm_id, title, notes, due_date, recurrence, animal_id, herd_id, paddock_id, created_by, repeated_from)
    values (new.farm_id, new.title, new.notes, v_next_due, new.recurrence, new.animal_id, new.herd_id, new.paddock_id, new.created_by, new.id)
    returning id into v_next_id;
    insert into public.assignment_assignees (assignment_id, user_id)
    select v_next_id, user_id from public.assignment_assignees where assignment_id = new.id;
    insert into public.assignment_people (assignment_id, person_id)
    select v_next_id, person_id from public.assignment_people where assignment_id = new.id;
  end if;
  return null;
end;
$$;

-- Assignees who aren't managers may also record which person did it.
create or replace function public.assignments_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_farm_manager() then
    new.title      := old.title;
    new.notes      := old.notes;
    new.due_date   := old.due_date;
    new.recurrence := old.recurrence;
    new.animal_id  := old.animal_id;
    new.herd_id    := old.herd_id;
    new.paddock_id := old.paddock_id;
    new.farm_id    := old.farm_id;
    new.created_by := old.created_by;
    new.repeated_from := old.repeated_from;
  end if;

  if new.status = 'done' and old.status <> 'done' then
    new.completed_at := now();
    new.completed_by := auth.uid();
  elsif new.status <> 'done' then
    new.completed_at := null;
    new.completed_by := null;
    new.completed_by_person_id := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- Money: payments can also be recorded as a labor expense by the app.

-- Change history (pay settings and payments included: managers only see
-- money rows, see 024; extend that to pay).
do $$
declare t text;
begin
  foreach t in array array['farm_people', 'time_entries', 'pay_payments', 'person_pay'] loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t);
  end loop;
end $$;

drop policy if exists "Farm members can view history" on public.audit_log;
create policy "Farm members can view history" on public.audit_log
  for select to authenticated
  using (farm_id = (select public.current_farm_id())
         and (table_name not in ('transactions', 'person_pay', 'pay_payments', 'time_entries') or (select public.is_farm_manager())));

commit;
