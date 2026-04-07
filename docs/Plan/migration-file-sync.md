# Migration File Sync

## Problem

`supabase/migrations/20260407_demo_account_bootstrap.sql` in the repo reflects an **older strategy (v3)** for setting up the demo account. The actual database has the **v7 strategy** applied directly (seeded via `demo_seed_*` snapshot tables, reset via `reset_demo_account()` Postgres function).

The file is misleading — if anyone runs it against a fresh Supabase instance, it will fail or produce incorrect state.

---

## What was actually applied (v7 — already in DB)

The live DB has:

1. **`reset_demo_account()` Postgres function** — deletes demo account data and re-seeds from snapshot tables
2. **Snapshot tables**: `demo_seed_categories`, `demo_seed_sub_categories`, `demo_seed_budgets`, `demo_seed_bcl`, `demo_seed_transactions`, `demo_seed_projections`
3. **Demo user profile**: `user_profiles` row with `email = 'demo@example.com'`, `current_account_id = '00000000-0000-4000-a000-000000000001'`
4. **Demo auth user**: Supabase Auth user with email `demo@example.com`, password `demo123`

---

## Fix Required

Replace the contents of `supabase/migrations/20260407_demo_account_bootstrap.sql` with a script that accurately documents what was applied. This is documentation/idempotency, not a new migration.

### Steps

1. Run this query to export the current `reset_demo_account()` function definition:
   ```sql
   SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'reset_demo_account';
   ```

2. Run these queries to capture current seed table structures:
   ```sql
   SELECT * FROM demo_seed_categories LIMIT 1;
   SELECT * FROM demo_seed_sub_categories LIMIT 1;
   SELECT * FROM demo_seed_budgets LIMIT 1;
   SELECT * FROM demo_seed_bcl LIMIT 1;
   SELECT * FROM demo_seed_transactions LIMIT 1;
   SELECT * FROM demo_seed_projections LIMIT 1;
   ```

3. Write the migration file as a fully idempotent `CREATE OR REPLACE` / `INSERT ... ON CONFLICT DO NOTHING` script that:
   - Creates the `demo_seed_*` tables if they don't exist
   - Inserts the seed data
   - Creates the `reset_demo_account()` function
   - Creates the demo account row in `accounts` (`00000000-0000-4000-a000-000000000001`)
   - Creates the demo `user_profiles` row

4. Add `-- Applied directly to DB on 2026-04-07. This file is for documentation/replay only.` at the top.

---

## Validation Checklist (for Claude to verify)

- [ ] File compiles (no SQL syntax errors)
- [ ] Running the file against a fresh DB produces the same state as the live DB
- [ ] `reset_demo_account()` function body matches the live DB version exactly
- [ ] All 6 `demo_seed_*` tables represented
