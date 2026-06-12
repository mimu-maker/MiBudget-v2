# Split Transaction Feature — Full Context

> For Chat Claude instances. Covers the full split flow: DB model, modal behaviour, save logic, status assignment, and visual rendering.

---

## What Split Is

Split ("Itemize Transaction") breaks a single transaction into N child line items — each with its own name, amount, category, and status. Common use case: a large grocery or superstore receipt where different parts belong to different budget categories, or where part of the spend should be excluded or flagged for reconciliation.

---

## Entry Point

Triggered from the row context menu → **"Split Transaction"**.
Only available on rows **without** a `parent_id`. Children (already-split items) cannot be split again.

- `src/components/Transactions/TransactionsTable.tsx` — owns `splitModalOpen` / `transactionToSplit` state, wires `handleSplit` callback to each row
- `src/components/Transactions/TransactionSplitModal.tsx` — the full split dialog
- `src/components/Transactions/TransactionsTableRow.tsx` — renders the context menu item; hides it when `transaction.parent_id` is set

---

## DB Fields

| Field      | Type           | Role |
|------------|----------------|------|
| `is_split` | `boolean\|null` | `true` on the **parent** row — marks it as a split header |
| `parent_id` | `uuid\|null`  | Set on **child** rows — self-referential FK to `transactions.id` |

No separate table. Parent and children all live in `transactions`. The `parent_id` FK is a self-join on the same table (`transactions_parent_id_fkey`).

---

## What the Modal Does

`TransactionSplitModal` lets the user build N split items before committing.

Each split item has:

- **name** — defaults to parent's `source`; editable (stored as `merchant`, `clean_merchant`, `clean_source`)
- **amount** — editable number; must sum to exactly the parent's amount (balanced gate, ±0.01 tolerance)
- **category** + **sub_category** — full category/sub-category pickers
- **excluded** toggle (EyeOff icon) — marks item as Excluded
- **pending_recon** toggle (History icon) — marks item as Pending Reconciliation (mutually exclusive with excluded)

The footer shows **Original Total / Allocated / Remaining** in real time. Save is disabled until remaining = 0.

---

## Save Logic (`handleSave`)

Two direct Supabase calls — does **not** go through the `bulkUpdate` hook.

### Step 1 — Insert children

```typescript
supabase.from('transactions').insert(
  items.map(item => ({
    user_id: transaction.user_id,
    date: transaction.date,
    merchant: item.name,
    clean_merchant: item.name,
    clean_source: item.name,
    amount: item.amount,
    account: transaction.account,
    status: item.excluded
      ? 'Excluded'
      : item.pending_recon
        ? 'Pending Reconciliation'
        : (item.category && item.sub_category ? 'Complete' : 'Pending Triage'),
    excluded: !!item.excluded,
    category: item.category,
    sub_category: item.sub_category,
    budget_month: transaction.budget_month,
    budget_year: transaction.budget_year,
    parent_id: transaction.id,
    notes: `Split item from ${transaction.source}`
  }))
)
```

### Step 2 — Update parent

```typescript
supabase.from('transactions')
  .update({
    is_split: true,
    status: 'Complete',   // Auto-completed — exits all pending buckets
    budget: 'Exclude',    // Excluded from budget to avoid double-counting
    category: null,       // Category cleared — children carry the budget impact
    sub_category: null
  })
  .eq('id', transaction.id)
```

### Cache invalidation

```typescript
queryClient.invalidateQueries({ queryKey: ['transactions-infinite'] });
queryClient.invalidateQueries({ queryKey: ['transactions-all'] });
```

Invalidating `['transactions']` alone does nothing — must use the exact key prefixes above.

---

## Auto-Status Logic for Children

| Item flags | Resulting `status` |
|---|---|
| `excluded = true` | `'Excluded'` |
| `pending_recon = true` | `'Pending Reconciliation'` |
| category + sub_category both set | `'Complete'` |
| category or sub_category missing | `'Pending Triage'` |

Children with `Pending Triage` status enter the normal Pending Action workflow (Source Mapping → Categorisation → Validation) just like any other transaction.

---

## Visual Indicators in the Transaction Table

| Condition | Visual |
|---|---|
| `is_split = true` (parent) | Blue-tinted row (`bg-blue-50/10`) + **"SPLIT"** blue badge next to source name |
| `parent_id` set (child) | Amber-tinted row (`bg-amber-50/20`) + amber connector line (`w-6 h-px bg-amber-200`) + **"SPLIT FROM {parent name}"** badge |

Parent name on the child badge is resolved by looking up `parent_id` in the loaded transaction list, falling back to `notes.replace('Split item from ', '')` if the parent row isn't in the current window.

---

## Legacy `splitTransaction` in `useTransactionTable.ts`

There is an older two-way split function still exported from the hook (line ~1140):

```typescript
splitTransaction: async (id: string, amount1: number) => {
  // Updates original row to amount1, is_split: true
  // Inserts a second row with amount2 = original - amount1, parent_id set
}
```

This is **not used by the current UI**. The modal (`TransactionSplitModal`) replaced it. Do not use this path for new work.

---

## Key Constraints

- A child row (`parent_id` set) cannot be split further — the context menu item is hidden.
- The parent row is budget-excluded (`budget = 'Exclude'`) after splitting. All budget impact moves to the children.
- The parent's category and sub_category are cleared on split — only children carry classification.
- Split children inherit `date`, `account`, `budget_month`, `budget_year` from the parent.
- `notes` on children is auto-set to `"Split item from {source}"` — used as a fallback parent name display.
