import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from './useSettings';

const DEFAULT_BUDGET_NAME = 'Primary 2025';
const DEFAULT_BUDGET_YEAR = 2025;

type CategoryQueryKey = (string | number | undefined | null)[];

export interface SubCategoryRecord {
  id: string;
  name: string;
  display_order?: number;
  budget_amount?: number;
  is_active?: boolean;
}

export interface BudgetCategoryRecord {
  id: string;
  name: string;
  category_group?: string;
  display_order?: number;
  is_system?: boolean;
  budget_amount?: number;
  icon?: string;
  sub_categories: SubCategoryRecord[];
}

const CATEGORY_QUERY_KEY = (profileId?: string, budgetId?: string | null): CategoryQueryKey => [
  'budget-categories',
  profileId,
  budgetId || 'default'
];

const BUDGET_QUERY_KEY = (profileId?: string): CategoryQueryKey => [
  'default-budget',
  profileId
];

const ALL_BUDGETS_QUERY_KEY = (profileId?: string): CategoryQueryKey => [
  'all-budgets',
  profileId
];

const fetchOrCreateDefaultBudget = async (profileId: string) => {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', profileId)
    .eq('name', DEFAULT_BUDGET_NAME)
    .eq('year', DEFAULT_BUDGET_YEAR)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  if (data) return data;

  const { data: inserted, error: insertError } = await supabase
    .from('budgets')
    .insert({
      user_id: profileId,
      name: DEFAULT_BUDGET_NAME,
      year: DEFAULT_BUDGET_YEAR,
      budget_type: 'primary',
      period_type: 'monthly',
      start_date: `${DEFAULT_BUDGET_YEAR}-01-01`,
      is_active: true
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return inserted;
};

const fetchCategories = async (profileId: string, budgetId?: string | null): Promise<BudgetCategoryRecord[]> => {
  const { data: categories, error } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      category_group,
      display_order,
      is_system,
      icon,
      sub_categories (
        id,
        name,
        display_order,
        budget_amount
      )
    `)
    .eq('user_id', profileId)
    .order('display_order', { ascending: true });

  if (error) throw error;

  let categoryBudgets: Record<string, number> = {};
  if (budgetId) {
    const { data: limitsData, error: limitsError } = await supabase
      .from('budget_category_limits')
      .select('category_id, sub_category_id, limit_amount, is_active')
      .eq('budget_id', budgetId);

    if (limitsError) throw limitsError;

    limitsData?.forEach((limit) => {
      if (limit.sub_category_id) {
        categoryBudgets[limit.sub_category_id] = Number(limit.limit_amount ?? 0);
        categoryBudgets[`${limit.category_id}-${limit.sub_category_id}-active`] = limit.is_active ? 1 : 0;
      } else {
        categoryBudgets[limit.category_id] = Number(limit.limit_amount ?? 0);
      }
    });
  }

  return (categories || []).map((category) => ({
    ...category,
    budget_amount: categoryBudgets[category.id] ?? 0,
    sub_categories: (category.sub_categories || [])
      .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((sub: any) => ({
        ...sub,
        budget_amount: sub.budget_amount ?? 0,
        is_active: categoryBudgets[`${category.id}-${sub.id}-active`] !== 0
      }))
  }));
};

const fetchAllBudgets = async (profileId: string) => {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', profileId)
    .order('year', { ascending: true });

  if (error) throw error;
  return data || [];
};

const fetchCategoriesWithMultiYearLimits = async (profileId: string, budgetIds: string[]): Promise<any[]> => {
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      category_group,
      display_order,
      is_system,
      icon,
      sub_categories (
        id,
        name,
        display_order
      )
    `)
    .eq('user_id', profileId)
    .order('display_order', { ascending: true });

  if (catError) throw catError;

  if (budgetIds.length === 0) {
    return (categories || []).map(cat => ({
      ...cat,
      limits: {},
      sub_categories: (cat.sub_categories || []).map((sub: any) => ({
        ...sub,
        limits: {}
      }))
    }));
  }

  const { data: limitsData, error: limitsError } = await supabase
    .from('budget_category_limits')
    .select('*')
    .in('budget_id', budgetIds);

  if (limitsError) throw limitsError;

  const limitsMap: Record<string, Record<string, any>> = {};
  limitsData?.forEach(limit => {
    if (!limitsMap[limit.budget_id]) limitsMap[limit.budget_id] = {};
    const key = limit.sub_category_id || limit.category_id;
    limitsMap[limit.budget_id][key] = limit;
  });

  return (categories || []).map(cat => ({
    ...cat,
    limits: budgetIds.reduce((acc, bId) => {
      acc[bId] = limitsMap[bId]?.[cat.id] || { is_active: true };
      return acc;
    }, {} as Record<string, any>),
    sub_categories: (cat.sub_categories || [])
      .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((sub: any) => ({
        ...sub,
        limits: budgetIds.reduce((acc, bId) => {
          acc[bId] = limitsMap[bId]?.[sub.id] || { is_active: true };
          return acc;
        }, {} as Record<string, any>)
      }))
  }));
};

const useCategoryMutations = (profileId?: string, budgetId?: string | null) => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['budget-categories'] });
    queryClient.invalidateQueries({ queryKey: ['multi-year-categories'] });
  };

  const addCategory = useMutation({
    mutationFn: async ({ name, categoryGroup }: { name: string; categoryGroup?: string }) => {
      const { error } = await supabase
        .from('categories')
        .insert({
          user_id: profileId,
          name,
          category_group: categoryGroup || 'expenditure',
          display_order: 0
        });
      if (error) throw error;
    },
    onSuccess: invalidate
  });

  const renameCategory = useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: string; name: string }) => {
      const { error } = await supabase.from('categories').update({ name }).eq('id', categoryId);
      if (error) throw error;
    },
    onSuccess: invalidate
  });

  const deleteCategory = useMutation({
    mutationFn: async ({ categoryId }: { categoryId: string }) => {
      const { error } = await supabase.from('categories').delete().eq('id', categoryId);
      if (error) throw error;
    },
    onSuccess: invalidate
  });

  const updateCategoryIcon = useMutation({
    mutationFn: async ({ categoryId, icon }: { categoryId: string; icon: string }) => {
      const { error } = await supabase.from('categories').update({ icon }).eq('id', categoryId);
      if (error) throw error;
    },
    onSuccess: invalidate
  });

  const reorderCategories = useMutation({
    mutationFn: async ({ orderedIds }: { orderedIds: string[] }) => {
      await Promise.all(orderedIds.map((id, index) =>
        supabase.from('categories').update({ display_order: index }).eq('id', id)
      ));
    },
    onSuccess: invalidate
  });

  const addSubCategory = useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: string; name: string }) => {
      const { error } = await supabase.from('sub_categories').insert({ category_id: categoryId, name, display_order: 0 });
      if (error) throw error;
    },
    onSuccess: invalidate
  });

  const renameSubCategory = useMutation({
    mutationFn: async ({ subCategoryId, name }: { subCategoryId: string; name: string }) => {
      const { error } = await supabase.from('sub_categories').update({ name }).eq('id', subCategoryId);
      if (error) throw error;
    },
    onSuccess: invalidate
  });

  const deleteSubCategory = useMutation({
    mutationFn: async ({ subCategoryId }: { subCategoryId: string }) => {
      const { error } = await supabase.from('sub_categories').delete().eq('id', subCategoryId);
      if (error) throw error;
    },
    onSuccess: invalidate
  });

  const reorderSubCategories = useMutation({
    mutationFn: async ({ categoryId, orderedIds }: { categoryId: string; orderedIds: string[] }) => {
      await Promise.all(orderedIds.map((id, index) =>
        supabase.from('sub_categories').update({ display_order: index }).eq('id', id).eq('category_id', categoryId)
      ));
    },
    onSuccess: invalidate
  });

  const moveSubCategory = useMutation({
    mutationFn: async ({ subCategoryId, targetCategoryId, newName }: { subCategoryId: string; targetCategoryId: string; newName?: string }) => {
      const updates: any = { category_id: targetCategoryId };
      if (newName) updates.name = newName;
      const { error } = await supabase.from('sub_categories').update(updates).eq('id', subCategoryId);
      if (error) throw error;
    },
    onSuccess: invalidate
  });

  const updateSubCategoryBudget = useMutation({
    mutationFn: async ({ subCategoryId, categoryId, amount, targetBudgetId }: { subCategoryId: string; categoryId: string; amount: number; targetBudgetId?: string }) => {
      const bid = targetBudgetId || budgetId;
      if (!bid) throw new Error('Missing budget id');
      const { error } = await supabase.from('budget_category_limits').upsert({
        budget_id: bid,
        category_id: categoryId,
        sub_category_id: subCategoryId || null,
        limit_amount: amount,
        is_active: true
      }, { onConflict: 'budget_id,sub_category_id' });
      if (error) throw error;
    },
    onSuccess: invalidate
  });

  const toggleSubCategoryActive = useMutation({
    mutationFn: async ({ subCategoryId, categoryId, active, targetBudgetId }: { subCategoryId: string; categoryId: string; active: boolean; targetBudgetId?: string }) => {
      const bid = targetBudgetId || budgetId;
      if (!bid) throw new Error('Missing budget id');
      const { error } = await supabase.from('budget_category_limits').upsert({
        budget_id: bid,
        category_id: categoryId,
        sub_category_id: subCategoryId,
        limit_amount: 0, // Required field
        is_active: active
      }, { onConflict: 'budget_id,sub_category_id' });
      if (error) throw error;
    },
    onSuccess: invalidate
  });

  return {
    addCategory, renameCategory, deleteCategory, reorderCategories,
    addSubCategory, renameSubCategory, deleteSubCategory, reorderSubCategories,
    moveSubCategory, updateSubCategoryBudget, toggleSubCategoryActive, updateCategoryIcon
  };
};

