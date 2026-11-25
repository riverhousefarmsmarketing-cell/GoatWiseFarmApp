-- 021: In-app feedback submissions.
--
-- Lets a signed-in user send a bug report, suggestion, or compliment from the
-- app (floating "Feedback" button). RLS keeps each user's feedback their own,
-- consistent with the rest of the schema; the owner reviews submissions from the
-- backend. Mirrors the shape used by the sibling GoodOfTheOrder app.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type = any (array['bug'::text, 'suggestion'::text, 'compliment'::text, 'other'::text])),
  message text not null,
  page_url text,
  status text not null default 'new' check (status = any (array['new'::text, 'reviewed'::text, 'resolved'::text])),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

create index if not exists feedback_user_id_idx on public.feedback (user_id);

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='feedback' and policyname='Users can insert own feedback') then
    create policy "Users can insert own feedback" on public.feedback
      for insert to authenticated with check (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='feedback' and policyname='Users can view own feedback') then
    create policy "Users can view own feedback" on public.feedback
      for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='feedback' and policyname='Users can update own feedback') then
    create policy "Users can update own feedback" on public.feedback
      for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='feedback' and policyname='Users can delete own feedback') then
    create policy "Users can delete own feedback" on public.feedback
      for delete to authenticated using (user_id = (select auth.uid()));
  end if;
end $$;
