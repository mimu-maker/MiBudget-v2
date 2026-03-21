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

  const fetchBudget = useCallback(async (budgetYear?: number) => {
    // Only show loading spinner on initial load, not on refreshes
    if (!budget) {
      setLoading(true);
    }
    setError(null);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Fetching budget for year:', budgetYear || 2025, 'user:', user.id);

      // Get user profile - try multiple approaches
      let profile = null;

      // Method 1: Direct user_id lookup
      const { data: profile1, error: error1 } = await supabase
        .from('user_profiles')
        .select('id, user_id, email')
        .eq('user_id', user.id)
        .single();

      if (!error1 && profile1) {
        profile = profile1;
        console.log('Found profile via user_id:', profile);
      } else {
        console.log('Method 1 failed:', error1);

        // Method 2: Email lookup
        const { data: profile2, error: error2 } = await supabase
          .from('user_profiles')
          .select('id, user_id, email')
          .eq('email', user.email || '')
          .single();

        if (!error2 && profile2) {
          profile = profile2;
          console.log('Found profile via email:', profile);
        } else {
          console.log('Method 2 failed:', error2);

          // Method 3: Get any profile (for debugging)
          const { data: allProfiles, error: error3 } = await supabase
            .from('user_profiles')
            .select('id, user_id, email')
            .limit(5);

          console.log('All profiles in database:', allProfiles, error3);
          throw new Error(`User profile not found. Tried user_id lookup and email lookup. Auth user: ${user.id} / ${user.email}`);
        }
      }

      // Get unified budget for the specified year (default to 2025)
      const targetYear = budgetYear || 2025;

      let budgetData: any;

      if (profile.user_id === '00000000-0000-0000-0000-000000000002') {
        budgetData = {
          id: '00000000-0000-0000-0000-000000000003',
          user_id: profile.id,
          year: targetYear,
          name: `Unified ${targetYear}`,
          budget_type: 'unified',
          start_date: `${targetYear}-01-01`,
          is_active: true,
          isFallback: false
        };
      } else {
        const { data: unifiedBudget, error: budgetError } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', profile.id)
          .eq('year', targetYear)
          .eq('budget_type', 'unified')
          .maybeSingle();

        if (budgetError || !unifiedBudget) {
          if (budgetError) console.warn('Unified search error:', budgetError.message);

          // Fallback to primary budget
          const { data: primaryBudget, error: primaryError } = await supabase
            .from('budgets')
            .select('*')
            .eq('user_id', profile.id)
            .eq('year', targetYear)
            .eq('budget_type', 'primary')
            .maybeSingle();

          if (primaryError) throw primaryError;

          if (!primaryBudget) {
            console.log(`No existing budget found for ${targetYear}, providing fallback template.`);
            budgetData = {
              id: 'fallback-id', // Will be handled by mutations as a request to create
              user_id: profile.id,
              year: targetYear,
              name: `Unified ${targetYear}`,
              budget_type: 'unified',
              start_date: `${targetYear}-01-01`,
              is_active: true,
              isFallback: true
            };
          } else {
            budgetData = primaryBudget;
          }
        } else {
          budgetData = unifiedBudget;
        }
      }

      console.log('Found budget:', budgetData);

      // 1. Fetch ALL categories and subcategories first (the master list)
      let allCategories: any[] = [];
      let hierarchicalCategories: any[] = [];
      let allYearTransactions: any[] = [];

      if (profile.user_id === '00000000-0000-0000-0000-000000000002') {
        allCategories = [
          { id: 'c1', name: 'Income', category_group: 'income', display_order: 1, icon: 'Wallet', color: '#22c55e', sub_categories: [{id: 's1', name: 'Salary', display_order: 1}, {id: 'inc2', name: 'Bonus', display_order: 2}, {id: 'inc3', name: 'Rental Income', display_order: 3}] },
          { id: 'c2', name: 'Housing', category_group: 'expenditure', display_order: 2, icon: 'Home', color: '#3b82f6', sub_categories: [{id: 's2', name: 'Mortgage', display_order: 1, label: 'Fixed Committed'}, {id: 'hou2', name: 'Electricity', display_order: 2, label: 'Variable Essential'}, {id: 'hou3', name: 'Water & Gas', display_order: 3, label: 'Variable Essential'}, {id: 'hou4', name: 'Internet', display_order: 4, label: 'Fixed Committed'}, {id: 'hou5', name: 'HOA Fees', display_order: 5, label: 'Fixed Committed'}] },
          { id: 'c3', name: 'Transport', category_group: 'expenditure', display_order: 3, icon: 'Car', color: '#f59e0b', sub_categories: [{id: 's3', name: 'Car Payment', display_order: 1, label: 'Fixed Committed'}, {id: 's4', name: 'Fuel', display_order: 2, label: 'Variable Essential'}, {id: 'trn3', name: 'Maintenance', display_order: 3, label: 'Variable Essential'}, {id: 'trn4', name: 'Public Transit', display_order: 4, label: 'Variable Essential'}, {id: 'trn5', name: 'Parking', display_order: 5, label: 'Variable Essential'}] },
          { id: 'c4', name: 'Food', category_group: 'expenditure', display_order: 4, icon: 'Utensils', color: '#ef4444', sub_categories: [{id: 's5', name: 'Groceries', display_order: 1, label: 'Variable Essential'}, {id: 's6', name: 'Dining Out', display_order: 2, label: 'Discretionary'}, {id: 'foo3', name: 'Coffee Shops', display_order: 3, label: 'Discretionary'}, {id: 'foo4', name: 'Delivery', display_order: 4, label: 'Discretionary'}] },
          { id: 'c5', name: 'Insurance', category_group: 'expenditure', display_order: 5, icon: 'ShieldCheck', color: '#8b5cf6', sub_categories: [{id: 's7', name: 'Home', display_order: 1, label: 'Fixed Committed'}, {id: 'ins2', name: 'Auto', display_order: 2, label: 'Fixed Committed'}, {id: 'ins3', name: 'Health', display_order: 3, label: 'Fixed Committed'}, {id: 'ins4', name: 'Life', display_order: 4, label: 'Fixed Committed'}] },
          { id: 'c6', name: 'Shopping', category_group: 'expenditure', display_order: 6, icon: 'ShoppingBag', color: '#ec4899', sub_categories: [{id: 's8', name: 'Electronics', display_order: 1, label: 'Discretionary'}, {id: 's9', name: 'Clothing', display_order: 2, label: 'Discretionary'}, {id: 'sho3', name: 'Personal Care', display_order: 3, label: 'Discretionary'}, {id: 'sho4', name: 'Hobbies', display_order: 4, label: 'Discretionary'}, {id: 'sho5', name: 'Gifts', display_order: 5, label: 'Discretionary'}] },
          { id: 'c7', name: 'Slush Fund', category_group: 'special', display_order: 7, icon: 'PiggyBank', color: '#14b8a6', sub_categories: [{id: 's10', name: 'Travel', display_order: 1}, {id: 's11', name: 'Home Repair', display_order: 2}, {id: 's12', name: 'Transport', display_order: 3}, {id: 's13', name: 'Events', display_order: 4}, {id: 's14', name: 'Pets', display_order: 5}, {id: 'slu6', name: 'Tech Gadgets', display_order: 6}, {id: 'slu7', name: 'Furniture', display_order: 7}] }
        ];
        hierarchicalCategories = [
          { category_id: 'c1', sub_categories: [{id: 's1', budget_amount: 11000}, {id: 'inc2', budget_amount: 0}, {id: 'inc3', budget_amount: 1500}] },
          { category_id: 'c2', sub_categories: [{id: 's2', budget_amount: 2800}, {id: 'hou2', budget_amount: 100}, {id: 'hou3', budget_amount: 60}, {id: 'hou4', budget_amount: 90}, {id: 'hou5', budget_amount: 200}] },
          { category_id: 'c3', sub_categories: [{id: 's3', budget_amount: 800}, {id: 's4', budget_amount: 200}, {id: 'trn3', budget_amount: 80}, {id: 'trn4', budget_amount: 0}, {id: 'trn5', budget_amount: 0}] },
          { category_id: 'c4', sub_categories: [{id: 's5', budget_amount: 600}, {id: 's6', budget_amount: 250}, {id: 'foo3', budget_amount: 80}, {id: 'foo4', budget_amount: 80}] },
          { category_id: 'c5', sub_categories: [{id: 's7', budget_amount: 150}, {id: 'ins2', budget_amount: 100}, {id: 'ins3', budget_amount: 100}, {id: 'ins4', budget_amount: 50}] },
          { category_id: 'c6', sub_categories: [{id: 's8', budget_amount: 50}, {id: 's9', budget_amount: 120}, {id: 'sho3', budget_amount: 50}, {id: 'sho4', budget_amount: 50}, {id: 'sho5', budget_amount: 50}] },
          { category_id: 'c7', budget_amount: 1600, sub_categories: [{id: 's10', budget_amount: 600}, {id: 's11', budget_amount: 400}, {id: 's12', budget_amount: 0}, {id: 's13', budget_amount: 200}, {id: 's14', budget_amount: 100}, {id: 'slu6', budget_amount: 200}, {id: 'slu7', budget_amount: 100}] }
        ];

        try {
          const res = await fetch('/demo_data.json');
          if (res.ok) {
            allYearTransactions = await res.json();
          }
        } catch(e) {
          console.error("Failed to load demo transactions", e);
        }
      } else {
        const { data: dbCategories, error: allError } = await supabase
          .from('categories')
          .select('*, sub_categories(id, name, display_order, label)')
          .eq('user_id', profile.id)
          .order('display_order', { ascending: true });

        if (allError) throw allError;
        allCategories = dbCategories || [];

        // 2. Fetch hierarchical budget data (limits)
        if (budgetData.id !== 'fallback-id') {
          const { data, error: hierarchicalError } = await supabase
            .rpc('get_hierarchical_categories', { p_budget_id: budgetData.id });

          if (hierarchicalError) throw hierarchicalError;
          hierarchicalCategories = data || [];
        }

        // 2.5 FETCH ACTUAL TRANSACTIONS for spent calculation (Frontend Override)
        let from = 0;
        const CHUNK_SIZE = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: chunk, error: fetchError } = await (supabase as any)
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .not('budget', 'eq', 'Exclude')
            .or(`budget_year.eq.${targetYear},and(budget_month.gte."${targetYear}-01-01",budget_month.lte."${targetYear}-12-31"),and(date.gte."${targetYear}-01-01T00:00:00Z",date.lte."${targetYear}-12-31T23:59:59Z")`)
            .range(from, from + CHUNK_SIZE - 1);

          if (fetchError) {
            console.warn('Error fetching budget transactions chunk:', fetchError.message);
            hasMore = false;
          } else if (chunk && chunk.length > 0) {
            allYearTransactions = [...allYearTransactions, ...chunk];
            if (chunk.length < CHUNK_SIZE) hasMore = false;
            else from += CHUNK_SIZE;
          } else {
            hasMore = false;
          }
        }
      }

      console.log(`[useAnnualBudget] Total Transactions Fetched for ${targetYear}:`, allYearTransactions.length);
      const yearTransactions = allYearTransactions;

      // Map to standardized Transaction structure
      const transactions = (yearTransactions || []).map((t: any) => {
        const sourceName = t.source || t.merchant || 'Unknown';
        let budget_month = t.budget_month;
        let budget_year = t.budget_year;

        if (!budget_month || !budget_year) {
          const d = parseISO(t.date);
          if (!isNaN(d.getTime())) {
            budget_month = budget_month || format(startOfMonth(d), 'yyyy-MM-01');
            budget_year = budget_year || d.getFullYear();
          }
        }

        return {
          ...t,
          source: sourceName,
          budget_month,
          budget_year,
          category: (t.category || 'Uncategorized').trim(),
          subCategory: (t.sub_category || '').trim(),
        };
      }).filter((t: any) => {
        const isMatch = t.budget_month && t.budget_month.startsWith(`${targetYear}-`);
        return isMatch && !t.excluded && t.status !== 'Excluded';
      });

      if (targetYear === 2025) {
        const totalAfterFilter = transactions.length;
        const groceries = transactions.filter(t => t.category === 'Food' && t.subCategory === 'Groceries');
        console.log('[useAnnualBudget 2025 DEBUG]:', {
          totalFetched: yearTransactions?.length,
          totalAfterYearFilter: totalAfterFilter,
          groceriesCount: groceries.length,
          groceriesSum: groceries.reduce((s, t) => s + (Number(t.amount) || 0), 0)
        });
      }

      // Fetch last year hierarchical data if exists
      let lastYearHierarchicalMap: Record<string, any> = {};

      // Try to find budget with same type first
      let { data: lastYearBudget } = await supabase
        .from('budgets')
        .select('id')
        .eq('user_id', profile.id)
        .eq('year', targetYear - 1)
        .eq('budget_type', budgetData.budget_type)
        .maybeSingle();

      // If not found, try fallback (e.g. if current is Unified but last year was Primary)
      if (!lastYearBudget) {
        const { data: fallbackBudget } = await supabase
          .from('budgets')
          .select('id')
          .eq('user_id', profile.id)
          .eq('year', targetYear - 1)
          .neq('budget_type', budgetData.budget_type) // Try the other type
          .maybeSingle();

        lastYearBudget = fallbackBudget;
      }

      if (lastYearBudget) {
        const { data: lastYearHierarchical, error: lastYearError } = await supabase
          .rpc('get_hierarchical_categories', { p_budget_id: lastYearBudget.id });

        if (!lastYearError && lastYearHierarchical) {
          (lastYearHierarchical || []).forEach((item: any) => {
            lastYearHierarchicalMap[item.category_id] = item;
          });
        }
      }

      // Map hierarchical data for easy lookup
      const hierarchicalMap: Record<string, any> = {};
      (hierarchicalCategories || []).forEach((item: any) => {
        hierarchicalMap[item.category_id] = item;
      });

      // 3. Build the combined list
      const categories: BudgetCategory[] = (allCategories || []).map((cat: any) => {
        const isIncome = cat.category_group === 'income';
        const hCat = hierarchicalMap[cat.id];

        const subCategories = (cat.sub_categories || [])
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
          .map((sub: any) => {
            const hSub = (hCat?.sub_categories || []).find((s: any) => s.id === sub.id);
            const subBudget = hSub?.budget_amount ?? 0;

            // Recalculate spent locally
            const subNet = transactions
              .filter(t => t.category === cat.name && t.subCategory === sub.name)
              .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

            if (sub.name === 'Groceries' && cat.name === 'Food') {
              const txs = transactions.filter(t => t.category === cat.name && t.subCategory === sub.name);
              const neg = txs.reduce((s, t) => s + (Number(t.amount) < 0 ? Number(t.amount) : 0), 0);
              const pos = txs.reduce((s, t) => s + (Number(t.amount) > 0 ? Number(t.amount) : 0), 0);
              console.log(`[DEBUG GROCERIES ${targetYear}]:`, {
                count: txs.length,
                net: subNet,
                negSum: neg,
                posSum: pos,
                oldCalc: Math.abs(neg),
                newCalc: subNet * -1,
                isExpenditure: !isIncome,
                sample: txs.slice(0, 5).map(t => ({ date: t.date, desc: t.description || t.source, amt: t.amount, bm: t.budget_month, by: t.budget_year }))
              });
            }

            const subSpent = isIncome ? subNet : (subNet * -1);

            const isActive = hSub ? (hSub.is_active !== false) : true;

            // Map last year's data ...
            const lastYearCat = lastYearHierarchicalMap[cat.id];
            const lastYearSub = (lastYearCat?.sub_categories || []).find((s: any) => s.id === sub.id);
            const lastYearData = lastYearSub ? {
              budget: lastYearSub.budget_amount,
              spent: lastYearSub.spent // Note: This might still be "wrong" for last year unless we recurse
            } : undefined;

            return {
              id: sub.id,
              name: sub.name,
              budget_amount: subBudget,
              spent: subSpent,
              remaining: subBudget - subSpent,
              is_active: isActive,
              last_year_data: lastYearData,
              label: sub.label,
            };
          });

        const subTotalBudget = subCategories.reduce((sum, sub) => sum + sub.budget_amount, 0);

        // Recalculate category-level spent locally
        const catNet = transactions
          .filter(t => t.category === cat.name)
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const catSpent = isIncome ? catNet : (catNet * -1);

        // Map last year's data for top-level category
        const lastYearCat = lastYearHierarchicalMap[cat.id];
        const lastYearData = lastYearCat ? {
          budget: lastYearCat.budget_amount,
          spent: lastYearCat.spent
        } : undefined;

        return {
          id: cat.id,
          name: cat.name,
          category_group: cat.category_group,
          display_order: cat.display_order,
          icon: cat.icon,
          color: cat.color,
          budget_amount: (cat.name === 'Special' || subCategories.length === 0) ? (hCat?.budget_amount || 0) : subTotalBudget,
          alert_threshold: 0,
          spent: catSpent,
          remaining: subTotalBudget - catSpent,
          remaining_percent: subTotalBudget > 0 ? ((subTotalBudget - catSpent) / subTotalBudget) * 100 : 0,
          sub_categories: subCategories,
          last_year_data: lastYearData,
          label: cat.label
        };
      }).filter(cat => cat.sub_categories.length > 0);

      // Group categories by category_group
      const categoryGroups = {
        income: categories.filter(cat => cat.category_group === 'income').sort((a, b) => a.name.localeCompare(b.name)),
        expenditure: categories.filter(cat => cat.category_group === 'expenditure').sort((a, b) => a.name.localeCompare(b.name)),
        klintemarken: categories.filter(cat => cat.category_group === 'klintemarken').sort((a, b) => a.name.localeCompare(b.name)),
        special: categories.filter(cat => cat.category_group === 'special').sort((a, b) => a.name.localeCompare(b.name))
      };

      const totalBudget = categories.reduce((sum, cat) => sum + cat.budget_amount, 0);
      const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
      const totalRemaining = totalBudget - totalSpent;

      const annualBudget: AnnualBudget = {
        id: budgetData.id,
        name: budgetData.name,
        year: budgetData.year,
        budget_type: budgetData.budget_type,
        start_date: budgetData.start_date,
        is_active: budgetData.is_active,
        isFallback: budgetData.isFallback,
        categories,
        total_budget: totalBudget,
        total_spent: totalSpent,
        total_remaining: totalRemaining,
        category_groups: categoryGroups
      };

      setBudget(annualBudget);
      return annualBudget;
    } catch (err) {
      console.error('Detailed error fetching annual budget:', err);
      // Extra details for Supabase errors
      if (err && typeof err === 'object' && 'message' in err) {
        setError(`${err.message}${('details' in err ? ': ' + err.details : '')}`);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch budget');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [year, user?.id]);

  useEffect(() => {
    fetchBudget(year);
  }, [year, user?.id]);

  const refreshBudget = useCallback(() => {
    return fetchBudget(year);
  }, [year, fetchBudget]);

  return {
    budget,
    loading,
    error,
    fetchBudget,
    refreshBudget
  };
};

// Export a hook to get all categories for Settings page
export const useCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profile) throw new Error('User profile not found');

        // Get categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*, sub_categories(id, name)')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: true });

        if (categoriesError) throw categoriesError;

        setCategories(categoriesData || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error
  };
};
