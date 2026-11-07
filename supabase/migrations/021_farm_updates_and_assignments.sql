-- 021_farm_updates_and_assignments.sql
--
-- 1. Farm updates feed: owners and managers post notes everyone on the farm
--    sees on their dashboard; posts can be pinned; reads are tracked so the
--    poster can see who has seen a note.
--
-- 2. Assignments: owners and managers assign tasks to one or more people, with
--    a due date, notes, an optional animal/herd/paddock, and an optional
--    repeat. Assignees mark them in progress or done. Completing a repeating
--    task creates the next one.
--
-- Both are recorded in the change history (migration 020).

begin;

-- ---------------------------------------------------------------------------
-- 1. Farm updates feed
-- ---------------------------------------------------------------------------

create table if not exists public.farm_posts (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  author_id   uuid default auth.uid() references auth.users(id) on delete set null,
  title       text,
  body        text not null check (length(trim(body)) > 0),
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_farm_posts_farm on public.farm_posts (farm_id, pinned desc, created_at desc);

create table if not exists public.farm_post_reads (
  post_id  uuid not null references public.farm_posts(id) on delete cascade,
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  read_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.farm_posts      enable row level security;
alter table public.farm_post_reads enable row level security;

create policy "Farm members can read updates" on public.farm_posts
  for select to authenticated using (farm_id = (select public.current_farm_id()));
create policy "Owners and managers can post updates" on public.farm_posts
  for insert to authenticated
  with check (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()) and author_id = (select auth.uid()));
create policy "Owners and managers can edit updates" on public.farm_posts
  for update to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()))
  with check (farm_id = (select public.current_farm_id()));
create policy "Owners and managers can remove updates" on public.farm_posts
  for delete to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));

create policy "Farm members can see who read updates" on public.farm_post_reads
  for select to authenticated
  using (exists (select 1 from public.farm_posts p where p.id = post_id and p.farm_id = (select public.current_farm_id())));
create policy "Members mark updates read" on public.farm_post_reads
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.farm_posts p where p.id = post_id and p.farm_id = (select public.current_farm_id())));

-- ---------------------------------------------------------------------------
-- 2. Assignments
-- ---------------------------------------------------------------------------

create table if not exists public.assignments (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  title            text not null check (length(trim(title)) > 0),
  notes            text,
  due_date         date,
  status           text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  recurrence       text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  animal_id        uuid references public.animals(id) on delete set null,
  herd_id          uuid references public.herds(id) on delete set null,
  paddock_id       uuid references public.paddocks(id) on delete set null,
  created_by       uuid default auth.uid() references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  completed_at     timestamptz,
  completed_by     uuid references auth.users(id) on delete set null,
  completion_note  text,
  -- The task this one was repeated from.
  repeated_from    uuid references public.assignments(id) on delete set null
);
create index if not exists idx_assignments_farm on public.assignments (farm_id, status, due_date);

create table if not exists public.assignment_assignees (
  assignment_id  uuid not null references public.assignments(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  primary key (assignment_id, user_id)
);
create index if not exists idx_assignment_assignees_user on public.assignment_assignees (user_id);

alter table public.assignments          enable row level security;
alter table public.assignment_assignees enable row level security;

-- Policy helpers. SECURITY DEFINER so the assignments and assignees policies
-- can look at each other's table without recursing through each other's RLS.
create or replace function public.is_assignee(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.assignment_assignees
                  where assignment_id = p_assignment_id and user_id = auth.uid());
$$;

create or replace function public.assignment_farm_id(p_assignment_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select farm_id from public.assignments where id = p_assignment_id;
$$;

revoke execute on function public.is_assignee(uuid)        from public, anon;
revoke execute on function public.assignment_farm_id(uuid) from public, anon;
grant  execute on function public.is_assignee(uuid)        to authenticated;
grant  execute on function public.assignment_farm_id(uuid) to authenticated;

create policy "Farm members can view assignments" on public.assignments
  for select to authenticated using (farm_id = (select public.current_farm_id()));
create policy "Owners and managers can create assignments" on public.assignments
  for insert to authenticated
  with check (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));
create policy "Managers and assignees can update assignments" on public.assignments
  for update to authenticated
  using (farm_id = (select public.current_farm_id())
         and ((select public.is_farm_manager()) or public.is_assignee(id)))
  with check (farm_id = (select public.current_farm_id()));
create policy "Owners and managers can delete assignments" on public.assignments
  for delete to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));

create policy "Farm members can view assignees" on public.assignment_assignees
  for select to authenticated
  using (public.assignment_farm_id(assignment_id) = (select public.current_farm_id()));
create policy "Owners and managers assign people" on public.assignment_assignees
  for insert to authenticated
  with check ((select public.is_farm_manager())
              and public.assignment_farm_id(assignment_id) = (select public.current_farm_id())
              and exists (select 1 from public.farm_members m where m.user_id = assignment_assignees.user_id and m.farm_id = (select public.current_farm_id())));
create policy "Owners and managers unassign people" on public.assignment_assignees
  for delete to authenticated
  using ((select public.is_farm_manager())
         and public.assignment_farm_id(assignment_id) = (select public.current_farm_id()));

-- Assignees who are not managers may only move the status along and leave a
-- completion note; everything else stays as the manager set it. Also stamps
-- who completed it and when.
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
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- Completing a repeating task schedules the next one for the same people.
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
  end if;
  return null;
end;
$$;

revoke execute on function public.assignments_before_update() from public, anon, authenticated;
revoke execute on function public.assignments_after_update()  from public, anon, authenticated;

drop trigger if exists trg_assignments_before_update on public.assignments;
create trigger trg_assignments_before_update before update on public.assignments
  for each row execute function public.assignments_before_update();
drop trigger if exists trg_assignments_after_update on public.assignments;
create trigger trg_assignments_after_update after update on public.assignments
  for each row execute function public.assignments_after_update();

-- Change history for the new tables. assignment_assignees has no id or
-- farm_id of its own, so it is not audited row by row; who an assignment is
-- for is shown on the assignment itself.
do $$
declare t text;
begin
  foreach t in array array['farm_posts', 'assignments'] loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t);
  end loop;
end $$;

commit;
