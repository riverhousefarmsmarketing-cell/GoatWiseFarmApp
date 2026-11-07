-- 020_change_history_and_delete_approval.sql
--
-- 1. Change history. A trigger on every farm table writes one row to
--    public.audit_log for each insert, update and delete: who, when, which
--    record, and the old and new values. It runs in the database, so no screen
--    or script can skip it, and clients cannot edit or remove history (there
--    are no insert/update/delete policies on audit_log).
--
-- 2. Delete approval. Since 019, only owners and managers can delete rows.
--    Workers call delete_or_request(), which files a deletion request instead.
--    An owner or manager approves (the row is deleted; its last values stay in
--    the history) or rejects it.

begin;

-- ---------------------------------------------------------------------------
-- 1. Change history
-- ---------------------------------------------------------------------------

create table if not exists public.audit_log (
  id             bigint generated always as identity primary key,
  -- Deliberately not a foreign key: rows deleted while a farm itself is being
  -- deleted still write history, and that must not block the delete.
  farm_id        uuid,
  table_name     text not null,
  record_id      uuid,
  action         text not null check (action in ('insert', 'update', 'delete')),
  changed_by     uuid references auth.users(id) on delete set null,
  changed_at     timestamptz not null default now(),
  old_data       jsonb,
  new_data       jsonb,
  changed_fields text[]
);
create index if not exists idx_audit_log_farm_time on public.audit_log (farm_id, changed_at desc);
create index if not exists idx_audit_log_record    on public.audit_log (record_id);
create index if not exists idx_audit_log_by        on public.audit_log (changed_by);

alter table public.audit_log enable row level security;
create policy "Farm members can view history" on public.audit_log
  for select to authenticated
  using (farm_id = (select public.current_farm_id()));
revoke insert, update, delete on public.audit_log from anon, authenticated;

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old    jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new    jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row    jsonb := coalesce(v_new, v_old);
  v_fields text[];
  v_farm   uuid;
begin
  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into v_fields
      from jsonb_object_keys(v_new) k
     where k not in ('updated_at')
       and (v_old -> k) is distinct from (v_new -> k);
    if v_fields is null then
      return null;  -- nothing really changed (e.g. only updated_at)
    end if;
  end if;

  v_farm := case
    when tg_table_name = 'farms' then (v_row ->> 'id')::uuid
    else (v_row ->> 'farm_id')::uuid
  end;

  insert into public.audit_log (farm_id, table_name, record_id, action, changed_by, old_data, new_data, changed_fields)
  values (v_farm, tg_table_name, (v_row ->> 'id')::uuid, lower(tg_op), auth.uid(), v_old, v_new, v_fields);
  return null;
end;
$$;
revoke execute on function public.audit_row_change() from public, anon, authenticated;

do $$
declare
  t text;
  tables text[] := array[
    'herds', 'animals', 'groups', 'animal_groups', 'health_records',
    'inspections', 'breeding_records', 'kidding_records', 'kid_records',
    'milk_records', 'weight_records', 'transactions', 'feed_types',
    'feed_inventory', 'feed_schedules', 'feed_usage', 'breeding_plans',
    'guardians', 'guardian_health_records', 'guardian_vaccinations',
    'predation_events', 'photos', 'herd_transfers', 'paddocks', 'paddock_moves',
    'farms', 'farm_members', 'farm_invites'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Delete approval
-- ---------------------------------------------------------------------------

-- Tables a deletion can be requested on (the farm data tables).
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
    'predation_events', 'photos', 'herd_transfers', 'paddocks', 'paddock_moves'
  ]);
$$;

