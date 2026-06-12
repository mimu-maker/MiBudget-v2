# MiBudget — Quick Reference for Chat Sessions

## Start Here
This is a private household budget app. Before doing anything:
1. Read `01_PROJECT_OVERVIEW.md` for stack + auth model
2. Read `03_DATABASE_REFERENCE.md` for DB layout + live account IDs
3. **Never write to production account** `92325837-1cf0-4157-82c6-82a233389b1a`

## Most Common Things You'll Need

### Auth context (use everywhere)
```ts
import { useAuth } from '@/contexts/UnifiedAuthContext';
const { userProfile, currentAccountId } = useAuth();
// userProfile.id = profile UUID (this is what transactions.user_id references)
// currentAccountId = account UUID (use this for account-scoped queries)
```

### Scoping a Supabase query
```ts
let query = supabase.from('transactions').select('*');
if (currentAccountId) {
  query = query.eq('account_id', currentAccountId);
} else {
  query = query.eq('user_id', userProfile.id);
}
```

### TanStack Query key pattern
```ts
queryKey: ['resource-name', currentAccountId]
enabled: !!currentAccountId
staleTime: 1000 * 60 * 5  // 5 min standard
```

### Invalidating transactions after a mutation
```ts
queryClient.invalidateQueries({ queryKey: ['transactions-infinite'] });
queryClient.invalidateQueries({ queryKey: ['transactions-all'] });
// ['transactions'] alone does NOTHING
```

### Checking if a transaction is settled
```ts
import { isSettled, SETTLED_STATUSES } from '@/lib/transactionConstants';
// Never redefine locally
```

### Category dropdowns
```ts
import { useGroupedCategories } from '@/hooks/useBudgetCategories';
import { CategorySelectContent } from '@/components/...';
// Always use these — never build category lists manually
// 'Special' group (Slush Fund) must remain visible
// Only 'General' is filtered out
```

## DB Column Name Confusion
| In DB | In App code |
|---|---|
| `merchant` | `source` |
| `clean_merchant` | `clean_source` |
| `merchant_description` | `source_description` |
Mutations write both for compatibility. Reads map the old names to the new names.

## Status Values (exact strings)
```
'Pending Triage'
'Pending Categorisation'  (note: British spelling)
'Pending Validation'
'Pending Reconciliation'
'Complete'
'Reconciled'
'Excluded'
```

## Classification Rules
- Match modes: `'exact'` | `'contains'` only. Guard: `=== 'fuzzy' ? 'contains'`
- Upsert conflict target: `(account_id, raw_name)`
- `is_resolved = !!clean_source` — NOT `knownSources.has(clean_source)`

## Files Most Likely to Edit
| Task | File |
|---|---|
| Transaction data/mutations | `src/components/Transactions/hooks/useTransactionTable.ts` |
| Pending validation UI | `src/components/Transactions/ValidationDashboard.tsx` |
| Source rule management | `src/components/Settings/SourceManager.tsx` |
| Sidebar badge counts | `src/hooks/useValidationStats.ts` |
| Category dropdowns | `src/hooks/useBudgetCategories.ts` |
| Auth gating | `src/lib/authUtils.ts` |
| Shared status constants | `src/lib/transactionConstants.ts` |
| Budget data | `src/hooks/useAnnualBudget.ts` |
| App routing | `src/App.tsx` |

## Git Workflow
```bash
git checkout Claude_0.2          # or Claude_0.3 for new session
# make changes
git add <specific files>
git commit -m "..."
git push origin Claude_0.2
gh pr create ...
gh pr merge <n> --merge --delete-branch
git checkout main && git pull
```
Never `git add .` — always add specific files to avoid committing .env or secrets.

## Running Locally
```bash
npm run dev       # http://localhost:8080
npm run build     # production build
npm run lint      # ESLint check
npm run test      # Vitest
```

## Known Gotchas
1. `transactions.user_id` = `user_profiles.id`, NOT `auth.uid()` — wrong one breaks RLS
2. Query keys must include `currentAccountId` or cache is shared across accounts
3. `['transactions']` invalidation key matches nothing — always use full key
4. `Special` category group = Slush Fund — must NOT be filtered from dropdowns
5. Month filter without a year filter defaults to current year (intentional fallback)
6. `confidence = 0` = unmapped; `confidence > 0` = categorised (not a percentage)
7. Supabase RLS: `get_my_account_id()` returns `user_profiles.current_account_id`
8. Both Michael and Tanja's profiles point to the same account — shared household model
