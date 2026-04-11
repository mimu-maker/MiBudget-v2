-- READY TO APPLY
-- ============================================================================
-- SQL Execution for Plans:
-- 1. docs/Plan/demo-seed-fix.md
-- 2. docs/Plan/schema-issues.md
-- 3. docs/Plan/currency-account-level.md
-- ============================================================================

-- ==========================================
-- PRE-FLIGHT CHECKS
-- ==========================================

DO $$ 
BEGIN
    -- Verify demo_seed_categories exists and has name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demo_seed_categories' AND column_name = 'name') THEN
        RAISE EXCEPTION 'Table demo_seed_categories or column "name" does not exist';
    END IF;

    -- Verify demo_seed_bcl exists and has required columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demo_seed_bcl' AND column_name = 'limit_amount') THEN
        RAISE EXCEPTION 'Table demo_seed_bcl or column "limit_amount" does not exist';
    END IF;

    -- Verify scenarios exists and has user_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scenarios' AND column_name = 'user_id') THEN
        RAISE EXCEPTION 'Table scenarios or column "user_id" does not exist';
    END IF;

    -- Verify user_profiles has required columns for backfilling
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'current_account_id') THEN
        RAISE EXCEPTION 'Table user_profiles or column "current_account_id" does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'currency') THEN
        RAISE EXCEPTION 'Table user_profiles or column "currency" does not exist';
    END IF;
END $$;

-- ==========================================
-- PLAN 1: FIX DEMO SEED DATA
-- ==========================================

/* INSPECTION: Verify category names before update
SELECT id, name FROM demo_seed_categories WHERE name IN ('Food & Groceries', 'Transportation', 'Transfers');
*/

-- 1. Update seed category names
UPDATE demo_seed_categories SET name = 'Food'      WHERE name = 'Food & Groceries';
UPDATE demo_seed_categories SET name = 'Transport'  WHERE name = 'Transportation';
UPDATE demo_seed_categories SET name = 'Transfer'   WHERE name = 'Transfers';

/* INSPECTION: Verify budget limits before update
SELECT bcl.sub_category_id, bcl.limit_amount FROM demo_seed_bcl bcl 
WHERE bcl.sub_category_id IN ('00000000-0000-4000-a200-000000000401', '00000000-0000-4000-a200-000000000502', '00000000-0000-4000-a200-000000000704', '00000000-0000-4000-a200-000000001102');
*/

-- 2. Correct budget amounts
-- Food: Target 22,800. Current 14,640. Diff = 8,160. Add to Groceries (0401)
UPDATE demo_seed_bcl SET limit_amount = limit_amount + 8160 
WHERE sub_category_id = '00000000-0000-4000-a200-000000000401';

-- Transport: Target 21,000. Current 13,500. Diff = 7,500. Add to Gas & Fuel (0502)
UPDATE demo_seed_bcl SET limit_amount = limit_amount + 7500 
WHERE sub_category_id = '00000000-0000-4000-a200-000000000502';

-- Shopping: Target 13,200. Current 6,600. Diff = 6,600. Add to Online Shopping (0704)
UPDATE demo_seed_bcl SET limit_amount = limit_amount + 6600 
WHERE sub_category_id = '00000000-0000-4000-a200-000000000704';

-- Transfer: Target 26,400. Current 8,400. Diff = 18,000. Add to Bank Transfer (1102)
UPDATE demo_seed_bcl SET limit_amount = limit_amount + 18000 
WHERE sub_category_id = '00000000-0000-4000-a200-000000001102';

-- Housing: Target 31,200. Current 33,000. Diff = -1,800. Subtract from Mortgage (0201)
UPDATE demo_seed_bcl SET limit_amount = limit_amount - 1800 
WHERE sub_category_id = '00000000-0000-4000-a200-000000000201';

-- Health: Target 4,080. Current 11,520. Diff = -7,440. Subtract from Health Insurance (0601)
UPDATE demo_seed_bcl SET limit_amount = limit_amount - 7440 
WHERE sub_category_id = '00000000-0000-4000-a200-000000000601';

-- Utilities: Target 3,720. Current 6,120. Diff = -2,400. 
UPDATE demo_seed_bcl SET limit_amount = limit_amount - 1000 WHERE sub_category_id = '00000000-0000-4000-a200-000000000301';
UPDATE demo_seed_bcl SET limit_amount = limit_amount - 1000 WHERE sub_category_id = '00000000-0000-4000-a200-000000000302';
UPDATE demo_seed_bcl SET limit_amount = limit_amount - 400 WHERE sub_category_id = '00000000-0000-4000-a200-000000000305';

-- Entertainment: Target 4,320. Current 3,720. Diff = 600. Add to Movies (0802)
UPDATE demo_seed_bcl SET limit_amount = limit_amount + 600 
WHERE sub_category_id = '00000000-0000-4000-a200-000000000802';

-- 3. Add 2024 and 2025 demo budgets by copying 2026
/* INSPECTION: Verify 2026 demo budget exists
SELECT id FROM demo_seed_budgets WHERE id = '00000000-0000-4000-a300-000000000001';
*/

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

-- ==========================================
-- PLAN 2: SCHEMA ISSUES
-- ==========================================

-- Scenarios: Make them account-scoped
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;

/* INSPECTION: Verify scenarios count before backfill
SELECT count(*) FROM public.scenarios WHERE account_id IS NULL;
*/

UPDATE public.scenarios s
SET account_id = (
  SELECT up.current_account_id FROM public.user_profiles up
  WHERE up.user_id = s.user_id
  LIMIT 1
)
WHERE account_id IS NULL;

-- Default to current profile's account if the above fails for some reason (rare)
UPDATE public.scenarios SET account_id = '00000000-0000-4000-a000-000000000001' WHERE account_id IS NULL;

ALTER TABLE public.scenarios ALTER COLUMN account_id SET NOT NULL;

DROP POLICY IF EXISTS "Users can manage their own scenarios" ON public.scenarios;
CREATE POLICY "Account members can manage scenarios" ON public.scenarios
FOR ALL USING (account_id = public.get_my_account_id())
WITH CHECK (account_id = public.get_my_account_id());

CREATE INDEX IF NOT EXISTS idx_scenarios_account ON public.scenarios(account_id);

-- Duplicate Budgets Cleanup (Mullally)
/* INSPECTION: Check Mullally 2025 budgets
SELECT b.id, b.name FROM budgets b WHERE account_id = '92325837-1cf0-4157-82c6-82a233389b1a' AND year = 2025;
*/

DELETE FROM public.budgets b
WHERE account_id = '92325837-1cf0-4157-82c6-82a233389b1a' 
  AND year = 2025
  AND NOT EXISTS (
    SELECT 1 FROM public.budget_category_limits bcl WHERE bcl.budget_id = b.id
  );

-- ==========================================
-- PLAN 3: MOVE CURRENCY TO ACCOUNT LEVEL
-- ==========================================

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'DKK';

/* INSPECTION: Verify accounts before currency seed
SELECT id, name, currency FROM public.accounts;
*/

UPDATE public.accounts a
SET currency = (
  SELECT up.currency FROM public.user_profiles up
  WHERE up.current_account_id = a.id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.current_account_id = a.id
);
