# MiBudget — Transactions Architecture

## Core Hook: `useTransactionTable`
`src/components/Transactions/hooks/useTransactionTable.ts`

The central hook. Returns everything the transactions UI needs. Has two modes:

```ts
useTransactionTable({ mode: 'infinite' })  // Default — paginated, server-side sort/filter
useTransactionTable({ mode: 'all' })       // Full dataset — used for analytics/validation
```

### Sub-hooks inside the file
- `useAllTransactions()` — fetches ALL transactions (no pagination). Exported for use in ValidationDashboard, sidebar badges etc. Query key: `['transactions-all', currentAccountId]`
- `useInfiniteTransactions()` — paginated (50/page). Query key: `['transactions-infinite', sortBy, sortOrder, filters, currentAccountId]`
- `useTransactionCounts()` — total + filtered count + sum for table header. Uses `applyTransactionFilters()` shared helper.
- `applyTransactionFilters(query, filters)` — shared filter builder (extracted). Handles date range, amount operators, status array, ilike, boolean. Month filter uses active year filter if set.

### Transaction Interface
```ts
interface Transaction {
  id: string;
  user_id: string;          // = user_profiles.id (NOT auth.uid())
  date: string;             // ISO date
  source: string;           // App-side name (maps from DB: merchant)
  clean_source?: string;    // Mapped/resolved name (maps from DB: clean_merchant)
  amount: number;
  account: string;          // Bank account name
  status: string;           // See Status Flow below
  category: string | null;
  sub_category: string | null;
  budget_month?: string;    // 'yyyy-MM-01'
  budget_year?: number;
  confidence?: number;      // 0 = unmapped, >0 = categorised
  is_resolved?: boolean;    // Computed: !!clean_source
  is_split?: boolean;       // True on the parent transaction
  parent_id?: string | null; // Set on child split items
  entity?: string | null;   // Person name for reconciliation items
  excluded?: boolean;
  notes?: string | null;
}
```

### DB Column Mapping (important!)
DB uses `merchant` / `clean_merchant` / `merchant_description`.
App layer maps these to `source` / `clean_source` / `source_description` on read.
Mutations write both old and new column names for compatibility.

## Status Flow
```
Pending Triage → (source mapped) → Pending Categorisation
               → (category set)  → Pending Validation
               → (validated)     → Complete
                                 → Excluded
Pending Reconciliation → Reconciled
```

**Settled statuses** (defined in `src/lib/transactionConstants.ts`):
```ts
export const SETTLED_STATUSES = ['Complete', 'Excluded', 'Pending Reconciliation', 'Reconciled'];
export const isSettled = (tx, duplicateIds?) => SETTLED_STATUSES.includes(tx.status) || duplicateIds?.has(tx.id);
```
These are hidden from all Pending views. Import `isSettled` from `transactionConstants` — never redefine locally.

## Source Resolution (`is_resolved`)
- `is_resolved = !!clean_source` — transaction has a mapped name, regardless of whether a classification rule exists
- `knownSources` (Set) = sources that have a classification rule. Used only to decide whether to show Apply vs Resolve dialog on inline edit
- Do NOT conflate `is_resolved` with `knownSources.has(...)` — they are different things

## Key Transaction Components
```
TransactionsTable.tsx          # Main table shell, filter bar, infinite scroll
TransactionsTableHeader.tsx    # Column headers with sort + filter popovers
TransactionsTableRow.tsx       # Single row (memo + forwardRef for virtualizer)
EditableCell.tsx               # Inline status editor (entity/reconciliation aware)
ValidationDashboard.tsx        # Pending Action hub — 3 buckets + duplicate finder
SourceResolveDialog.tsx        # "Create new source rule" wizard
SourceApplyDialog.tsx          # "Apply existing source rule to this transaction"
SourceNameSelector.tsx         # Combobox for source names (all clean_source values + rules)
SourceMappingRefiner.tsx       # Inline rule editor in ValidationDashboard
TransactionDetailDialog.tsx    # Full edit drawer for a transaction
TransactionSplitModal.tsx      # Split a transaction into multiple items
BulkActionBar.tsx              # Bulk edit/delete toolbar
```

## ValidationDashboard Buckets
Defined in `ValidationDashboard.tsx`, mirrored in `useValidationStats.ts` (sidebar badges):
```ts
pendingSourceMapping   = confidence <= 0 && !isSettled(tx)           // No source mapped
pendingCategorisation  = confidence > 0 && (!category || !sub_cat) && !isSettled(tx)
pendingValidation      = confidence > 0 && category && sub_cat && !isSettled(tx)
```
Both files import `isSettled` from `transactionConstants`. Keep them in sync.

## Classification Rules
Table: `classification_rules`
- `raw_name` — raw bank string pattern
- `clean_name` — display name
- `match_mode` — `'exact'` | `'contains'` (fuzzy removed)
- `account_id` — scoped to account
- Unique constraint: `(account_id, raw_name)`
- Migration guard: `=== 'fuzzy' ? 'contains'` wherever match_mode is read

## Split Transactions
- Parent gets `is_split: true`, amount reduced to `amount1`
- Child gets `parent_id: parent.id`, `is_split: false`, amount = remainder
- Both tracked via `splitTransaction()` in `useTransactionTable`
- UI: amber tint on child rows, "SPLIT FROM X" badge

## Reconciliation
- Status `Pending Reconciliation` or `entity` field set → treated as recon item
- Recon items: category/sub-category columns show `-`, status shows `Reconciled` if Complete
- `isReconItem = status === 'Pending Reconciliation' || status === 'Reconciled' || !!entity`

## Query Invalidation (Critical)
After any mutation, invalidate with exact keys:
```ts
queryClient.invalidateQueries({ queryKey: ['transactions-infinite'] });
queryClient.invalidateQueries({ queryKey: ['transactions-all'] });
// Also if counts matter:
queryClient.invalidateQueries({ queryKey: ['transactions-counts'] });
```
`['transactions']` alone does NOT match either key — never use it.

## Account Scoping Pattern
```ts
// Correct
let query = supabase.from('transactions').select('*');
if (currentAccountId) {
  query = query.eq('account_id', currentAccountId);
} else {
  query = query.eq('user_id', userId); // Legacy fallback
}
// Mutations: only add user_id filter when no accountId
if (!currentAccountId) query = query.eq('user_id', userId);
// RLS handles it when accountId is present
```
