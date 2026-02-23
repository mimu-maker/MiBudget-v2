import { useState, useMemo } from 'react';
import { FutureTransaction, NewTransactionForm, ProjectionData, RecurringInterval } from '@/types/projection';
import ProjectionChart from '@/components/Projection/ProjectionChart';
import AddTransactionFormV2 from '@/components/Projection/AddTransactionFormV2';
import IncomeTransactionsTable from '@/components/Projection/IncomeTransactionsTable';
import ExpenseTransactionsTable from '@/components/Projection/ExpenseTransactionsTable';
import SlushFundTransactionsTable from '@/components/Projection/SlushFundTransactionsTable';
import SlushFundAddDialog from '@/components/Projection/SlushFundAddDialog';
import ProjectedIncomeTable from '@/components/Projection/ProjectedIncomeTable';
import PasteDataDialog from '@/components/Projection/PasteDataDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronDown, ChevronUp, Clock, History, TrendingUp, TrendingDown, Scale, ArrowUpRight, ArrowDownRight, Wallet, PieChart, Plus, Trash2, BarChart3 } from 'lucide-react';
import CreateScenarioDialog from '@/components/Projection/CreateScenarioDialog';
import SuggestProjectionsWizard from '@/components/Projection/SuggestProjectionsWizard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/formatUtils';
import { useAnnualBudget, BudgetCategory, BudgetSubCategory } from '@/hooks/useAnnualBudget';
import { useBudgetCategoryActionsForBudget } from '@/hooks/useBudgetCategories';
import { useSettings } from '@/hooks/useSettings';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { BudgetTable } from '@/components/Budget/BudgetTable';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const Projection = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteDialogType, setPasteDialogType] = useState<'income' | 'expense'>('income');
  const [showLegacy, setShowLegacy] = useState(false);
  const [showPastProjections, setShowPastProjections] = useState(false);
  const [showCreateScenario, setShowCreateScenario] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [disabledIncomeStreams, setDisabledIncomeStreams] = useState<Set<string>>(new Set());
  const [disabledExpenses, setDisabledExpenses] = useState<Set<string>>(new Set());
  const [slushDialogOpen, setSlushDialogOpen] = useState(false);
  const [slushEditingTx, setSlushEditingTx] = useState<FutureTransaction | null>(null);
  const currentYear = new Date().getFullYear();
  const selectedYear = currentYear.toString();

  // Budget Hooks
  const { budget, loading: budgetLoading, refreshBudget } = useAnnualBudget(currentYear);
  const { updateSubCategoryBudget: updateSubCategoryBudgetMutation } = useBudgetCategoryActionsForBudget(budget?.id);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // 1. Fetch ALL Projections (including Master)
  const { data: allProjectionsRaw = [], isLoading: isLoadingProjections } = useQuery<any[]>({
    queryKey: ['projections', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projections' as any)
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  // Map merchant -> source for frontend consistently
  const allProjections = useMemo(() =>
    allProjectionsRaw.map((p: any) => ({
      ...p,
      source: p.merchant || p.source // handle both just in case
    })),
    [allProjectionsRaw]
  );

  const projections = useMemo(() => {
    if (activeScenarioId) {
      return allProjections.filter(p => p.scenario_id === activeScenarioId);
    }
    return allProjections.filter(p => !p.scenario_id);
  }, [allProjections, activeScenarioId]);

  const masterProjectionsRaw = useMemo(() =>
    allProjections.filter(p => !p.scenario_id),
    [allProjections]
  );

  // 1.1 Fetch Scenarios
  const { data: scenarios = [] } = useQuery<any[]>({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  // 2. Fetch Actual Transactions (Complete only, last 13 months for averages)
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', 'complete', 'projection-trailing'],
    queryFn: async () => {
      const today = new Date();
      const thirteenMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 13, 1).toISOString().split('T')[0];

      let allData: any[] = [];
      let hasMore = true;
      let offset = 0;
      const limit = 1000; // Chunk size

      while (hasMore) {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('status', 'Complete')
          .gte('date', thirteenMonthsAgo)
          .order('date', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
          }
        } else {
          hasMore = false;
        }
      }

      return allData;
    }
  });

  const [newTransaction, setNewTransaction] = useState<NewTransactionForm>({
    date: new Date().toISOString().slice(0, 10),
    source: '',
    amount: '',
    category: 'Food',
    stream: '',
    planned: true,
    recurring: 'Monthly',
    description: ''
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const expandAll = (categories: string[]) => setExpandedCategories(new Set(categories));
  const collapseAll = () => setExpandedCategories(new Set());

  const handleUpdateBudget = async (parentCategory: BudgetCategory, subCategory: BudgetSubCategory, value: string, type: 'annual' | 'monthly' | 'percent', currentKey: string) => {
    try {
      const numValue = parseFloat(value) || 0;
      let newMonthlyAmount = subCategory.budget_amount || 0;
      const totalIncome = budget?.category_groups?.income?.reduce((sum, item) => sum + item.budget_amount, 0) || 0;

      switch (type) {
        case 'annual': newMonthlyAmount = numValue / 12; break;
        case 'monthly': newMonthlyAmount = numValue; break;
        case 'percent': {
          const effectiveIncome = totalIncome > 0 ? totalIncome : 0.01;
          newMonthlyAmount = (numValue / 100) * effectiveIncome;
          break;
        }
      }

      const roundedMonthly = Number(newMonthlyAmount.toFixed(2));

      if (activeScenarioId) {
        // SCENARIO MODE: Update or Create a Projection instead of changing the real budget
        const existingProj = projections.find(p => p.category === parentCategory.name && p.stream === subCategory.name);

        if (existingProj) {
          await updateProjectionMutation.mutateAsync({
            id: existingProj.id,
            updates: { amount: roundedMonthly }
          });
        } else {
          await addProjectionMutation.mutateAsync({
            category: parentCategory.name,
            stream: subCategory.name,
            amount: roundedMonthly,
            date: new Date(currentYear, 0, 1).toISOString().slice(0, 10),
            recurring: 'Monthly',
            planned: true,
            source: subCategory.name,
            description: `Scenario override for ${subCategory.name}`
          });
        }
        queryClient.invalidateQueries({ queryKey: ['projections'] });
      } else {
        // MASTER MODE: Standard budget update
        if (updateSubCategoryBudgetMutation) {
          await updateSubCategoryBudgetMutation.mutateAsync({
            subCategoryId: subCategory.id || null,
            categoryId: parentCategory.id,
            amount: roundedMonthly,
            targetBudgetId: budget?.id,
            year: currentYear
          });
          await refreshBudget();
        }
      }
    } catch (e) {
      console.error('Failed to update budget', e);
    } finally {
      setEditingBudget(prev => prev === currentKey ? null : prev);
    }
  };

  // Matching Logic: For each projection in the selected year, find matching actual transactions
  const matchProjectionsToActuals = (projList: any[], actualList: any[]) => {
    return projList.map(p => {
      const pSource = (p.source || p.merchant || '').toLowerCase();
      const projMonth = p.date?.slice(0, 7);

      const matches = actualList.filter(tx => {
        if (tx.projection_id === p.id) return true;
        if (tx.projection_id) return false;

        const txMonth = tx.date?.slice(0, 7);
        if (txMonth !== projMonth) return false;

        // Ensure category and stream (sub_category) match if specified
        if (tx.category !== p.category) return false;
        if (p.stream && tx.sub_category !== p.stream) return false;

        const txSource = (tx.source || tx.merchant || '').toLowerCase();
        const txCleanSource = (tx.clean_source || tx.clean_merchant || '').toLowerCase();

        return (txCleanSource && txCleanSource === pSource) || (txSource && txSource === pSource);
      });
      const actualAmount = matches.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      return {
        ...p,
        actual_amount: actualAmount,
        is_matched: matches.length > 0
      };
    });
  };

  const toggleIncomeStream = (name: string) => {
    setDisabledIncomeStreams(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleExpense = (name: string) => {
    // Fixed Committed and Variable Essential cannot be disabled
    if (name === 'Fixed Committed' || name === 'Variable Essential') return;

    setDisabledExpenses(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleBatchAdjust = async (label: string, subName: string | null, percentage: number) => {
    const group = primaryExpensesByLabel.find(g => g.name === label);
    if (!group) return;

    const itemsToUpdate = subName
      ? group.sub_categories.filter(s => s.name === subName)
      : group.sub_categories;

    for (const sub of itemsToUpdate) {
      const base = (sub as any).avg_6m || 0;
      const newValue = base * (1 + percentage / 100);

      if (!budget?.category_groups?.expenditure) continue;

      const [origCatName, origSubName] = sub.name.split(' - ');
      let foundParent: BudgetCategory | undefined;
      let foundSub: BudgetSubCategory | undefined;

      budget.category_groups.expenditure.forEach(cat => {
        if (cat.name === origCatName) {
          const s = cat.sub_categories.find(sc => sc.name === origSubName);
          if (s) {
            foundParent = cat;
            foundSub = s;
          }
        }
      });

      if (foundParent && foundSub) {
        await handleUpdateBudget(foundParent, foundSub, newValue.toFixed(2), 'monthly', '');
      }
    }
    toast({ title: "Updated", description: `Applied ${percentage}% adjustment to ${subName || label}` });
  };

  const futureTransactions = useMemo(() =>
    matchProjectionsToActuals(projections, transactions),
    [projections, transactions]
  );

  // Mutations
  const addProjectionMutation = useMutation({
    mutationFn: async (newP: any) => {
      const { data: userData } = await supabase.auth.getUser();
      // Map source -> merchant for DB
      const { source, ...rest } = newP;
      const dbPayload = {
        ...rest,
        merchant: source,
        user_id: userData.user?.id,
        scenario_id: activeScenarioId
      };

      const { error } = await (supabase.from('projections' as any) as any)
        .insert([dbPayload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projections'] });
      toast({ title: "Success", description: "Projection added successfully" });
    },
    onError: (error) => {
      console.error('Add Projection error:', error);
      toast({ title: "Error", description: "Failed to add projection", variant: "destructive" });
    }
  });

  const deleteProjectionMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const { error } = await supabase.from('projections' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projections'] });
      toast({ title: "Deleted", description: "Projection removed" });
    },
    onError: (error) => {
      console.error('Delete Projection error:', error);
      toast({ title: "Error", description: "Failed to delete projection", variant: "destructive" });
    }
  });

  const updateProjectionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string | number, updates: any }) => {
      // Map source -> merchant if present in updates
      const dbUpdates = { ...updates };
      if (updates.source) {
        dbUpdates.merchant = updates.source;
        delete dbUpdates.source;
      }

      const { error } = await (supabase.from('projections' as any) as any).update(dbUpdates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projections'] });
      toast({ title: "Updated", description: "Projection changes saved" });
    },
    onError: (error) => {
      console.error('Update Projection error:', error);
      toast({ title: "Error", description: "Failed to update projection", variant: "destructive" });
    }
  });

  // Derived Data
  const incomeData = budget?.category_groups?.income || [];
  const klintemarkenData = budget?.category_groups?.klintemarken || [];

  const specialCategoryNames = useMemo(() => {
    if (!budget?.category_groups?.special) return ['Slush Fund'];
    return [
      ...budget.category_groups.special.map(c => c.name),
      'Slush Fund' // Always include as fallback
    ];
  }, [budget]);

  const incomeTransactions = useMemo(() =>
    (futureTransactions as any[]).filter(t => t.amount >= 0 && (t.recurring !== 'N/A' || t.date?.slice(0, 4) >= currentYear.toString())),
    [futureTransactions, selectedYear]
  );

  const expenseTransactions = useMemo(() =>
    (futureTransactions as any[]).filter(t =>
      t.amount < 0 &&
      !specialCategoryNames.includes(t.category) &&
      (t.recurring !== 'N/A' || t.date?.slice(0, 4) >= currentYear.toString())
    ),
    [futureTransactions, selectedYear, specialCategoryNames]
  );

  const slushFundTransactions = useMemo(() =>
    (futureTransactions as any[]).filter(t =>
      t.amount < 0 &&
      specialCategoryNames.includes(t.category) &&
      (t.recurring !== 'N/A' || t.date?.slice(0, 4) >= currentYear.toString())
    ),
    [futureTransactions, selectedYear, specialCategoryNames]
  );

  const handleEditTransaction = (tx: FutureTransaction) => {
    setEditingId(tx.id);
    setTransactionType(tx.amount >= 0 ? 'income' : 'expense');
    setNewTransaction({
      date: tx.date,
      source: tx.source,
      amount: Math.abs(tx.amount).toString(),
      category: tx.category,
      stream: tx.stream,
      planned: tx.planned,
      recurring: tx.recurring,
      description: tx.description
    });
    setShowAddForm(true);
  };

  const subCategoryAverages = useMemo(() => {
    const avgs: Record<string, { avg6m: number, avg1y: number }> = {};
    const today = new Date();

    // Use start of current month for trailing calculation
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 12, 1);

    // Group transactions by normalized category-sub_category
    const grouped: Record<string, any[]> = {};
    (transactions as any[]).forEach(t => {
      if (!t.category) return;
      const cat = t.category.trim();
      const sub = (t.sub_category || '').trim();
      const key = `${cat}-${sub}`.toLowerCase();

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });

    Object.entries(grouped).forEach(([key, txs]) => {
      // User requested exact simple math: take last 180 days / 6, and last 365 days / 12.
      const sixMonthsAgo = new Date(today.getTime() - 182 * 24 * 60 * 60 * 1000);
      const twelveMonthsAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

      const sixMonthTotal = txs
        .filter(t => new Date(t.date) >= sixMonthsAgo && new Date(t.date) <= today)
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const twelveMonthTotal = txs
        .filter(t => new Date(t.date) >= twelveMonthsAgo && new Date(t.date) <= today)
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      avgs[key] = {
        avg6m: Math.abs(sixMonthTotal) / 6,
        avg1y: Math.abs(twelveMonthTotal) / 12
      };
    });

    return avgs;
  }, [transactions]);

  const primaryExpensesByLabel = useMemo(() => {
    if (!budget?.category_groups?.expenditure) return [];

    const labelGroups: Record<string, BudgetSubCategory[]> = {};

    budget.category_groups.expenditure.forEach(cat => {
      cat.sub_categories.forEach(sub => {
        const label = sub.label || 'Unlabeled';
        if (!labelGroups[label]) labelGroups[label] = [];

        // Match with normalized key
        const matchKey = `${cat.name}-${sub.name}`.toLowerCase();
        const avgData = subCategoryAverages[matchKey] || { avg6m: 0, avg1y: 0 };

        labelGroups[label].push({
          ...sub,
          name: `${cat.name} - ${sub.name}`,
          avg_6m: avgData.avg6m,
          avg_1y: avgData.avg1y
        } as any);
      });
    });

    const labelOrder = ['Fixed Committed', 'Variable Essential', 'Discretionary'];

    return Object.entries(labelGroups).map(([label, subcategories]) => {
      return {
        id: `label-${label}`,
        name: label,
        type: 'expense',
        budget_amount: subcategories.reduce((sum, sub) => sum + (sub.budget_amount || 0), 0),
        spent: subcategories.reduce((sum, sub) => sum + (sub.spent || 0), 0),
        avg_6m: subcategories.reduce((sum, sub) => sum + ((sub as any).avg_6m || 0), 0),
        avg_1y: subcategories.reduce((sum, sub) => sum + ((sub as any).avg_1y || 0), 0),
        sub_categories: subcategories.sort((a, b) => a.name.localeCompare(b.name))
      } as unknown as BudgetCategory;
    }).sort((a, b) => {
      const indexA = labelOrder.indexOf(a.name);
      const indexB = labelOrder.indexOf(b.name);
      if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [budget, subCategoryAverages]);

  const klintemarkenDataEnhanced = useMemo(() => {
    if (!budget?.category_groups?.klintemarken) return [];
    return budget.category_groups.klintemarken.map(cat => ({
      ...cat,
      avg_6m: cat.sub_categories.reduce((sum, sub) => {
        const matchKey = `${cat.name}-${sub.name}`.toLowerCase();
        const avgData = subCategoryAverages[matchKey] || { avg6m: 0, avg1y: 0 };
        return sum + avgData.avg6m;
      }, 0),
      avg_1y: cat.sub_categories.reduce((sum, sub) => {
        const matchKey = `${cat.name}-${sub.name}`.toLowerCase();
        const avgData = subCategoryAverages[matchKey] || { avg6m: 0, avg1y: 0 };
        return sum + avgData.avg1y;
      }, 0),
      sub_categories: cat.sub_categories.map(sub => {
        const matchKey = `${cat.name}-${sub.name}`.toLowerCase();
        const avgData = subCategoryAverages[matchKey] || { avg6m: 0, avg1y: 0 };
        return {
          ...sub,
          avg_6m: avgData.avg6m,
          avg_1y: avgData.avg1y
        };
      })
    }));
  }, [budget, subCategoryAverages]);

  const unlabeledCategories = useMemo(() => {
    if (!budget?.category_groups?.expenditure) return [];
    const unlabeled: string[] = [];
    budget.category_groups.expenditure.forEach(cat => {
      cat.sub_categories.forEach(sub => {
        if (!sub.label || sub.label.toLowerCase() === 'unlabeled') {
          unlabeled.push(`${cat.name} - ${sub.name}`);
        }
      });
    });
    return unlabeled.sort();
  }, [budget]);

  const projectionData = useMemo(() => {
    const calculateData = (txs: any[]) => {
      const data: ProjectionData[] = [];
      const yearNum = currentYear;

      const feederMonthlyTotal = klintemarkenData.reduce((sum, item) => {
        if (disabledExpenses.has(item.name)) return sum;
        return sum + (item.budget_amount || 0);
      }, 0);

      const expenseLabelBreakdownBase: Record<string, number> = {};
      primaryExpensesByLabel.forEach(labelCat => {
        if (disabledExpenses.has(labelCat.name)) return;
        const labelTotal = labelCat.sub_categories.reduce((s, sub) => {
          if (disabledExpenses.has(sub.name)) return s;
          return s + (sub.budget_amount || 0);
        }, 0);
        if (labelTotal > 0) {
          expenseLabelBreakdownBase[labelCat.name] = labelTotal;
        }
      });
      const expenseMonthlyTotal = Object.values(expenseLabelBreakdownBase).reduce((a, b) => a + b, 0);

      let runningBalance = 0;
      const today = new Date();
      const isCurrentYear = yearNum === today.getFullYear();
      const startMonth = isCurrentYear ? today.getMonth() : 0;

      for (let i = 0; i < 12; i++) {
        const monthIdx = (startMonth + i) % 12;
        const yearOffset = Math.floor((startMonth + i) / 12);
        const currentYearNum = yearNum + yearOffset;

        const monthDate = new Date(currentYearNum, monthIdx, 1);
        const monthKey = monthDate.toISOString().slice(0, 7);
        let income = 0;
        let slush = 0;
        const incomeBreakdown: Record<string, number> = {};
        const slushBreakdown: Record<string, number> = {};

        // 1. Process Income from Budget Categories (merging with overrides in projections)
        budget?.category_groups?.income?.forEach(cat => {
          cat.sub_categories.forEach(sub => {
            if (disabledIncomeStreams.has(sub.name)) return;

            // Find ALL potential projections for this stream
            const matches = txs.filter(t =>
              (t.stream === sub.name && t.category === cat.name) ||
              (t.source === sub.name && (t.category === 'Income' || t.category === cat.name))
            );

            let amount = sub.budget_amount;

            // Check for overrides in any matching projection
            matches.forEach(m => {
              const monthOverride = m.overrides?.[monthKey];
              if (monthOverride && monthOverride.amount !== undefined) {
                amount = monthOverride.amount;
              } else if (m.recurring === 'Monthly') {
                amount = m.amount;
              } else {
                // If it's a non-monthly recurring projection, it will be handled in the txs loop below?
                // Actually, to avoid double counting, we should mark these projections as "handled"
                // but let's stick to the simplest override logic first.
              }
            });

            income += amount;
            incomeBreakdown[sub.name] = (incomeBreakdown[sub.name] || 0) + amount;
          });
        });

        // 2. Process non-income projections and Slush fund items
        txs.forEach(t => {
          if (!t.date) return;

          const isKnownIncome = budget?.category_groups?.income?.some(cat =>
            cat.sub_categories.some(sub =>
              sub.name === t.stream || sub.name === t.source
            )
          );

          const transDate = new Date(t.date);
          const transMonthKey = t.date.slice(0, 7);
          const monthOverride = t.overrides?.[monthKey];
          const effectiveAmount = monthOverride?.amount ?? t.amount;
          const amountToUse = (t.actual_amount !== undefined && t.actual_amount !== 0 && transMonthKey === monthKey)
            ? t.actual_amount
            : effectiveAmount;

          let isCurrentMonth = false;
          if (t.recurring === 'N/A') {
            if (transMonthKey === monthKey) isCurrentMonth = true;
          } else if (t.recurring === 'Monthly') {
            if (new Date(t.date) <= new Date(yearNum, monthIdx, 28)) isCurrentMonth = true;
          } else if (t.recurring === 'Annually') {
            if (transDate.getMonth() === monthIdx) isCurrentMonth = true;
          } else if (t.recurring === 'Bi-annually') {
            const firstMonth = transDate.getMonth();
            const secondMonth = (firstMonth + 6) % 12;
            if (monthIdx === firstMonth || monthIdx === secondMonth) isCurrentMonth = true;
          } else if (t.recurring === 'Quarterly') {
            const startMonth = transDate.getMonth();
            if ((monthIdx - startMonth) % 3 === 0) isCurrentMonth = true;
          }

          if (isCurrentMonth) {
            if (amountToUse >= 0) {
              // Only add if it wasn't handled by the budget loop above
              // AND ensure it doesn't just match the "Income" category name to avoid doubling
              if (!isKnownIncome) {
                const streamName = t.stream || t.source || 'Other';

                // If it's not a known sub-category (handled in first loop), but it is a positive amount
                // that belongs to an Income category, we strictly exclude it to avoid doubling.
                const isIncomeCategory = budget?.category_groups?.income?.some(cat => cat.name === t.category);
                if (isIncomeCategory && !isKnownIncome) return;

                // Handle generic "Income" or category name as stream name
                const isTopLevelCategoryName = budget?.category_groups?.income?.some(cat => cat.name === streamName);
                if (isTopLevelCategoryName || streamName === 'Income') return;

                income += amountToUse;
                incomeBreakdown[streamName] = (incomeBreakdown[streamName] || 0) + amountToUse;
              }
            } else if (specialCategoryNames.includes(t.category)) {
              // Show individual Slush items as requested
              const itemName = t.source || t.stream || 'Slush Item';
              const uniqueKey = `${itemName} [${t.id?.slice(0, 4) || 'tx'}]`;
              const absVal = Math.abs(amountToUse);
              slush += absVal;
              slushBreakdown[uniqueKey] = (slushBreakdown[uniqueKey] || 0) + absVal;
            }
          }
        });

        const monthlyNet = income + feederMonthlyTotal - expenseMonthlyTotal - slush;
        runningBalance += monthlyNet;

        data.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
          value: monthlyNet,
          cumulativeBalance: runningBalance,
          date: monthKey,
          income,
          feeder: feederMonthlyTotal,
          expense: expenseMonthlyTotal,
          slush,
          breakdown: {
            incomeBreakdown,
            feederBreakdown: { 'Feeder Budget': feederMonthlyTotal },
            expenseBreakdown: expenseLabelBreakdownBase,
            expenseLabelBreakdown: expenseLabelBreakdownBase,
            slushBreakdown
          }
        });
      }
      return data;
    };

    return calculateData(futureTransactions);
  }, [futureTransactions, selectedYear, klintemarkenData, specialCategoryNames, budget, disabledIncomeStreams, disabledExpenses]);

  const stats = useMemo(() => {
    const totalIncome = projectionData.reduce((sum, d) => sum + (d.income || 0), 0);
    const totalFeeder = projectionData.reduce((sum, d) => sum + (d.feeder || 0), 0);
    const totalExpenses = projectionData.reduce((sum, d) => sum + (d.expense || 0), 0);
    const totalSlush = projectionData.reduce((sum, d) => sum + (d.slush || 0), 0);

    return {
      income: totalIncome,
      feeder: totalFeeder,
      expenses: totalExpenses,
      slush: totalSlush,
      totalIncome: (totalIncome + totalFeeder),
      totalExpenses: (totalExpenses + totalSlush),
      pl: (totalIncome + totalFeeder) - (totalExpenses + totalSlush)
    };
  }, [projectionData]);

  const masterProjectionData = useMemo(() => {
    if (!activeScenarioId) return undefined;
    const matchedMaster = matchProjectionsToActuals(masterProjectionsRaw, transactions);

    const calculateData = (txs: any[]) => {
      const data: ProjectionData[] = [];
      const yearNum = currentYear;

      const feederMonthlyTotal = klintemarkenData.reduce((sum, item) => sum + (item.budget_amount || 0), 0);

      const expenseLabelBreakdownBase: Record<string, number> = {};
      primaryExpensesByLabel.forEach(labelCat => {
        if (disabledExpenses.has(labelCat.name)) return;
        const labelTotal = labelCat.sub_categories.reduce((s, sub) => {
          if (disabledExpenses.has(sub.name)) return s;
          return s + (sub.budget_amount || 0);
        }, 0);
        if (labelTotal > 0) {
          expenseLabelBreakdownBase[labelCat.name] = labelTotal;
        }
      });
      const expenseMonthlyTotal = Object.values(expenseLabelBreakdownBase).reduce((a, b) => a + b, 0);

      let runningBalance = 0;
      const today = new Date();
      const isCurrentYear = yearNum === today.getFullYear();
      const startMonth = isCurrentYear ? today.getMonth() : 0;

      for (let i = 0; i < 12; i++) {
        const monthIdx = (startMonth + i) % 12;
        const yearOffset = Math.floor((startMonth + i) / 12);
        const currentYearNum = yearNum + yearOffset;

        const monthDate = new Date(currentYearNum, monthIdx, 1);
        const monthKey = monthDate.toISOString().slice(0, 7);
        let income = 0;
        let slush = 0;
        const incomeBreakdown: Record<string, number> = {};
        const slushBreakdown: Record<string, number> = {};

        // 1. Process Income from Budget Categories (merging with overrides in projections)
        budget?.category_groups?.income?.forEach(cat => {
          cat.sub_categories.forEach(sub => {
            if (disabledIncomeStreams.has(sub.name)) return;

            const matches = txs.filter(t =>
              (t.stream === sub.name && t.category === cat.name) ||
              (t.source === sub.name && (t.category === 'Income' || t.category === cat.name))
            );

            let amount = sub.budget_amount;
            matches.forEach(m => {
              const monthOverride = m.overrides?.[monthKey];
              if (monthOverride && monthOverride.amount !== undefined) {
                amount = monthOverride.amount;
              } else if (m.recurring === 'Monthly') {
                amount = m.amount;
              }
            });

            income += amount;
            incomeBreakdown[sub.name] = (incomeBreakdown[sub.name] || 0) + amount;
          });
        });

        // 2. Process non-income projections and Slush fund items
        txs.forEach(t => {
          if (!t.date) return;

          const isKnownIncome = budget?.category_groups?.income?.some(cat =>
            cat.sub_categories.some(sub =>
              sub.name === t.stream || sub.name === t.source
            )
          );

          const transDate = new Date(t.date);
          const transMonthKey = t.date.slice(0, 7);
          const monthOverride = t.overrides?.[monthKey];
          const effectiveAmount = monthOverride?.amount ?? t.amount;
          const amountToUse = (t.actual_amount !== undefined && t.actual_amount !== 0 && transMonthKey === monthKey)
            ? t.actual_amount
            : effectiveAmount;

          let isCurrentMonth = false;
          if (t.recurring === 'N/A') {
            if (transMonthKey === monthKey) isCurrentMonth = true;
          } else if (t.recurring === 'Monthly') {
            if (new Date(t.date) <= new Date(yearNum, monthIdx, 28)) isCurrentMonth = true;
          } else if (t.recurring === 'Annually') {
            if (transDate.getMonth() === monthIdx) isCurrentMonth = true;
          } else if (t.recurring === 'Bi-annually') {
            const firstMonth = transDate.getMonth();
            const secondMonth = (firstMonth + 6) % 12;
            if (monthIdx === firstMonth || monthIdx === secondMonth) isCurrentMonth = true;
          } else if (t.recurring === 'Quarterly') {
            const startMonth = transDate.getMonth();
            if ((monthIdx - startMonth) % 3 === 0) isCurrentMonth = true;
          }

          if (isCurrentMonth) {
            if (amountToUse >= 0) {
              if (!isKnownIncome) {
                const streamName = t.stream || t.source || 'Other';

                const isIncomeCategory = budget?.category_groups?.income?.some(cat => cat.name === t.category);
                if (isIncomeCategory && !isKnownIncome) return;

                const isTopLevelCategoryName = budget?.category_groups?.income?.some(cat => cat.name === streamName);
                if (isTopLevelCategoryName || streamName === 'Income') return;

                income += amountToUse;
                incomeBreakdown[streamName] = (incomeBreakdown[streamName] || 0) + amountToUse;
              }
            } else if (specialCategoryNames.includes(t.category)) {
              const itemName = t.source || t.stream || 'Slush Item';
              const uniqueKey = `${itemName} [${t.id?.slice(0, 4) || 'tx'}]`;
              const absVal = Math.abs(amountToUse);
              slush += absVal;
              slushBreakdown[uniqueKey] = (slushBreakdown[uniqueKey] || 0) + absVal;
            }
          }
        });

        const monthlyNet = income + feederMonthlyTotal - expenseMonthlyTotal - slush;
        runningBalance += monthlyNet;

        data.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
          value: monthlyNet,
          cumulativeBalance: runningBalance,
          date: monthKey,
          income,
          feeder: feederMonthlyTotal,
          expense: expenseMonthlyTotal,
          slush,
          breakdown: {
            incomeBreakdown,
            feederBreakdown: { 'Feeder Budget': feederMonthlyTotal },
            expenseBreakdown: expenseLabelBreakdownBase,
            expenseLabelBreakdown: expenseLabelBreakdownBase,
            slushBreakdown
          }
        });
      }
      return data;
    };

    return calculateData(matchedMaster);
  }, [masterProjectionsRaw, transactions, selectedYear, activeScenarioId, klintemarkenData, specialCategoryNames, budget, disabledIncomeStreams, disabledExpenses]);

  const handleAddTransaction = () => {
    if (!newTransaction.amount) {
      toast({ title: "Validation Error", description: "Amount is required", variant: "destructive" });
      return;
    }

    if (!newTransaction.source && !newTransaction.stream && !newTransaction.description) {
      toast({ title: "Validation Error", description: "Please provide a source, stream, or description", variant: "destructive" });
      return;
    }

    const payload = {
      ...newTransaction,
      amount: parseFloat(newTransaction.amount) || 0,
      date: newTransaction.date || new Date().toISOString().slice(0, 10)
    };

    if (editingId) {
      updateProjectionMutation.mutate({ id: editingId, updates: payload });
    } else {
      addProjectionMutation.mutate(payload);
    }
    resetForm();
  };

  const resetForm = () => {
    setNewTransaction({
      date: new Date().toISOString().slice(0, 10),
      source: '',
      amount: '',
      category: transactionType === 'income' ? 'Income' : 'Food',
      stream: '',
      planned: true,
      recurring: 'Monthly',
      description: ''
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSlushSubmit = (data: { name: string; date: string; amount: number; category: string }) => {
    if (slushEditingTx) {
      updateProjectionMutation.mutate({
        id: slushEditingTx.id,
        updates: {
          source: data.name,
          description: data.name,
          date: data.date,
          amount: data.amount,
          recurring: 'N/A',
          category: data.category,
          stream: ''
        }
      });
      setSlushEditingTx(null);
    } else {
      addProjectionMutation.mutate({
        source: data.name,
        description: data.name,
        date: data.date,
        amount: data.amount,
        recurring: 'N/A',
        category: data.category,
        stream: '',
        planned: true
      });
    }
  };

  const handleDeleteTransaction = (id: string | number) => deleteProjectionMutation.mutate(id);
  const handleTransactionChange = (updates: Partial<NewTransactionForm>) => setNewTransaction(prev => ({ ...prev, ...updates }));

  const handleAddClick = (type: 'income' | 'expense', category?: string) => {
    setTransactionType(type);
    setNewTransaction({
      date: new Date().toISOString().slice(0, 10),
      source: '',
      amount: '',
      category: category || (type === 'income' ? 'Income' : 'Food'),
      stream: '',
      planned: true,
      recurring: 'Monthly',
      description: ''
    });
    setEditingId(null);
    setShowAddForm(true);
  };

  const handlePasteClick = (type: 'income' | 'expense') => {
    setPasteDialogType(type);
    setShowPasteDialog(true);
  };

  const handlePasteImport = (pastedTransactions: any[]) => {
    pastedTransactions.forEach(t => {
      addProjectionMutation.mutate({
        ...t,
        stream: t.subCategory || '',
        recurring: 'N/A' as RecurringInterval
      });
    });
  };

  const totalBudgetedIncome = Math.max(incomeData.reduce((sum, item) => sum + item.budget_amount, 0), 0.01);

  const deleteScenarioMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scenarios').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      setActiveScenarioId(null);
      toast({ title: "Deleted", description: "Scenario removed" });
    },
    onError: (error) => {
      console.error('Delete Scenario error:', error);
      toast({ title: "Error", description: "Failed to delete scenario", variant: "destructive" });
    }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col">
          <Breadcrumb className="mb-2 opacity-50 scale-90 origin-left">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/budget">Budget</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Projections</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-baseline gap-4">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
              Rolling Year Forecast
            </h1>
            {activeScenarioId && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg">
                <Sparkles className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Simulation: {scenarios.find(s => s.id === activeScenarioId)?.name}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Tabs value={activeScenarioId || 'master'} onValueChange={(val) => {
            if (val === 'new') {
              setShowCreateScenario(true);
              return;
            }
            setActiveScenarioId(val === 'master' ? null : val);
          }} className="inline-flex items-center">
            <TabsList className="bg-slate-100/80 backdrop-blur-md border border-slate-200 p-1 h-10 gap-1 shadow-sm rounded-xl">
              <TabsTrigger
                value="master"
                className="px-6 h-8 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg font-black uppercase tracking-widest text-[10px] transition-all"
              >
                Expected
              </TabsTrigger>
              {scenarios.map(scenario => (
                <TabsTrigger
                  key={scenario.id}
                  value={scenario.id}
                  className="px-6 h-8 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg font-black uppercase tracking-widest text-[10px] group flex items-center gap-2 transition-all hover:bg-slate-50 data-[state=active]:hover:bg-white"
                >
                  {scenario.name}
                  {activeScenarioId === scenario.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this scenario? All its data will be lost.')) {
                          deleteScenarioMutation.mutate(scenario.id);
                        }
                      }}
                      className="ml-1 opacity-40 hover:opacity-100 p-0.5 hover:bg-slate-100 rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </TabsTrigger>
              ))}
              <TabsTrigger
                value="new"
                className="px-3 h-8 text-slate-400 hover:text-primary hover:bg-white rounded-lg transition-all"
              >
                <Plus className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex items-center gap-2 text-slate-400">
        <Scale className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{activeScenarioId ? 'Scenario Comparison' : 'Master Projection'}</span>
      </div>



      {/* Summary Tiles Hidden for now
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
        ... tiles content ...
      </div>
      */}

      <ProjectionChart
        data={projectionData}
        comparisonData={masterProjectionData}
        title=""
        activeLabel={activeScenarioId ? "Scenario" : "Projected"}
        comparisonLabel="Master"
        unlabeledCategories={unlabeledCategories}
      />

      <div className="grid grid-cols-1 gap-6">
        {/* Slush Fund Section */}
        <div key="slush-fund" className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-slate-200/60 p-6 shadow-sm animate-in fade-in duration-500 delay-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black text-purple-900 tracking-tight flex items-center gap-2">
              <div className="p-1.5 bg-purple-50 rounded-lg text-purple-600">
                <Wallet className="w-4 h-4" />
              </div>
              Slush Fund
            </h2>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1">Items</p>
                <p className="text-sm font-black text-slate-900 font-mono">{slushFundTransactions.length}</p>
              </div>
              <div className="text-right border-l border-slate-200 pl-6">
                <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1">Total Impact</p>
                <p className="text-sm font-black text-slate-900 font-mono">{formatCurrency(slushFundTransactions.reduce((sum, t) => sum + t.amount, 0), settings.currency)}</p>
              </div>
            </div>
          </div>
          <SlushFundTransactionsTable
            transactions={slushFundTransactions}
            onDelete={handleDeleteTransaction}
            onUpdate={(id, updates) => updateProjectionMutation.mutate({ id, updates })}
            onEdit={(tx) => { setSlushEditingTx(tx as FutureTransaction); setSlushDialogOpen(true); }}
            onAddClick={() => { setSlushEditingTx(null); setSlushDialogOpen(true); }}
            selectedYear={selectedYear}
            showPastProjections={showPastProjections}
          />
        </div>

        {/* Income Sources Card */}
        {incomeData.length > 0 && (
          <div key="income" className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-slate-200/60 p-6 shadow-sm animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-emerald-900 tracking-tight flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                Projected Income
              </h2>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1">Monthly</p>
                  <p className="text-sm font-black text-slate-900 font-mono">{formatCurrency(projectionData[0]?.income || 0, settings.currency)}</p>
                </div>
                <div className="text-right border-l border-slate-200 pl-6">
                  <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1">Annual</p>
                  <p className="text-sm font-black text-slate-900 font-mono">{formatCurrency(projectionData.reduce((sum, d) => sum + (d.income || 0), 0), settings.currency)}</p>
                </div>
              </div>
            </div>
            <div className="p-0">
              <ProjectedIncomeTable
                incomeCategories={incomeData as any}
                projections={futureTransactions}
                disabledStreams={disabledIncomeStreams}
                onToggleStream={(name) => {
                  const next = new Set(disabledIncomeStreams);
                  if (next.has(name)) next.delete(name);
                  else next.add(name);
                  setDisabledIncomeStreams(next);
                }}
                onUpdateValue={async (stream, category, monthKey, amount, mode) => {
                  // Find existing projection for this stream
                  const existing = futureTransactions.find(p => p.stream === stream && p.category === category);
                  if (mode === 'single') {
                    if (existing) {
                      const newOverrides = { ...(existing.overrides || {}) };
                      newOverrides[monthKey] = { amount };
                      await updateProjectionMutation.mutateAsync({ id: existing.id, updates: { overrides: newOverrides } });
                    } else {
                      // Create new projection for this stream
                      await addProjectionMutation.mutateAsync({
                        category,
                        stream,
                        amount: amount, // For single month, we set it as the base and use override logic?
                        // Actually, if it's the first time, maybe just set it as single month projection
                        date: `${monthKey}-01`,
                        recurring: 'N/A',
                        planned: true,
                        source: stream,
                        description: `Income override for ${stream}`
                      });
                    }
                  } else {
                    // Forward mode: set the base amount and clear subsequent overrides?
                    // Or set recurring to Monthly and change amount
                    if (existing) {
                      await updateProjectionMutation.mutateAsync({
                        id: existing.id,
                        updates: {
                          amount,
                          recurring: 'Monthly',
                          date: `${monthKey}-01`,
                          overrides: {} // Clear overrides to let the new base take effect
                        }
                      });
                    } else {
                      await addProjectionMutation.mutateAsync({
                        category,
                        stream,
                        amount,
                        date: `${monthKey}-01`,
                        recurring: 'Monthly',
                        planned: true,
                        source: stream,
                        description: `Income override for ${stream}`
                      });
                    }
                  }
                  queryClient.invalidateQueries({ queryKey: ['projections'] });
                }}
                currency={settings.currency}
              />
            </div>
          </div>
        )}

        {/* Primary Expenses Section */}
        {budget?.category_groups?.expenditure && (
          <div key="expenses-top" className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-slate-200/60 p-6 shadow-sm animate-in fade-in duration-500 delay-150">
            <div>
              <BudgetTable
                data={primaryExpensesByLabel as any}
                type="expense"
                title="Core Expenditure"
                hideHeader={false}
                expandedCategories={expandedCategories}
                toggleCategory={toggleCategory}
                editingBudget={editingBudget}
                setEditingBudget={setEditingBudget}
                handleUpdateBudget={handleUpdateBudget}
                totalIncome={stats.totalIncome}
                currency={settings?.currency || 'DKK'}
                selectedYear={currentYear}
                onToggleItem={toggleExpense}
                disabledItems={disabledExpenses}
                isScenario={!!activeScenarioId}
                projectionMode={true}
                onBatchAdjust={handleBatchAdjust}
              />
            </div>
          </div>
        )}

        {/* Feeder Budgets */}
        {klintemarkenDataEnhanced.length > 0 && (
          <div key="klintemarken" className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-slate-200/60 p-6 shadow-sm animate-in fade-in duration-500 delay-100">
            <div>
              <BudgetTable
                data={klintemarkenDataEnhanced as any}
                type="klintemarken"
                title="Feeders"
                hideHeader={false}
                expandedCategories={expandedCategories}
                toggleCategory={toggleCategory}
                editingBudget={editingBudget}
                setEditingBudget={setEditingBudget}
                handleUpdateBudget={handleUpdateBudget}
                totalIncome={stats.totalIncome}
                currency={settings?.currency || 'DKK'}
                selectedYear={currentYear}
                onToggleItem={toggleExpense}
                disabledItems={disabledExpenses}
                isScenario={!!activeScenarioId}
                projectionMode={true}
                onBatchAdjust={handleBatchAdjust}
              />
            </div>
          </div>
        )}

      </div>

      <AddTransactionFormV2
        showForm={showAddForm}
        transactionType={transactionType}
        newTransaction={newTransaction}
        onTransactionChange={handleTransactionChange}
        onSubmit={handleAddTransaction}
        onCancel={resetForm}
        onPasteClick={() => handlePasteClick(transactionType)}
        isEditing={!!editingId}
      />

      {/* Space for future sections */}
      <div className="h-12" />

      <PasteDataDialog
        open={showPasteDialog}
        onClose={() => setShowPasteDialog(false)}
        onImport={handlePasteImport}
        transactionType={pasteDialogType}
      />

      <SuggestProjectionsWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onAddProjections={(projectionsToAdd) => {
          projectionsToAdd.forEach(p => addProjectionMutation.mutate(p));
          setShowWizard(false);
        }}
      />

      <CreateScenarioDialog
        open={showCreateScenario}
        onOpenChange={setShowCreateScenario}
        onSuccess={(id) => setActiveScenarioId(id)}
      />
      <SlushFundAddDialog
        open={slushDialogOpen}
        onOpenChange={(open) => { setSlushDialogOpen(open); if (!open) setSlushEditingTx(null); }}
        onSubmit={handleSlushSubmit}
        editingTransaction={slushEditingTx}
      />
    </div >
  );
};

export default Projection;
