-- Two pre-existing single-user accounts with data (as before 019).
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a', 'owner@riverhouse.test', '{"farm_name":"RiverHouse Farms"}'),
 ('00000000-0000-0000-0000-00000000000b', 'other@farm.test', '{}');
update public.profiles set farm_name = 'RiverHouse Farms' where id = '00000000-0000-0000-0000-00000000000a';
insert into public.herds (id, user_id, name) values
 ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Dairy Does'),
 ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'Other Herd');
insert into public.animals (id, user_id, name, herd_id, sex, category) values
 ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Daisy', '10000000-0000-0000-0000-000000000001', 'doe', 'milking_doe'),
 ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'Other Goat', '10000000-0000-0000-0000-000000000002', 'doe', 'milking_doe');
-- A pre-existing herd feeding schedule, to check 022 copies it into care plans.
insert into public.feed_schedules (user_id, herd_id, feed_type, quantity_per_feeding, unit, feeding_times, start_date, status)
values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'Alfalfa hay', 2, 'flakes', '["17:00", "07:00"]', '2026-01-01', 'active');
