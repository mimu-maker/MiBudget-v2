# Pending Action Buckets & Reconciliation — DB Reference

> For Chat Claude instances querying the Supabase DB directly.  
> The UI computes bucket membership dynamically from field values — **not** from the `status` column.

---

## Part 1 — Pending Action Buckets

### The Core Misconception

The four UI buckets (Source Mapping, Categorisation, Validation, Complete) are **not stored as status values**.  
The DB `status` column only ever holds these values (from `APP_STATUSES`):

```
'Pending Triage' | 'Pending Reconciliation' | 'Reconciled' | 'Complete' | 'Excluded'
```

Any DB row with a status **not in that list** (e.g. a legacy `'Pending Categorisation'`) is coerced to `'Pending Triage'` at app read time:

```typescript
// useTransactionTable.ts ~line 862
let status = t.status || 'Pending Triage';
if (!APP_STATUSES.includes(status)) status = 'Pending Triage';
```

The sub-buckets are computed entirely from `confidence`, `category`, and `sub_category`.

---

### isSettled — the common gate

Defined in `src/lib/transactionConstants.ts`:

```typescript
export const SETTLED_STATUSES = ['Complete', 'Excluded', 'Pending Reconciliation', 'Reconciled'];

export const isSettled = (tx, duplicateIds?) =>
  SETTLED_STATUSES.includes(tx.status) || (duplicateIds?.has(tx.id) ?? false);
```

A transaction is **settled** (hidden from all pending buckets) if:
- `status IN ('Complete', 'Excluded', 'Pending Reconciliation', 'Reconciled')`
- OR it is part of a duplicate group (see Duplicates below)

---

### Duplicate Detection

Computed in-memory before bucket assignment. A transaction is a duplicate if another transaction exists with the same `(date, amount, lower(source))`.

```sql
-- Duplicate group key: date + amount + lower(source)
-- All members of any group where count > 1 are excluded from pending buckets
WITH dup_keys AS (
  SELECT date, amount, lower(coalesce(source, '')) AS src
  FROM transactions
  WHERE account_id = '<account_id>'
  GROUP BY date, amount, lower(coalesce(source, ''))
  HAVING count(*) > 1
)
```

---

### Bucket 1 — Pending Source Mapping

**UI label:** "Pending Source Mapping"  
**Condition:** `confidence` is null or ≤ 0, and not settled, and not a duplicate.

```typescript
transactions.filter(tx =>
  (!tx.confidence || tx.confidence <= 0) && !isSettled(tx, duplicateIds)
)
```

**SQL equivalent:**

```sql
WITH dup_keys AS (
  SELECT date, amount, lower(coalesce(source, '')) AS src
  FROM transactions
  WHERE account_id = '<account_id>'
  GROUP BY date, amount, lower(coalesce(source, ''))
  HAVING count(*) > 1
)
SELECT t.*
FROM transactions t
WHERE t.account_id = '<account_id>'
  AND (t.confidence IS NULL OR t.confidence <= 0)
  AND t.status NOT IN ('Complete', 'Excluded', 'Pending Reconciliation', 'Reconciled')
  AND NOT EXISTS (
    SELECT 1 FROM dup_keys d
    WHERE d.date = t.date
      AND d.amount = t.amount
      AND d.src = lower(coalesce(t.source, ''))
  );
```

---

### Bucket 2 — Pending Categorisation

**UI label:** "Pending Categorisation"  
**Condition:** `confidence > 0`, AND (`category` is null/empty OR `sub_category` is null/empty), and not settled, and not a duplicate.

```typescript
transactions.filter(tx =>
  tx.confidence > 0 &&
  (!tx.category || !tx.sub_category) &&
  !isSettled(tx, duplicateIds)
)
```

**SQL equivalent:**

