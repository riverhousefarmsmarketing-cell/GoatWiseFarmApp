#!/bin/bash
# Runs the shared-farm database tests against a throwaway local Postgres.
#
#   PGHOST=/path/to/socket PGPORT=5432 supabase/tests/run.sh
#
# Needs a Postgres 15+ server you can connect to as a superuser (it creates
# and drops a database called goatwise_test). 00_supabase_shim.sql stands in
# for the bits of Supabase the migrations rely on (auth.uid(), roles, storage).
# Every migration is applied in order, with sample pre-019 accounts seeded just
# before 019 so the move-existing-data step is exercised too.
set -euo pipefail
cd "$(dirname "$0")"
PSQL="psql -U ${PGUSER:-postgres} -v ON_ERROR_STOP=1 -q"
$PSQL -d postgres -c "drop database if exists goatwise_test" -c "create database goatwise_test"
$PSQL -d goatwise_test -f 00_supabase_shim.sql
seeded=0
for f in ../migrations/0*.sql; do
  n=$(basename "$f" | cut -c1-3)
  if [ "$n" -ge 019 ] && [ "$seeded" = 0 ]; then
    $PSQL -d goatwise_test -f 10_seed_pre_019.sql
    seeded=1
  fi
  $PSQL -d goatwise_test -f "$f" 2>&1 | grep -v NOTICE || true
done
$PSQL -d goatwise_test -f 20_shared_farms_test.sql 2>&1 | grep -E "PASS|FAIL|ERROR|ALL TESTS"