create table if not exists public.deletion_requests (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null default public.current_farm_id() references public.farms(id) on delete cascade,
  table_name    text not null check (public.is_deletable_table(table_name)),
  record_id     uuid not null,
  -- What the person saw, e.g. "Health record – Daisy (Mar 3)". The row itself
  -- may be gone by the time anyone reads the request.
  record_label  text,
  record_data   jsonb,
  reason        text,
  requested_by  uuid default auth.uid() references auth.users(id) on delete set null,
  requested_at  timestamptz not null default now(),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  decided_by    uuid references auth.users(id) on delete set null,
  decided_at    timestamptz,
  decision_note text
);
create index if not exists idx_deletion_requests_farm on public.deletion_requests (farm_id, status);
create unique index if not exists uq_deletion_requests_pending
  on public.deletion_requests (table_name, record_id) where status = 'pending';

alter table public.deletion_requests enable row level security;
create policy "Farm members can view deletion requests" on public.deletion_requests
  for select to authenticated
  using (farm_id = (select public.current_farm_id()));
revoke insert, update, delete on public.deletion_requests from anon, authenticated;

drop trigger if exists trg_audit on public.deletion_requests;
create trigger trg_audit after insert or update or delete on public.deletion_requests
  for each row execute function public.audit_row_change();

-- Owners/managers: deletes now and returns 'deleted'.
-- Workers: files a request and returns 'requested' ('already_requested' if one
-- is pending for that record).
create or replace function public.delete_or_request(
  p_table  text,
  p_id     uuid,
  p_label  text default null,
  p_reason text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farm uuid := public.current_farm_id();
  v_row  jsonb;
  v_n    integer;
begin
  if v_farm is null then raise exception 'You are not part of a farm'; end if;
  if not public.is_deletable_table(p_table) then raise exception 'That kind of record cannot be deleted here'; end if;

  execute format('select to_jsonb(t) from public.%I t where t.id = $1 and t.farm_id = $2', p_table)
    into v_row using p_id, v_farm;
  if v_row is null then raise exception 'Record not found'; end if;

  if public.is_farm_manager() then
    execute format('delete from public.%I where id = $1 and farm_id = $2', p_table) using p_id, v_farm;
    get diagnostics v_n = row_count;
    update public.deletion_requests
       set status = 'approved', decided_by = auth.uid(), decided_at = now(),
           decision_note = coalesce(decision_note, 'Deleted directly by an owner or manager')
     where table_name = p_table and record_id = p_id and status = 'pending';
    return case when v_n > 0 then 'deleted' else 'not_found' end;
  end if;

  if exists (select 1 from public.deletion_requests
              where table_name = p_table and record_id = p_id and status = 'pending') then
    return 'already_requested';
  end if;

  insert into public.deletion_requests (farm_id, table_name, record_id, record_label, record_data, reason, requested_by)
  values (v_farm, p_table, p_id, nullif(trim(p_label), ''), v_row, nullif(trim(p_reason), ''), auth.uid());
  return 'requested';
end;
$$;

create or replace function public.decide_deletion_request(p_request_id uuid, p_approve boolean, p_note text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.deletion_requests%rowtype;
begin
  if not public.is_farm_manager() then raise exception 'Only owners and managers can approve deletions'; end if;

  select * into v_req from public.deletion_requests
   where id = p_request_id and farm_id = public.current_farm_id()
   for update;
  if v_req.id is null then raise exception 'Request not found'; end if;
  if v_req.status <> 'pending' then raise exception 'This request was already %', v_req.status; end if;

  if p_approve then
    execute format('delete from public.%I where id = $1 and farm_id = $2', v_req.table_name)
      using v_req.record_id, v_req.farm_id;
  end if;

  update public.deletion_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(), decided_at = now(), decision_note = nullif(trim(p_note), '')
   where id = v_req.id;

  return case when p_approve then 'approved' else 'rejected' end;
end;
$$;

-- The person who asked can withdraw a pending request.
create or replace function public.cancel_deletion_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.deletion_requests
     set status = 'cancelled', decided_by = auth.uid(), decided_at = now()
   where id = p_request_id and farm_id = public.current_farm_id()
     and status = 'pending'
     and (requested_by = auth.uid() or public.is_farm_manager());
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'delete_or_request(text, uuid, text, text)',
    'decide_deletion_request(uuid, boolean, text)',
    'cancel_deletion_request(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

commit;
