-- Comprehensive fix for lost budget data
-- 1. Ensures schema is correct (sub_category_id in limits)
-- 2. Ensures unique constraint handles sub_category_id
-- 3. Restores data from legacy sub_categories.budget_amount to budget_category_limits
-- 4. Updates the RPC function to read from the correct table

-- 1. Schema Check
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'budget_category_limits' 
        AND column_name = 'sub_category_id'
    ) THEN
        ALTER TABLE public.budget_category_limits 
        ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES public.sub_categories(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Constraint Check 
-- (We drop the old restrictive one if it exists)
ALTER TABLE public.budget_category_limits 
DROP CONSTRAINT IF EXISTS budget_category_limits_budget_id_category_id_key;

-- (We ensure the new one exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'budget_category_limits_budget_id_category_id_sub_category_id_key'
    ) THEN
        ALTER TABLE public.budget_category_limits 
        ADD CONSTRAINT budget_category_limits_budget_id_category_id_sub_category_id_key 
        UNIQUE(budget_id, category_id, sub_category_id);
    END IF;
END $$;

-- 3. Data Restore
DO $$
DECLARE
    v_budget_id UUID;
BEGIN
    -- Get the 2025 Unified Budget ID
    SELECT id INTO v_budget_id 
    FROM budgets 
    WHERE year = 2025 AND budget_type = 'unified' 
    LIMIT 1;

    -- Fallback to Primary if Unified doesn't exist
    IF v_budget_id IS NULL THEN
        SELECT id INTO v_budget_id 
        FROM budgets 
        WHERE year = 2025 AND budget_type = 'primary' 
        LIMIT 1;
    END IF;

    IF v_budget_id IS NOT NULL THEN
        INSERT INTO public.budget_category_limits (budget_id, category_id, sub_category_id, limit_amount, is_active, created_at, updated_at)
        SELECT 
            v_budget_id,
            sc.category_id,
            sc.id,
            sc.budget_amount,
            true,
            NOW(),
            NOW()
        FROM public.sub_categories sc
        WHERE sc.budget_amount > 0
        ON CONFLICT (budget_id, category_id, sub_category_id) 
        DO UPDATE SET 
            limit_amount = EXCLUDED.limit_amount
        WHERE budget_category_limits.limit_amount = 0;
    END IF;
END $$;

-- 4. Function Update
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
) AS $func$
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
                'budget_amount', COALESCE(bscl.limit_amount, 0)
            ) ORDER BY sc.display_order
          ) FILTER (WHERE sc.id IS NOT NULL), 
          '[]'::jsonb
        ) as sub_categories
    FROM categories c
    LEFT JOIN budget_category_limits bcl ON bcl.category_id = c.id AND bcl.budget_id = p_budget_id AND bcl.sub_category_id IS NULL
    LEFT JOIN sub_categories sc ON sc.category_id = c.id
    LEFT JOIN budget_category_limits bscl ON bscl.sub_category_id = sc.id AND bscl.budget_id = p_budget_id
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
$func$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_hierarchical_categories TO authenticated;
