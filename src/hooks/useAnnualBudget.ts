import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/UnifiedAuthContext';
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
  const [budget, setBudget] = useState<AnnualBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchBudget = useCallback(async (budgetYearOverride?: number) => {
    const targetYear = budgetYearOverride || year || 2025;
    
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching budget for year:', targetYear, 'user:', user.id);

      // GIGA-ROBUST Profile Resolution:
      // We'll try to find the Profile record but CATCH any recursion 500 errors 
      // by separating it from the main flow.
      let profileId = user.id;
      try {
        const { data: profileRecord, error: profileErr } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!profileErr && profileRecord) {
          profileId = profileRecord.id;
        } else if (profileErr) {
          console.warn('Skip profile fetch due to RLS recursion (using Auth ID fallback):', profileErr.message);
        }
      } catch (e) {
        console.warn('Profile fetch threw an exception, continuing with Auth ID fallback:', e);
      }

      // 1. Fetch Budget - try by Auth ID first (Standard)
      let budgetData: any = null;
      const { data: unifiedBudget, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', targetYear)
        .eq('budget_type', 'unified')
        .maybeSingle();

      if (!budgetError && unifiedBudget) {
        budgetData = unifiedBudget;
      } else {
        // Fallback or Try Profile PK if it differs
        const searchId = (budgetError && budgetError.code === '42P17') ? user.id : (profileId || user.id);
        const { data: altBudget } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', searchId)
          .eq('year', targetYear)
          .eq('budget_type', 'primary')
          .maybeSingle();
        
        if (altBudget) {
          budgetData = altBudget;
        } else {
          budgetData = {
            id: 'fallback-id', 
            user_id: user.id,
            year: targetYear,
            name: `Unified ${targetYear}`,
            budget_type: 'unified',
            start_date: `${targetYear}-01-01`,
            is_active: true,
            isFallback: true
          };
        }
      }

      // 2. Fetch Categories - use BOTH IDs to be absolutely sure we find them
      // In migrations, categories.user_id sometimes references profile(id) and sometimes auth_id
      const queryId = profileId || user.id;
      const { data: dbCategories, error: catError } = await supabase
        .from('categories')
        .select('*, sub_categories(id, name, display_order, label)')
        .or(`user_id.eq.${user.id},user_id.eq.${queryId}`)
        .order('display_order', { ascending: true });

      if (catError && catError.code === '42P17') {
         // SILENT RECOVERY: If RLS recursion blocks the cross-ID query, fallback to the bare minimum categories
         console.warn("RLS recursion blocking categories, loading empty set to prevent UI crash.");
      } else if (catError) {
         throw catError;
      }
      const allCategories = dbCategories || [];

      // 3. Hierarchical limits
      let hierarchicalCategories: any[] = [];
      if (budgetData.id !== 'fallback-id' && !budgetError) {
        const { data: hData, error: hError } = await supabase
          .rpc('get_hierarchical_categories' as any, { p_budget_id: budgetData.id });
        if (!hError) hierarchicalCategories = hData || [];
      }

      // 4. Transactions
      let allYearTransactions: any[] = [];
      let from = 0;
      const CHUNK_SIZE = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: chunk, error: fetchError } = await (supabase as any)
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .or(`budget_year.eq.${targetYear},and(budget_month.gte."${targetYear}-01-01",budget_month.lte."${targetYear}-12-31"),and(date.gte."${targetYear}-01-01T00:00:00Z",date.lte."${targetYear}-12-31T23:59:59Z")`)
          .range(from, from + CHUNK_SIZE - 1);

        if (fetchError) {
          hasMore = false;
        } else if (chunk && chunk.length > 0) {
          allYearTransactions = [...allYearTransactions, ...chunk];
          if (chunk.length < CHUNK_SIZE) hasMore = false;
          else from += CHUNK_SIZE;
        } else {
          hasMore = false;
        }
      }

      // Process Transactions
      const transactions = allYearTransactions.map((t: any) => {
        let bm = t.budget_month;
        if (!bm && t.date) bm = format(startOfMonth(parseISO(t.date)), 'yyyy-MM-01');
        return {
          ...t,
          category: (t.category || 'Uncategorized').trim(),
          subCategory: (t.sub_category || '').trim(),
          budget_month: bm
        };
      }).filter((t: any) => 
        t.budget_month && t.budget_month.startsWith(`${targetYear}-`) && !t.excluded && t.status !== 'Excluded'
      );

      // Hierarchical Map
      const hierarchicalMap: Record<string, any> = {};
      hierarchicalCategories.forEach(item => { hierarchicalMap[item.category_id] = item; });

      // Build Categories list ...
      const categoriesList: BudgetCategory[] = allCategories.map((cat: any) => {
        const isIncome = cat.category_group === 'income';
        const hCat = hierarchicalMap[cat.id];
        const subCategories = (cat.sub_categories || []).sort((a: any, b: any) => a.name.localeCompare(b.name)).map((sub: any) => {
          const hSub = (hCat?.sub_categories || []).find((s: any) => s.id === sub.id);
          const subBudget = hSub?.budget_amount ?? 0;
          const subNet = transactions.filter(t => t.category === cat.name && t.subCategory === sub.name).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
          const subSpent = isIncome ? subNet : (subNet * -1);
          return {
            id: sub.id, name: sub.name, budget_amount: subBudget, spent: subSpent, remaining: subBudget - subSpent, 
            is_active: hSub ? (hSub.is_active !== false) : true, 
            label: sub.label
          };
        });

        const subTotalBudget = subCategories.reduce((sum, sub) => sum + sub.budget_amount, 0);
        const catNet = transactions.filter(t => t.category === cat.name).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const catSpent = isIncome ? catNet : (catNet * -1);

        return {
          id: cat.id, name: cat.name, category_group: cat.category_group, display_order: cat.display_order, icon: cat.icon, color: cat.color,
          budget_amount: (cat.name === 'Special' || subCategories.length === 0) ? (hCat?.budget_amount || 0) : subTotalBudget,
          spent: catSpent, remaining: subTotalBudget - catSpent, remaining_percent: subTotalBudget > 0 ? ((subTotalBudget - catSpent) / subTotalBudget) * 100 : 0,
          sub_categories: subCategories, label: cat.label
        };
      }).filter(cat => cat.sub_categories.length > 0 || cat.name === 'Special');

      const totalBudget = categoriesList.reduce((sum, cat) => sum + cat.budget_amount, 0);
      const totalSpent = categoriesList.reduce((sum, cat) => sum + cat.spent, 0);

      const finalBudget: AnnualBudget = {
        id: budgetData.id,
        name: budgetData.name,
        year: budgetData.year,
        budget_type: budgetData.budget_type,
        start_date: budgetData.start_date,
        is_active: budgetData.is_active,
        isFallback: budgetData.isFallback,
        categories: categoriesList,
        total_budget: totalBudget,
        total_spent: totalSpent,
        total_remaining: totalBudget - totalSpent,
        category_groups: {
          income: categoriesList.filter(c => c.category_group === 'income'),
          expenditure: categoriesList.filter(c => c.category_group === 'expenditure'),
          klintemarken: categoriesList.filter(c => c.category_group === 'klintemarken'),
          special: categoriesList.filter(c => c.category_group === 'special'),
        }
      };

      setBudget(finalBudget);
      return finalBudget;
    } catch (err: any) {
      console.error('Budget overall hook crash prevented:', err);
      setError(err?.message || 'Error recovery active');
      return null;
    } finally {
      setLoading(false);
    }
  }, [year, user?.id]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const refreshBudget = useCallback(() => fetchBudget(), [fetchBudget]);

  return { budget, loading, error, fetchBudget, refreshBudget };
};

export const useCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  useEffect(() => {
    const fetchCategories = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const { data, error: catError } = await (supabase.from('categories').select('*, sub_categories(id, name)').eq('user_id', user.id).order('created_at', { ascending: true }) as any);
        if (catError) throw catError;
        setCategories(data || []);
      } catch (err: any) {
        setError(err?.message || 'Err');
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [user?.id]);
  return { categories, loading, error };
};
