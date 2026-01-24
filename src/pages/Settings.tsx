import { Fragment, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Sparkles, Settings as SettingsIcon, Info, ArrowUp, ArrowDown, ExternalLink, Store, Search, Forward, Check, ChevronRight, Users, Edit } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useSettings, AppSettings } from '@/hooks/useSettings';
import { useTransactionTable, Transaction } from '@/components/Transactions/hooks/useTransactionTable';
import { useBudgetCategoriesManager } from '@/hooks/useBudgetCategories';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
// import UserManagement from '@/components/Settings/UserManagement';

const Settings = () => {
  const {
    settings,
    saveSettings,
    addItem,
    removeItem,
    updateCategoryBudget: updateCategoryBudgetLocal,
    updateSubCategoryBudget: updateSubCategoryBudgetLocal,
    addSubCategory: addSubCategoryLocal,
    removeSubCategory: removeSubCategoryLocal,
    updateCategoryConfig,
    reorderItems,
    moveSubCategory: moveSubCategoryLocal
  } = useSettings();
  const { transactions, bulkUpdate, emergencyClearAll } = useTransactionTable();
  const {
    categories: dbCategories,
    isLoading: categoriesLoading,
    error: categoriesError,
    addCategory: addCategoryMutation,
    renameCategory: renameCategoryMutation,
    deleteCategory: deleteCategoryMutation,
    reorderCategories: reorderCategoriesMutation,
    addSubCategory: addSubCategoryMutation,
    renameSubCategory: renameSubCategoryMutation,
    deleteSubCategory: deleteSubCategoryMutation,
    reorderSubCategories: reorderSubCategoriesMutation,
    moveSubCategory: moveSubCategoryMutation,
    updateCategoryBudget: updateCategoryBudgetMutation,
    updateSubCategoryBudget: updateSubCategoryBudgetMutation
  } = useBudgetCategoriesManager();

  const hasSupabaseCategories = dbCategories.length > 0;
  const categoryMap = dbCategories.reduce<Record<string, (typeof dbCategories)[number]>>((acc, cat) => {
    acc[cat.name] = cat;
    return acc;
  }, {});

  // Use database categories if available, fallback to localStorage
  const displayCategories = hasSupabaseCategories ? dbCategories.map(c => c.name) : settings.categories;
  const displaySubCategories = hasSupabaseCategories
    ? dbCategories.reduce((acc, cat) => {
        acc[cat.name] = cat.sub_categories?.map((sub: any) => sub.name) || [];
        return acc;
      }, {} as Record<string, string[]>)
    : settings.subCategories;

  const [saveMessage, setSaveMessage] = useState('');



  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const newCats = [...displayCategories];
    if (direction === 'up' && index > 0) {
      [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
    } else if (direction === 'down' && index < newCats.length - 1) {
      [newCats[index + 1], newCats[index]] = [newCats[index], newCats[index + 1]];
    }
    if (hasSupabaseCategories) {
      const orderedIds = newCats
        .map((name) => categoryMap[name]?.id)
        .filter(Boolean) as string[];
      reorderCategoriesMutation.mutate({ orderedIds });
    } else {
      reorderItems('categories', newCats);
    }
  };

  const handleMoveSubCategory = (category: string, index: number, direction: 'up' | 'down') => {
    const currentSubs = displaySubCategories[category] || [];
    const newSubs = [...currentSubs];
    if (direction === 'up' && index > 0) {
      [newSubs[index - 1], newSubs[index]] = [newSubs[index], newSubs[index - 1]];
      reorderItems('subCategories', newSubs, category);
    } else if (direction === 'down' && index < newSubs.length - 1) {
      [newSubs[index + 1], newSubs[index]] = [newSubs[index], newSubs[index + 1]];
    }
    if (hasSupabaseCategories && categoryMap[category]) {
      const orderedIds = newSubs
        .map((subName) => categoryMap[category]?.sub_categories.find((sub: any) => sub.name === subName)?.id)
        .filter(Boolean) as string[];
      reorderSubCategoriesMutation.mutate({ categoryId: categoryMap[category]!.id, orderedIds });
    } else {
      reorderItems('subCategories', newSubs, category);
    }
  };

  const handleAddCategory = (name: string) => {
    if (!name.trim()) return;
    if (hasSupabaseCategories) {
      addCategoryMutation.mutate({ name: name.trim() });
    } else {
      addItem('categories', name.trim());
    }
  };

  const handleRenameCategory = (categoryName: string, newName: string) => {
    if (!newName || newName === categoryName) return;
    if (hasSupabaseCategories && categoryMap[categoryName]) {
      renameCategoryMutation.mutate({ categoryId: categoryMap[categoryName].id, name: newName });
    } else {
      const newCategories = [...displayCategories];
      const idx = newCategories.indexOf(categoryName);
      if (idx >= 0) {
        newCategories[idx] = newName;
        reorderItems('categories', newCategories);
      }
    }
  };

  const handleDeleteCategory = (categoryName: string) => {
    if (hasSupabaseCategories && categoryMap[categoryName]) {
      deleteCategoryMutation.mutate({ categoryId: categoryMap[categoryName].id });
    } else {
      removeItem('categories', categoryName);
    }
  };

  const getSubCategoryRecord = (categoryName: string, subName: string) => {
    return categoryMap[categoryName]?.sub_categories.find((sub: any) => sub.name === subName);
  };

  const handleAddSubCategory = (categoryName: string, subName: string) => {
    if (!subName.trim()) return;
    if (hasSupabaseCategories && categoryMap[categoryName]) {
      addSubCategoryMutation.mutate({ categoryId: categoryMap[categoryName].id, name: subName.trim() });
    } else {
      addSubCategoryLocal(categoryName, subName.trim());
    }
  };

  const handleRenameSubCategory = (categoryName: string, subName: string, newName: string) => {
    if (!newName || newName === subName) return;
    const subRecord = getSubCategoryRecord(categoryName, subName);
    if (hasSupabaseCategories && subRecord) {
      renameSubCategoryMutation.mutate({ subCategoryId: subRecord.id, name: newName });
    } else {
      const currentSubs = displaySubCategories[categoryName] || [];
      const newSubs = currentSubs.map((s) => (s === subName ? newName : s));
      reorderItems('subCategories', newSubs, categoryName);
    }
  };

  const handleRemoveSubCategory = (categoryName: string, subName: string) => {
    const subRecord = getSubCategoryRecord(categoryName, subName);
    if (hasSupabaseCategories && subRecord) {
      deleteSubCategoryMutation.mutate({ subCategoryId: subRecord.id });
    } else {
      removeSubCategoryLocal(categoryName, subName);
    }
  };

  const handleMoveSubCategoryPersist = (subCategory: string, fromCategory: string, toCategory: string, newSubCategoryName?: string) => {
    const subRecord = getSubCategoryRecord(fromCategory, subCategory);
    const targetCategoryId = categoryMap[toCategory]?.id;
    if (hasSupabaseCategories && subRecord && targetCategoryId) {
      moveSubCategoryMutation.mutate({
        subCategoryId: subRecord.id,
        targetCategoryId,
        newName: newSubCategoryName
      });
    } else {
      moveSubCategoryLocal(subCategory, fromCategory, toCategory, newSubCategoryName);
    }
  };

  const handleSubCategoryBudgetChange = (
    categoryName: string,
    subName: string,
    value: string,
    onSuccess?: () => void,
    onError?: () => void
  ) => {
    const amount = parseFloat(value) || 0;
    const subRecord = getSubCategoryRecord(categoryName, subName);
    if (hasSupabaseCategories && subRecord) {
      updateSubCategoryBudgetMutation.mutate(
        { subCategoryId: subRecord.id, amount },
        {
          onSuccess: () => {
            updateSubCategoryBudgetLocal(categoryName, subName, value);
            onSuccess?.();
          },
          onError
        }
      );
      return;
    }
    updateSubCategoryBudgetLocal(categoryName, subName, value);
    onSuccess?.();
  };

  const SimpleListSection = ({ title, field, items }: { title: string, field: keyof AppSettings, items: string[] }) => {
    const [newItem, setNewItem] = useState('');
    return (
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="py-4 border-b bg-slate-50/50">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {items.map((item, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-2 py-1 px-3 font-normal bg-white border shadow-sm">
                {item}
                <button onClick={() => removeItem(field, item)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={`Add ${title.toLowerCase()}...`}
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newItem.trim()) { addItem(field, newItem.trim()); setNewItem(''); } }}
              className="h-9"
            />
            <Button size="sm" onClick={() => { if (newItem.trim()) { addItem(field, newItem.trim()); setNewItem(''); } }}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Unified Table Row Component
  const UnifiedCategoryManager = () => {
    const [newCatName, setNewCatName] = useState('');
    const [moveDialog, setMoveDialog] = useState<{
      open: boolean;
      subCategory: string;
      fromCategory: string;
      toCategory: string;
      matchingTransactions: Transaction[];
    }>({
      open: false,
      subCategory: '',
      fromCategory: '',
      toCategory: '',
      matchingTransactions: []
    });

    const [migrationMode, setMigrationMode] = useState<'all' | 'individual'>('all');
    const [targetSubCategory, setTargetSubCategory] = useState<string>('');
    const [individualMappings, setIndividualMappings] = useState<Record<string, { category: string, subCategory: string }>>({});
    const [subBudgetDrafts, setSubBudgetDrafts] = useState<Record<string, string>>({});
    const [subBudgetSaving, setSubBudgetSaving] = useState<Record<string, 'saving' | 'saved'>>({});

    const subBudgetKey = (categoryName: string, subCategoryName: string) => `${categoryName}::${subCategoryName}`;

    const getPersistedSubBudgetValue = (categoryName: string, subCategoryName: string): string => {
      if (hasSupabaseCategories) {
        const subRecord = getSubCategoryRecord(categoryName, subCategoryName);
        if (typeof subRecord?.budget_amount === 'number' && !Number.isNaN(subRecord.budget_amount)) {
          return subRecord.budget_amount === 0 ? '' : subRecord.budget_amount.toString();
        }
        return '';
      }
      const storedValue = settings.subCategoryBudgets?.[categoryName]?.[subCategoryName];
      if (storedValue === undefined || storedValue === null) return '';
      const storedString = storedValue.toString();
      return storedString === '0' ? '' : storedString;
    };

    useEffect(() => {
      setSubBudgetDrafts((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.keys(prev).forEach((key) => {
          const [categoryName, subName] = key.split('::');
          if (getPersistedSubBudgetValue(categoryName, subName) === prev[key]) {
            delete next[key];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, [hasSupabaseCategories, dbCategories, settings.subCategoryBudgets]);

    const commitSubBudgetValue = (categoryName: string, subCategoryName: string) => {
      const key = subBudgetKey(categoryName, subCategoryName);
      if (!(key in subBudgetDrafts)) return;
      const pendingValue = subBudgetDrafts[key];
      const persistedValue = getPersistedSubBudgetValue(categoryName, subCategoryName);
      if (pendingValue === persistedValue) {
        cancelSubBudgetDraft(categoryName, subCategoryName);
        return;
      }
      setSubBudgetSaving((prev) => ({ ...prev, [key]: 'saving' }));
      handleSubCategoryBudgetChange(categoryName, subCategoryName, pendingValue, () => {
        setSubBudgetSaving((prev) => ({ ...prev, [key]: 'saved' }));
        cancelSubBudgetDraft(categoryName, subCategoryName);
        setTimeout(() => {
          setSubBudgetSaving((prev) => {
            const next = { ...prev };
            if (next[key] === 'saved') {
              delete next[key];
            }
            return next;
          });
        }, 1500);
      }, () => {
        setSubBudgetSaving((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      });
    };

    const cancelSubBudgetDraft = (categoryName: string, subCategoryName: string) => {
      const key = subBudgetKey(categoryName, subCategoryName);
      setSubBudgetDrafts((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    };

    const handleInitialMove = (sub: string, from: string, to: string) => {
      if (!to) return;
      setMoveDialog({
        open: true,
        subCategory: sub,
        fromCategory: from,
        toCategory: to,
        matchingTransactions: []
      });
    };

    return (
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Budget Categories</h3>
            <p className="text-xs text-slate-500">Manage categories backed by Supabase or local settings.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Input
              placeholder="New Category..."
              className="bg-white h-9"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCatName.trim()) {
                  handleAddCategory(newCatName.trim());
                  setNewCatName('');
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => {
                if (newCatName.trim()) {
                  handleAddCategory(newCatName.trim());
                  setNewCatName('');
                }
              }}
            >
              Add Category
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold tracking-wider">
                <th className="py-3 px-4 w-14 text-center"></th>
                <th className="py-3 px-4">Category / Subcategory</th>
                <th className="py-3 px-4 text-right">Budget</th>
                <th className="py-3 px-4 w-40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayCategories.map((cat, idx) => {
                const subCats = displaySubCategories[cat] || [];
                const catBudget = hasSupabaseCategories && categoryMap[cat]
                  ? categoryMap[cat].budget_amount ?? ''
                  : settings.categoryBudgets[cat];

                return (
                  <Fragment key={cat}>
                    <tr className="bg-white hover:bg-slate-50 group border-b border-slate-100/50">
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button disabled={idx === 0} onClick={() => handleMoveCategory(idx, 'up')} className="text-slate-400 hover:text-blue-600 disabled:opacity-20"><ArrowUp className="w-4 h-4" /></button>
                          <button disabled={idx === displayCategories.length - 1} onClick={() => handleMoveCategory(idx, 'down')} className="text-slate-400 hover:text-blue-600 disabled:opacity-20"><ArrowDown className="w-4 h-4" /></button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            className="font-bold text-slate-800 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded"
                            onClick={() => {
                              const newName = prompt('Edit category name:', cat);
                              if (newName && newName !== cat) {
                                handleRenameCategory(cat, newName);
                              }
                            }}
                          >
                            {cat}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="text-sm font-semibold text-slate-700">
                          {catBudget ? catBudget.toString() : '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-50 group">
                                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Add subcategory to {cat}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-50">
                                <Plus className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Subcategory to {cat}</DialogTitle>
                                <DialogDescription>
                                  Add a new subcategory under {cat}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="subcategory-name" className="text-right">
                                    Name
                                  </Label>
                                  <Input
                                    id="subcategory-name"
                                    className="col-span-3"
                                    placeholder="Enter subcategory name"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                        handleAddSubCategory(cat, e.currentTarget.value.trim());
                                        e.currentTarget.value = '';
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  type="submit"
                                  onClick={() => {
                                    const input = document.getElementById('subcategory-name') as HTMLInputElement;
                                    if (input?.value.trim()) {
                                      handleAddSubCategory(cat, input.value.trim());
                                      input.value = '';
                                    }
                                  }}
                                >
                                  Add Subcategory
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-400 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleDeleteCategory(cat)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {subCats.map((sub, subIdx) => (
                      <tr key={`${cat}-${sub}`} className="bg-slate-50/40 hover:bg-slate-50 group/sub border-b border-slate-100/30">
                        <td className="py-2 px-4">
                          <div className="flex flex-col gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                            <button disabled={subIdx === 0} onClick={() => handleMoveSubCategory(cat, subIdx, 'up')} className="text-slate-300 hover:text-blue-500 disabled:opacity-10"><ArrowUp className="w-3 h-3" /></button>
                            <button disabled={subIdx === subCats.length - 1} onClick={() => handleMoveSubCategory(cat, subIdx, 'down')} className="text-slate-300 hover:text-blue-500 disabled:opacity-10"><ArrowDown className="w-3 h-3" /></button>
                          </div>
                        </td>
                        <td className="py-2 px-4 pl-12 flex items-center gap-2 group/subcat">
                          <span className="w-6 border-l-2 border-b-2 border-slate-200 h-3 inline-block rounded-bl-md mr-1 -mt-2"></span>
                          <button
                            className="text-slate-600 text-sm font-medium hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded"
                            onClick={() => {
                              const newName = prompt('Edit subcategory name:', sub);
                              if (newName && newName !== sub) {
                                handleRenameSubCategory(cat, sub, newName);
                              }
                            }}
                          >
                            {sub}
                          </button>
                        </td>
                        <td className="py-2 px-4 text-right">
                          <div className="relative inline-flex items-center gap-1 justify-end w-32">
                            <Input
                              className="h-7 text-right text-xs bg-white"
                              value={subBudgetDrafts[subBudgetKey(cat, sub)] ?? getPersistedSubBudgetValue(cat, sub)}
                              placeholder="0"
                              onFocus={(e) => {
                                e.target.select();
                                const key = subBudgetKey(cat, sub);
                                setSubBudgetDrafts((prev) => ({
                                  ...prev,
                                  [key]: prev[key] ?? getPersistedSubBudgetValue(cat, sub)
                                }));
                              }}
                              onChange={(e) => {
                                const key = subBudgetKey(cat, sub);
                                const nextValue = e.target.value;
                                setSubBudgetDrafts((prev) => ({
                                  ...prev,
                                  [key]: nextValue
                                }));
                              }}
                              onBlur={() => commitSubBudgetValue(cat, sub)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                  cancelSubBudgetDraft(cat, sub);
                                  e.currentTarget.value = getPersistedSubBudgetValue(cat, sub);
                                  e.currentTarget.blur();
                                }
                              }}
                            />
                            {subBudgetSaving[subBudgetKey(cat, sub)] === 'saving' && (
                              <span className="text-[10px] text-amber-500 font-medium">Saving…</span>
                            )}
                            {subBudgetSaving[subBudgetKey(cat, sub)] === 'saved' && (
                              <span className="text-[10px] text-emerald-500 font-medium">Saved</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-4 text-right">
                          <div className="flex justify-end gap-1 items-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-block">
                                    <Select onValueChange={(val) => handleInitialMove(sub, cat, val)}>
                                      <SelectTrigger className="h-7 w-7 p-0 border-none bg-transparent hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors">
                                        <Forward className="w-3.5 h-3.5" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem disabled value={cat} className="text-xs font-bold">Move to:</SelectItem>
                                        {displayCategories.filter(c => c !== cat).map(c => (
                                          <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent><p>Move to different category</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              onClick={() => handleRemoveSubCategory(cat, sub)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    );
};

const BudgetTypeManager = () => {
  const [newBudgetType, setNewBudgetType] = useState('');
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAddBudgetType = () => {
    if (newBudgetType.trim() && !settings.budgetTypes.includes(newBudgetType.trim())) {
      addItem('budgetTypes', newBudgetType.trim());
      setNewBudgetType('');
    }
  };

  const handleEditBudgetType = (type: string) => {
    setEditingType(type);
    setEditValue(type);
  };

  const handleSaveEdit = () => {
    if (editingType && editValue.trim() && editValue !== editingType) {
      const newTypes = settings.budgetTypes.map(t => t === editingType ? editValue.trim() : t);
      saveSettings({ budgetTypes: newTypes });
    }
    setEditingType(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingType(null);
    setEditValue('');
  };

  const handleDeleteBudgetType = (type: string) => {
    // Don't allow deletion of core budget types
    if (['Budgeted', 'Special', 'Klintemarken', 'Exclude'].includes(type)) {
      alert('Cannot delete core budget types');
      return;
    }
    removeItem('budgetTypes', type);
  };

  return (
    <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
      <div className="p-4 bg-slate-50 border-b">
        <h3 className="text-lg font-bold text-slate-800">Budget Types Management</h3>
        <p className="text-xs text-slate-500">Manage budget types including Special and Klintemarken categories.</p>
      </div>
      <div className="p-4">
        <div className="space-y-3 mb-4">
          {settings.budgetTypes.map((type, index) => (
            <div key={type} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex-1">
                {editingType === type ? (
                  <div className="flex gap-2">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-8"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <Button size="sm" onClick={handleSaveEdit} className="h-8">
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-8">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-700">{type}</span>
                      {['Budgeted', 'Special', 'Klintemarken', 'Exclude'].includes(type) && (
                        <Badge variant="secondary" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-100">
                          Core
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                        onClick={() => handleEditBudgetType(type)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      {!['Budgeted', 'Special', 'Klintemarken', 'Exclude'].includes(type) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                          onClick={() => handleDeleteBudgetType(type)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="border-t pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add new budget type..."
              value={newBudgetType}
              onChange={(e) => setNewBudgetType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddBudgetType();
              }}
              className="h-9"
            />
            <Button size="sm" onClick={handleAddBudgetType}>
              <Plus className="w-4 h-4 mr-2" />
              Add Type
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Core budget types (Budgeted, Special, Klintemarken, Exclude) cannot be deleted.
          </p>
        </div>
      </div>
    </Card>
  );
};

const MerchantManager = () => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [newRule, setNewRule] = useState({ name: '', category: '', sub_category: '', skip_triage: false });

    const { data: rules = [], isLoading } = useQuery({
      queryKey: ['merchant_rules'],
      queryFn: async () => {
        const { data } = await supabase.from('merchant_rules').select('*').order('clean_merchant_name');
        return data || [];
      }
    });

    const addMutation = useMutation({
      mutationFn: async (rule: any) => {
        const { error } = await supabase.from('merchant_rules').insert([{
          clean_merchant_name: rule.name,
          auto_category: rule.category,
          auto_sub_category: rule.sub_category,
          skip_triage: rule.skip_triage
        }]);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['merchant_rules'] });
        setNewRule({ name: '', category: '', sub_category: '', skip_triage: false });
      }
    });

    const deleteMutation = useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from('merchant_rules').delete().eq('id', id);
        if (error) throw error;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant_rules'] })
    });

    const filteredRules = rules.filter(r =>
      r.clean_merchant_name.toLowerCase().includes(search.toLowerCase()) ||
      r.auto_category?.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="p-6 bg-slate-50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Merchant Management</h3>
            <p className="text-xs text-slate-500">Define automatic categorization rules for known merchants.</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search rules..."
              className="pl-9 bg-white h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 border-b bg-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-400">Merchant Name</Label>
              <Input
                placeholder="e.g. Netflix"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-400">Category</Label>
              <Select value={newRule.category} onValueChange={(v) => setNewRule({ ...newRule, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {displayCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-400">Sub-category</Label>
              <Select
                value={newRule.sub_category}
                onValueChange={(v) => setNewRule({ ...newRule, sub_category: v })}
                disabled={!newRule.category}
              >
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {(settings.subCategories[newRule.category] || []).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col justify-end gap-2 pb-1">
              <div className="flex items-center space-x-2">
                <Switch
                  id="skip-triage"
                  checked={newRule.skip_triage}
                  onCheckedChange={(v) => setNewRule({ ...newRule, skip_triage: v })}
                />
                <Label htmlFor="skip-triage" className="text-xs font-medium text-slate-600">Auto-complete (skip Triage)</Label>
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 h-9"
                onClick={() => addMutation.mutate(newRule)}
                disabled={!newRule.name || !newRule.category}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Rule
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold tracking-wider">
                <th className="py-3 px-6">Merchant Pattern</th>
                <th className="py-3 px-6">Auto-Category</th>
                <th className="py-3 px-6">Sub-category</th>
                <th className="py-3 px-6">Auto-Complete</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50 group">
                  <td className="py-3 px-6 font-medium text-slate-700">{rule.clean_merchant_name}</td>
                  <td className="py-3 px-6">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-normal">
                      {rule.auto_category}
                    </Badge>
                  </td>
                  <td className="py-3 px-6 text-slate-500 text-sm">{rule.auto_sub_category || '-'}</td>
                  <td className="py-3 px-6">
                    {rule.skip_triage ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-normal">
                        Yes
                      </Badge>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteMutation.mutate(rule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredRules.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 italic">
                    No merchant rules found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-slate-500 mt-1">Manage budget categories, allocations, and application defaults.</p>
        </div>
      </div>

      {saveMessage && (
        <Alert className={saveMessage.includes('No new') ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-100 text-green-800"}>
          <AlertTitle>System Notification</AlertTitle>
          <AlertDescription>{saveMessage}</AlertDescription>
        </Alert>
      )}


      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="px-6">General</TabsTrigger>
          <TabsTrigger value="budget" className="px-6">Budget Categories</TabsTrigger>
          <TabsTrigger value="merchants" className="px-6">Merchant Rules</TabsTrigger>
          <TabsTrigger value="lists" className="px-6">System Lists</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-4 border-b bg-slate-50/50">
              <CardTitle className="text-lg font-semibold text-slate-800">Preferences</CardTitle>
              <CardDescription>Customize your application experience.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 h-10">
                <Switch
                  id="dark-mode"
                  checked={settings.darkMode}
                  onCheckedChange={(val) => saveSettings({ darkMode: val })}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <Label htmlFor="dark-mode" className="text-slate-600 font-medium font-bold">Dark Mode</Label>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Clear Card */}
          <Card className="border-red-200 shadow-sm bg-white">
            <CardHeader className="pb-4 border-b bg-red-50/50">
              <CardTitle className="text-lg font-semibold text-red-800">🚨 Emergency Data Management</CardTitle>
              <CardDescription>Dangerous operations - use with caution.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Alert className="border-red-200 bg-red-50">
                  <AlertTitle className="text-red-800">⚠️ Warning</AlertTitle>
                  <AlertDescription className="text-red-700">
                    This will permanently delete all transactions from your local cache and refresh your data. This action cannot be undone.
                  </AlertDescription>
                </Alert>
                
                <Button
                  onClick={emergencyClearAll}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  🚨 Clear All Transaction Data
                </Button>
                
                <p className="text-xs text-slate-500">
                  Use this when you need to completely reset the transaction system and start fresh.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">

          {/* Unified Categories Section */}
          <UnifiedCategoryManager />

          {/* Budget Types Management */}
          <BudgetTypeManager />

          {/* Budget Balancing Card */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-4 border-b bg-slate-50/50">
              <CardTitle className="text-lg font-semibold text-slate-800">Budget Balancing</CardTitle>
              <CardDescription>Select a sub-category that will absorb any budget remainder (over or under spending).</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs uppercase font-bold text-slate-500">Target Category</Label>
                  <Select
                    value={settings.balancingSubCategory?.category}
                    onValueChange={(cat) => saveSettings({ balancingSubCategory: { category: cat, subCategory: settings.subCategories[cat]?.[0] || '' } })}
                  >
                    <SelectTrigger className="h-10 bg-white">
                      <SelectValue placeholder="Select Category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {displayCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs uppercase font-bold text-slate-500">Target Sub-category</Label>
                  <Select
                    value={settings.balancingSubCategory?.subCategory}
                    onValueChange={(sub) => saveSettings({ balancingSubCategory: { ...settings.balancingSubCategory!, subCategory: sub } })}
                    disabled={!settings.balancingSubCategory?.category}
                  >
                    <SelectTrigger className="h-10 bg-white">
                      <SelectValue placeholder="Select Sub-category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(settings.subCategories[settings.balancingSubCategory?.category || ''] || []).map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-4 italic">
                Example: If you spend less than your total budget, the leftover amount will be added to this sub-category. If you overspend, it will be deducted from here.
              </p>
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="merchants">
          <MerchantManager />
        </TabsContent>


        <TabsContent value="lists">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SimpleListSection title="Accounts" field="accounts" items={settings.accounts} />
            <SimpleListSection title="Budget Types" field="budgetTypes" items={settings.budgetTypes} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
