# Architecture

## Stack

| Layer | Technology |
|---|---|
| UI | React 18 + TypeScript, Vite, Tailwind CSS |
| Component library | shadcn/ui (Radix UI primitives) |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Build | Vite (port 8080 in dev) |

---

## Provider Hierarchy

The app wraps in this exact order (outermost first):

```
QueryClientProvider
  AuthProvider              ← Supabase session + userProfile + currentAccountId
    LocalAuthProvider       ← Dev bypass auth (VITE_DEV_BYPASS_AUTH=true)
      ProfileProvider       ← updateUserProfile(), profile loading state
        UnifiedAuthProvider ← Single useAuth() interface for all components
          PeriodProvider    ← selectedPeriod, customDateRange (persisted to localStorage)
            ThemeProvider
              BrowserRouter
                App         ← routes
```

**Always import `useAuth` from `UnifiedAuthContext`**, never directly from `AuthContext` or `LocalAuthContext`. The unified context abstracts over Supabase and local dev modes.

---

## Key Patterns

### Data fetching

All server data goes through TanStack Query hooks in `src/hooks/` and `src/components/*/hooks/`.

```typescript
const { budget, loading, refreshBudget } = useAnnualBudget(selectedYear);
```

Query keys follow the pattern `[resource, year?, accountId?]`. Always include `currentAccountId` in the key when the query is account-scoped — omitting it causes stale cross-account cache hits.

Standard stale times:
- Transactions: 5 minutes (`useAllTransactions`)
- Budget / categories: 5 minutes (`useAnnualBudget`)
- Settings: loaded once

### Category & sub-category selectors

Always use `useGroupedCategories` hook + `CategorySelectContent` component. They handle Income / Feeder / Expense grouping, sorting, and the `enableFeederBudgets` flag. Do not build ad-hoc category dropdowns.

### Transactions store names not IDs

`transactions.category` and `transactions.sub_category` store the **name** (text), not a foreign key ID. This is intentional for resilience — categories can be renamed without a migration. Match on name strings, not UUIDs, when joining or filtering.

### Period context

`usePeriod()` returns `{ selectedPeriod, customDateRange }`. Period is persisted to localStorage. `getPeriodInterval(period, customDateRange)` in `src/lib/dateUtils.ts` converts a period string to a `{ start, end }` interval.

Available periods: `All`, `This month`, `Last Month`, `This Quarter`, `Last Quarter`, `This Year`, `Last Year`, `YTD`, `6m`, `90d`, `Custom`, or a 4-digit year string like `"2026"`.

### Budget vs cash flow filtering

The overview dashboard uses `flowFiltered` (from `useOverviewData`) which excludes:
- `budget = 'Exclude'`
- `excluded = true`
- `status = 'Pending Reconciliation'`
- `status` starts with `'Pending: '`

The `includeKlintemarken` toggle controls whether klintemarken-group transactions appear in the chart. **It is not gated by `enableFeederBudgets`** — the feature flag only controls whether the FEEDER toggle button renders.

---

## Page Routes (`src/App.tsx`)

| Path | Component | Notes |
|---|---|---|
| `/` | Overview tabs (Main / Category / Slush) | Default landing |
| `/transactions` | TransactionsTable | Infinite scroll, bulk actions |
| `/budget` | Budget matrix | Annual / monthly view |
| `/projections` | Projection | 1-year cash flow |
| `/settings` | Settings tabs | Profile, categories, rules, import |

---

## Feature Flags (Settings)

Stored in Supabase `settings` table, loaded via `useSettings()`.

| Flag | Default | Effect |
|---|---|---|
| `enableFeederBudgets` | `false` | Shows FEEDER toggle in overview; shows Klintemarken budget section |
| `enableBudgetBalancing` | `false` | Enables budget rebalancing UI |
| `darkMode` | `false` | CSS dark theme |

---

## Environment Variables

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_DEV_BYPASS_AUTH=true   # local dev only — skips auth entirely
```
