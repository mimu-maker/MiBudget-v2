-- READY TO APPLY
-- ============================================================================
-- SQL Execution for Plans:
-- 1. docs/Plan/demo-seed-fix.md
-- 2. docs/Plan/schema-issues.md
-- 3. docs/Plan/currency-account-level.md
-- ============================================================================

-- PRE-FLIGHT CHECKS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demo_seed_categories' AND column_name = 'name') THEN
        RAISE EXCEPTION 'Table demo_seed_categories or column "name" does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demo_seed_bcl' AND column_name = 'limit_amount') THEN
        RAISE EXCEPTION 'Table demo_seed_bcl or column "limit_amount" does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scenarios' AND column_name = 'user_id') THEN
        RAISE EXCEPTION 'Table scenarios or column "user_id" does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'current_account_id') THEN
        RAISE EXCEPTION 'Table user_profiles or column "current_account_id" does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'currency') THEN
        RAISE EXCEPTION 'Table user_profiles or column "currency" does not exist';
    END IF;
END $$;

-- PLAN 1: FIX DEMO SEED DATA

UPDATE demo_seed_categories SET name = 'Food'      WHERE name = 'Food & Groceries';
UPDATE demo_seed_categories SET name = 'Transport'  WHERE name = 'Transportation';
UPDATE demo_seed_categories SET name = 'Transfer'   WHERE name = 'Transfers';

UPDATE demo_seed_bcl SET limit_amount = limit_amount + 8160  WHERE sub_category_id = '00000000-0000-4000-a200-000000000401';
UPDATE demo_seed_bcl SET limit_amount = limit_amount + 7500  WHERE sub_category_id = '00000000-0000-4000-a200-000000000502';
UPDATE demo_seed_bcl SET limit_amount = limit_amount + 6600  WHERE sub_category_id = '00000000-0000-4000-a200-000000000704';
UPDATE demo_seed_bcl SET limit_amount = limit_amount + 18000 WHERE sub_category_id = '00000000-0000-4000-a200-000000001102';
UPDATE demo_seed_bcl SET limit_amount = limit_amount - 1800  WHERE sub_category_id = '00000000-0000-4000-a200-000000000201';
UPDATE demo_seed_bcl SET limit_amount = limit_amount - 7440  WHERE sub_category_id = '00000000-0000-4000-a200-000000000601';
UPDATE demo_seed_bcl SET limit_amount = limit_amount - 1000  WHERE sub_category_id = '00000000-0000-4000-a200-000000000301';
UPDATE demo_seed_bcl SET limit_amount = limit_amount - 1000  WHERE sub_category_id = '00000000-0000-4000-a200-000000000302';
UPDATE demo_seed_bcl SET limit_amount = limit_amount - 400   WHERE sub_category_id = '00000000-0000-4000-a200-000000000305';
UPDATE demo_seed_bcl SET limit_amount = limit_amount + 600   WHERE sub_category_id = '00000000-0000-4000-a200-000000000802';

INSERT INTO demo_seed_budgets (id, user_id, name, period_type, start_date, is_active, budget_type, year, account_id)
SELECT '00000000-0000-4000-a300-000000000002', user_id, 'Demo Household 2025', period_type, '2025-01-01', true, budget_type, 2025, account_id
FROM demo_seed_budgets WHERE id = '00000000-0000-4000-a300-000000000001'
ON CONFLICT (id) DO NOTHING;

INSERT INTO demo_seed_budgets (id, user_id, name, period_type, start_date, is_active, budget_type, year, account_id)
SELECT '00000000-0000-4000-a300-000000000003', user_id, 'Demo Household 2024', period_type, '2024-01-01', true, budget_type, 2024, account_id
FROM demo_seed_budgets WHERE id = '00000000-0000-4000-a300-000000000001'
ON CONFLICT (id) DO NOTHING;

INSERT INTO demo_seed_bcl (budget_id, category_id, sub_category_id, limit_amount, is_active)
SELECT '00000000-0000-4000-a300-000000000002', category_id, sub_category_id, limit_amount, is_active
FROM demo_seed_bcl WHERE budget_id = '00000000-0000-4000-a300-000000000001'
ON CONFLICT (budget_id, sub_category_id) DO NOTHING;

INSERT INTO demo_seed_bcl (budget_id, category_id, sub_category_id, limit_amount, is_active)
SELECT '00000000-0000-4000-a300-000000000003', category_id, sub_category_id, limit_amount, is_active
FROM demo_seed_bcl WHERE budget_id = '00000000-0000-4000-a300-000000000001'
ON CONFLICT (budget_id, sub_category_id) DO NOTHING;

-- PLAN 2: SCENARIOS ACCOUNT-SCOPED

ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;

UPDATE public.scenarios s
SET account_id = (
  SELECT up.current_account_id FROM public.user_profiles up
  WHERE up.user_id = s.user_id LIMIT 1
)
WHERE account_id IS NULL;

UPDATE public.scenarios SET account_id = '00000000-0000-4000-a000-000000000001' WHERE account_id IS NULL;

ALTER TABLE public.scenarios ALTER COLUMN account_id SET NOT NULL;

DROP POLICY IF EXISTS "Users can manage their own scenarios" ON public.scenarios;
CREATE POLICY "Account members can manage scenarios" ON public.scenarios
FOR ALL USING (account_id = public.get_my_account_id())
WITH CHECK (account_id = public.get_my_account_id());

CREATE INDEX IF NOT EXISTS idx_scenarios_account ON public.scenarios(account_id);

DELETE FROM public.budgets b
WHERE account_id = '92325837-1cf0-4157-82c6-82a233389b1a'
  AND year = 2025
  AND NOT EXISTS (
    SELECT 1 FROM public.budget_category_limits bcl WHERE bcl.budget_id = b.id
  );

-- PLAN 3: CURRENCY TO ACCOUNT LEVEL

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'DKK';

UPDATE public.accounts a
SET currency = (
  SELECT up.currency FROM public.user_profiles up
  WHERE up.current_account_id = a.id LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.current_account_id = a.id
);

-- FIX: create_scenario_from_master — account_id is now NOT NULL on scenarios

CREATE OR REPLACE FUNCTION public.create_scenario_from_master(p_name text, p_description text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
    new_scenario_id UUID;
    v_account_id UUID;
BEGIN
    v_account_id := public.get_my_account_id();
    INSERT INTO public.scenarios (user_id, account_id, name, description)
    VALUES (auth.uid(), v_account_id, p_name, p_description)
    RETURNING id INTO new_scenario_id;
    INSERT INTO public.projections (
        account_id, user_id, date, merchant, amount, category, stream,
        planned, recurring, description, budget_year, overrides, scenario_id
    )
    SELECT account_id, user_id, date, merchant, amount, category, stream,
        planned, recurring, description, budget_year, overrides, new_scenario_id
    FROM public.projections
    WHERE account_id = v_account_id AND scenario_id IS NULL;
    RETURN new_scenario_id;
END;
$function$;
