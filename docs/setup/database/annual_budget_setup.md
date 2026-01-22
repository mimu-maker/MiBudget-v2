# Annual Budget Configuration Setup

This document explains the annual budget configuration system that supports per-year budget management with sub-category visibility control.

## Overview

The annual budget system allows you to:
- Create budgets for specific years
- Maintain consistent categories across all years
- Control sub-category visibility per year
- Automatically activate sub-categories when used in transactions
- Carry forward sub-categories from previous years

## Database Schema Changes

### 1. Enhanced `budgets` Table
```sql
ALTER TABLE public.budgets 
ADD COLUMN IF NOT EXISTS year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);
```

- **year**: Explicit year for the budget (e.g., 2025, 2026)
- **Unique constraint**: Now includes `user_id`, `name`, `budget_type`, and `year`

### 2. Enhanced `transactions` Table
```sql
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS budget_year INTEGER;
```

- **budget_year**: Auto-populated from transaction date, but can be manually overridden
- **Index**: Added for performance on budget_year queries

### 3. New `budget_sub_categories` Table
```sql
CREATE TABLE IF NOT EXISTS public.budget_sub_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
    sub_category_id UUID REFERENCES public.sub_categories(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    first_used_date DATE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(budget_id, sub_category_id)
);
```

- **budget_id**: Links to specific annual budget
- **sub_category_id**: Links to sub-category
- **is_active**: Controls visibility in budget views for that year
- **first_used_date**: Tracks when sub-category was first used in that year

## Key Features

### 1. Automatic Budget Year Detection
- Transactions automatically get `budget_year` from their date
- Manual override allowed for special cases
- Trigger: `set_transaction_budget_year_trigger`

### 2. Sub-category Auto-activation
- When a transaction uses a sub-category, it becomes active for that year
- First usage date is tracked
- Trigger: `activate_sub_category_trigger`

### 3. Year-over-year Carry Forward
- Function: `carry_forward_sub_categories(p_budget_id)`
- Automatically carries active sub-categories from previous year
- Can be called when creating new annual budget

### 4. Active Sub-categories Query
- Function: `get_active_sub_categories(p_budget_id)`
- Returns all sub-categories with their active status for a specific budget
- Includes categories that haven't been used yet (is_active = FALSE)

## Usage Examples

### Creating a 2025 Budget
```sql
-- Create the budget
INSERT INTO public.budgets (user_id, name, year, budget_type, start_date)
VALUES (user_uuid, 'Primary 2025', 2025, 'primary', '2025-01-01');

-- Carry forward sub-categories from 2024
SELECT carry_forward_sub_categories(budget_id);
```

### Getting Active Sub-categories for 2025
```sql
SELECT * FROM get_active_sub_categories(budget_id_2025);
```

### Manually Activating/Deactivating Sub-categories
```sql
-- Deactivate Tesla sub-category for 2026
UPDATE public.budget_sub_categories 
SET is_active = FALSE 
WHERE budget_id = budget_2026_id 
AND sub_category_id = tesla_sub_category_id;
```

## RLS Policies

All new tables have proper Row Level Security policies:
- Users can only see their own budget data
- Admin functions use SECURITY DEFINER for cross-table operations
- Sub-category activation works automatically for authenticated users

## Performance Indexes

- `idx_transactions_budget_year` on transactions(budget_year)
- `idx_budget_sub_categories_budget_id` on budget_sub_categories(budget_id)
- `idx_budget_sub_categories_sub_category_id` on budget_sub_categories(sub_category_id)
- `idx_budget_sub_categories_is_active` on budget_sub_categories(is_active)

## Migration Script

Run the migration script to update your database:
```sql
-- File: supabase/migrations/20260121_add_annual_budget_config.sql
```

## Import Script

Use the provided import script to load your 2025 budget data:
```bash
# File: scripts/database/import_2025_budget.js
node scripts/database/import_2025_budget.js
```

## Testing

After migration and import:
1. Verify budgets have correct years
2. Check transactions have budget_year populated
3. Test sub-category visibility per year
4. Confirm auto-activation works with new transactions

## Future Enhancements

The schema is designed to support:
- Bi-annual budgets (period_type = 'semi-annual')
- Quarterly budgets (period_type = 'quarterly')
- Custom budget periods
- Budget templates for easy year-over-year setup
