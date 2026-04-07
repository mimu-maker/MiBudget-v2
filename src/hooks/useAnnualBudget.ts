import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, startOfMonth } from 'date-fns';

export interface BudgetCategory {
  id: string;
  name: string;
  category_group: 'income' | 'expenditure' | 'klintemarken' | 'special';
  display_order: number;
  icon?: string;
  color?: string;
  budget_amount: number;
  alert_threshold: number;
  spent: number;
  remaining: number;
  remaining_percent: number;
  sub_categories: BudgetSubCategory[];
  last_year_data?: { budget: number, spent: number };
  label?: "Fixed Committed" | "Variable Essential" | "Discretionary" | null;
}

export interface BudgetSubCategory {
  id: string;
  name: string;
  budget_amount: number;
  spent: number;
  remaining: number;
  is_active: boolean;
  last_year_data?: { budget: number, spent: number };
  first_used_date?: string;
  label?: "Fixed Committed" | "Variable Essential" | "Discretionary" | null;
}

export interface AnnualBudget {
  id: string;
  name: string;
  year: number;
  budget_type: string;
  start_date: string;
  is_active: boolean;
  isFallback?: boolean;
  categories: BudgetCategory[];
  total_budget: number;
  total_spent: number;
  total_remaining: number;
  category_groups: {
    income: BudgetCategory[];
    expenditure: BudgetCategory[];
    klintemarken: BudgetCategory[];
    special: BudgetCategory[];
  };
}