export const useMultiYearBudgets = () => {
  const { userProfile } = useAuth();
  const profileId = userProfile?.id;
  const budgetsQuery = useQuery({
    queryKey: ALL_BUDGETS_QUERY_KEY(profileId),
    queryFn: () => fetchAllBudgets(profileId!),
    enabled: !!profileId
  });
  const budgetIds = budgetsQuery.data?.map(b => b.id) || [];
  const categoriesQuery = useQuery({
    queryKey: ['multi-year-categories', profileId, budgetIds.join(',')],
    queryFn: () => fetchCategoriesWithMultiYearLimits(profileId!, budgetIds),
    enabled: !!profileId
  });
  const mutations = useCategoryMutations(profileId, null);
  return {
    budgets: budgetsQuery.data || [],
    categories: categoriesQuery.data || [],
    isLoading: budgetsQuery.isLoading || categoriesQuery.isLoading,
    error: budgetsQuery.error || categoriesQuery.error,
    refresh: () => { budgetsQuery.refetch(); categoriesQuery.refetch(); },
    ...mutations
  };
};

export const useBudgetCategoriesManager = () => {
  const { userProfile } = useAuth();
  const profileId = userProfile?.id;
  const { data: budget, isLoading: bLoading } = useDefaultBudget(profileId);
  const { data: categories, isLoading: cLoading } = useBudgetCategoriesData(profileId, budget?.id ?? null);
  const mutations = useCategoryMutations(profileId, budget?.id ?? null);
  return {
    categories: categories || [],
    budgetId: budget?.id ?? null,
    isLoading: bLoading || cLoading,
    ...mutations
  };
};

