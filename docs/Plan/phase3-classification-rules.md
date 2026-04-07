# Phase 3: Unify Classification Rules

## Goal

Merge `merchant_rules` and `source_rules` into a single `classification_rules` table. Both tables do the same thing (auto-classify transactions on import) but use different matching strategies. Unifying them simplifies the schema, removes duplicated frontend logic, and makes the rules UI a single place to manage.

---

## Current State

### `merchant_rules` — matches on the cleaned merchant name
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| account_id | uuid | NOT NULL |
| user_id | uuid | NOT NULL |
| clean_merchant_name | text | the normalised match key |
| merchant_name | text | raw/display name |
| match_mode | text | 'exact' \| 'contains' \| 'starts_with' |
| auto_category | text | |
| auto_sub_category | text | |
| auto_budget | text | |
| skip_triage | boolean | |
| auto_verify | boolean | |
| auto_planned | boolean | |
| auto_recurring | text | |
| secondary_categories | text[] | |
| created_at / updated_at | timestamptz | |

### `source_rules` — matches on the raw source/bank description
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| account_id | uuid | NOT NULL |
| user_id | uuid | nullable (older rows) |
| source_name | text | raw bank description |
| clean_source_name | text | normalised match key |
| match_mode | text | |
| auto_category / auto_sub_category / auto_budget | text | |
| skip_triage / auto_planned / auto_recurring | bool/text | |
| secondary_categories | text[] | |
| created_at / updated_at | timestamptz | |

---

## Target Schema: `classification_rules`

