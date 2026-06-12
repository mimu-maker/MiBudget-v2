# MiBudget — Supabase Quick Reference

## Connection
- **Project ID**: `irudwhbkkdbhufjtofog`
- **URL**: `https://irudwhbkkdbhufjtofog.supabase.co`
- **MCP tool**: use `execute_sql` for reads, `apply_migration` for DDL

## ⚠️ Data Safety
| Account | ID | Rule |
|---|---|---|
| Michael & Tanja (production) | `92325837-1cf0-4157-82c6-82a233389b1a` | **READ ONLY — never write** |
| Demo | `00000000-0000-4000-a000-000000000001` | Safe to write/test |

Schema changes (DDL) must be reviewed with Michael before executing.

## Live Data (as of 2026-05-11)
- **2,728 transactions** — Jan 2025 to Jul 2026
- **1,919 demo transactions** — Jan 2024 to Apr 2026

## Key Identities
```
Michael  profile_id:  d1ad5d65-da01-445f-bcfe-cc7f6552a424
Tanja    profile_id:  ed2aaf21-4c63-4225-b98a-eccf41005b6d
```
Both share account `92325837-1cf0-4157-82c6-82a233389b1a`.

## Core Tables

### `transactions` (4,647 rows total)
```sql
SELECT id, date, merchant, clean_merchant, amount, category, sub_category,
       status, budget_month, confidence, is_split, parent_id, entity,
       excluded, notes
FROM transactions
WHERE account_id = '92325837-1cf0-4157-82c6-82a233389b1a'
ORDER BY date DESC;
```
| DB column | Meaning |
|---|---|
| `merchant` | Raw bank string |
| `clean_merchant` | Mapped display name |
| `confidence` | 0 = unmapped; >0 = categorised |
| `is_split` | True on parent of a split transaction |
| `parent_id` | Set on child split items |
| `entity` | Person name (reconciliation items) |
| `excluded` | True = hidden from budget |

### `classification_rules`
```sql
SELECT raw_name, clean_name, match_mode
FROM classification_rules
WHERE account_id = '92325837-1cf0-4157-82c6-82a233389b1a'
ORDER BY clean_name;
```
- `match_mode`: `'exact'` | `'contains'`
- Unique on `(account_id, raw_name)`

### `categories` + `sub_categories`
```sql
SELECT c.name as category, c.group_name, s.name as sub_category
FROM categories c
LEFT JOIN sub_categories s ON s.category_id = c.id
WHERE c.group_name != 'General'
ORDER BY c.group_name, c.name, s.name;
```
- Group names: `Income`, `Expense`, `Special` (Slush Fund), `General` (internal — ignore)

### `budgets` + `budget_category_limits`
```sql
SELECT b.year, bcl.category, bcl.sub_category, bcl.amount, bcl.month
FROM budget_category_limits bcl
JOIN budgets b ON b.id = bcl.budget_id
WHERE b.account_id = '92325837-1cf0-4157-82c6-82a233389b1a'
ORDER BY b.year, bcl.month, bcl.category;
```

## Status Values
```
Pending Triage          → not yet looked at
Pending Categorisation  → source mapped, no category yet
Pending Validation      → categorised, not confirmed
Complete                → confirmed
Excluded                → ignored in budget
Pending Reconciliation  → owed to/from someone
Reconciled              → settled
```
Settled (hidden from pending views): `Complete`, `Excluded`, `Pending Reconciliation`, `Reconciled`

## RLS
All tables use Row Level Security. Queries through the MCP (service role) bypass RLS — you see everything. App queries go through the anon key and are RLS-scoped to the authenticated user's account via `get_my_account_id()`.

## Useful Queries

### Unmapped transactions (nothing in clean_merchant)
```sql
SELECT date, merchant, amount, status
FROM transactions
WHERE account_id = '92325837-1cf0-4157-82c6-82a233389b1a'
  AND (clean_merchant IS NULL OR clean_merchant = '')
  AND status NOT IN ('Complete','Excluded','Pending Reconciliation','Reconciled')
ORDER BY date DESC;
```

### Spending by category, current year
```sql
SELECT category, sub_category, SUM(amount) as total
FROM transactions
WHERE account_id = '92325837-1cf0-4157-82c6-82a233389b1a'
  AND budget_year = 2026
  AND status NOT IN ('Excluded','Reconciled')
  AND amount < 0
GROUP BY category, sub_category
ORDER BY total ASC;
```

### Pending reconciliation items
```sql
SELECT date, merchant, clean_merchant, amount, entity, status
FROM transactions
WHERE account_id = '92325837-1cf0-4157-82c6-82a233389b1a'
  AND (status = 'Pending Reconciliation' OR entity IS NOT NULL)
  AND status != 'Reconciled'
ORDER BY date DESC;
```
