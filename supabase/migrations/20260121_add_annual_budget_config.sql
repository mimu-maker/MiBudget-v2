-- Migration for Annual Budget Configuration
-- Adds support for per-year budget configuration with sub-category visibility management

-- 1. Add year column to budgets table
ALTER TABLE public.budgets 
ADD COLUMN IF NOT EXISTS year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

-- Update the unique constraint to include year
ALTER TABLE public.budgets 
DROP CONSTRAINT IF EXISTS budgets_user_id_name_budget_type_key,
ADD CONSTRAINT budgets_user_id_name_budget_type_year_key 
UNIQUE(user_id, name, budget_type, year);

-- 2. Add budget_year column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS budget_year INTEGER;

-- Create index for budget_year on transactions
CREATE INDEX IF NOT EXISTS idx_transactions_budget_year ON public.transactions(budget_year);

-- 3. Create budget_sub_categories join table for per-year visibility
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

-- 4. Enable RLS for budget_sub_categories
ALTER TABLE public.budget_sub_categories ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for budget_sub_categories
CREATE POLICY "Users can view own budget sub-categories" ON public.budget_sub_categories
    FOR SELECT USING (
        auth.uid() = (
            SELECT user_id FROM public.user_profiles 
            WHERE id = (
                SELECT user_id FROM public.budgets 
                WHERE id = budget_sub_categories.budget_id
            )
        )
    );

CREATE POLICY "Users can manage own budget sub-categories" ON public.budget_sub_categories
    FOR ALL USING (
        auth.uid() = (
            SELECT user_id FROM public.user_profiles 
            WHERE id = (
                SELECT user_id FROM public.budgets 
                WHERE id = budget_sub_categories.budget_id
            )
        )
    );

