-- Migration to update schema for MiBudget Brain & AI features

-- 1. Create merchant_rules table
CREATE TABLE IF NOT EXISTS public.merchant_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clean_merchant_name TEXT NOT NULL UNIQUE,
    auto_category TEXT,
    auto_sub_category TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Add new columns to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS clean_description TEXT,
ADD COLUMN IF NOT EXISTS budget_month DATE,
ADD COLUMN IF NOT EXISTS suggested_category TEXT,
ADD COLUMN IF NOT EXISTS suggested_sub_category TEXT,
ADD COLUMN IF NOT EXISTS merchant_description TEXT;

-- 3. Update status column to support new statuses (if it's a check constraint)
-- If status is a simple text column, this might not be needed, but good to know the allowed values:
-- 'New', 'Unmatched', 'Verified', 'Complete'

-- Optional: Add check constraint for status if desired
-- ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
-- ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check 
-- CHECK (status IN ('New', 'Unmatched', 'Verified', 'Complete'));
