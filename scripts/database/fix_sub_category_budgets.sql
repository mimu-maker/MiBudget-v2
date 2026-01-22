-- Script to add sub-category budget limits for existing categories
-- This will create individual budget limits for each sub-category

-- Add sub-category budget limits table if it doesn't have sub_category_id column
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

-- Populate sub-category budget limits from parent category budgets
INSERT INTO public.budget_category_limits (budget_id, category_id, sub_category_id, limit_amount, is_percentage)
SELECT 
    b.id as budget_id,
    c.id as category_id,
    sc.id as sub_category_id,
    bcl.limit_amount as limit_amount,
    FALSE as is_percentage
FROM public.budgets b
CROSS JOIN public.categories c ON c.user_id = b.user_id AND c.category_group != 'income'
CROSS JOIN public.sub_categories sc ON sc.category_id = c.id
LEFT JOIN public.budget_category_limits bcl ON bcl.budget_id = b.id AND bcl.category_id = c.id
WHERE b.budget_type = 'unified' 
AND b.year = 2025
AND sc.id IS NOT NULL
ON CONFLICT (budget_id, category_id, sub_category_id) DO NOTHING;

-- Update the hierarchical function to use sub-category budget limits
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_hierarchical_categories TO authenticated;
