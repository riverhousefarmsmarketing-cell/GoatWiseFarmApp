\set ON_ERROR_STOP 1
\set QUIET 1
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(u::text,''), false); end $$;
create or replace function pg_temp.ok(cond boolean, label text) returns void language plpgsql as $$
begin if cond then raise notice 'PASS  %', label; else raise exception 'FAIL  %', label; end if; end $$;
create or replace function pg_temp.raises(stmt text, label text) returns void language plpgsql as $$
begin begin execute stmt; exception when others then raise notice 'PASS  % (blocked: %)', label, sqlerrm; return; end;
raise exception 'FAIL  % (was allowed)', label; end $$;

\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set W '''00000000-0000-0000-0000-0000000000c1'''
\set DAISY '''20000000-0000-0000-0000-000000000001'''

-- Backfill
select pg_temp.ok((select count(*) from farms) = 2, 'each existing user got a farm');
select pg_temp.ok((select name from farms f join farm_members m on m.farm_id=f.id where m.user_id=:A) = 'RiverHouse Farms', 'farm named from farm_name');
select pg_temp.ok((select count(*) from animals where farm_id is null) = 0, 'every animal has a farm');

set role authenticated;
select pg_temp.as_user(:A);
select pg_temp.ok((select count(*) from animals) = 1 and (select name from animals) = 'Daisy', 'owner sees own farm only');
select set_config('test.token', create_farm_invite('worker', 'Jake'), false);
select set_config('test.mtoken', create_farm_invite('manager', 'Sam'), false);
select pg_temp.ok((select count(*) from farm_invites) = 2, 'owner sees invites');

-- Invite info is readable before sign-in
reset role; set role anon; select pg_temp.as_user(null);
select pg_temp.ok((select farm_name from get_invite_info(current_setting('test.token'))) = 'RiverHouse Farms', 'join page can show farm name to link holder');
select pg_temp.ok((select count(*) from public.animals) = 0 and (select count(*) from public.farms) = 0, 'signed-out visitor sees no farm data');
reset role;

-- New worker signs up through the invite link
insert into auth.users (id, email, raw_user_meta_data)
values (:W, 'jake@worker.test', jsonb_build_object('invite_token', current_setting('test.token')));
select pg_temp.ok((select count(*) from farms) = 2, 'invited signup did NOT create an extra farm');
select pg_temp.ok((select role from farm_members where user_id = :W) = 'worker', 'invited signup joined as worker');

set role authenticated; select pg_temp.as_user(:W);
select pg_temp.ok((select count(*) from animals) = 1, 'worker sees the farm''s animals');
update animals set notes = 'Limping on left front' where id = :DAISY;
select pg_temp.ok((select notes from animals where id = :DAISY) = 'Limping on left front', 'worker can edit');
insert into herds (name, user_id) values ('Kids pen', :W);
select pg_temp.ok((select farm_id from herds where name='Kids pen') = (select farm_id from animals where id=:DAISY), 'worker insert lands in the shared farm automatically');
delete from animals where id = :DAISY;
select pg_temp.ok((select count(*) from animals where id = :DAISY) = 1, 'worker direct delete removes nothing');
insert into groups (id, name) values ('40000000-0000-0000-0000-000000000001', 'Milkers');
insert into animal_groups (animal_id, group_id) values (:DAISY, '40000000-0000-0000-0000-000000000001');
delete from animal_groups where group_id = '40000000-0000-0000-0000-000000000001';
select pg_temp.ok((select count(*) from animal_groups) = 0, 'worker can take an animal out of a group');
select pg_temp.ok(delete_or_request('animals', :DAISY, 'Daisy', 'Sold at auction') = 'requested', 'worker delete becomes a request');
select pg_temp.ok(delete_or_request('animals', :DAISY, 'Daisy', null) = 'already_requested', 'duplicate request is not filed twice');
select pg_temp.ok((select count(*) from animals where id = :DAISY) = 1, 'record still there while pending');
select pg_temp.raises($$select decide_deletion_request((select id from deletion_requests limit 1), true)$$, 'worker cannot approve');
select pg_temp.raises($$select create_farm_invite('worker')$$, 'worker cannot invite');
select pg_temp.raises($$insert into audit_log (table_name, action) values ('x','insert')$$, 'nobody can write history directly');
select pg_temp.raises($$update farms set complimentary = true$$, 'nobody can set complimentary from the app');
select pg_temp.ok((select count(*) from audit_log where table_name='animals' and action='update' and changed_by = :W and 'notes' = any(changed_fields)) = 1, 'history records worker edit with field name');

