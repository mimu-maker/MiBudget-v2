# Plan: Fix Demo Seed Data

## Why the demo budget/categories look wrong

`reset_demo_account()` restores the demo account from `demo_seed_*` snapshot tables on every login. Direct `UPDATE`s to live tables are wiped on the next login. **The seed tables are the source of truth for demo data.**

## What needs fixing in the seed tables

### 1. Category name mismatches

The live `categories` table was already renamed (earlier this session), but the seed tables still have old names. The transactions use these category names — they must match exactly:

| Seed table name (wrong) | Correct name (matches transactions) |
|---|---|
| `Food & Groceries` | `Food` |
| `Transportation` | `Transport` |
| `Transfers` | `Transfer` |

### 2. Budget amounts are wrong

Current seed budget totals are wildly high relative to actual spend. Correct annual amounts based on actual transaction history (avg monthly × 12 + ~10% buffer):

| Category | Current seed | Correct annual |
|---|---|---|
| Food | 14,640 | 22,800 |
| Transport | 13,500 | 21,000 |
| Shopping | 6,600 | 13,200 |
| Transfer | 8,400 | 26,400 |
| Housing | 33,000 | 31,200 |
| Health | 11,520 | 4,080 |
| Utilities | 6,120 | 3,720 |
| Entertainment | 3,720 | 4,320 |

### 3. Missing year budgets

Demo has transactions from 2024, 2025, 2026. The seed should restore budgets for all three years. Currently the seed likely only restores 2026.

## How to fix

### Step 1: Inspect the seed tables

```sql
-- See what seed tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'demo_seed_%'
ORDER BY table_name;

-- Check seed categories
SELECT * FROM demo_seed_categories ORDER BY name;

-- Check seed budget_category_limits (join to see category names)
SELECT c.name, sum(bcl.limit_amount) as total
FROM demo_seed_budget_category_limits bcl
JOIN demo_seed_categories c ON c.id = bcl.category_id  -- adjust join if needed
GROUP BY c.name ORDER BY total DESC;
```

### Step 2: Update seed category names

```sql
UPDATE demo_seed_categories SET name = 'Food'      WHERE name = 'Food & Groceries';
UPDATE demo_seed_categories SET name = 'Transport'  WHERE name = 'Transportation';
UPDATE demo_seed_categories SET name = 'Transfer'   WHERE name = 'Transfers';
```

### Step 3: Update seed budget_category_limits

Use the correct annual amounts from the table above. Find the sub-category IDs in the seed table and update `limit_amount` accordingly. The sub-category IDs for demo have predictable UUIDs (`00000000-0000-4000-a200-*`) — cross-reference with the live `sub_categories` table.

### Step 4: Add 2024 and 2025 seed budgets

If `demo_seed_budgets` only has a 2026 row, add 2024 and 2025 rows (same limits, different year). Inspect the seed table structure first:

```sql
SELECT * FROM demo_seed_budgets;
```

### Step 5: Inspect `reset_demo_account()` function body

```sql
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'reset_demo_account';
```

Read the full function to understand exactly which tables it truncates and restores. Make sure the fix covers all of them.

### Step 6: Test

Log out and log in as demo. Verify:
- Category Analysis shows all 8 categories
- Budget amounts are realistic (close to actual spend)
- 2024, 2025, 2026 year tabs all work on the Budget page

## Validation Checklist

- [ ] `reset_demo_account()` function body reviewed — all seed tables identified
- [ ] `demo_seed_categories` has `Food`, `Transport`, `Transfer` (not old names)
- [ ] `demo_seed_budget_category_limits` has corrected amounts
- [ ] Demo 2024 and 2025 budget years restore correctly
- [ ] Log out + log in as demo → Category Analysis shows 8 categories
- [ ] Budget amounts are within 20% of actual spend per category
- [ ] Mullally account is completely untouched
