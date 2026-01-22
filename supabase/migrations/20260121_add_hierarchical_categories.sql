-- Migration for Hierarchical Category Structure
-- Replaces separate budget types with unified hierarchical categories

-- 0. Drop existing function first (if it exists)
DROP FUNCTION IF EXISTS public.get_hierarchical_categories(UUID);

-- 1. Add category_group field to categories for top-level grouping (without constraint first)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS category_group VARCHAR(20) DEFAULT 'expenditure';

-- 2. Update ALL existing values to match allowed enum values before adding constraint
UPDATE public.categories 
SET category_group = CASE 
    WHEN category_group IS NULL THEN 'expenditure'
    WHEN category_group NOT IN ('income', 'expenditure', 'klintemarken', 'special') THEN 'expenditure'
    ELSE category_group
END;

-- 3. Verify no invalid values exist before adding constraint
-- This will help us debug if there are still issues
SELECT category_group, COUNT(*) as count 
FROM public.categories 
GROUP BY category_group;

-- 4. Now add the check constraint (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'categories_category_group_check' 
        AND table_name = 'categories'
    ) THEN
        ALTER TABLE public.categories 
        ADD CONSTRAINT categories_category_group_check 
        CHECK (category_group IN ('income', 'expenditure', 'klintemarken', 'special'));
    END IF;
END $$;

-- 5. Add display_order field for custom ordering
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

ALTER TABLE public.sub_categories 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 6. Update budgets table to support unified budget structure
ALTER TABLE public.budgets 
DROP CONSTRAINT IF EXISTS budgets_budget_type_check;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'budgets_budget_type_check' 
        AND table_name = 'budgets'
    ) THEN
        ALTER TABLE public.budgets 
        ADD CONSTRAINT budgets_budget_type_check 
        CHECK (budget_type IN ('primary', 'unified'));
    END IF;
END $$;

-- 7. Create unified budget for existing users (if not exists)
INSERT INTO public.budgets (user_id, name, start_date, budget_type, period_type)
SELECT 
    id as user_id, 
    'Unified Budget' as name,
    CURRENT_DATE as start_date,
    'unified' as budget_type,
    'yearly' as period_type
FROM public.user_profiles 
WHERE id NOT IN (
    SELECT DISTINCT user_id FROM public.budgets WHERE budget_type = 'unified'
);

-- 8. Create hierarchical categories for unified budget structure
-- This will be populated through the settings page or initial setup

-- 9. Update budget_category_limits to work with unified budget
ALTER TABLE public.budget_category_limits 
ADD COLUMN IF NOT EXISTS is_percentage BOOLEAN DEFAULT FALSE;

-- 10. Create function to get hierarchical categories for a budget
CREATE OR REPLACE FUNCTION public.get_hierarchical_categories(p_budget_id UUID)
RETURNS TABLE(
    category_group VARCHAR(20),
    category_id UUID,
    category_name VARCHAR(255),
    category_order INTEGER,
    budget_amount DECIMAL(12,2),
    spent_amount DECIMAL(12,2),
    remaining_amount DECIMAL(12,2),
    sub_categories JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH category_spending AS (
        SELECT 
            c.id as category_id,
            COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) as spent
        FROM categories c
        LEFT JOIN transactions t ON c.name = t.category
        LEFT JOIN budgets b ON b.user_id = c.user_id AND b.id = p_budget_id
        WHERE c.user_id = (SELECT user_id FROM budgets WHERE id = p_budget_id)
        AND EXTRACT(YEAR FROM t.date) = EXTRACT(YEAR FROM b.start_date)
        GROUP BY c.id
    )
    SELECT 
        c.category_group as category_group,
        c.id as category_id,
        c.name as category_name,
        c.display_order as category_order,
        COALESCE(bcl.limit_amount, 0) as budget_amount,
        COALESCE(cs.spent, 0) as spent_amount,
        COALESCE(bcl.limit_amount, 0) - COALESCE(cs.spent, 0) as remaining_amount,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
                'id', sc.id,
                'name', sc.name,
                'display_order', sc.display_order,
                'spent', COALESCE(sub_spent.sub_spent, 0),
                'budget_amount', COALESCE(bcl.limit_amount, 0)
            ) ORDER BY sc.display_order
          ) FILTER (WHERE sc.id IS NOT NULL), 
          '[]'::jsonb
        ) as sub_categories
    FROM categories c
    LEFT JOIN budget_category_limits bcl ON bcl.category_id = c.id AND bcl.budget_id = p_budget_id
    LEFT JOIN sub_categories sc ON sc.category_id = c.id
    LEFT JOIN category_spending cs ON cs.category_id = c.id
    LEFT JOIN (
        SELECT 
            sc.id as sub_id,
            COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) as sub_spent
        FROM sub_categories sc
        LEFT JOIN transactions t ON sc.name = t.sub_category
        LEFT JOIN categories c ON c.id = sc.category_id
        LEFT JOIN budgets b ON b.user_id = c.user_id AND b.id = p_budget_id
        WHERE c.user_id = (SELECT user_id FROM budgets WHERE id = p_budget_id)
        AND EXTRACT(YEAR FROM t.date) = EXTRACT(YEAR FROM b.start_date)
        GROUP BY sc.id
    ) sub_spent ON sub_spent.sub_id = sc.id
    WHERE c.user_id = (SELECT user_id FROM budgets WHERE id = p_budget_id)
    GROUP BY c.category_group, c.id, c.name, c.display_order, bcl.limit_amount, cs.spent
    ORDER BY c.category_group, c.display_order, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to initialize default hierarchical categories
CREATE OR REPLACE FUNCTION public.initialize_hierarchical_categories(p_user_id UUID)
RETURNS TABLE(category_id UUID, category_name VARCHAR(255), category_group VARCHAR(20)) AS $$
DECLARE
    unified_budget_id UUID;