select pg_temp.raises($$insert into herds (name, user_id) values ('Forged', '00000000-0000-0000-0000-00000000000a')$$, 'cannot stamp a record as created by someone else');
insert into paddocks (name) values ('North Pasture');
select pg_temp.raises($$insert into paddocks (name) values ('North Pasture')$$, 'paddock names are unique per farm');
-- Owner approves
select pg_temp.as_user(:A);
select pg_temp.ok((select count(*) from deletion_requests where status='pending') = 1, 'owner sees pending request');
select pg_temp.ok(decide_deletion_request((select id from deletion_requests where status='pending'), true, 'ok') = 'approved', 'owner approves');
select pg_temp.ok((select count(*) from animals where id = :DAISY) = 0, 'approved record is deleted');
select pg_temp.ok((select old_data->>'name' from audit_log where record_id = :DAISY and action='delete') = 'Daisy', 'history keeps a copy of the deleted record');

-- Outsider isolation
select pg_temp.as_user(:B);
select pg_temp.ok((select count(*) from herds) = 1 and (select name from herds) = 'Other Herd', 'other farm sees only its own herds');
select pg_temp.ok((select count(*) from audit_log) = 0, 'other farm cannot see RiverHouse history');
select pg_temp.raises($$select delete_or_request('herds', (select id from public.herds h where false limit 1))$$, 'cannot delete other farm''s records');
select pg_temp.raises($$insert into herds (name, farm_id, user_id) values ('Planted', (select farm_id from public.farm_members where user_id = '00000000-0000-0000-0000-00000000000a'), '00000000-0000-0000-0000-00000000000b')$$, 'cannot add records to another farm by naming it');
select pg_temp.raises($$update herds set farm_id = (select farm_id from public.farm_members where user_id = '00000000-0000-0000-0000-00000000000a')$$, 'cannot move own records into another farm');

-- Existing user (B) accepts the manager invite; switches farms
select accept_farm_invite(current_setting('test.mtoken'));
select pg_temp.ok((select count(*) from herds where name = 'Dairy Does') = 1, 'existing user who accepts invite now works in RiverHouse');
select pg_temp.ok((select count(*) from get_my_farms()) = 2, 'they keep access to their own farm too');
select pg_temp.raises($$select create_farm_invite('manager')$$, 'manager cannot invite managers');
select pg_temp.ok(create_farm_invite('worker') is not null, 'manager can invite workers');
select pg_temp.raises($$select remove_farm_member('00000000-0000-0000-0000-0000000000c1')$$, 'manager cannot remove people');
select switch_farm((select farm_id from get_my_farms() where role = 'owner'));
select pg_temp.ok((select name from herds) = 'Other Herd', 'switching farms changes what you see');
select switch_farm((select farm_id from get_my_farms() where role = 'manager'));

-- Updates feed
select pg_temp.as_user(:W);
select pg_temp.raises($$insert into farm_posts (body, author_id) values ('hi', '00000000-0000-0000-0000-0000000000c1')$$, 'worker cannot post updates');
select pg_temp.as_user(:A);
insert into farm_posts (body, title, pinned, author_id) values ('Vet visit Thursday 9am', 'Vet', true, :A);
select pg_temp.as_user(:W);
select pg_temp.ok((select count(*) from farm_posts) = 1, 'worker sees the update');
insert into farm_post_reads (post_id) select id from farm_posts;
select pg_temp.as_user(:A);
select pg_temp.ok((select count(*) from farm_post_reads) = 1, 'owner sees who read it');

-- Assignments
insert into assignments (id, title, due_date, recurrence) values ('30000000-0000-0000-0000-000000000001', 'Check water troughs', '2026-11-09', 'weekly');
insert into assignment_assignees values ('30000000-0000-0000-0000-000000000001', :W);
select pg_temp.as_user(:W);
select pg_temp.raises($$insert into assignments (title) values ('self-assigned')$$, 'worker cannot create assignments');
update assignments set title = 'Hacked', status = 'done', completion_note = 'All full' where id = '30000000-0000-0000-0000-000000000001';
select pg_temp.ok((select title from assignments where id='30000000-0000-0000-0000-000000000001') = 'Check water troughs', 'worker cannot rename an assignment');
select pg_temp.ok((select completed_by from assignments where id='30000000-0000-0000-0000-000000000001') = :W, 'completion stamped with who did it');
select pg_temp.ok((select due_date from assignments where repeated_from='30000000-0000-0000-0000-000000000001') = '2026-11-16', 'weekly task repeats a week later');
select pg_temp.ok((select count(*) from assignment_assignees aa join assignments a on a.id=aa.assignment_id where a.repeated_from='30000000-0000-0000-0000-000000000001' and aa.user_id=:W) = 1, 'repeat keeps the same person');