-- 6. Create function to auto-populate budget_year from transaction date
CREATE OR REPLACE FUNCTION public.set_transaction_budget_year()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set budget_year if it's not already set
    IF NEW.budget_year IS NULL AND NEW.date IS NOT NULL THEN
        NEW.budget_year := EXTRACT(YEAR FROM NEW.date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for auto-setting budget_year
CREATE TRIGGER set_transaction_budget_year_trigger
    BEFORE INSERT OR UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.set_transaction_budget_year();

-- 8. Create function to auto-activate sub-category when used in a transaction
CREATE OR REPLACE FUNCTION public.activate_sub_category_for_budget_year()
RETURNS TRIGGER AS $$
DECLARE
    v_budget_id UUID;
    v_sub_category_id UUID;
    v_budget_sub_category_exists BOOLEAN;
BEGIN
    -- Only proceed if we have a sub_category and budget_year
    IF NEW.sub_category IS NOT NULL AND NEW.budget_year IS NOT NULL THEN
        -- Find the sub_category_id
        SELECT id INTO v_sub_category_id
        FROM public.sub_categories 
        WHERE name = NEW.sub_category
        AND category_id = (
            SELECT id FROM public.categories 
            WHERE name = NEW.category 
            AND user_id = (
                SELECT user_id FROM public.user_profiles 
                WHERE user_id = auth.uid()
            )
        )
        LIMIT 1;
        
        -- Find the budget_id for this year
        SELECT id INTO v_budget_id
        FROM public.budgets 
        WHERE user_id = (
            SELECT user_id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
        AND year = NEW.budget_year
        AND budget_type = 'primary'
        LIMIT 1;
        
        -- Check if budget_sub_category already exists
        SELECT EXISTS(
            SELECT 1 FROM public.budget_sub_categories 
            WHERE budget_id = v_budget_id 
            AND sub_category_id = v_sub_category_id
        ) INTO v_budget_sub_category_exists;
        
        -- Create budget_sub_category if it doesn't exist
        IF NOT v_budget_sub_category_exists AND v_budget_id IS NOT NULL AND v_sub_category_id IS NOT NULL THEN
            INSERT INTO public.budget_sub_categories (budget_id, sub_category_id, first_used_date)
            VALUES (v_budget_id, v_sub_category_id, NEW.date);
        ELSIF v_budget_sub_category_exists THEN
            -- Update first_used_date if this transaction is earlier
            UPDATE public.budget_sub_categories 
            SET first_used_date = LEAST(first_used_date, NEW.date)
            WHERE budget_id = v_budget_id 
            AND sub_category_id = v_sub_category_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create trigger for auto-activating sub-categories
CREATE TRIGGER activate_sub_category_trigger
    AFTER INSERT OR UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.activate_sub_category_for_budget_year();

-- 10. Create function to get active sub-categories for a budget year
CREATE OR REPLACE FUNCTION public.get_active_sub_categories(p_budget_id UUID)
RETURNS TABLE(
    sub_category_id UUID,
    sub_category_name TEXT,
    category_name TEXT,
    is_active BOOLEAN,
    first_used_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.id,
        sc.name,
        c.name,
        COALESCE(bsc.is_active, FALSE) as is_active,
        bsc.first_used_date
    FROM public.sub_categories sc
    JOIN public.categories c ON sc.category_id = c.id
    LEFT JOIN public.budget_sub_categories bsc ON 
        bsc.sub_category_id = sc.id 
        AND bsc.budget_id = p_budget_id
    WHERE c.user_id = (
        SELECT user_id FROM public.budgets 
        WHERE id = p_budget_id
    )
    ORDER BY c.name, sc.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to initialize budget sub-categories from previous year
CREATE OR REPLACE FUNCTION public.carry_forward_sub_categories(p_budget_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_user_id UUID;
    v_current_year INTEGER;
    v_previous_budget_id UUID;
    v_carried_count INTEGER := 0;
BEGIN
    -- Get user info and current year
    SELECT user_id, year INTO v_user_id, v_current_year
    FROM public.budgets 
    WHERE id = p_budget_id;
    
    -- Find previous year's budget
    SELECT id INTO v_previous_budget_id
    FROM public.budgets 
    WHERE user_id = v_user_id 
    AND year = v_current_year - 1 
    AND budget_type = 'primary'
    LIMIT 1;
    
    -- If previous budget exists, carry forward active sub-categories
    IF v_previous_budget_id IS NOT NULL THEN
        INSERT INTO public.budget_sub_categories (budget_id, sub_category_id, is_active)
        SELECT 
            p_budget_id, 
            sub_category_id, 
            TRUE
        FROM public.budget_sub_categories 
        WHERE budget_id = v_previous_budget_id 
        AND is_active = TRUE
        ON CONFLICT (budget_id, sub_category_id) DO NOTHING;
        
        GET DIAGNOSTICS v_carried_count = ROW_COUNT;
    END IF;
    
    RETURN v_carried_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_sub_categories_budget_id ON public.budget_sub_categories(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_sub_categories_sub_category_id ON public.budget_sub_categories(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_budget_sub_categories_is_active ON public.budget_sub_categories(is_active);

-- 13. Create trigger for updated_at on budget_sub_categories
CREATE TRIGGER update_budget_sub_categories_updated_at
    BEFORE UPDATE ON public.budget_sub_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Update existing budgets to have proper years (if they don't already)
UPDATE public.budgets 
SET year = EXTRACT(YEAR FROM start_date) 
WHERE year IS NULL OR year = 0;

-- 15. Update existing transactions to have budget_year (if they don't already)
UPDATE public.transactions 
SET budget_year = EXTRACT(YEAR FROM date) 
WHERE budget_year IS NULL AND date IS NOT NULL;

-- Verification queries
SELECT 'Annual budget configuration migration completed successfully' as status;
SELECT COUNT(*) as budgets_count FROM public.budgets WHERE year IS NOT NULL;
SELECT COUNT(*) as transactions_with_budget_year FROM public.transactions WHERE budget_year IS NOT NULL;
SELECT COUNT(*) as budget_sub_categories_count FROM public.budget_sub_categories;
