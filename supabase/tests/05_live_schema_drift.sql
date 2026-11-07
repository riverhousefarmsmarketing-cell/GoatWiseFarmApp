-- The live GoatWise database was changed outside the migration files at some
-- point (e.g. through the Supabase dashboard). This brings a database built
-- from migrations 001-018 in line with what production actually has, as read
-- from production on 2026-11-07, so the tests exercise 019+ against the real
-- shape. Applied by run.sh after 018 and before 019.

alter table public.animals rename column birth_date to date_of_birth;
alter table public.animals rename column purchase_price to purchase_cost;
alter table public.animals
  add column if not exists species text not null default 'goat',
  add column if not exists tattoo text,
  add column if not exists secondary_breed text,
  add column if not exists health_status text default 'healthy',
  add column if not exists registry_name text,
  add column if not exists registry_number text,
  add column if not exists pedigreed boolean default false,
  add column if not exists pedigree_generations integer,
  add column if not exists polled boolean default false,
  add column if not exists disbudded boolean default false,
  add column if not exists disbudded_date date,
  add column if not exists castration_date date,
  add column if not exists born_on_farm boolean default true,
  add column if not exists purchase_source text,
  add column if not exists group_ids uuid[],
  add column if not exists weight numeric,
  add column if not exists color text,
  add column if not exists markings text,
  add column if not exists genetic_traits jsonb;

alter table public.animals drop constraint if exists animals_sex_check;
alter table public.animals add constraint animals_sex_check
  check (sex = any (array['doe','buck','wether','female','male','castrated']));
alter table public.animals drop constraint if exists animals_category_check;
alter table public.animals add constraint animals_category_check
  check (category = any (array['milking_doe','dry_doe','bred_doe','doeling','buck','buckling','wether','kid',
    'milking_female','dry_female','bred_female','young_female','male','young_male','castrated','young']));

alter table public.health_records drop constraint if exists health_records_type_check;
alter table public.health_records add constraint health_records_type_check
  check (type = any (array['vaccination','deworming','treatment','vet_visit','hoof_trim','injury','illness','other','observation']));
