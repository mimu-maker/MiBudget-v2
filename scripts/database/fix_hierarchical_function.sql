-- Fix the get_hierarchical_categories function
-- The issue is that budget_category_limits table doesn't have sub_category_id column
-- We need to use budget_sub_categories table instead

-- First, let's check what tables actually exist
SELECT '=== CHECKING TABLE STRUCTURES ===' as status;

-- Check budget_category_limits structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'budget_category_limits' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check budget_sub_categories structure  
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'budget_sub_categories' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Now fix the function
DROP FUNCTION IF EXISTS public.get_hierarchical_categories(UUID);

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
    ),
    sub_category_spending AS (
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
    )
    SELECT 
        c.category_group,
        c.id,
        c.name,
        c.display_order,
        COALESCE(bcl.limit_amount, 0) as budget_amount,
        COALESCE(cs.spent, 0) as spent_amount,
        COALESCE(bcl.limit_amount, 0) - COALESCE(cs.spent, 0) as remaining_amount,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
                'id', sc.id,
                'name', sc.name,
                'display_order', sc.display_order,
                'spent', COALESCE(scs.sub_spent, 0),
                'budget_amount', COALESCE(bsc.limit_amount, 0)
            ) ORDER BY sc.display_order
          ) FILTER (WHERE sc.id IS NOT NULL), 
          '[]'::jsonb
        ) as sub_categories
    FROM categories c
    LEFT JOIN budget_category_limits bcl ON bcl.category_id = c.id AND bcl.budget_id = p_budget_id
    LEFT JOIN sub_categories sc ON sc.category_id = c.id
    LEFT JOIN budget_sub_categories bsc ON bsc.sub_category_id = sc.id AND bsc.budget_id = p_budget_id
    LEFT JOIN category_spending cs ON cs.category_id = c.id
    LEFT JOIN sub_category_spending scs ON scs.sub_id = sc.id
    WHERE c.user_id = (SELECT user_id FROM budgets WHERE id = p_budget_id)
    GROUP BY c.category_group, c.id, c.name, c.display_order, bcl.limit_amount, cs.spent
    ORDER BY c.category_group, c.display_order, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT '=== TESTING FUNCTION ===' as status;
SELECT * FROM get_hierarchical_categories('afc5f8ef-0248-4070-bf94-ced6eec31e16'::UUID);
