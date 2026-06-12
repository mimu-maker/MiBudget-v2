# Gemini Task: Demo Seed Category/Sub-category Restructure

## Context

MiBudget is a Supabase (PostgreSQL) budget app. The demo account has seed tables that
`reset_demo_account()` restores on every login. All changes must be applied to BOTH:
1. The `demo_seed_*` tables (the reset source of truth)
2. The live tables for account `00000000-0000-4000-a000-000000000001` (takes effect immediately)

The full plan is in `docs/Plan/demo-seed-restructure.md`. Read it before writing SQL.

## Your job

Write a **single migration file** that can be applied via Supabase MCP `apply_migration`.
The migration name should be `demo_seed_category_restructure`.

The migration must:

### 1. Rename sub-categories

In both `demo_seed_sub_categories` AND live `sub_categories` (filtered to demo account):

| ID suffix | Old name | New name |
|---|---|---|
| ...000000000802 | Movies | Movies & Shows |
| ...000000000801 | Streaming | Streaming & Music |
| ...000000000402 | Dining Out | Restaurants |
| ...000000000403 | Coffee & Drinks | Coffee & Cafés |
| ...000000000602 | Pharmacy | Pharmacy (already renamed) — add label |
| ...000000000603 | Doctor Visits | Doctor & Dental |
| ...000000000203 | Home Maintenance | Home Maintenance (already renamed) |
| ...000000000702 | Electronics | Electronics & Tech |
| ...000000000703 | Home Goods | Home Goods (already renamed) |
| ...000000000701 | Clothing | Clothing & Apparel |
| ...000000001203 | Short-Term Savings | Monthly Savings |
| ...000000001202 | Retirement (401k/IRA) | Retirement (401k) |
| ...000000001301 | Home Improvement | Home Projects |
| ...000000001302 | Vacation & Travel | Travel & Vacation |
| ...000000001304 | Large Purchases | Big Purchases |

Full IDs are `00000000-0000-4000-a200-0000000XXXXX` where XXXXX = the suffix above.

### 2. Re-classify transactions

Update `demo_seed_transactions` AND live `transactions` for demo account.
**Do NOT add rows — only UPDATE existing ones.**

```sql
-- a) 24 cheapest Restaurants → Coffee & Cafés
-- Use: WHERE category='Food' AND sub_category='Restaurants' ORDER BY amount DESC LIMIT 24
-- (amount is negative, so DESC = least negative = cheapest)

-- b) 12 most expensive Pharmacy → Doctor & Dental
-- WHERE category='Health' AND sub_category='Pharmacy' ORDER BY amount ASC LIMIT 12
-- (most negative = largest medical bills = doctor visits)

-- c) 4 Property Tax from Home Maintenance
-- WHERE category='Housing' AND sub_category='Home Maintenance'
--   AND amount BETWEEN -700 AND -400 LIMIT 4

-- d) Shopping/General → split: 15 largest → Clothing & Apparel, rest → Home Goods
-- Step 1: 15 largest (most negative amounts): category='Shopping', sub_category='General' ORDER BY amount ASC LIMIT 15 → Clothing & Apparel
-- Step 2: remaining General → Home Goods

-- e) Transfer/Savings → split into 3 Savings sub-categories
-- 27 → Monthly Savings (UPDATE category='Savings', by ctid or date range Jan-Mar, Jul-Sep = routine months)
-- 12 → Emergency Fund (mid-year months: Apr-Jun)
-- 12 → Retirement (401k) (Oct-Dec + remaining)
-- Simple approach: ORDER BY date, first 27→Monthly, next 12→Emergency, last 12→Retirement

-- f) 10 largest Fuel → Car Repair
-- WHERE category='Transport' AND sub_category='Fuel' ORDER BY amount ASC LIMIT 10

-- g) 6 Phone → Internet & Cable
-- WHERE category='Utilities' AND sub_category='Phone' ORDER BY date LIMIT 6
-- (every other month = cable bill alternating with phone bill)
```