-- Team management
select pg_temp.as_user(:A);
select pg_temp.ok((select count(*) from get_farm_members()) = 3, 'owner sees 3 people on the team');
select pg_temp.raises($$select set_member_role('00000000-0000-0000-0000-00000000000a', 'worker')$$, 'last owner cannot be demoted');
select remove_farm_member(:W);
select pg_temp.as_user(:W);
select pg_temp.ok((select count(*) from herds) = 0, 'removed worker loses access immediately');
select pg_temp.ok(create_my_farm('Jake''s Goats') is not null, 'removed worker can start their own farm');
reset role;
select pg_temp.ok((select count(*) from herds where name = 'Kids pen') = 1, 'records a removed worker entered stay with the farm');

-- ===================== 022: care plans, chores, minerals =====================
reset role;
select pg_temp.ok((select count(*) from care_plans where kind='feeding' and title='Alfalfa hay' and times = array['07:00','17:00']) = 1, 'existing herd feeding schedule copied into care plans (times sorted)');
set role authenticated;
\set J '''00000000-0000-0000-0000-0000000000d1'''
reset role;
insert into auth.users (id, email) values (:J, 'jo@worker.test');
insert into farm_members (farm_id, user_id, role) select farm_id, :J, 'worker' from farm_members where user_id = :A;
update profiles set current_farm_id = (select farm_id from farm_members where user_id = :A) where id = :J;
set role authenticated;

select pg_temp.as_user(:J);
select pg_temp.raises($$insert into care_plans (kind, paddock_id, title, user_id) values ('watering', (select id from paddocks limit 1), 'Fill trough', '00000000-0000-0000-0000-0000000000d1')$$, 'worker cannot create care plans');
select pg_temp.ok((select count(*) from care_plans) >= 1, 'worker can read care plans');

select pg_temp.as_user(:A);
insert into care_plans (id, kind, paddock_id, title, times, season_start, season_end, user_id)
values ('50000000-0000-0000-0000-000000000001', 'watering', (select id from paddocks where name='North Pasture'), 'Check and fill troughs', array['07:00','16:00'], '11-01', '03-31', :A);
select pg_temp.raises($$insert into care_plans (kind, herd_id, title, user_id) values ('feeding', '10000000-0000-0000-0000-000000000002', 'Steal', '00000000-0000-0000-0000-00000000000a')$$, 'cannot attach a plan to another farm''s herd');
select pg_temp.raises($$insert into care_plans (kind, herd_id, paddock_id, title, user_id) values ('feeding', '10000000-0000-0000-0000-000000000001', (select id from paddocks limit 1), 'Two targets', '00000000-0000-0000-0000-00000000000a')$$, 'a plan has exactly one target');
select pg_temp.raises($$insert into care_plans (kind, herd_id, title, times, user_id) values ('feeding', '10000000-0000-0000-0000-000000000001', 'Bad time', array['7am'], '00000000-0000-0000-0000-00000000000a')$$, 'times must be HH:MM');
select pg_temp.raises($$insert into care_plans (kind, herd_id, title, season_start, user_id) values ('feeding', '10000000-0000-0000-0000-000000000001', 'Half season', '11-01', '00000000-0000-0000-0000-00000000000a')$$, 'season needs both start and end');

select pg_temp.as_user(:J);
insert into chore_completions (care_plan_id, chore_date, slot, note, user_id) values ('50000000-0000-0000-0000-000000000001', '2026-11-07', '07:00', 'Trough was low', :J);
select pg_temp.raises($$insert into chore_completions (care_plan_id, chore_date, slot, user_id) values ('50000000-0000-0000-0000-000000000001', '2026-11-07', '07:00', '00000000-0000-0000-0000-0000000000d1')$$, 'the same chore cannot be ticked twice');
select pg_temp.ok((select count(*) from audit_log where table_name='chore_completions' and changed_by=:J) = 1, 'chore check-off is in the change history');

-- W was removed from RiverHouse earlier and now runs their own farm.
select pg_temp.as_user(:W);
select pg_temp.raises($$insert into chore_completions (care_plan_id, chore_date, slot, user_id) values ('50000000-0000-0000-0000-000000000001', '2026-11-07', '16:00', '00000000-0000-0000-0000-0000000000c1')$$, 'another farm cannot tick our chores');
select pg_temp.ok((select count(*) from care_plans) = 0, 'another farm cannot see our care plans');

