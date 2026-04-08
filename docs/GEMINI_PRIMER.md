# MiBudget — Antigravity Agent Instruction Manual

This is the kickoff document for a Gemini agent working in Antigravity. Read it in full before writing a single line of code.

---

## How to Work in Antigravity

1. **Always start on a feature branch.** Never commit directly to `main`.
   ```
   git checkout -b feature/<task-name>
   ```

2. **Use Planning Mode before coding.** Paste this document + the task spec and ask Antigravity to plan first. Review the plan, then approve before execution.

3. **Reference files with `@`.** Antigravity auto-indexes the workspace. Use `@src/lib/importBrain.ts` to bring a file into context rather than asking the agent to find it.

4. **Iterative approval.** Break the plan into logical chunks. Approve one chunk at a time. Do not let the agent free-run across many files without checkpoints.

5. **After every chunk**, run `npm run build` to catch TypeScript errors before they compound.

6. **Validate the checklist** at the bottom of the task's `@docs/Plan/<task>.md` before asking Claude to review.

---

## Project Snapshot

- **What**: Private household budget app — Danish household (Michael + Tanja), plus a demo account
- **Stack**: React 18 + TypeScript, Vite, Tailwind, shadcn/ui, React Router v6, TanStack Query v5, Supabase (PostgreSQL + RLS + Auth)
- **Supabase project**: `irudwhbkkdbhufjtofog` (eu-west-1)
- **Dev server**: `npm run dev` → `http://localhost:8080`
- **Build check**: `npm run build` (use this to confirm no TS errors)

---

## The 6 Rules You Must Not Break

### Rule 1 — Account-scoped data, never user-scoped

Two people (Michael + Tanja) share one `account_id`. All data tables have `account_id`, not just `user_id`.

```typescript
// ❌ Wrong
.eq('user_id', user.id)

// ✅ Correct
.eq('account_id', currentAccountId)
// where currentAccountId = useAuth().currentAccountId from UnifiedAuthContext
```

In every SQL migration / RLS policy:
```sql
-- ❌ Wrong
WHERE user_id = auth.uid()

-- ✅ Correct
WHERE account_id = public.get_my_account_id()
```

`get_my_account_id()` resolves via `SELECT current_account_id FROM user_profiles WHERE user_id = auth.uid()`.

### Rule 2 — TanStack Query keys must include `currentAccountId`

```typescript
// ❌ Stale cross-account cache
queryKey: ['transactions-all']

// ✅ Correct
queryKey: ['transactions-all', currentAccountId]
```

Every `queryFn` that uses `currentAccountId` must have it in the key. Exact-match operations (`getQueryData`, `setQueryData`) must use the full key. Prefix operations (`invalidateQueries`, `cancelQueries`) use partial keys.

### Rule 3 — Budget amounts live in `budget_category_limits`, not `sub_categories`

```typescript
// ❌ Always returns 0
sub.budget_amount

// ✅ Correct
categoryBudgets[sub.id] ?? sub.budget_amount ?? 0
// categoryBudgets is keyed from budget_category_limits rows
```

### Rule 4 — Transactions store category names, not IDs

```typescript
// ❌ Wrong mental model
transaction.category_id → categories.id

// ✅ How it actually works
transaction.category === category.name  // string match
```

Never add FK columns for category on transactions.

### Rule 5 — Always import from `UnifiedAuthContext`

```typescript
// ❌ Wrong
import { useAuth } from '@/contexts/AuthContext'

// ✅ Correct
import { useAuth } from '@/contexts/UnifiedAuthContext'
```

### Rule 6 — Query budgets by `account_id + year`, never by name

Budget names have changed across years. Use:
```typescript
supabase.from('budgets').eq('account_id', currentAccountId).eq('year', targetYear)
```

---

## Key IDs

| Thing | ID |
|---|---|
| Mullally `account_id` | `92325837-1cf0-4157-82c6-82a233389b1a` |
| Demo `account_id` | `00000000-0000-4000-a000-000000000001` |
| Michael `user_profiles.id` | `d1ad5d65-da01-445f-bcfe-cc7f6552a424` |
| Michael auth `user_id` | `a316d106-5bc5-447a-b594-91dab8814c06` |

---

## Provider Hierarchy (do not reorder)

```
QueryClientProvider → AuthProvider → LocalAuthProvider → ProfileProvider
  → UnifiedAuthProvider → PeriodProvider → ThemeProvider → BrowserRouter
```

---

## Transaction Filtering (`flowFiltered`)

Excluded from all dashboard calculations:
- `budget = 'Exclude'`
- `excluded = true`
- `status = 'Pending Reconciliation'`
- `status` starts with `'Pending: '`

`status = 'Pending Triage'` is **included** (visible but unverified).

Klintemarken transactions are included in cash flow by default. `enableFeederBudgets` only controls whether the feeder toggle *button* renders — it does not gate inclusion in calculations.

---

## Current Schema: Classification Rules

`merchant_rules` and `source_rules` have been unified into `classification_rules` (Phase 3a, applied 2026-04-08).

```sql
classification_rules (
  id uuid PK,
  account_id uuid NOT NULL,   -- RLS key
  user_id uuid NOT NULL,
  match_type text,             -- 'merchant' | 'source'
  raw_name text,               -- original bank string
  clean_name text NOT NULL,    -- normalised match key
  match_mode text,             -- 'exact' | 'contains' | 'starts_with'
  auto_category text,
  auto_sub_category text,
  auto_budget text,
  skip_triage boolean,
  auto_verify boolean,
  auto_planned boolean,
  auto_recurring text,
  secondary_categories text[]
)
```

The old tables (`merchant_rules`, `source_rules`) still exist but are unused. Phase 3b drops them — do not touch them until that migration is applied.

---

## Cache Migration Lesson (do not repeat this mistake)

Rules were stored in localStorage as `source_rules_cache_v1`. A previous agent migration added `localStorage.removeItem('source_rules_cache_v1')` which deleted all rules on load. **Never remove a cache key until the new key is confirmed populated.** Lazy migration pattern:

```typescript
const old = localStorage.getItem('old_cache_key');
if (old && !localStorage.getItem('new_cache_key')) {
  localStorage.setItem('new_cache_key', old);
}
localStorage.removeItem('old_cache_key');
```

---

## Where to Find Task Specs

All planned work lives in `@docs/Plan/`. Before starting any task, read the relevant spec and confirm you understand the validation checklist at the bottom.

Current plans:
- `@docs/Plan/phase3-classification-rules.md` — Phase 3b (drop old tables) still pending
- `@docs/Plan/demo-lifecycle.md` — demo account reset wiring
- `@docs/Plan/migration-file-sync.md` — fix demo bootstrap SQL

---

## Kickoff Checklist

Before writing code, confirm:
- [ ] On a feature branch (not `main`)
- [ ] Read the relevant `@docs/Plan/<task>.md`
- [ ] `npm run build` passes on the current branch
- [ ] You understand which `account_id` your queries will use