Use CTEs with `id IN (SELECT id FROM ... LIMIT n)` pattern to safely limit rows.

### 3. Delete empty sub-categories

From `demo_seed_bcl` (cascade handled), `demo_seed_sub_categories`, then live tables.

Delete sub-category IDs (full UUID pattern `00000000-0000-4000-a200-00000000XXXXX`):
- 000000000804 (Hobbies)
- 000000000803 (Sports & Events)
- 000000000404 (Meal Delivery)
- 000000000604 (Gym & Fitness)
- 000000000601 (Health Insurance)
- 000000000605 (Dental & Vision)
- 000000000204 (Home Insurance)
- 000000000901, 000000000902, 000000000903 (Personal Care)
- 000000001001, 000000001002, 000000001003 (Gifts & Giving)
- 000000000704 (General — after all transactions re-classified away)
- 000000001102, 000000001101, 000000001103 (Transfer sub-cats)
- 000000000504 (Parking & Tolls)
- 000000000303, 000000000302 (Water & Sewer, Gas & Heating)
- 000000000102, 000000000103, 000000000104 (Freelance, Investment, Other Income)
- 000000001303, 000000001305 (Medical Emergency, Car Major Repair)

Order: delete from `budget_category_limits` / `demo_seed_bcl` first, then `sub_categories` / `demo_seed_sub_categories`.

### 4. Delete empty categories

After sub-categories removed:
- Personal Care (`00000000-0000-4000-a100-000000000009` — look up actual ID)
- Gifts & Giving (look up actual ID)
- Transfer (look up actual ID)

Use: `DELETE FROM demo_seed_categories WHERE name IN ('Personal Care','Gifts & Giving','Transfer')`
And: `DELETE FROM public.categories WHERE name IN ('Personal Care','Gifts & Giving','Transfer') AND account_id = '00000000-0000-4000-a000-000000000001'`

### 5. Update budget amounts (demo_seed_bcl + live budget_category_limits)

Set for ALL 3 demo budgets (2024, 2025, 2026). See amounts in `docs/Plan/demo-seed-restructure.md`.

### 6. Set expense_label on live sub_categories for demo account

```sql
UPDATE public.sub_categories SET label = 'Fixed Committed'
WHERE id IN ('...000000000201','...000000000501','...000000000503','...000000000304','...000000000305','...000000000801','...000000001202','...000000000202')
AND category_id IN (SELECT id FROM categories WHERE account_id = '00000000-0000-4000-a000-000000000001');

UPDATE public.sub_categories SET label = 'Variable Essential'
WHERE id IN ('...000000000401','...000000000502','...000000000301','...000000000203','...000000000602','...000000000603','...000000001201','...000000001203','...000000000506')
AND category_id IN (SELECT id FROM categories WHERE account_id = '00000000-0000-4000-a000-000000000001');

UPDATE public.sub_categories SET label = 'Discretionary'
WHERE id IN ('...000000000402','...000000000403','...000000000703','...000000000702','...000000000701','...000000000505','...000000000802')
AND category_id IN (SELECT id FROM categories WHERE account_id = '00000000-0000-4000-a000-000000000001');
```

## Safety rules

- Wrap everything in a transaction
- DELETE from budget_category_limits/demo_seed_bcl BEFORE deleting sub_categories
- DELETE sub_categories BEFORE deleting categories
- Re-classify transactions BEFORE deleting the old sub-category
- Do NOT touch the Mullally account (`92325837-1cf0-4157-82c6-82a233389b1a`)
- Do NOT modify `reset_demo_account()` function itself

## Expected result

- 27 sub-categories total (10 categories × ~2-3 subs each)
- Every sub-category has ≥6 transactions in demo_seed_transactions for 2025
- Budget page shows 10 expense categories with USD monthly amounts matching ~80% utilization
- Savings category shows actual spend (was zero before)

## Output

A single SQL file ready to paste into `apply_migration`. Name: `demo_seed_category_restructure`.
