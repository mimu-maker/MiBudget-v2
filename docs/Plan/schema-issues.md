# Plan: Schema Issues — types.ts + Scenarios + Budget Cleanup

## 1. Regenerate `types.ts`

`src/integrations/supabase/types.ts` is significantly out of date. Run:

```bash
npx supabase gen types typescript --project-id irudwhbkkdbhufjtofog > src/integrations/supabase/types.ts
```

Key gaps in current types.ts:
- `transactions` — missing `account_id`, `merchant`, `entity`, `clean_source`, `budget_year`, `is_split`, `parent_id`, `notes`; uses `source` where column is `merchant`
- `budgets` — missing `account_id`
- `categories` — missing `account_id`
- `projections` — missing `account_id`, `scenario_id`; uses `source` where column is `merchant`
- `user_profiles` — missing `current_account_id`, `currency`, `timezone`, `role`, `language`, `date_format`, `amount_format`, `active_device_id`, `show_time`
- Missing tables entirely: `accounts`, `scenarios`, `user_settings`, `income_streams`, `onboarding_progress`
- `source_rules` still present (table was dropped in Phase 3b — remove from types.ts)

After regenerating, fix any TypeScript errors that surface (`npm run build`).

## 2. Fix Scenarios: Must Be Account-Scoped, Not User-Scoped

### Problem

`scenarios` table currently has RLS: `auth.uid() = user_id`. This means Tanja can't see Michael's scenarios and vice versa — but they share an account and should share scenarios.

### Current Schema

```sql
scenarios (
  id uuid PK,
  user_id uuid,       -- FK to auth.users, RLS scoped to this
  name text,
  description text,
  settings jsonb
)
```

### Target Schema

```sql
scenarios (
  id uuid PK,
  account_id uuid NOT NULL,   -- FK to accounts.id
  user_id uuid,               -- keep for audit trail (who created it)
  name text,
  description text,
  settings jsonb
)
```

### Migration

```sql
-- Add account_id
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE CASCADE;

-- Backfill from user_profiles
UPDATE scenarios s
SET account_id = (
  SELECT up.current_account_id FROM user_profiles up
  WHERE up.user_id = s.user_id
  LIMIT 1
);

-- Make NOT NULL once backfilled
ALTER TABLE scenarios ALTER COLUMN account_id SET NOT NULL;

-- Update RLS
DROP POLICY IF EXISTS "Users can manage their own scenarios" ON scenarios;
CREATE POLICY "Account members can manage scenarios" ON scenarios
FOR ALL USING (account_id = public.get_my_account_id())
WITH CHECK (account_id = public.get_my_account_id());

-- Index
CREATE INDEX IF NOT EXISTS idx_scenarios_account ON scenarios(account_id);
```

### Frontend: `create_scenario_from_master` RPC

Already fixed (see `fix_create_scenario_from_master_account_id` migration) — inserts `account_id` into projections. But the scenarios INSERT still only uses `user_id`. Update it to also set `account_id`:

```sql
-- Update the RPC function too
INSERT INTO public.scenarios (user_id, account_id, name, description)
VALUES (auth.uid(), public.get_my_account_id(), p_name, p_description)
```

### Frontend files to check

- `src/pages/Projection.tsx` — scenario fetch query; add `.eq('account_id', currentAccountId)` or rely on RLS
- Any other place that inserts/queries `scenarios`

## 3. Duplicate Budget Cleanup (Mullally)

The Mullally account has two budget records for 2025 — a leftover from early development.
Known IDs: `afc5f8ef-0248-4070-bf94-ced6eec31e16` and `eaa61c93-b5d9-406e-b91a-a03063bafd47`.

**CRITICAL: Do NOT delete until you verify which one has data.**

```sql
-- Step 1: Check which has limits
SELECT b.id, b.name, b.created_at, count(bcl.id) as limit_rows
FROM budgets b
LEFT JOIN budget_category_limits bcl ON bcl.budget_id = b.id
WHERE b.account_id = '92325837-1cf0-4157-82c6-82a233389b1a' AND b.year = 2025
GROUP BY b.id, b.name, b.created_at
ORDER BY b.created_at;

-- Step 2: Keep the one WITH limits, delete the one with 0 limits
-- Only proceed if exactly one has 0 limit_rows
DELETE FROM budgets WHERE id = '<id-with-zero-limits>';
```

If BOTH have limits, do NOT delete either — flag for manual review.

## Validation Checklist

- [ ] `npm run build` clean after types.ts regeneration
- [ ] Tanja can see Michael's scenarios (and vice versa) after RLS fix
- [ ] New scenario creation sets `account_id` correctly
- [ ] Mullally 2025 has exactly one budget record
- [ ] Demo scenarios are account-scoped (not leaking to Mullally)
