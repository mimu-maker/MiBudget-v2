# Projection Page Updates

## Summary
Updated the Projection page to split Future Transactions into separate Income and Expense sections with improved UX for adding and importing transactions.

## Changes Made

### 1. New Components Created

#### `IncomeTransactionsTable.tsx`
- Displays income transactions (amount >= 0) in a dedicated table
- Shows month instead of specific date
- Includes "+" button and "Paste Data" button in the header
- Green color for positive amounts

#### `ExpenseTransactionsTable.tsx`
- Displays expense transactions (amount < 0) in a dedicated table
- Shows month instead of specific date
- Includes "+" button and "Paste Data" button in the header
- Red color for negative amounts (shown as absolute value)

#### `AddTransactionFormV2.tsx`
- Replaced date picker with month selector (shows next 24 months)
- Merchant field is now a dropdown with existing merchants
- Option to add new merchant via "+ Add New Merchant"
- Automatically sets correct sign for amount based on transaction type (income/expense)
- Fetches merchants from database using new `useMerchants` hook

#### `PasteDataDialog.tsx`
- Split-screen dialog (left: paste area, right: preview)
- Accepts tab-separated data with columns: Month, Merchant, Amount, Account (optional), Description (optional)
- Parses and previews data before import
- Validates and shows errors
- Automatically applies correct sign based on transaction type

### 2. New Hook

#### `useMerchants.ts`
- Fetches unique merchants from transactions table
- Returns sorted list of clean_merchant names (falls back to merchant if clean_merchant is null)
- Used in merchant dropdown for transaction form

### 3. Updated Main Page

#### `Projection.tsx`
- Removed single "Add Future Transaction" button
- Split transactions into income and expense arrays
- Each section has its own "+" button and "Paste Data" button
- Form adapts based on which section's "+" was clicked
- Paste dialog adapts based on which section's "Paste Data" was clicked

## UI/UX Improvements

1. **Simplified Add Button**: Simple "+" icon button instead of long text button
2. **Month Display**: Shows "Jan 2026" format instead of full date
3. **Month Selector**: Dropdown with readable month names instead of date picker
4. **Merchant Dropdown**: Reuses existing merchants for consistency
5. **Bulk Import**: Easy paste from spreadsheet with live preview
6. **Split Sections**: Clear separation between income and expenses

## Data Format for Paste

Users can paste tab-separated data like:
```
Jan 2026	Salary	50000	Master	Monthly salary
Feb 2026	Salary	50000	Master	Monthly salary
Jan 2026	Rent	-15000	Joint	Monthly rent
```

The parser handles:
- Month formats: "Jan 2026" or "2026-01"
- Automatic sign correction based on transaction type
- Optional columns (Account defaults to "Master", Description to empty)
- Error validation with helpful messages