export const useDefaultBudget = (profileId?: string) => {
  return useQuery({
    queryKey: BUDGET_QUERY_KEY(profileId),
    queryFn: () => {
      if (!profileId) throw new Error('Missing profile id');
      return fetchOrCreateDefaultBudget(profileId);
    },
    enabled: !!profileId
  });
};

export const useBudgetCategoriesData = (profileId?: string, budgetId?: string | null) => {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEY(profileId, budgetId),
    queryFn: () => {
      if (!profileId) throw new Error('Missing profile id');
      return fetchCategories(profileId, budgetId);
    },
    enabled: !!profileId
  });
};

export const useBudgetCategoryActions = () => {
  const { userProfile } = useAuth();
  const profileId = userProfile?.id;
  const { data: budget } = useDefaultBudget(profileId);
  return useCategoryMutations(profileId, budget?.id ?? null);
};

export const useBudgetCategoryActionsForBudget = (budgetId?: string | null) => {
  const { userProfile } = useAuth();
  return useCategoryMutations(userProfile?.id, budgetId ?? null);
};

// ... existing imports ...

export interface BudgetGroupRecord {
  id: string;
  name: string;
  slug: string;
  type: 'system' | 'feeder';
  display_order: number;
  is_collapsed_by_default: boolean;
}