BEGIN
    -- Get the unified budget for this user
    SELECT id INTO unified_budget_id 
    FROM budgets 
    WHERE user_id = p_user_id AND budget_type = 'unified';
    
    IF unified_budget_id IS NULL THEN
        -- Create unified budget if it doesn't exist
        INSERT INTO budgets (user_id, name, start_date, budget_type, period_type)
        VALUES (p_user_id, 'Unified Budget', CURRENT_DATE, 'unified', 'yearly')
        RETURNING id INTO unified_budget_id;
    END IF;
    
    -- Insert Income categories
    INSERT INTO categories (user_id, name, category_group, display_order, is_system)
    VALUES 
        (p_user_id, 'Income', 'income', 1, TRUE),
        (p_user_id, 'Primary Income', 'income', 2, TRUE)
    ON CONFLICT (user_id, name) DO NOTHING
    RETURNING id, name, category_group;
    
    -- Insert Expenditure categories (primary household)
    INSERT INTO categories (user_id, name, category_group, display_order, is_system)
    VALUES 
        (p_user_id, 'Housing', 'expenditure', 1, TRUE),
        (p_user_id, 'Utilities', 'expenditure', 2, TRUE),
        (p_user_id, 'Food', 'expenditure', 3, TRUE),
        (p_user_id, 'Transportation', 'expenditure', 4, TRUE),
        (p_user_id, 'Healthcare', 'expenditure', 5, TRUE),
        (p_user_id, 'Personal', 'expenditure', 6, TRUE),
        (p_user_id, 'Savings', 'expenditure', 7, TRUE)
    ON CONFLICT (user_id, name) DO NOTHING
    RETURNING id, name, category_group;
    
    -- Insert Klintemarken categories
    INSERT INTO categories (user_id, name, category_group, display_order, is_system)
    VALUES 
        (p_user_id, 'Klintemarken', 'klintemarken', 1, TRUE)
    ON CONFLICT (user_id, name) DO NOTHING
    RETURNING id, name, category_group;
    
    -- Insert Special category
    INSERT INTO categories (user_id, name, category_group, display_order, is_system)
    VALUES 
        (p_user_id, 'Special', 'special', 1, TRUE)
    ON CONFLICT (user_id, name) DO NOTHING
    RETURNING id, name, category_group;
    
    -- Return all created categories
    RETURN QUERY
    SELECT id, name, category_group 
    FROM categories 
    WHERE user_id = p_user_id AND is_system = TRUE
    ORDER BY category_group, display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to initialize Klintemarken sub-categories
CREATE OR REPLACE FUNCTION public.initialize_klintemarken_subcategories(p_user_id UUID)
RETURNS TABLE(sub_category_id UUID, sub_category_name VARCHAR(255)) AS $$
DECLARE
    klintemarken_category_id UUID;
BEGIN
    -- Get Klintemarken category
    SELECT id INTO klintemarken_category_id
    FROM categories 
    WHERE user_id = p_user_id AND category_group = 'klintemarken';
    
    IF klintemarken_category_id IS NOT NULL THEN
        -- Insert Klintemarken sub-categories
        INSERT INTO sub_categories (category_id, name, display_order)
        VALUES 
            (klintemarken_category_id, 'Income - Rent', 1),
            (klintemarken_category_id, 'Expense - Mortgage', 2),
            (klintemarken_category_id, 'Expense - Property Tax', 3),
            (klintemarken_category_id, 'Expense - Insurance', 4),
            (klintemarken_category_id, 'Expense - Maintenance', 5),
            (klintemarken_category_id, 'Expense - Utilities', 6)
        ON CONFLICT (category_id, name) DO NOTHING
        RETURNING id, name;
        
        -- Return all created sub-categories
        RETURN QUERY
        SELECT id, name 
        FROM sub_categories 
        WHERE category_id = klintemarken_category_id
        ORDER BY display_order;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to initialize Special sub-categories
CREATE OR REPLACE FUNCTION public.initialize_special_subcategories(p_user_id UUID)
RETURNS TABLE(sub_category_id UUID, sub_category_name VARCHAR(255)) AS $$
DECLARE
    special_category_id UUID;
BEGIN
    -- Get Special category
    SELECT id INTO special_category_id
    FROM categories 
    WHERE user_id = p_user_id AND category_group = 'special';
    
    IF special_category_id IS NOT NULL THEN
        -- Insert Special sub-categories (based on user's spreadsheet)
        INSERT INTO sub_categories (category_id, name, display_order)
        VALUES 
            (special_category_id, 'Dog', 1),
            (special_category_id, 'Health', 2),
            (special_category_id, 'Household', 3),
            (special_category_id, 'Income', 4),
            (special_category_id, 'Operation Mamba', 5),
            (special_category_id, 'Project Sønderborg', 6),
            (special_category_id, 'Special Celebration', 7)
        ON CONFLICT (category_id, name) DO NOTHING
        RETURNING id, name;
        
        -- Return all created sub-categories
        RETURN QUERY
        SELECT id, name 
        FROM sub_categories 
        WHERE category_id = special_category_id
        ORDER BY display_order;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_category_group ON public.categories(category_group);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories(display_order);
CREATE INDEX IF NOT EXISTS idx_sub_categories_display_order ON public.sub_categories(display_order);

-- 12. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_hierarchical_categories TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_hierarchical_categories TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_klintemarken_subcategories TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_special_subcategories TO authenticated;

-- 13. Verification
SELECT 'Hierarchical categories migration completed successfully' as status;
SELECT COUNT(*) as categories_with_group FROM public.categories WHERE category_group IS NOT NULL;