```sql
WITH dup_keys AS (
  SELECT date, amount, lower(coalesce(source, '')) AS src
  FROM transactions
  WHERE account_id = '<account_id>'
  GROUP BY date, amount, lower(coalesce(source, ''))
  HAVING count(*) > 1
)
SELECT t.*
FROM transactions t
WHERE t.account_id = '<account_id>'
  AND t.confidence > 0
  AND (t.category IS NULL OR t.category = '' OR t.sub_category IS NULL OR t.sub_category = '')
  AND t.status NOT IN ('Complete', 'Excluded', 'Pending Reconciliation', 'Reconciled')
  AND NOT EXISTS (
    SELECT 1 FROM dup_keys d
    WHERE d.date = t.date
      AND d.amount = t.amount
      AND d.src = lower(coalesce(t.source, ''))
  );
```

> This bucket explains the mismatch: DB `status = 'Pending Triage'` is the actual stored value for these rows.  
> The 154 shown in the UI are `Pending Triage` rows with `confidence > 0` and missing category/sub_category.

---

### Bucket 3 — Pending Validation

**UI label:** "Pending Validation"  
**Condition:** `confidence > 0`, AND `category` is set, AND `sub_category` is set, and not settled, and not a duplicate.

```typescript
transactions.filter(tx =>
  tx.confidence > 0 &&
  tx.category &&
  tx.sub_category &&
  !isSettled(tx, duplicateIds)
)
```

**SQL equivalent:**

```sql
WITH dup_keys AS (
  SELECT date, amount, lower(coalesce(source, '')) AS src
  FROM transactions
  WHERE account_id = '<account_id>'
  GROUP BY date, amount, lower(coalesce(source, ''))
  HAVING count(*) > 1
)
SELECT t.*
FROM transactions t
WHERE t.account_id = '<account_id>'
  AND t.confidence > 0
  AND t.category IS NOT NULL AND t.category <> ''
  AND t.sub_category IS NOT NULL AND t.sub_category <> ''
  AND t.status NOT IN ('Complete', 'Excluded', 'Pending Reconciliation', 'Reconciled')
  AND NOT EXISTS (
    SELECT 1 FROM dup_keys d
    WHERE d.date = t.date
      AND d.amount = t.amount
      AND d.src = lower(coalesce(t.source, ''))
  );
```

> The 211 shown vs 52 DB rows with `status = 'Pending Validation'`: the extra 159 are `Pending Triage` rows  
> that have `confidence > 0`, `category`, and `sub_category` all set. The DB `status` hasn't been advanced yet.

---

### Bucket 4 — Completed (Audit Log)

**Condition:** `status = 'Complete'` and not a duplicate.

```sql
SELECT * FROM transactions
WHERE account_id = '<account_id>'
  AND status = 'Complete'
  AND NOT EXISTS (
    SELECT 1 FROM dup_keys d
    WHERE d.date = t.date AND d.amount = t.amount AND d.src = lower(coalesce(t.source, ''))
  );
```

---

### Summary Table

| UI Bucket | DB `status` values present | Key discriminator |
|---|---|---|
| Pending Source Mapping | `Pending Triage` (and any unknown → coerced) | `confidence IS NULL OR confidence <= 0` |
| Pending Categorisation | `Pending Triage` | `confidence > 0` AND missing `category` or `sub_category` |
| Pending Validation | `Pending Triage` (and legacy `Pending Validation`) | `confidence > 0` AND both `category` + `sub_category` set |
| Excluded | `Excluded` | `status = 'Excluded'` (or `excluded = true`) |
| Complete / Audit Log | `Complete` | `status = 'Complete'` |

---

### `is_resolved` (computed, not a DB column)

The app derives `is_resolved` at query time:

```typescript
is_resolved: !!(t.clean_source && t.clean_source.trim() !== '')
```

**Not a stored column.** It equals `true` when `clean_source` (or `clean_merchant`) is non-empty.  
It does NOT affect bucket placement — only `confidence` does.

---

## Part 2 — Reconciliation

### Fields Involved

| Field | Type | Role |
|---|---|---|
| `status` | `text` | `'Pending Reconciliation'` = flagged; `'Reconciled'` = done |
| `excluded` | `boolean` | Set to `true` when `status = 'Reconciled'` |
| `budget` | `text` | Set to `'Exclude'` when `status = 'Reconciled'` |
| `entity` | `text \| null` | Optional — links transaction to a reconciliation entity; its presence alone triggers membership in the reconciliation view |

