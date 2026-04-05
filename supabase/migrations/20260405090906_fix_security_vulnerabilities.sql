-- 1. Enable RLS on all flagged tables
ALTER TABLE public.budget_category_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Backups
ALTER TABLE IF EXISTS public.transactions_backup_20260204 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions_backup_20260221 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transaction_items_backup_20260204 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.source_rules_backup_20260221 ENABLE ROW LEVEL SECURITY;

-- 2. Lockdown functions search_path
ALTER FUNCTION public.is_household_member() SET search_path = public;
ALTER FUNCTION public.get_household_master_user_id() SET search_path = public;
ALTER FUNCTION public.get_hierarchical_categories(uuid) SET search_path = public;
ALTER FUNCTION public.initialize_hierarchical_categories(uuid) SET search_path = public;
ALTER FUNCTION public.create_scenario_from_master(text, text) SET search_path = public;
ALTER FUNCTION public.initialize_klintemarken_subcategories(uuid) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.initialize_special_subcategories(uuid) SET search_path = public;
ALTER FUNCTION public.set_transaction_budget_year() SET search_path = public;
ALTER FUNCTION public.activate_sub_category_for_budget_year() SET search_path = public;
ALTER FUNCTION public.get_active_sub_categories(uuid) SET search_path = public;
ALTER FUNCTION public.carry_forward_sub_categories(uuid) SET search_path = public;
ALTER FUNCTION public.handle_user_profile_creation() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 3. Fix source_rules permissive policy
DROP POLICY IF EXISTS "Enable read access for all users" ON public.source_rules;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.source_rules;
DROP POLICY IF EXISTS "Enable update for all users" ON public.source_rules;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.source_rules;

-- Replace with proper user-bound policy, assuming source_rules are linked by user_id
CREATE POLICY "Users can manage own source rules" ON public.source_rules 
  FOR ALL USING (auth.uid() = user_id);
