# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (port 8080)
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Vitest unit tests
npm run test:ui    # Vitest with UI
```

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

Query keys typically include `[resource, year, accountId]`. Stale time is usually 5 minutes.

### Category & Sub-category Selections

Always use `useGroupedCategories` hook and `CategorySelectContent` component for consistent dropdowns — they handle the Income/Feeder/Expense grouping and sorting.

Transactions store category/sub-category *names* (not IDs) for resilience.

### Missing Data Debugging

If data appears missing in the UI:
1. Check RLS policies join through `user_profiles`
2. Verify `user_id` in data table matches `id` in `user_profiles` (not auth UID)
3. Verify a default budget exists for the profile (many queries scope to a `budgetId`)

## Key Files

- `src/App.tsx` — routing and layout
- `src/integrations/supabase/client.ts` — Supabase client (env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- `src/integrations/supabase/types.ts` — auto-generated DB types
- `src/contexts/UnifiedAuthContext.tsx` — auth interface used by all components
- `src/hooks/useAnnualBudget.ts` — primary budget data hook
- `docs/FE_ARCHITECTURE.md` — architecture decisions and RLS patterns
