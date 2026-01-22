# Settings Refactor Summary

## Completed Changes

### 1. **Removed Global Allocations**
- ✅ Removed `sidAmount` and `specialAmount` from `AppSettings` interface
- ✅ Removed global allocation UI card from Settings page
- ✅ Category budgets now auto-calculate as sum of sub-category budgets (read-only)

### 2. **Hardcoded Status System**
- ✅ Created `APP_STATUSES` constant: `['Pending Triage', 'Pending Person/Event', 'Reconciled', 'Complete']`
- ✅ Removed status management UI from Settings
- ✅ Status field in transactions table is now a dropdown
- ✅ Auto-exclude logic: transactions with status 'Reconciled' are automatically excluded
- ✅ Auto-include logic: changing status from 'Reconciled' to anything else auto-includes the transaction

### 3. **Pending Person/Event Workflow**
- ✅ When selecting 'Pending Person/Event' status, user is prompted for name/event
- ✅ Stored as `"Pending: <name>"` in database
- ✅ Dropdown correctly displays these as 'Pending Person/Event' option

### 4. **Budget Balancing**
- ✅ Removed per-category "Overflow" dropdowns
- ✅ Added global "Budget Balancing" card
- ✅ Single sub-category selection for absorbing over/under spending across entire budget
- ✅ Default: Savings > Investments

### 5. **UI Refinements**
- ✅ Removed drag handles (GripVertical icons)
- ✅ Removed "Order" column header (column still exists for up/down arrows)
- ✅ Minimized Order column width
- ✅ Hidden chevron icon in sub-category move dropdown (using `[&>svg]:hidden`)
- ✅ Removed "Scan Suggestions" button and all related logic
- ✅ Moved Dark Mode to new "General" tab

### 6. **Settings Tab Structure**
New tab layout:
- **General**: Dark mode toggle
- **Budget Configuration**: Categories, sub-categories, budget balancing
- **Merchant Rules**: Auto-categorization rules with skip-triage option
- **System Lists**: Accounts, Budget Types (removed Status Labels)

### 7. **Import Defaults**
- ✅ Default status for imported transactions: `'Pending Triage'`

### 8. **Database Migration**
- ✅ Created migration: `20260117_add_skip_triage.sql`
- ✅ Updated Supabase types to include `skip_triage` field

## Remaining Items to Address

### Import Workflow Enhancement
**Issue**: Need to ensure import process forces choices for missing fields

**Required Behavior**:
- If sub-category is missing during import, user must:
  1. Update to existing sub-category (dropdown)
  2. Create new sub-category (input + add)
  3. Mark for triage (sets status to 'Pending Triage')
  4. Exclude transaction

**Current State**: Import uses defaults but doesn't force user interaction for missing fields

**Recommendation**: Update `MappingCard.tsx` or create new import validation step

### Triage Workflow Clarification

**How Triage Works**:
1. **Pending Triage**: Transaction needs review/categorization
2. **Pending Person/Event**: Awaiting reconciliation with specific person/event
3. **Complete**: Fully categorized and verified
4. **Reconciled**: Settled/resolved, auto-excluded from budget calculations

**Merchant Rules & Triage**:
- Merchant rules with `skip_triage: true` → status set to 'Complete'
- Merchant rules with `skip_triage: false` → status based on confidence:
  - Exact match (confidence 1.0) → 'Verified'
  - Partial match (confidence 0.8) → 'Unmatched'
  - No match → 'Unmatched'

### Display Balancing Sub-Category

**Pending**: Need to display the balancing sub-category in:
- Budget table view (visual indicator)
- Sankey chart view (special node/flow)

**Recommendation**: Add badge or icon next to the balancing sub-category in Settings and Budget views

## Technical Notes

### Files Modified
1. `/src/hooks/useSettings.ts` - Removed global allocations, added APP_STATUSES
2. `/src/pages/Settings.tsx` - Major UI refactor, new tab structure
3. `/src/components/Transactions/EditableCell.tsx` - Status dropdown with Pending X prompt
4. `/src/components/Transactions/hooks/useTransactionTable.ts` - Auto-exclude logic
5. `/src/integrations/supabase/types.ts` - Added skip_triage field
6. `/src/lib/importBrain.ts` - Respect skip_triage flag
7. `/supabase/migrations/20260117_add_skip_triage.sql` - Database schema update

### Breaking Changes
- `settings.statuses` no longer exists (use `APP_STATUSES` constant)
- `settings.sidAmount` and `settings.specialAmount` removed
- Category budgets are now calculated, not editable

### Migration Path
Existing localStorage data will auto-merge with new defaults. Old `sidAmount`, `specialAmount`, and `statuses` fields will be ignored.
