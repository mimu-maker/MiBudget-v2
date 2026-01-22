-- Fix the type casting issue in get_hierarchical_categories
-- The problem is c.category_group needs explicit casting

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
        c.category_group::VARCHAR(20), -- Explicit cast to fix type mismatch
        c.id::UUID,
        c.name::VARCHAR(255),
        c.display_order::INTEGER,
        COALESCE(bcl.limit_amount, 0)::DECIMAL(12,2),
        0::DECIMAL(12,2), -- Simplified for now
        COALESCE(bcl.limit_amount, 0)::DECIMAL(12,2),
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', sc.id::UUID,
                    'name', sc.name::VARCHAR,
                    'display_order', sc.display_order::INTEGER,
                    'spent', 0::DECIMAL(12,2), -- Simplified for now
                    'budget_amount', 0::DECIMAL(12,2), -- Sub-categories don't have individual budgets
                    'is_active', true::BOOLEAN,
                    'first_used_date', null::TIMESTAMP
                ) ORDER BY sc.display_order
              ) FILTER (WHERE sc.id IS NOT NULL), 
              '[]'::jsonb
            )::JSONB
    FROM categories c
    LEFT JOIN budget_category_limits bcl ON bcl.category_id = c.id AND bcl.budget_id = p_budget_id
    LEFT JOIN sub_categories sc ON sc.category_id = c.id
    WHERE c.user_id = (SELECT user_id FROM budgets WHERE id = p_budget_id)
    GROUP BY c.category_group, c.id, c.name, c.display_order, bcl.limit_amount
    ORDER BY c.category_group, c.display_order, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT '=== TESTING FIXED FUNCTION ===' as status;
SELECT * FROM get_hierarchical_categories('afc5f8ef-0248-4070-bf94-ced6eec31e16'::UUID);