export const useAnnualBudget = (year?: number) => {
  const { user, userProfile, currentAccountId } = useAuth();
  const queryClient = useQueryClient();
  const targetYear = year || new Date().getFullYear();

  const { data: budget, isLoading, error } = useQuery<AnnualBudget | null>({
    queryKey: ['annual-budget', targetYear, currentAccountId],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const profileId = userProfile?.id || user?.id;
      if (!profileId) return null;

      // 1. Fetch Budget record for the target year
      let budgetData: any = null;

      // Try account_id + year first (preferred)
      if (currentAccountId) {
        // Prefer own user's budget, fall back to any in the account for this year
        const { data: ownBudget } = await (supabase as any)
          .from('budgets')
          .select('*')
          .eq('account_id', currentAccountId)
          .eq('year', targetYear)
          .eq('user_id', profileId)
          .maybeSingle();

        if (ownBudget) {
          budgetData = ownBudget;
        } else {
          const { data: acctBudget } = await (supabase as any)
            .from('budgets')
            .select('*')
            .eq('account_id', currentAccountId)
            .eq('year', targetYear)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          budgetData = acctBudget || null;
        }
      }

      // Fallback: user_id + year
      if (!budgetData) {
        const { data: userBudget } = await (supabase as any)
          .from('budgets')
          .select('*')
          .eq('user_id', profileId)
          .eq('year', targetYear)
          .maybeSingle();
        budgetData = userBudget || null;
      }

      // Final fallback: synthetic stub so UI renders without data
      if (!budgetData) {
        budgetData = {
          id: 'fallback-id',
          user_id: profileId,
          year: targetYear,
          name: `Budget ${targetYear}`,
          budget_type: 'unified',
          start_date: `${targetYear}-01-01`,
          is_active: true,
          isFallback: true
        };
      }

      // 2. Fetch Categories (try account_id first, fall back to user_id)
      let dbCategories: any[] = [];
      if (currentAccountId) {
        const { data, error: catError } = await (supabase as any)
          .from('categories')
          .select('*, sub_categories(id, name, display_order, budget_amount, label)')
          .eq('account_id', currentAccountId)
          .order('display_order', { ascending: true });
        if (!catError && data && data.length > 0) {
          dbCategories = data;
        }
      }
      // Fallback to user_id if account_id returned nothing
      if (dbCategories.length === 0) {
        const { data, error: catError } = await (supabase as any)
          .from('categories')
          .select('*, sub_categories(id, name, display_order, budget_amount, label)')
          .eq('user_id', profileId)
          .order('display_order', { ascending: true });
        if (catError) throw catError;
        dbCategories = data || [];
      }

      // 3. Fetch budget_category_limits (where the actual budget amounts live)
      let categoryBudgets: Record<string, number> = {};
      if (budgetData.id !== 'fallback-id') {
        const { data: limitsData } = await (supabase as any)
          .from('budget_category_limits')
          .select('category_id, sub_category_id, limit_amount, is_active')
          .eq('budget_id', budgetData.id);

        (limitsData || []).forEach((limit: any) => {
          if (limit.sub_category_id) {
            categoryBudgets[limit.sub_category_id] = Number(limit.limit_amount ?? 0);
            categoryBudgets[`${limit.category_id}-${limit.sub_category_id}-active`] = limit.is_active ? 1 : 0;
          } else {
            categoryBudgets[limit.category_id] = Number(limit.limit_amount ?? 0);
          }
        });
      }

      // 4. Fetch Transactions for the year
      let allYearTransactions: any[] = [];
      let from = 0;
      const CHUNK_SIZE = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = (supabase as any).from('transactions').select('*');
        if (currentAccountId) query = query.eq('account_id', currentAccountId);
        else query = query.or(`user_id.eq.${user?.id},user_id.eq.${profileId}`);

        const { data: chunk, error: fetchError } = await query
          .or(`budget_year.eq.${targetYear},and(budget_month.gte."${targetYear}-01-01",budget_month.lte."${targetYear}-12-31")`)
          .range(from, from + CHUNK_SIZE - 1);

        if (fetchError || !chunk || chunk.length === 0) {
          hasMore = false;
        } else {
          allYearTransactions = [...allYearTransactions, ...chunk];
          if (chunk.length < CHUNK_SIZE) hasMore = false;
          else from += CHUNK_SIZE;
        }
      }

      // 5. Build Budget Object with proper amounts from budget_category_limits
      const categories: BudgetCategory[] = dbCategories.map((cat: any) => {
        const catTransactions = allYearTransactions.filter(t => t.category === cat.name);
        const spent = catTransactions.reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);

        const subCategories = (cat.sub_categories || [])
          .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
          .map((sub: any) => {
            // Use budget_category_limits as source of truth; fall back to sub_categories.budget_amount
            const subBudgetAmount = categoryBudgets[sub.id] !== undefined
              ? categoryBudgets[sub.id]
              : (sub.budget_amount ?? 0);
            const subSpent = catTransactions.filter(t => t.sub_category === sub.name).reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);
            return {
              id: sub.id,
              name: sub.name,
              budget_amount: subBudgetAmount,
              spent: subSpent,
              remaining: subBudgetAmount - subSpent,
              is_active: categoryBudgets[`${cat.id}-${sub.id}-active`] !== 0,
              label: sub.label
            };
          });

        // Category total: use explicit category-level limit, otherwise sum sub-category limits
        const catBudgetAmount = categoryBudgets[cat.id] !== undefined
          ? categoryBudgets[cat.id]
          : subCategories.reduce((sum, sub) => sum + sub.budget_amount, 0);

        return {
          id: cat.id,
          name: cat.name,
          category_group: cat.category_group,
          display_order: cat.display_order,
          icon: cat.icon,
          color: cat.color,
          budget_amount: catBudgetAmount,
          alert_threshold: cat.alert_threshold || 80,
          spent,
          remaining: catBudgetAmount - spent,
          remaining_percent: catBudgetAmount > 0 ? Math.round(((catBudgetAmount - spent) / catBudgetAmount) * 100) : 0,
          label: cat.label,
          sub_categories: subCategories
        };
      });

      return {
        ...budgetData,
        categories,
        total_budget: categories.reduce((sum, c) => sum + c.budget_amount, 0),
        total_spent: categories.reduce((sum, c) => sum + c.spent, 0),
        total_remaining: categories.reduce((sum, c) => sum + c.remaining, 0),
        category_groups: {
          income: categories.filter(c => c.category_group === 'income'),
          expenditure: categories.filter(c => c.category_group === 'expenditure'),
          klintemarken: categories.filter(c => c.category_group === 'klintemarken'),
          special: categories.filter(c => c.category_group === 'special'),
        }
      };
    }
  });

  const refreshBudget = () => queryClient.invalidateQueries({ queryKey: ['annual-budget', targetYear, currentAccountId] });

  return { budget, loading: isLoading, error: error?.message || null, refreshBudget };
};

// --- RESTORED HOOKS FOR COMPATIBILITY ---

export const useCategories = () => {
  const { budget, loading, error } = useAnnualBudget();
  return { 
    categories: budget?.categories || [], 
    loading, 
    error 
  };
};

export const useUnifiedCategoryActions = () => {
  const queryClient = useQueryClient();
  const { currentAccountId } = useAuth();

  const addCategory = async (name: string) => {
    const { data: newCat, error } = await (supabase as any)
      .from('categories')
      .insert([{ 
        name, 
        account_id: currentAccountId, 
        category_group: 'expenditure',
        display_order: 100 
      }])
      .select()
      .single();

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['annual-budget'] });
    return newCat;
  };

  const addSubCategory = async (categoryName: string, subName: string) => {
    // 1. Find category ID
    const { data: cat } = await (supabase as any)
      .from('categories')
      .select('id')
      .eq('name', categoryName)
      .eq('account_id', currentAccountId)
      .maybeSingle();

    if (!cat) throw new Error(`Category ${categoryName} not found`);

    const { data: newSub, error } = await (supabase as any)
      .from('sub_categories')
      .insert([{
        category_id: cat.id,
        name: subName,
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['annual-budget'] });
    return newSub;
  };

  return { addCategory, addSubCategory };
};
