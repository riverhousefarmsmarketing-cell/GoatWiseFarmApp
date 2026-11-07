-- 023_restock_list.sql
--
-- Restock list: anyone on the farm can flag something that's running low or
-- has run out (feed, a mineral, medicine, supplies...). Anyone can then mark
-- it ordered or restocked. Every step is stamped with who and when, and the
-- whole thing is recorded in the change history.
--
-- An item can optionally point at a feed type or mineral (feed_types); free
-- text covers everything else. Requires 019-022.

begin;

create table if not exists public.restock_requests (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  -- Who flagged it.
  user_id          uuid default auth.uid() references auth.users(id) on delete set null,
  item_name        text not null check (length(trim(item_name)) > 0),
  feed_type_id     uuid references public.feed_types(id) on delete set null,
  category         text not null default 'other'
                     check (category in ('feed', 'mineral', 'medicine', 'supplies', 'bedding', 'equipment', 'other')),
  level            text not null default 'low' check (level in ('low', 'out')),
  -- Free text, e.g. "about 2 bags left".
  quantity_note    text,
  note             text,
  status           text not null default 'open' check (status in ('open', 'ordered', 'restocked', 'cancelled')),
  ordered_by       uuid references auth.users(id) on delete set null,
  ordered_at       timestamptz,
  resolved_by      uuid references auth.users(id) on delete set null,
  resolved_at      timestamptz,
  resolution_note  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_restock_requests_farm on public.restock_requests (farm_id, status, created_at desc);

alter table public.restock_requests enable row level security;
create policy "Farm members can view the restock list" on public.restock_requests
  for select to authenticated using (farm_id = (select public.current_farm_id()));
create policy "Farm members can flag items" on public.restock_requests
  for insert to authenticated
  with check (farm_id = (select public.current_farm_id()) and user_id = (select auth.uid()) and status = 'open');
create policy "Farm members can update the restock list" on public.restock_requests
  for update to authenticated
  using (farm_id = (select public.current_farm_id()))
  with check (farm_id = (select public.current_farm_id()));
create policy "Owners and managers can delete restock items" on public.restock_requests
  for delete to authenticated
  using (farm_id = (select public.current_farm_id()) and (select public.is_farm_manager()));

-- Stamp who/when on each status change; keep who flagged it and when fixed.
create or replace function public.restock_requests_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.row_in_farm('feed_types', new.feed_type_id, new.farm_id) then
    raise exception 'That feed or mineral is not on this farm';
  end if;

  if tg_op = 'INSERT' then
    new.ordered_by := null; new.ordered_at := null;
    new.resolved_by := null; new.resolved_at := null;
    new.created_at := now();
    return new;
  end if;

  new.user_id    := old.user_id;
  new.created_at := old.created_at;
  new.farm_id    := old.farm_id;

  if new.status is distinct from old.status then
    if new.status = 'ordered' then
      new.ordered_by := auth.uid(); new.ordered_at := now();
      new.resolved_by := null; new.resolved_at := null;
    elsif new.status in ('restocked', 'cancelled') then
      new.resolved_by := auth.uid(); new.resolved_at := now();
    elsif new.status = 'open' then
      new.ordered_by := null; new.ordered_at := null;
      new.resolved_by := null; new.resolved_at := null;
    end if;
  else
    new.ordered_by := old.ordered_by;   new.ordered_at := old.ordered_at;
    new.resolved_by := old.resolved_by; new.resolved_at := old.resolved_at;
  end if;

  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.restock_requests_before_write() from public, anon, authenticated;

drop trigger if exists trg_restock_before_write on public.restock_requests;
create trigger trg_restock_before_write before insert or update on public.restock_requests
  for each row execute function public.restock_requests_before_write();
drop trigger if exists trg_audit on public.restock_requests;
create trigger trg_audit after insert or update or delete on public.restock_requests
  for each row execute function public.audit_row_change();

commit;
