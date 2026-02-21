# Import Fix Implementation Plan

## Issues Identified

1. **Categorization not showing**: The `processTransaction` results are applied in `executeImport` but not in `generatePreview`
2. **No fuzzy matching**: Column mapping uses exact substring matching only
3. **Missing dropdown validation**: Account, Status, Category, Sub-category should be dropdowns with validation

## Implementation Steps

### Step 1: Add Fuzzy Matching for Column Mapping
- Install/use Levenshtein distance algorithm
- Match column headers to field names with similarity threshold
- Prioritize exact matches, then fuzzy matches

### Step 2: Apply Categorization in Preview
- Call `processTransaction` in `generatePreview` function
- Display suggested category/sub-category in preview table
- Show confidence indicators

### Step 3: Post-Import Review Screen
- Create new step (Step 3.5) between Preview and Import
- Show transactions with missing/invalid fields
- Provide dropdowns for:
  - Account (from settings.accounts)
  - Status (from APP_STATUSES)
  - Category (from settings.categories)
  - Sub-category (filtered by category, from settings.subCategories)
- Allow "Add New" for categories/sub-categories
- Allow "Mark for Triage" or "Exclude" options

### Step 4: Enhanced MappingCard
- Keep Date and Amount as-is (already working)
- For Account, Status, Category, Sub-category:
  - Show dropdown in mapping card
  - Display sample value with validation
  - Highlight unknown values

## Files to Modify

1. `/src/components/Transactions/UnifiedAddTransactionsDialog.tsx`
   - Add fuzzy matching function
   - Update `generatePreview` to call `processTransaction`
   - Add post-import review step
   
2. `/src/components/Transactions/MappingCard.tsx`
   - Add dropdown support for categorical fields
   - Add validation for known values

3. `/src/lib/importUtils.ts`
   - Add fuzzy string matching utility

## Ready to Implement

Waiting for user confirmation before proceeding with implementation.
