-- 029_notifications.sql
--
-- Notifications. Each person gets their own list (the bell in the app). Rows
-- are written only by the database:
--
--   * straight away, by triggers: a concern reported (urgent ones flagged),
--     a deletion waiting for approval, a new assignment, something out of
--     stock or running low, a new farm update, and answers back to the person
--     who asked (concern resolved, deletion approved or rejected);
--   * every 10 minutes, by generate_due_notifications() (pg_cron where the
--     database has it): treatment doses more than 30 minutes late, chores
--     more than an hour late, and assignments past their due date.
--
-- Times of day are farm time, so farms get a time zone (the app fills it in
-- from the owner's browser). Phones and browsers can also receive these as
-- push notifications: push_subscriptions holds each device, and the app's
-- /api/notifications/dispatch route sends anything not yet pushed.
--
-- dedupe_key stops the same alert being sent twice. Requires 019-028.

begin;

alter table public.farms add column if not exists timezone text not null default 'UTC';

-- Owners can set the farm's time zone (alongside its name).
grant update (name, timezone) on public.farms to authenticated;

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null references public.farms(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  link        text,
  urgent      boolean not null default false,
  dedupe_key  text,
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  pushed_at   timestamptz
);
create index if not exists idx_notifications_user on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unpushed on public.notifications (created_at) where pushed_at is null;
create unique index if not exists uq_notifications_dedupe on public.notifications (user_id, dedupe_key) where dedupe_key is not null;

alter table public.notifications enable row level security;
create policy "People see their own notifications" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "People mark their own notifications read" on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "People clear their own notifications" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));
revoke insert on public.notifications from anon, authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "People manage their own devices" on public.push_subscriptions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Which kinds of notification each person has turned off.
create table if not exists public.notification_settings (
  user_id      uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  muted_kinds  text[] not null default '{}',
  updated_at   timestamptz not null default now()
);
alter table public.notification_settings enable row level security;
create policy "People manage their own notification settings" on public.notification_settings
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Senders
-- ---------------------------------------------------------------------------

