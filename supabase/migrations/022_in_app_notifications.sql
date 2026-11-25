-- 022: In-app notifications (owner -> user) + a founding-member comp flag.
--
-- `notifications` holds per-user in-app messages. Users can read and mark their
-- own as read; there is intentionally NO user INSERT policy, so notifications
-- are created only by the owner from the backend (service role) — a user can
-- never write a notification to themselves or anyone else.
--
-- `profiles.comped` records the permanent-free commitment made to founding beta
-- users. GoatWise has no billing yet; this preserves the promise in data so it
-- can be honored automatically if/when billing is added.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.notifications enable row level security;

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='Users can view own notifications') then
    create policy "Users can view own notifications" on public.notifications
      for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='Users can update own notifications') then
    create policy "Users can update own notifications" on public.notifications
      for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
  end if;
end $$;

alter table public.profiles add column if not exists comped boolean not null default false;
