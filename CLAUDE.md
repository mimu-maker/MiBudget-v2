# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL: DATA SAFETY — READ BEFORE ANY DB OPERATION

**NEVER modify, delete, or alter any data in the Michael & Tanja production account.**

- The production account ID is `92325837-1cf0-4157-82c6-82a233389b1a`
- **ALL database writes, migrations, deletes, and updates are PROHIBITED** on this account's data
- The only account where data changes are permitted is the **demo account** (`00000000-...-0001`)
- Schema changes (DDL: CREATE TABLE, ALTER TABLE, etc.) must be reviewed with the user before executing
- When in doubt: **read only**. Ask the user before touching anything in production data.

This applies to every tool, script, MCP call, SQL execution, and Supabase operation.

## Commands

```bash
npm run dev        # Start Vite dev server (port 8080)
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Vitest unit tests
npm run test:ui    # Vitest with UI
```

## Active Branch

`Claude_0.1` — all work goes here. Never push directly to main.

## Architecture

**Stack**: React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix UI), React Router v6, TanStack Query v5, Supabase (PostgreSQL backend + auth).

### Auth & Shared Account Model

The app uses a "Single Account, Multi-Ready" design. Two auth users (Michael & Tanja) share one `user_profiles` record.

- **Always use `useAuth().userProfile.id`** when querying Supabase — never `auth.uid()` directly.
- The `UnifiedAuthContext` (`src/contexts/UnifiedAuthContext.tsx`) abstracts over `AuthContext` and `LocalAuthContext` (dev bypass).
- RLS policies must join through `user_profiles` to support shared access:

```sql
CREATE POLICY "..." ON <table>
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = <table>.user_id
    AND (user_profiles.user_id = auth.uid() OR user_profiles.email = auth.jwt()->>'email')
  )
);
```

### Provider Hierarchy

```
QueryClientProvider → AuthProvider → LocalAuthProvider → ProfileProvider
  → UnifiedAuthProvider → PeriodProvider → ThemeProvider → BrowserRouter
```

### Data Fetching

TanStack Query with custom hooks in `src/hooks/`. Common pattern:

```typescript
const { budget, loading, refreshBudget } = useAnnualBudget(selectedYear);
```

Query keys **must** include `currentAccountId` and use `enabled: !!currentAccountId` — missing this causes empty cache before auth resolves.

Query keys typically include `[resource, year, accountId]`. Stale time is usually 5 minutes.

**Invalidation:** always use the exact query key prefix. The transaction list uses `['transactions-infinite']` and `['transactions-all']` — invalidating `['transactions']` does nothing.

### Category & Sub-category Selections

Always use `useGroupedCategories` hook and `CategorySelectContent` component for consistent dropdowns — they handle the Income/Feeder/Expense grouping and sorting.

Transactions store category/sub-category *names* (not IDs) for resilience.

The `Special` category group = Slush Fund. `useCategorySource` only filters out `'General'` (internal feeder) — `'Special'` must remain visible in all dropdowns.

### Source / Classification Rules

- `classification_rules` table: stores pattern rules with `raw_name`, `clean_name`, `match_mode`, `account_id`
- Unique constraint: `(account_id, raw_name)` — required for upsert
- `match_mode` is `'exact' | 'contains'` — fuzzy was removed, migration guard: `=== 'fuzzy' ? 'contains'`
- `is_resolved` on a transaction = `!!clean_source` (non-empty) — does NOT require a classification rule to exist
- `SourceNameSelector` queries all distinct `clean_source` values from transactions (no row limit) + rule names

### Transaction Status Flow

```
Pending Triage → Pending Categorisation → Pending Validation → Complete
                                                              → Excluded
Pending Reconciliation → Reconciled  (never show in Pending views)
```

**Settled statuses** (hidden from all Pending views): `Complete`, `Excluded`, `Pending Reconciliation`, `Reconciled`

### Missing Data Debugging

If data appears missing in the UI:
1. Check RLS policies join through `user_profiles`
2. Verify `user_id` in data table matches `id` in `user_profiles` (not auth UID)
3. Verify a default budget exists for the profile (many queries scope to a `budgetId`)
4. Check TanStack Query keys include `currentAccountId` with `enabled` guard

## Key Files

- `src/App.tsx` — routing and layout
- `src/integrations/supabase/client.ts` — Supabase client (env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- `src/integrations/supabase/types.ts` — auto-generated DB types
- `src/contexts/UnifiedAuthContext.tsx` — auth interface used by all components
- `src/hooks/useAnnualBudget.ts` — primary budget data hook
- `src/hooks/useValidationStats.ts` — sidebar badge counts (keep in sync with ValidationDashboard filters)
- `src/components/Transactions/hooks/useTransactionTable.ts` — core transaction data + `is_resolved` logic
- `src/components/Transactions/ValidationDashboard.tsx` — Pending Action hub
- `src/components/Settings/SourceManager.tsx` — source rule management
- `docs/FE_ARCHITECTURE.md` — architecture decisions and RLS patterns
- `vercel.json` — SPA rewrite rule (all routes → index.html)

## Decisions Log

| Date | Decision |
|------|----------|
| 2026-05-02 | Removed `fuzzy` match mode — only `contains` and `exact` remain |
| 2026-05-02 | Added `UNIQUE (account_id, raw_name)` constraint to `classification_rules` |
| 2026-05-02 | `is_resolved` = `!!clean_source` — no longer requires a rule to exist |
| 2026-05-02 | Transaction sub-label shows raw bank string, not notes field |
| 2026-05-02 | `Reconciled` status excluded from all Pending views |
| 2026-05-02 | `Special` category (Slush Fund) must not be filtered out of dropdowns |
| 2026-05-02 | `vercel.json` added for SPA routing (fixes 404 on page refresh) |