create or replace function public.notify_user(
  p_farm uuid, p_user uuid, p_kind text, p_title text, p_body text, p_link text,
  p_urgent boolean default false, p_dedupe text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null then return; end if;
  -- Only people still on the farm, and not if they've muted this kind.
  if not exists (select 1 from public.farm_members where farm_id = p_farm and user_id = p_user) then return; end if;
  if exists (select 1 from public.notification_settings where user_id = p_user and p_kind = any (muted_kinds)) and not p_urgent then return; end if;
  insert into public.notifications (farm_id, user_id, kind, title, body, link, urgent, dedupe_key)
  values (p_farm, p_user, p_kind, left(p_title, 200), left(p_body, 1000), p_link, p_urgent, p_dedupe)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
end;
$$;

-- Everyone with one of the given roles, except (optionally) one person.
create or replace function public.notify_roles(
  p_farm uuid, p_roles text[], p_except uuid, p_kind text, p_title text, p_body text, p_link text,
  p_urgent boolean default false, p_dedupe text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare m record;
begin
  for m in select user_id from public.farm_members where farm_id = p_farm and role = any (p_roles) and user_id is distinct from p_except loop
    perform public.notify_user(p_farm, m.user_id, p_kind, p_title, p_body, p_link, p_urgent, p_dedupe);
  end loop;
end;
$$;

revoke execute on function public.notify_user(uuid, uuid, text, text, text, text, boolean, text) from public, anon, authenticated;
revoke execute on function public.notify_roles(uuid, text[], uuid, text, text, text, text, boolean, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Event triggers
-- ---------------------------------------------------------------------------

create or replace function public.notify_on_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name   text;
  v_title  text;
  v_actor  text := coalesce((select coalesce(nullif(trim(display_name), ''), split_part(email, '@', 1)) from public.profiles where id = auth.uid()), 'Someone');
  managers constant text[] := array['owner', 'manager'];
  everyone constant text[] := array['owner', 'manager', 'worker'];
begin
  if tg_table_name = 'concern_reports' then
    select name into v_name from public.animals where id = new.animal_id;
    if tg_op = 'INSERT' then
      perform public.notify_roles(new.farm_id, managers, new.user_id, 'concern',
        case when new.urgency = 'urgent' then 'URGENT: ' else 'Concern: ' end || coalesce(v_name || ' — ', '') || left(new.description, 80),
        v_actor || ' reported: ' || new.description, '/dashboard/sick-pen', new.urgency = 'urgent', 'concern:' || new.id);
    elsif new.status = 'resolved' and old.status <> 'resolved' then
      perform public.notify_user(new.farm_id, new.user_id, 'concern_resolved',
        'Resolved: ' || coalesce(v_name || ' — ', '') || left(new.description, 80),
        coalesce(new.resolution_note, 'Marked resolved by ' || v_actor), '/dashboard/sick-pen', false, 'concern-resolved:' || new.id);
    end if;

  elsif tg_table_name = 'deletion_requests' then
    if tg_op = 'INSERT' then
      perform public.notify_roles(new.farm_id, managers, new.requested_by, 'approval',
        'Delete request: ' || coalesce(new.record_label, new.table_name),
        v_actor || ' asked to delete this' || coalesce('. Reason: ' || new.reason, '.'), '/dashboard/approvals', false, 'deletion:' || new.id);
    elsif new.status in ('approved', 'rejected') and old.status = 'pending' and new.decided_by is distinct from new.requested_by then
      perform public.notify_user(new.farm_id, new.requested_by, 'approval_decided',
        case when new.status = 'approved' then 'Deleted: ' else 'Kept (not deleted): ' end || coalesce(new.record_label, new.table_name),
        new.decision_note, '/dashboard/approvals', false, 'deletion-decided:' || new.id);
    end if;

  elsif tg_table_name = 'assignment_assignees' then
    select title || coalesce(' (due ' || to_char(due_date, 'Mon DD') || ')', '') into v_title
      from public.assignments where id = new.assignment_id;
    if new.user_id is distinct from auth.uid() then
      perform public.notify_user((select farm_id from public.assignments where id = new.assignment_id), new.user_id, 'assignment',
        'New assignment: ' || coalesce(v_title, 'task'), 'From ' || v_actor, '/dashboard/assignments', false, 'assigned:' || new.assignment_id);
    end if;

  elsif tg_table_name = 'restock_requests' then
    if tg_op = 'INSERT' or (new.level = 'out' and old.level = 'low' and new.status = 'open') then
      perform public.notify_roles(new.farm_id, managers, auth.uid(), 'restock',
        case when new.level = 'out' then 'Out of ' else 'Running low: ' end || new.item_name,
        concat_ws(' · ', 'Flagged by ' || v_actor, new.quantity_note, new.note), '/dashboard/restock', false,
        'restock:' || new.id || ':' || new.level);
    end if;

  elsif tg_table_name = 'farm_posts' then
    perform public.notify_roles(new.farm_id, everyone, new.author_id, 'farm_update',
      coalesce('Farm update: ' || new.title, 'New farm update from ' || v_actor), left(new.body, 300), '/dashboard/updates',
      false, 'post:' || new.id);
  end if;
  return null;
end;
$$;
revoke execute on function public.notify_on_event() from public, anon, authenticated;

drop trigger if exists trg_notify on public.concern_reports;
create trigger trg_notify after insert or update on public.concern_reports for each row execute function public.notify_on_event();
drop trigger if exists trg_notify on public.deletion_requests;
create trigger trg_notify after insert or update on public.deletion_requests for each row execute function public.notify_on_event();
drop trigger if exists trg_notify on public.assignment_assignees;
create trigger trg_notify after insert on public.assignment_assignees for each row execute function public.notify_on_event();
drop trigger if exists trg_notify on public.restock_requests;
create trigger trg_notify after insert or update on public.restock_requests for each row execute function public.notify_on_event();
drop trigger if exists trg_notify on public.farm_posts;
create trigger trg_notify after insert on public.farm_posts for each row execute function public.notify_on_event();

-- ---------------------------------------------------------------------------
-- Time-based alerts
-- ---------------------------------------------------------------------------

-- Is this care plan in effect on this (farm-local) date? Mirrors
-- src/lib/chores.ts appliesOn().
create or replace function public.care_plan_applies(p public.care_plans, p_date date)
returns boolean
language sql
immutable
as $$
  select p.active
     and (p.days_of_week is null or cardinality(p.days_of_week) = 0 or extract(dow from p_date)::smallint = any (p.days_of_week))
     and (p.season_start is null or p.season_end is null
          or (case when p.season_start <= p.season_end
                   then to_char(p_date, 'MM-DD') between p.season_start and p.season_end
                   else to_char(p_date, 'MM-DD') >= p.season_start or to_char(p_date, 'MM-DD') <= p.season_end end));
$$;

create or replace function public.generate_due_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  f        record;
  r        record;
  v_local  timestamp;
  v_date   date;
  v_time   text;
  v_count  integer := 0;
  managers constant text[] := array['owner', 'manager'];
begin
  for f in select id, timezone from public.farms loop
    begin
      v_local := now() at time zone f.timezone;
    exception when others then
      v_local := now() at time zone 'UTC';
    end;
    v_date := v_local::date;

    -- Treatment doses more than 30 minutes late today.
    v_time := to_char(v_local - interval '30 minutes', 'HH24:MI');
    for r in
      select c.id, c.farm_id, c.user_id, c.medication, a.name as animal, s.slot
        from public.treatment_courses c
        join public.animals a on a.id = c.animal_id
        cross join lateral unnest(c.times) as s(slot)
       where c.farm_id = f.id and c.status = 'active'
         and v_date between c.start_date and public.course_last_day(c.start_date, c.days, c.every_n_days)
         and (v_date - c.start_date) % c.every_n_days = 0
         and s.slot <= v_time
         and (v_local - interval '30 minutes')::date = v_date
         and not exists (select 1 from public.course_doses d where d.course_id = c.id and d.dose_date = v_date and d.slot = s.slot)
    loop
      perform public.notify_roles(r.farm_id, managers, null, 'dose_late',
        'Dose late: ' || r.animal || ' — ' || r.medication || ' (' || r.slot || ')', 'Not ticked off yet today.',
        '/dashboard/treatments', true, 'dose:' || r.id || ':' || v_date || ':' || r.slot);
      perform public.notify_user(r.farm_id, r.user_id, 'dose_late',
        'Dose late: ' || r.animal || ' — ' || r.medication || ' (' || r.slot || ')', 'Not ticked off yet today.',
        '/dashboard/treatments', true, 'dose:' || r.id || ':' || v_date || ':' || r.slot);
      v_count := v_count + 1;
    end loop;

    -- Chores more than an hour late today (one alert per time slot).
    v_time := to_char(v_local - interval '60 minutes', 'HH24:MI');
    if (v_local - interval '60 minutes')::date = v_date then
      for r in
        select s.slot, count(*) as n, string_agg(p.title, ', ' order by p.title) as titles
          from public.care_plans p
          cross join lateral unnest(p.times) as s(slot)
         where p.farm_id = f.id and p.kind <> 'instruction' and public.care_plan_applies(p, v_date)
           and s.slot <= v_time
           and not exists (select 1 from public.chore_completions cc where cc.care_plan_id = p.id and cc.chore_date = v_date and cc.slot = s.slot)
         group by s.slot
      loop
        perform public.notify_roles(f.id, managers, null, 'chore_late',
          r.n || ' chore' || case when r.n = 1 then '' else 's' end || ' not done from ' || r.slot,
          left(r.titles, 300), '/dashboard/chores', false, 'chores:' || v_date || ':' || r.slot);
        v_count := v_count + 1;
      end loop;
    end if;

    -- Assignments past their due date (once a day, after 8am farm time).
    if to_char(v_local, 'HH24:MI') >= '08:00' then
      for r in
        select a.id, a.title, a.due_date, aa.user_id
          from public.assignments a
          join public.assignment_assignees aa on aa.assignment_id = a.id
         where a.farm_id = f.id and a.status <> 'done' and a.due_date < v_date
      loop
        perform public.notify_user(f.id, r.user_id, 'assignment_overdue',
          'Overdue: ' || r.title, 'Was due ' || to_char(r.due_date, 'Mon DD') || '.', '/dashboard/assignments', false,
          'overdue:' || r.id || ':' || v_date);
        v_count := v_count + 1;
      end loop;
    end if;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.generate_due_notifications() from public, anon, authenticated;

-- Run it every 10 minutes where pg_cron is available (Supabase has it; a
-- plain local Postgres usually doesn't, which is fine for tests).
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'goatwise-due-notifications';
  perform cron.schedule('goatwise-due-notifications', '*/10 * * * *', 'select public.generate_due_notifications()');
exception when others then
  raise notice 'pg_cron not available, time-based notifications not scheduled: %', sqlerrm;
end $$;

commit;