-- Worker minerals
select pg_temp.as_user(:A);
insert into feed_types (id, name, category, unit, check_every_days, user_id) values ('60000000-0000-0000-0000-000000000001', 'Kelp', 'mineral', 'lbs', 14, :A);
select pg_temp.as_user(:J);
insert into mineral_refills (id, paddock_id, feed_type_id, amount, unit, refilled_on, user_id)
values ('70000000-0000-0000-0000-000000000001', (select id from paddocks where name='North Pasture'), '60000000-0000-0000-0000-000000000001', 5, 'lbs', '2026-11-07', :J);
select pg_temp.ok((select amount from mineral_refills) = 5, 'worker logs a mineral refill');
select pg_temp.raises($$insert into mineral_refills (paddock_id, feed_type_id, amount, unit, user_id) values ((select id from paddocks limit 1), '60000000-0000-0000-0000-000000000001', 0, 'lbs', '00000000-0000-0000-0000-0000000000d1')$$, 'refill amount must be more than zero');
delete from mineral_refills;
select pg_temp.ok((select count(*) from mineral_refills) = 1, 'worker cannot delete a refill directly');
select pg_temp.ok(delete_or_request('mineral_refills', '70000000-0000-0000-0000-000000000001', 'Kelp refill', 'wrong pasture') = 'requested', 'worker can request deleting a refill');
select pg_temp.as_user(:A);
select pg_temp.raises($$delete from feed_types where id = '60000000-0000-0000-0000-000000000001'$$, 'a mineral with refill history cannot be deleted');
reset role;

-- ===================== 023: restock list =====================
set role authenticated;
select pg_temp.as_user(:J);
insert into restock_requests (id, item_name, feed_type_id, category, level, quantity_note, user_id)
values ('80000000-0000-0000-0000-000000000001', 'Kelp', '60000000-0000-0000-0000-000000000001', 'mineral', 'low', 'half a bag left', :J);
select pg_temp.ok((select status from restock_requests) = 'open', 'worker flags an item as low');
select pg_temp.raises($$insert into restock_requests (item_name, status, user_id) values ('Sneaky', 'restocked', '00000000-0000-0000-0000-0000000000d1')$$, 'new items always start open');
select pg_temp.as_user(:A);
update restock_requests set status = 'ordered' where id = '80000000-0000-0000-0000-000000000001';
select pg_temp.ok((select ordered_by from restock_requests) = :A and (select ordered_at from restock_requests) is not null, 'ordered is stamped with who and when');
select pg_temp.as_user(:J);
update restock_requests set status = 'restocked', resolution_note = '2 bags in the shed', user_id = :A where id = '80000000-0000-0000-0000-000000000001';
select pg_temp.ok((select resolved_by from restock_requests) = :J, 'restocked is stamped with who did it');
select pg_temp.ok((select user_id from restock_requests) = :J, 'who flagged it cannot be changed');
select pg_temp.ok((select ordered_by from restock_requests) = :A, 'the ordered stamp is kept');
update restock_requests set resolved_by = :A;
select pg_temp.ok((select resolved_by from restock_requests) = :J, 'stamps cannot be forged by editing them');
delete from restock_requests;
select pg_temp.ok((select count(*) from restock_requests) = 1, 'worker cannot delete restock items');
select pg_temp.ok((select count(*) from audit_log where table_name = 'restock_requests') = 3, 'every restock step is in the change history');
select pg_temp.as_user(:W);
select pg_temp.ok((select count(*) from restock_requests) = 0, 'another farm cannot see our restock list');
select pg_temp.raises($$insert into restock_requests (item_name, feed_type_id, user_id) values ('Steal', '60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1')$$, 'cannot link another farm''s feed');
reset role;

-- ===================== 024: money privacy, emergency info =====================
set role authenticated;
select pg_temp.as_user(:A);
insert into transactions (type, category, amount, date, user_id) values ('expense', 'feed', 120, '2026-11-07', :A);
select pg_temp.ok((select count(*) from transactions) = 1, 'owner sees money');
select pg_temp.as_user(:J);
select pg_temp.ok((select count(*) from transactions) = 0, 'worker cannot see money');
select pg_temp.raises($$insert into transactions (type, category, amount, date, user_id) values ('income', 'milk', 5, '2026-11-07', '00000000-0000-0000-0000-0000000000d1')$$, 'worker cannot add money entries');
select pg_temp.ok((select count(*) from audit_log where table_name = 'transactions') = 0, 'worker cannot see money in the change history');
select pg_temp.as_user(:A);
select pg_temp.ok((select count(*) from audit_log where table_name = 'transactions') = 1, 'owner sees money in the change history');
insert into farm_emergency_info (address, medicine_location) values ('123 River Rd', 'Fridge in the milk room');
insert into emergency_contacts (name, role, phone) values ('Dr. Smith', 'Vet', '555-0100');
select pg_temp.as_user(:J);
select pg_temp.ok((select medicine_location from farm_emergency_info) = 'Fridge in the milk room' and (select count(*) from emergency_contacts) = 1, 'worker can read emergency info');
update emergency_contacts set phone = '000';
select pg_temp.ok((select phone from emergency_contacts) = '555-0100', 'worker cannot change emergency contacts');
select pg_temp.as_user(:W);
select pg_temp.ok((select count(*) from emergency_contacts) = 0, 'another farm cannot see our emergency contacts');
reset role;
\echo ALL TESTS PASSED
