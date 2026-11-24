# P0 — isolated PostgreSQL equipment checks

Run `tests/sql/equipment-fleet-isolated-smoke.psql` **only** in a disposable database named `vacleaner_test_*` with the VAcleaner schema and equipment migration already applied, and at least one ready unit seeded.

Example: `psql "$ISOLATED_TEST_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f tests/sql/equipment-fleet-isolated-smoke.psql`.

The script refuses other database names before opening a transaction. It invokes the actual `vacleaner_admin_set_equipment_unit_status` PostgreSQL RPC and asserts same-status idempotency, rejection of invalid status, unchanged capacity and unchanged event count. It ends in `ROLLBACK` and does not modify production or financial baselines.

**Covered by assertions but not yet executed:** duplicate add-unit request IDs (unchanged capacity, one creation event), successful repair and restore of a newly created test unit, inventory capacity transitions and exactly two status-change audit events. The test unit is created and changed inside the same transaction, then rolled back. **Not yet covered:** concurrent reservations, overlapping booking demand, transaction interleavings, and failed writes under contention. These require a disposable database with representative booking fixtures and at least two coordinated connections. Do not treat this smoke as complete P0 coverage or merge an inventory behavior change solely on its result. It is not yet included in CI because no isolated PostgreSQL service/fixture has been configured; failing closed is preferable to running against Supabase production.
