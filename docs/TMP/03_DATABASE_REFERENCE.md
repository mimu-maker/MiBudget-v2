# MiBudget — Database Reference

## Supabase Project
- **Project ID**: `irudwhbkkdbhufjtofog`
- **URL**: `https://irudwhbkkdbhufjtofog.supabase.co`
- **Region**: us-east-1 (AWS)

## Live Data Summary (as of 2026-05-11)
| Account | Transactions | Date Range |
|---|---|---|
| Michael & Tanja (production) | 2,728 | Jan 2025 – Jul 2026 |
| Demo | 1,919 | Jan 2024 – Apr 2026 |
| **Total** | **4,647** | |

## Accounts
| Name | account_id | Notes |
|---|---|---|
| Michael & Tanja | `92325837-1cf0-4157-82c6-82a233389b1a` | ⚠️ PRODUCTION — read only |
| Demo | `00000000-0000-4000-a000-000000000001` | Safe to write/test |

## User Profiles
| Email | profile_id | auth_uid | account_id |
|---|---|---|---|
| michaelmullally@gmail.com | `d1ad5d65-da01-445f-bcfe-cc7f6552a424` | `a316d106-5bc5-447a-b594-91dab8814c06` | 92325837-... |
| tanjen2@gmail.com | `ed2aaf21-4c63-4225-b98a-eccf41005b6d` | `e378e8ca-7b63-444f-9d7c-5167a1216f01` | 92325837-... |
| demo@example.com | `2edb305b-d267-4e7c-9411-1e83d503bc68` | `00000000-0000-0000-0000-000000000002` | 00000000-... |

## Key Tables

### `transactions`
Primary data table. 4,647 rows.
```
id              uuid PK
user_id         uuid → user_profiles.id (NOT auth.uid)
account_id      uuid → accounts.id
date            timestamptz
merchant        text   ← raw bank name (app calls this 'source')
clean_merchant  text   ← mapped display name (app calls this 'clean_source')
merchant_description text ← (app calls this 'source_description')
amount          numeric
category        text   ← stored as name, not ID
sub_category    text   ← stored as name, not ID
status          text   ← see Status Flow
budget          text
budget_month    text   ← 'yyyy-MM-01'
budget_year     int
confidence      numeric ← 0=unmapped, >0=categorised
is_split        bool   ← true on parent of a split
parent_id       uuid   ← set on child split items
entity          text   ← person name for reconciliation
excluded        bool
fingerprint     text   UNIQUE ← for dedup on import
notes           text
planned         bool
recurring       bool
created_at      timestamptz
updated_at      timestamptz
```

### `classification_rules`
Source mapping rules. Links raw bank strings to clean names.
```
id          uuid PK
account_id  uuid → accounts.id
raw_name    text    ← pattern to match
clean_name  text    ← display name
match_mode  text    ← 'exact' | 'contains' ('fuzzy' removed)
UNIQUE (account_id, raw_name)
```

### `user_profiles`
One row per user. Michael & Tanja both point to the same `current_account_id`.
```
id                  uuid PK  ← this is what transactions.user_id references
user_id             uuid     ← Supabase auth.uid()
email               text
full_name           text
current_account_id  uuid → accounts.id
role                text  ← 'admin' | 'editor' | 'viewer' | 'restrict'
currency            text
```

### `accounts`
```
id        uuid PK
name      text
slug      text
currency  text
```

### `account_members`
```
id          uuid PK
account_id  uuid → accounts.id
user_id     uuid → user_profiles.id
role        text
```

### `budgets`
```
id          uuid PK
user_id     uuid → user_profiles.id
account_id  uuid → accounts.id
year        int
name        text
```

### `categories`
```
id          uuid PK
user_id     uuid
name        text   ← stored as name in transactions
group_name  text   ← 'Income' | 'Expense' | 'General' | 'Special'
```
Note: `'Special'` = Slush Fund. Never filter it from dropdowns.
`'General'` = internal feeder category — always filtered from dropdowns.

### `sub_categories`
```
id           uuid PK
category_id  uuid → categories.id
name         text
```

### `budget_category_limits`
Monthly spend limits per category.
```
id          uuid PK
budget_id   uuid → budgets.id
category    text
sub_category text
amount      numeric
month       text  ← 'yyyy-MM-01'
```

### `projections`
Income projections.
```
id          uuid PK
account_id  uuid
date        text
source      text
amount      numeric
```

### `demo_seed_*` tables
Static seed data for demo resets. Read-only for authenticated users.
Tables: `demo_seed_bcl`, `demo_seed_budgets`, `demo_seed_categories`, `demo_seed_projections`, `demo_seed_sub_categories`, `demo_seed_transactions`

## RLS Architecture
All tables have RLS enabled. Core helper function:
```sql
-- Returns current_account_id from user_profiles for the authenticated user
get_my_account_id() → uuid

-- Returns role
get_my_role() → text
```

Standard policy pattern:
```sql
CREATE POLICY "..." ON <table> FOR ALL
USING (account_id = get_my_account_id());
```

For tables without `account_id`, join through `user_profiles`:
```sql
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = <table>.user_id
    AND (user_profiles.user_id = auth.uid() OR user_profiles.email = auth.jwt()->>'email')
  )
)
```

## Important Gotchas
1. `transactions.user_id` = `user_profiles.id` (the profile UUID), NOT `auth.uid()`
2. Both Michael and Tanja share the same `account_id` — queries by `account_id` return both users' data correctly
3. `merchant` / `clean_merchant` in DB = `source` / `clean_source` in app code
4. `confidence = 0` means unmapped/untriaged; `confidence > 0` means a rule has been applied
5. `is_resolved = !!clean_merchant` — computed in app, not stored in DB
6. Dedup key is `fingerprint` = hash of `date + merchant + amount + account`
