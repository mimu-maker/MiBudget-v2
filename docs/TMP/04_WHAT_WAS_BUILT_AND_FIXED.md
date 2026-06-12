# MiBudget — What Was Built & Fixed (Session History)

## Security Fixes (2026-05-10 to 2026-05-11)

### RLS enabled on unprotected tables
- `accounts` — now gated: `id = get_my_account_id()`
- `account_members` — now gated: `account_id = get_my_account_id()`
- All 6 `demo_seed_*` tables — read-only for authenticated users

### Email allowlist enforced (`src/lib/authUtils.ts`)
- `isEmailAllowed()` was returning `true` unconditionally
- Fixed to check `ALLOWED_EMAILS.includes(email.toLowerCase())`
- Prevents any Google account from signing in and auto-creating a user_profiles row

## Critical Bug Fixes (Claude_0.1 branch, merged to main)

### 1. `useTransactionCounts` ignored `account_id`
- Counts (table header total/filtered) were scoped to user, not account
- Fixed: `.eq(currentAccountId ? 'account_id' : 'user_id', currentAccountId ?? userId)`

### 2. `bulkUpdate` / `bulkDelete` used `user_id` only
- In multi-account mode, mutations silently did nothing (RLS blocked them)
- Fixed: only add `user_id` filter when `currentAccountId` is null

### 3. `splitTransaction` missing `parent_id` / `is_split`
- Child splits had `parent_id: null` and `is_split: false`
- Fixed: parent gets `is_split: true`; child gets `parent_id: tx.id`, `is_split: false`

### 4. Email allowlist order — runs before profile creation
- `fetchUserProfile` was called before `isEmailAllowed` check
- Fixed: allowlist check now happens first in both `onAuthStateChange` and `getSession`

## Code Quality Improvements (Claude_0.1)

### `SETTLED_STATUSES` extracted to shared constant
- File: `src/lib/transactionConstants.ts`
- Exports: `SETTLED_STATUSES`, `SettledStatus`, `isSettled(tx, duplicateIds?)`
- Used by: `ValidationDashboard.tsx`, `useValidationStats.ts`
- Never redefine locally — always import from here

### `applyTransactionFilters()` helper extracted
- Shared filter builder inside `useTransactionTable.ts`
- Handles: date range/year/month, amount operators, status array, ilike, boolean
- Month filter: checks `filters.date?.type === 'year'` first, falls back to `new Date().getFullYear()`
- Used by both `useInfiniteTransactions` and `useTransactionCounts`

### React Error Boundary added
- File: `src/components/ErrorBoundary.tsx`
- Wraps `AppLayout` in `App.tsx`
- Shows "Something went wrong" + reload button on render errors

### Dead code removed from `App.tsx`
- `authMode`, `useLocal`, `handleLocalAuth`, `handleSupabaseAuth` state removed
- Local auth is permanently disabled in production

## UI/UX Fixes (earlier sessions)

### Source resolution
- `is_resolved` = `!!clean_source` — no longer requires a classification rule to exist
- `SourceNameSelector` fetches ALL distinct `clean_source` values (no 500-row limit)
- Rule-backed sources get +50 score boost in ranking

### Transaction row sub-label
- Shows raw bank string (`transaction.source`) in monospace, not the notes field
- Only shown when `isResolved && source !== clean_source`

### Pending views filtering
- `Reconciled` status correctly excluded from all Pending views
- Settled statuses: `Complete`, `Excluded`, `Pending Reconciliation`, `Reconciled`

### Category dropdowns
- `Special` category (Slush Fund) no longer filtered from dropdowns
- Only `General` (internal feeder) is filtered

### Settings category activity indicators
- Green tick shown if ANY transaction exists for that category in selected year
- Uses dedicated lightweight query (not the paged `useTransactionTable`)

### Match mode selector
- Replaced Radix `Select` with button toggle (was clipping in animated containers)
- No more `fuzzy` mode — only `exact` | `contains`
- Migration guard: `=== 'fuzzy' ? 'contains'` wherever match_mode is read

### 404 on page refresh
- Fixed by adding `vercel.json` with SPA rewrite: all routes → `index.html`

### Source not found intermittently
- Root cause: `SourceNameSelector` had `.limit(500)` — old sources fell off
- Fixed: removed limit, sources now fetched without cap

## Decisions Log Summary
See `docs/logs/2026-05-02.md` and `docs/logs/2026-05-10.md` for dated entries.

Key decisions:
- `fuzzy` match mode removed — only `contains` and `exact`
- `UNIQUE (account_id, raw_name)` constraint on `classification_rules`
- `is_resolved = !!clean_source` — does not require a rule
- Sub-label under source = raw bank string, not notes
- `Reconciled` hidden from all Pending views
- `Special` category must not be filtered from dropdowns
- `vercel.json` SPA rewrite for page refresh fix
- RLS enabled on `accounts`, `account_members`, `demo_seed_*`
- Email allowlist now enforced (was returning true unconditionally)