---

### Status Flow

```
Any pending bucket
  → (user flags) → status = 'Pending Reconciliation'   [excluded = false, visible in recon view]
  → (reconciled)  → status = 'Reconciled'              [excluded = true, budget = 'Exclude', hidden everywhere]
```

`Pending Reconciliation` is in `SETTLED_STATUSES`, so it is **hidden from all three pending buckets**.  
`Reconciled` is also settled and additionally sets `excluded = true`.

---

### What Triggers Reconciliation View Membership

`useValidationStats.ts` defines `pendingReconciliationItems` as:

```typescript
transactions.filter(t => {
  const status = t.status || '';
  const isPending =
    status === 'Pending Reconciliation' ||
    status.startsWith('Pending: ') ||
    (status.startsWith('Pending ') &&
      !['Pending Triage', 'Pending Categorisation', 'Pending Mapping', 'Pending Validation'].includes(status)) ||
    !!t.entity;
  return isPending && !t.excluded && status !== 'Reconciled';
});
```

A transaction appears in the Reconciliation view if **any** of these are true:
1. `status = 'Pending Reconciliation'`
2. `status LIKE 'Pending: %'` (e.g. legacy `'Pending: Invoice'`)
3. `status LIKE 'Pending %'` AND status is not one of the four known pending statuses
4. `entity IS NOT NULL` (regardless of status)

**AND** `excluded = false` AND `status != 'Reconciled'`.

---

### What "Reconciling" a Transaction Does

When `status` is set to `'Reconciled'` (in `useTransactionTable.ts`):

```typescript
if (updates.status === 'Reconciled') {
  dbUpdates.excluded = true;
  dbUpdates.budget = 'Exclude';
}
```

Three fields change atomically:
- `status` → `'Reconciled'`
- `excluded` → `true`
- `budget` → `'Exclude'`

When `status` is set to `'Pending Reconciliation'` (moving to pending):

```typescript
} else if (value === 'Pending Reconciliation' || value.startsWith('Pending')) {
  updates.excluded = false;
  if (!updates.budget || updates.budget === 'Exclude') updates.budget = 'Primary';
}
```

- `excluded` → `false`
- `budget` → `'Primary'` (unless already set to something non-Exclude)

---

### SQL — Open Reconciliation Items (strict)

Matches `status = 'Pending Reconciliation'` only:

```sql
SELECT *
FROM transactions
WHERE account_id = '<account_id>'
  AND status = 'Pending Reconciliation'
  AND (excluded IS NULL OR excluded = false);
```

---

### SQL — All Reconciliation View Items (matches app logic exactly)

```sql
SELECT *
FROM transactions
WHERE account_id = '<account_id>'
  AND (
    status = 'Pending Reconciliation'
    OR status LIKE 'Pending: %'
    OR (
      status LIKE 'Pending %'
      AND status NOT IN ('Pending Triage', 'Pending Categorisation', 'Pending Mapping', 'Pending Validation')
    )
    OR entity IS NOT NULL
  )
  AND (excluded IS NULL OR excluded = false)
  AND status <> 'Reconciled';
```

---

### SQL — Fully Reconciled (closed items)

```sql
SELECT *
FROM transactions
WHERE account_id = '<account_id>'
  AND status = 'Reconciled';
-- These will also have excluded = true and budget = 'Exclude'
```

---

## Quick Reference: Why DB Status Counts Don't Match UI Counts

| What Chat queries | What UI shows | Why they differ |
|---|---|---|
| `status = 'Pending Categorisation'` → 0 rows | 154 Pending Categorisation | This status doesn't exist. The bucket is computed from `confidence > 0 AND missing cat/subcat`, all stored as `Pending Triage` |
| `status = 'Pending Validation'` → 52 rows | 211 Pending Validation | 52 rows have the legacy status; 159 more are `Pending Triage` with `confidence > 0` + full cat/subcat |
| `status = 'Pending Triage'` → 313 rows | Split across all 3 buckets | All three non-settled pending buckets draw from this pool |

**Bottom line:** To reproduce UI counts, filter on `confidence` + `category` + `sub_category`, not on `status`.