// ... existing code ...

const fetchBudgetGroups = async (profileId: string) => {
  const { data, error } = await supabase
    .from('budget_groups' as any)
    .select('*')
    .eq('user_id', profileId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data as BudgetGroupRecord[];
};

export const useBudgetGroups = () => {
  const { userProfile } = useAuth();
  const profileId = userProfile?.id;
  const queryClient = useQueryClient();

  const { data: groups, isLoading, error } = useQuery({
    queryKey: ['budget-groups', profileId],
    queryFn: () => {
      if (!profileId) throw new Error('Missing profile id');
      return fetchBudgetGroups(profileId);
    },
    enabled: !!profileId
  });



  const addGroup = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      // Generate slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const { data: group, error } = await supabase
        .from('budget_groups' as any)
        .insert({
          user_id: profileId,
          name,
          slug,
          type: 'feeder',
          display_order: (groups?.length || 0) + 1,
          is_collapsed_by_default: true
        })
        .select()
        .single();

      if (error) throw error;

      // Enforce default categories: "Income" and "Expense"
      // We prefix them with the group name to satisfy unique constraints (user_id, name)
      // The UI will strip this prefix for display
      const incomeName = `${name} - Income`;
      const expenseName = `${name} - Expense`;

      const { error: catError } = await supabase
        .from('categories')
        .insert([
          { user_id: profileId, name: incomeName, category_group: slug, display_order: 0, is_system: false },
          { user_id: profileId, name: expenseName, category_group: slug, display_order: 1, is_system: false }
        ]);

      if (catError) {
        // Best effort rollback - if simple cleanup fails, user might have partial state but it's rare
        await supabase.from('budget_groups' as any).delete().eq('id', group.id);
        throw catError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-groups'] });
      queryClient.invalidateQueries({ queryKey: ['budget-categories'] });
      queryClient.invalidateQueries({ queryKey: ['multi-year-categories'] });
    }
  });

  const deleteGroup = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from('budget_groups' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-groups'] });
    }
  });

  return {
    groups: groups || [],
    isLoading,
    error,
    addGroup,
    deleteGroup
  };
};

export const useCategorySource = () => {
  const { userProfile } = useAuth();
  const profileId = userProfile?.id;
  const { settings } = useSettings();

  const { data: dbCategories, isLoading } = useBudgetCategoriesData(profileId, null);
  const { groups } = useBudgetGroups(); // Fetch groups to potentially map later or just expose

  const hasDbData = !!profileId && dbCategories && dbCategories.length > 0;

  const categories = useMemo(() => {
    if (hasDbData) return dbCategories.map(c => c.name);
    return settings.categories || [];
  }, [hasDbData, dbCategories, settings.categories]);

  const subCategories = useMemo(() => {
    if (hasDbData) {
      const map: Record<string, string[]> = {};
      dbCategories.forEach(c => {
        map[c.name] = (c.sub_categories || []).map((s: any) => s.name);
      });
      return map;
    }
    return settings.subCategories || {};
  }, [hasDbData, dbCategories, settings.subCategories]);

  return {
    categories,
    subCategories,
    isLoading,
    isLocal: !hasDbData,
    groups: hasDbData ? groups : []
  };
};

