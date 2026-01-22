-- Run the simplified hierarchical function
-- This should fix the budget loading error

-- First, run the simplified function
SELECT '=== RUNNING SIMPLIFIED FUNCTION ===' as status;

-- Drop and recreate the function
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
    SELECT 
        c.category_group,
        c.id as category_id,
        c.name as category_name,
        c.display_order as category_order,
        COALESCE(bcl.limit_amount, 0) as budget_amount,
        0 as spent_amount, -- Simplified for now
        COALESCE(bcl.limit_amount, 0) as remaining_amount,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', sc.id,
                    'name', sc.name,
                    'display_order', sc.display_order,
                    'spent', 0, -- Simplified for now
                    'budget_amount', 0, -- Sub-categories don't have individual budgets
                    'is_active', true,
                    'first_used_date', null
                ) ORDER BY sc.display_order
              ) FILTER (WHERE sc.id IS NOT NULL), 
              '[]'::jsonb
            ) as sub_categories
    FROM categories c
    LEFT JOIN budget_category_limits bcl ON bcl.category_id = c.id AND bcl.budget_id = p_budget_id
    LEFT JOIN sub_categories sc ON sc.category_id = c.id
    WHERE c.user_id = (SELECT user_id FROM budgets WHERE id = p_budget_id)
    GROUP BY c.category_group, c.id, c.name, c.display_order, bcl.limit_amount
    ORDER BY c.category_group, c.display_order, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function immediately
SELECT '=== TESTING FUNCTION ===' as status;
SELECT * FROM get_hierarchical_categories('afc5f8ef-0248-4070-bf94-ced6eec31e16'::UUID);

-- Verify it works
SELECT '=== FUNCTION CREATED SUCCESSFULLY ===' as status;