```sql
CREATE TABLE public.classification_rules (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL,

  -- Discriminator
  match_type           TEXT NOT NULL CHECK (match_type IN ('merchant', 'source')),

  -- Matching keys (one pair used depending on match_type)
  raw_name             TEXT,            -- merchant_name  OR  source_name
  clean_name           TEXT NOT NULL,   -- clean_merchant_name  OR  clean_source_name
  match_mode           TEXT NOT NULL DEFAULT 'contains'
                         CHECK (match_mode IN ('exact', 'contains', 'starts_with')),

  -- Classification outputs (identical for both old tables)
  auto_category        TEXT,
  auto_sub_category    TEXT,
  auto_budget          TEXT,
  skip_triage          BOOLEAN NOT NULL DEFAULT FALSE,
  auto_verify          BOOLEAN NOT NULL DEFAULT FALSE,
  auto_planned         BOOLEAN NOT NULL DEFAULT FALSE,
  auto_recurring       TEXT,
  secondary_categories TEXT[],

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### RLS (CRITICAL — must follow the shared-account pattern)

```sql
ALTER TABLE public.classification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account members can manage classification_rules"
ON public.classification_rules
FOR ALL
USING (account_id = public.get_my_account_id())
WITH CHECK (account_id = public.get_my_account_id());
```

> **Never use `auth.uid()` directly.** Always use `public.get_my_account_id()` which resolves to `SELECT current_account_id FROM user_profiles WHERE user_id = auth.uid()`. This supports the shared-account model (Michael + Tanja share one account).

### Index

```sql
CREATE INDEX idx_classification_rules_account ON public.classification_rules(account_id);
CREATE INDEX idx_classification_rules_clean_name ON public.classification_rules(account_id, clean_name);
```

---

## Migration Steps

1. Create `classification_rules` table (above).
2. Backfill from `merchant_rules`:
   ```sql
   INSERT INTO classification_rules (id, account_id, user_id, match_type, raw_name, clean_name, match_mode, auto_category, auto_sub_category, auto_budget, skip_triage, auto_verify, auto_planned, auto_recurring, secondary_categories, created_at, updated_at)
   SELECT id, account_id, user_id, 'merchant', merchant_name, clean_merchant_name, COALESCE(match_mode,'contains'), auto_category, auto_sub_category, auto_budget, skip_triage, COALESCE(auto_verify,false), COALESCE(auto_planned,false), auto_recurring, secondary_categories, created_at, updated_at
   FROM merchant_rules;
   ```
3. Backfill from `source_rules`:
   ```sql
   INSERT INTO classification_rules (account_id, user_id, match_type, raw_name, clean_name, match_mode, auto_category, auto_sub_category, auto_budget, skip_triage, auto_verify, auto_planned, auto_recurring, secondary_categories, created_at, updated_at)
   SELECT account_id, COALESCE(user_id, (SELECT user_id FROM user_profiles WHERE current_account_id = source_rules.account_id LIMIT 1)), 'source', source_name, COALESCE(clean_source_name, source_name), COALESCE(match_mode,'contains'), auto_category, auto_sub_category, auto_budget, COALESCE(skip_triage,false), false, COALESCE(auto_planned,false), auto_recurring, secondary_categories, COALESCE(created_at,now()), COALESCE(updated_at,now())
   FROM source_rules;
   ```
4. Drop old tables (only after frontend is fully switched over).

---

## Frontend Changes

### TypeScript type (update `src/lib/importBrain.ts`)

Replace `SourceRule` with:

```typescript
export interface ClassificationRule {
  id: string;
  account_id: string;
  match_type: 'merchant' | 'source';
  raw_name?: string;
  clean_name: string;
  match_mode: 'exact' | 'contains' | 'starts_with';
  auto_category?: string;
  auto_sub_category?: string;
  auto_budget?: string;
  skip_triage: boolean;
  auto_verify: boolean;
  auto_planned: boolean;
  auto_recurring?: string;
  secondary_categories?: string[];
}
```

### Files that reference `merchant_rules` or `source_rules` (all need updating)

| File | What to change |
|---|---|
| `src/lib/importBrain.ts` | Replace `SourceRule` type; update `applySourceRules()` to query `classification_rules` filtered by both `match_type`s |
| `src/lib/sourceRulesCache.ts` | Update `RULES_CACHE_KEY` to `'classification_rules_cache_v1'`; update type reference |
| `src/components/Transactions/hooks/useTransactionTable.ts` | Update query from `source_rules` + `merchant_rules` to `classification_rules`; update invalidation key `['source-rules-simple']` → `['classification-rules']` |
| `src/components/Transactions/hooks/useTransactionImport.ts` | Same — fetch from `classification_rules` |
| `src/components/Settings/SourceManager.tsx` | Update CRUD operations to target `classification_rules`; show/filter by `match_type` |
| `src/components/Transactions/SourceResolveDialog.tsx` | Update insert/update to `classification_rules` |
| `src/components/Transactions/SourceApplyDialog.tsx` | Same |
| `src/components/Transactions/SourceNameSelector.tsx` | Update query target |
| `src/components/Transactions/EditableCell.tsx` | Update rule lookup |
| `src/components/Transactions/ValidationDashboard.tsx` | Update any direct queries |
| `src/components/Projection/SuggestProjectionsWizard.tsx` | Update rule lookups |
| `src/lib/driveExport.ts` | Update export logic |
| `src/integrations/supabase/types.ts` | Regenerate or manually add `classification_rules` type |

### Query pattern to use everywhere

```typescript
const { data: rules } = await supabase
  .from('classification_rules')
  .select('*')
  .eq('account_id', currentAccountId);
```

---

## Validation Checklist (for Claude to verify after Gemini builds)

- [ ] Migration ran cleanly; row counts in `classification_rules` = sum of old tables
- [ ] RLS policy uses `get_my_account_id()` not `auth.uid()`
- [ ] Import flow correctly applies rules from the unified table
- [ ] SourceManager CRUD creates/updates/deletes `classification_rules` rows
- [ ] `match_type` shown in the UI so users can distinguish merchant vs source rules
- [ ] Old tables (`merchant_rules`, `source_rules`) are dropped in a follow-on migration
- [ ] No TypeScript errors (`npm run build` clean)
- [ ] Demo account reset seeds include `classification_rules` rows (update `demo_seed_*` tables)
