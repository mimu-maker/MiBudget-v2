# Database Schema

Supabase project: `irudwhbkkdbhufjtofog` (eu-west-1)

---

## Core Tables

### `accounts`
The top-level owner of all data.

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text | e.g. "Mullally Household" |
| created_at | timestamptz | |

### `user_profiles`
One row per Supabase Auth user. The bridge between `auth.uid()` and account data.

| column | type | notes |
|---|---|---|
| id | uuid PK | used as foreign key in legacy rows |
| user_id | uuid | Supabase Auth UID (`auth.uid()`) |
| email | text | |
| full_name | text | |
| current_account_id | uuid FK→accounts | **the key field for all data scoping** |
| role | text | 'admin' \| 'editor' \| 'viewer' \| 'restrict' |
| currency | text | default 'DKK' |
| language | text | 'en-US' \| 'da-DK' |
| amount_format | text | 'dot_decimal' \| 'comma_decimal' |
| date_format | text | 'YYYY-MM-DD' \| 'DD/MM/YYYY' \| 'YY/MM/DD' |
| last_session_id | uuid | session conflict detection |
| is_setup_complete | boolean | |
| import_completed | boolean | |
| onboarding_step | int | |
| created_at / updated_at | timestamptz | |

### `transactions`
Central fact table. ~191 rows per month for the Mullally account.

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK→accounts NOT NULL | RLS scope |
| user_id | uuid | auth UID of importer |
| date | date | actual bank transaction date |
| budget_month | date | always `YYYY-MM-01`; used for budget period assignment |
| budget_year | int | derived from budget_month |
| amount | numeric | negative = expense, positive = income/refund |
| merchant | text | raw bank description |
| clean_merchant | text | normalised display name |
| merchant_description | text | detail/notes |
| category | text | category name (not FK) |
| sub_category | text | sub-category name (not FK) |
| budget | text | 'Budgeted' \| 'Exclude' \| 'Special' \| 'Klintemarken' |
| status | text | see statuses below |
| excluded | boolean | true = hidden from all calculations |
| recurring | text | |
| planned | boolean | |
| fingerprint | text UNIQUE | dedup key for import |
| parent_id | uuid nullable | for split transactions |
| account | text | bank account name |
| notes | text | user notes |

**Statuses**: `Complete`, `Pending Triage`, `Pending Reconciliation`, `Pending: <reason>`, `Excluded`, `Reconciled`

**Filtering rules** (applied in `flowFiltered`):
- `budget = 'Exclude'` → excluded from all calculations
- `excluded = true` → excluded
- `status = 'Pending Reconciliation'` → excluded
- `status LIKE 'Pending: %'` → excluded
- `status = 'Pending Triage'` → **included** (visible but unverified)

### `categories`
Defines the category structure for an account.

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK→accounts NOT NULL | |
| user_id | uuid | |
| name | text | must match `transactions.category` exactly |
| category_group | text | 'income' \| 'expenditure' \| 'klintemarken' \| 'special' |
| display_order | int | |
| icon | text | Lucide icon name |
| color | text | hex colour |
| label | text | 'Fixed Committed' \| 'Variable Essential' \| 'Discretionary' \| null |
| alert_threshold | int | % for budget alerts, default 80 |

### `sub_categories`
Belongs to a category. No direct `account_id` — RLS joins through `categories`.

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| category_id | uuid FK→categories | |
| name | text | must match `transactions.sub_category` exactly |
| display_order | int | |
| budget_amount | numeric | **legacy — use `budget_category_limits` as source of truth** |
| label | text | same values as category label |
| is_active | boolean | |

### `budgets`
One budget record per year per account (typically one active budget per year).

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK→accounts NOT NULL | |
| user_id | uuid | |
| name | text | e.g. "Unified Budget" |
| year | int | e.g. 2026 |
| budget_type | text | 'unified' |
| start_date | date | `YYYY-01-01` |
| is_active | boolean | |

**Lookup pattern**: always query by `account_id + year`, not by name. Name has changed across years.

### `budget_category_limits`
**Source of truth for budget amounts.** `sub_categories.budget_amount` is legacy/zero.

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| budget_id | uuid FK→budgets | |
| category_id | uuid FK→categories | |
| sub_category_id | uuid FK→sub_categories nullable | null = category-level limit |
| limit_amount | numeric | annual budget amount |
| is_active | boolean | |

RLS: joins through `budgets.account_id`.

### `projections`
12-month forward projections for cash flow planning.

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK→accounts NOT NULL | |
| user_id | uuid | |
| month | date | `YYYY-MM-01` |
| category | text | category name |
| projected_amount | numeric | |
| actual_amount | numeric | filled in as month passes |
| notes | text | |

---

## Classification Rules Tables

Two tables currently; targeted for merger in Phase 3 (see `docs/Plan/phase3-classification-rules.md`).

### `merchant_rules`
Matches on normalised merchant name (`clean_merchant_name`).

### `source_rules`
Matches on raw bank source description (`source_name` / `clean_source_name`).

Both share the same output fields: `auto_category`, `auto_sub_category`, `auto_budget`, `skip_triage`, `auto_verify`, `auto_planned`, `auto_recurring`, `secondary_categories`, `match_mode`.

---

## Demo Seed Tables

Snapshot tables used by `reset_demo_account()` to restore the demo account to a clean state. Never queried directly by the app.

- `demo_seed_categories`
- `demo_seed_sub_categories`
- `demo_seed_budgets`
- `demo_seed_bcl`
- `demo_seed_transactions`
- `demo_seed_projections`

---

## Key Functions

### `public.get_my_account_id() → uuid`
```sql
SELECT current_account_id FROM user_profiles WHERE user_id = auth.uid()
```
Used in every RLS policy. Has `SET search_path = public`.

### `public.reset_demo_account()`
Callable only by `demo@example.com`. Deletes all demo account data and re-seeds from the `demo_seed_*` snapshot tables. Called on demo sign-out and after 15 min inactivity.

---

## RLS Summary

All data tables use a single `FOR ALL` policy:
```sql
account_id = public.get_my_account_id()
```

`sub_categories` and `budget_category_limits` use subquery joins through their parent `account_id`. See `docs/TechSpec/auth-model.md` for the full pattern.

---

## Migrations

Stored in `supabase/migrations/`. Key files:
- `20260407_phase2_rls_overhaul.sql` — replaced all legacy household/user_id policies with account_id-based RLS
- `20260407_demo_account_bootstrap.sql` — demo account setup (note: file reflects v3; v7 was applied directly — see `docs/Plan/migration-file-sync.md`)
