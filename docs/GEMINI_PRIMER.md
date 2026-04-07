# MiBudget — Agent Context Primer

Read this before touching any code. These rules are non-obvious and easy to get wrong.

---

## Project Snapshot

- **What**: Private household budget app (Danish household, 2 users + demo)
- **Stack**: React 18 + TypeScript, Vite, Tailwind, shadcn/ui, React Router v6, TanStack Query v5, Supabase (PostgreSQL + RLS + Auth)
- **Supabase project**: `irudwhbkkdbhufjtofog` (eu-west-1)
- **Full docs**: `@docs/README.md`

---

## Rule 1 — Never use `auth.uid()` directly

All data is scoped to an **account**, not an auth user. Two people share one account.

```typescript
// ❌ Wrong
.eq('user_id', user.id)

// ✅ Correct
.eq('account_id', currentAccountId)
```

In RLS policies:
```sql
-- ❌ Wrong
WHERE user_id = auth.uid()

-- ✅ Correct
WHERE account_id = public.get_my_account_id()
-- get_my_account_id() = SELECT current_account_id FROM user_profiles WHERE user_id = auth.uid()
```

Every new data table needs: `account_id uuid NOT NULL` + the RLS policy pattern in `@docs/TechSpec/auth-model.md`.

---

## Rule 2 — Include `currentAccountId` in TanStack Query keys

```typescript
// ❌ Stale cross-account cache
queryKey: ['transactions-all']

// ✅ Correct
queryKey: ['transactions-all', currentAccountId]
```

If `currentAccountId` is used inside a `queryFn`, it must be in the key. Otherwise cached data from one account bleeds into another.

---

## Rule 3 — Budget amounts come from `budget_category_limits`, not `sub_categories`

```typescript
// ❌ Always zero
const amount = sub.budget_amount

// ✅ Correct
const amount = categoryBudgets[sub.id] ?? sub.budget_amount ?? 0
// where categoryBudgets is keyed from budget_category_limits rows
```

---

## Rule 4 — Transactions store category/sub-category names, not IDs

```typescript
// ❌ Wrong approach
transactions.category_id → categories.id

// ✅ How it actually works
transactions.category === categories.name  // string match
```

Never add FK columns for category on transactions. Match by name.

---

## Rule 5 — Always use `useAuth` from `UnifiedAuthContext`

```typescript
// ❌ Wrong — bypasses the abstraction
import { useAuth } from '@/contexts/AuthContext'

// ✅ Correct
import { useAuth } from '@/contexts/UnifiedAuthContext'
```

`UnifiedAuthContext` handles both Supabase and local dev bypass mode.

---

## Rule 6 — Budget lookup: query by year + account_id, never by name

Budget names have changed across years ("Primary 2025", "Unified Budget"). Query like this:

```typescript
supabase.from('budgets')
  .eq('account_id', currentAccountId)
  .eq('year', targetYear)
```

---

## Key IDs (Mullally account)

| Thing | ID |
|---|---|
| Mullally account_id | `92325837-1cf0-4157-82c6-82a233389b1a` |
| Demo account_id | `00000000-0000-4000-a000-000000000001` |
| Michael profile id | `d1ad5d65-da01-445f-bcfe-cc7f6552a424` |

---

## Provider hierarchy (don't break the order)

```
QueryClientProvider → AuthProvider → LocalAuthProvider → ProfileProvider
  → UnifiedAuthProvider → PeriodProvider → ThemeProvider → BrowserRouter
```

---

## Transaction filtering rules (`flowFiltered`)

These are **excluded** from all dashboard calculations:
- `budget = 'Exclude'`
- `excluded = true`
- `status = 'Pending Reconciliation'`
- `status` starts with `'Pending: '`

`status = 'Pending Triage'` is **included** (visible but unverified).

Klintemarken transactions are included in cash flow by default. The `enableFeederBudgets` flag only controls whether the FEEDER toggle *button* renders — it does not gate inclusion.

---

## Before you start coding

1. Confirm you are on a **feature branch**, not `main`
2. Read the task spec: `@docs/Plan/<task>.md`
3. Check the validation checklist at the bottom of the task spec — that's what gets reviewed

---

## Run commands

```bash
npm run dev      # dev server on :8080
npm run build    # production build (use this to check for TS errors)
npm run lint     # ESLint
npm run test     # Vitest
```
