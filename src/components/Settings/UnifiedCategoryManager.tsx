import React, { useState, Fragment, useMemo, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as LucideIcons from 'lucide-react';
import { Plus, Trash2, ArrowUp, ArrowDown, CheckCircle2, Circle, ArrowRightLeft, Target, Pencil, ChevronRight, ChevronDown, Sparkles, Activity, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiYearBudgets, useBudgetGroups, BudgetGroupRecord } from '@/hooks/useBudgetCategories';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const AVAILABLE_ICONS = [
    'Target', 'TrendingUp', 'TrendingDown', 'Activity', 'CreditCard', 'Banknote',
    'Wallet', 'Landmark', 'PieChart', 'BarChart', 'ShoppingBag', 'ShoppingCart',
    'Coffee', 'Car', 'Home', 'Heart', 'Zap', 'Wifi', 'Smartphone', 'Laptop',
    'Book', 'Plane', 'Wine', 'Utensils', 'Gift', 'Briefcase', 'Key', 'Umbrella',
    'Shield', 'Gem', 'Trash2'
] as const;

const AVAILABLE_COLORS = [
    '#3B82F6', '#60A5FA', '#93C5FD', // Blues
    '#10B981', '#34D399', '#6EE7B7', // Emeralds/Greens
    '#F59E0B', '#FBBF24', '#FDE68A', // Ambers
    '#EF4444', '#F87171', '#FCA5A5', // Reds
    '#8B5CF6', '#A78BFA', '#C4B5FD', // Violets
    '#EC4899', '#F472B6', '#F9A8D4', // Pinks
    '#06B6D4', '#22D3EE', '#67E8F9', // Cyans
    '#F97316', '#FB923C', '#FDBA74', // Oranges
    '#84CC16', '#A3E635', '#BEF264', // Limes
    '#14B8A6', '#2DD4BF', '#5EEAD4', // Teals
    '#6366F1', '#818CF8', '#A5B4FC', // Indigos
    '#A855F7', '#C084FC', '#D8B4FE', // Purples
    '#64748B', '#94A3B8', '#CBD5E1', // Slates
];

const PRESET_CATEGORIES = [
    "Housing", "Utilities", "Household", "Food", "Transportation",
    "Insurance", "Healthcare", "Debt Payments", "Savings & Investing",
    "Personal & Lifestyle", "Entertainment & Subscriptions",
    "Children & Education", "Gifts & Charity", "Miscellaneous / Buffer"
];

const ICON_SECTIONS = [
    {
        label: 'Money & Finance',
        icons: ['Landmark', 'Banknote', 'Coins', 'Wallet', 'CreditCard', 'Receipt', 'Calculator', 'PiggyBank', 'TrendingUp', 'TrendingDown', 'BarChart2', 'PieChart', 'Percent']
    },
    {
        label: 'Housing & Home',
        icons: ['Home', 'Building', 'Key', 'MapPin', 'Lamp', 'Sofa', 'Trash2', 'Hammer', 'Wrench', 'Lightbulb', 'Power', 'Wind', 'DoorOpen', 'Thermometer']
    },
    {
        label: 'Food & Drink',
        icons: ['ShoppingBag', 'ShoppingCart', 'Coffee', 'Utensils', 'UtensilsCrossed', 'GlassWater', 'Pizza', 'Wine', 'Cake', 'Apple', 'Carrot', 'Beef', 'IceCream', 'Candy']
    },
    {
        label: 'Transport & Travel',
        icons: ['Car', 'Bus', 'TrainFront', 'Bike', 'Plane', 'Fuel', 'Map', 'Gauge', 'ParkingCircle', 'Waypoints', 'Umbrella', 'Suitcase', 'Navigation', 'Anchor']
    },
    {
        label: 'Health & Wellness',
        icons: ['Heart', 'HeartPulse', 'Activity', 'Stethoscope', 'Pill', 'Syringe', 'FirstAid', 'Dumbbell', 'Brain', 'Smile', 'Moon', 'Bath']
    },
    {
        label: 'Family & Children',
        icons: ['Baby', 'Users', 'User', 'PersonStanding', 'Trees', 'ToyBrick', 'Milk', 'Tent', 'Cloud', 'SmilePlus']
    },
    {
        label: 'Education',
        icons: ['School', 'GraduationCap', 'Book', 'BookOpen', 'Pencil', 'Library', 'Award', 'Languages', 'Microscope', 'FlaskConical', 'Globe', 'Compass']
    },
    {
        label: 'Lifestyle & Fun',
        icons: ['Gamepad2', 'Tv', 'Monitor', 'Music', 'Music2', 'Headphones', 'Clapperboard', 'Ticket', 'Mic2', 'Camera', 'Smartphone', 'Laptop', 'Headset', 'Brush', 'Palette']
    },
    {
        label: 'Gifts & Charity',
        icons: ['Gift', 'PartyPopper', 'Sparkles', 'HandHeart', 'Flame', 'Flower2', 'Clover', 'Sprout', 'HelpingHand', 'Church', 'Bird', 'Infinity']
    },
    {
        label: 'System & Other',
        icons: ['Shield', 'ShieldCheck', 'Lock', 'KeyRound', 'Target', 'Gem', 'Layers', 'Boxes', 'Archive', 'Tags']
    }
];

export const UnifiedCategoryManager = () => {
    const { userProfile } = useAuth();
    const {
        budgets,
        categories: dbCategories,
        isLoading,
        addCategory,
        renameCategory,
        deleteCategory,
        reorderCategories,
        addSubCategory,
        renameSubCategory,
        deleteSubCategory,
        reorderSubCategories,
        moveSubCategory,
        toggleSubCategoryActive,
        updateCategoryIcon,
        updateCategoryColor,
        updateCategoryLabel,
        updateSubCategoryLabel
    } = useMultiYearBudgets();

    const {
        groups,
        addGroup,
        deleteGroup
    } = useBudgetGroups();

    const { transactions } = useTransactionTable();
    const {
        settings,
        addItem,
        // removeItem,
        addSubCategory: addSubCategoryLocal,
        removeSubCategory: removeSubCategoryLocal,
        reorderItems,
        moveSubCategory: moveSubCategoryLocal,
        renameSubCategory: renameSubCategoryLocal,
        updateCategoryConfig
    } = useSettings();

    const { toast } = useToast();
    const [newCatName, setNewCatName] = useState('');
    const [inlineSubName, setInlineSubName] = useState<Record<string, string>>({});
    const [newFeederName, setNewFeederName] = useState('');

    // Dialog state

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [editingCategory, setEditingCategory] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [editingSubCategory, setEditingSubCategory] = useState<{ category: string, sub: string, subRecord: any } | null>(null);
    const [editNameValue, setEditNameValue] = useState('');
    const [editIconValue, setEditIconValue] = useState('');
    const [editColorValue, setEditColorValue] = useState('');
    const [isActionPending, setIsActionPending] = useState(false);
    const [feederSectionExpanded, setFeederSectionExpanded] = useState(false);
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

    const isDbMode = !!userProfile;
    const hasSupabaseCategories = isDbMode && !!dbCategories;
    const isAuthenticatedButUsingLocal = isDbMode && (!dbCategories || dbCategories.length === 0);

    // Expansion State
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const displayCategories = useMemo(() => {
        if (isDbMode) return (dbCategories || []).map(c => c.name);
        return settings.categories || [];
    }, [isDbMode, dbCategories, settings.categories]);


    // Initialize expansion on load
    useEffect(() => {
        if (displayCategories.length > 0 && expandedCategories.size === 0) {
            // Only expand Income by default
            setExpandedCategories(new Set(['Income']));
        }
    }, [displayCategories.length]);

    // Initialize groups expansion - Disabled (collapse by default)
    /* useEffect(() => {
        if (groups.length > 0 && expandedGroups.size === 0) {
            setExpandedGroups(new Set(groups.map(g => g.id)));
        }
    }, [groups.length]); */

    const displaySubCategories = useMemo(() => {
        if (hasSupabaseCategories) {
            const map: Record<string, string[]> = {};
            dbCategories.forEach(c => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                map[c.name] = (c.sub_categories || []).map((s: any) => s.name);
            });
            return map;
        }
        return settings.subCategories || {};
    }, [hasSupabaseCategories, dbCategories, settings.subCategories]);

    const categoryMap = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const map: Record<string, any> = {};
        if (hasSupabaseCategories) {
            dbCategories.forEach(c => {
                map[c.name] = c;
            });
        } else {
            settings.categories.forEach(name => {
                map[name] = { name, id: name };
            });
        }
        return map;
    }, [hasSupabaseCategories, dbCategories, settings.categories]);

    // Split Categories
    const incomeCategories = displayCategories.filter(c => c === 'Income');
    const expenseCategories = displayCategories.filter(c => c !== 'Unplanned Expenses' && c !== 'Income'); // Fallback for legacy
    const extraordinaryCategories = displayCategories.filter(c => c === 'Unplanned Expenses');

    // Filter categories by group
    const getCategoriesByGroup = (groupSlug: string) => {
        if (isDbMode && dbCategories) {
            return dbCategories.filter(c => {
                // EXCLUSION: Never show 'General' in any group
                if (c.name === 'General') return false;

                // FORCE: 'Special' always belongs to 'special' group
                if (c.name === 'Special') return groupSlug === 'special';

                // STANDARD: Check group slug
                return c.category_group === groupSlug;
            }).map(c => c.name);
        }
        // Fallback for local mappings if needed, or strictly rely on DB for this feature
        if (groupSlug === 'income') return incomeCategories;
        if (groupSlug === 'expenditure') return expenseCategories.filter(c => c !== 'General' && c !== 'Special');
        if (groupSlug === 'special') return extraordinaryCategories;
        return [];
    };

    const incomeGroupCats = getCategoriesByGroup('income');
    const expenseGroupCats = getCategoriesByGroup('expenditure');
    const specialGroupCats = getCategoriesByGroup('special');

    // Dynamic/Feeder groups are those that are NOT system groups
    const feederGroups = groups.filter(g => g.type !== 'system');

    const toggleExpand = (cat: string) => {
        const newSet = new Set(expandedCategories);
        if (newSet.has(cat)) newSet.delete(cat);
        else newSet.add(cat);
        setExpandedCategories(newSet);
    };

    const toggleGroupExpand = (groupId: string) => {
        const newSet = new Set(expandedGroups);
        if (newSet.has(groupId)) newSet.delete(groupId);
        else newSet.add(groupId);
        setExpandedGroups(newSet);
    };

    const expandAll = () => setExpandedCategories(new Set(displayCategories));
    const collapseAll = () => setExpandedCategories(new Set());

    const hasTransactions = (subCategoryName: string, year: number) => {
        return transactions.some(t =>
            (t.sub_category?.toLowerCase() === subCategoryName.toLowerCase() ||
                t.subCategory?.toLowerCase() === subCategoryName.toLowerCase()) &&
            new Date(t.date).getFullYear() === year
        );
    };

    const handleToggleActive = async (categoryName: string, subName: string, budgetId: string, active: boolean) => {
        const catRecord = categoryMap[categoryName];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subRecord = catRecord?.sub_categories.find((s: any) => s.name === subName);
        if (hasSupabaseCategories && subRecord && catRecord) {
            const budgetYear = budgets.find(b => b.id === budgetId)?.year;
            if (!active && budgetYear && hasTransactions(subName, budgetYear)) {
                toast({ title: "Cannot Disable", description: `Transactions already exist for "${subName}" in ${budgetYear}.`, variant: "destructive" });
                return;
            }
            setIsActionPending(true);
            try {
                await toggleSubCategoryActive.mutateAsync({
                    subCategoryId: subRecord.id,
                    categoryId: catRecord.id,
                    active,
                    targetBudgetId: budgetId,
                    year: budgetYear
                });
                toast({ title: active ? "Sub-category Enabled" : "Sub-category Disabled", description: `"${subName}" is now ${active ? 'active' : 'inactive'}.` });
            } catch (err) {
                toast({ title: "Action Failed", description: "Database communication error.", variant: "destructive" });
            } finally {
                setIsActionPending(false);
            }
        }
    };

    const handleMoveCategory = (catName: string, direction: 'up' | 'down', groupCats: string[]) => {
        // Find index in the specific group list first
        const currentGroupIndex = groupCats.indexOf(catName);
        if (currentGroupIndex === -1) return;

        const targetGroupIndex = direction === 'up' ? currentGroupIndex - 1 : currentGroupIndex + 1;
        if (targetGroupIndex < 0 || targetGroupIndex >= groupCats.length) return;

        const targetCatName = groupCats[targetGroupIndex];

        // Find indices in global list
        const globalIndexCurrent = displayCategories.indexOf(catName);
        const globalIndexTarget = displayCategories.indexOf(targetCatName);

        if (globalIndexCurrent === -1 || globalIndexTarget === -1) return;

        const newCats = [...displayCategories];
        // Swap their positions in the global list
        [newCats[globalIndexCurrent], newCats[globalIndexTarget]] = [newCats[globalIndexTarget], newCats[globalIndexCurrent]];

        if (hasSupabaseCategories) {
            const orderedIds = newCats.map((name) => categoryMap[name]?.id).filter(Boolean) as string[];
            reorderCategories.mutate({ orderedIds });
        } else {
            reorderItems('categories', newCats);
        }
    };

    const handleMoveSubCategoryList = (category: string, subName: string, direction: 'up' | 'down') => {
        const currentSubs = displaySubCategories[category] || [];
        const currentIndex = currentSubs.indexOf(subName);
        if (currentIndex === -1) return;

        const newSubs = [...currentSubs];
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (targetIndex >= 0 && targetIndex < newSubs.length) {
            [newSubs[targetIndex], newSubs[currentIndex]] = [newSubs[currentIndex], newSubs[targetIndex]];

            if (hasSupabaseCategories && categoryMap[category]) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const orderedIds = newSubs.map(s => categoryMap[category]?.sub_categories.find((sub: any) => sub.name === s)?.id).filter(Boolean);
                reorderSubCategories.mutate({ categoryId: categoryMap[category]!.id, orderedIds });
            } else {
                reorderItems('subCategories', newSubs, category);
            }
        }
    };

    const handleAddCategory = () => {
        if (!newCatName.trim()) return;
        if (isDbMode) addCategory.mutate({ name: newCatName.trim() });
        else addItem('categories', newCatName.trim());

        toast({ title: "Category Added", description: `"${newCatName}" is now available.` });
        setNewCatName('');
    };

    const handleAddFeederBudget = async () => {
        if (!newFeederName.trim()) return;
        await addGroup.mutateAsync({ name: newFeederName.trim() });
        setNewFeederName('');
        toast({ title: "Feeder Budget Added", description: `"${newFeederName}" has been created.` });
    };

    // Helper to add category to specific group
    const handleAddCategoryToGroup = (groupSlug: string, name: string) => {
        if (!name.trim()) return;
        addCategory.mutate({ name: name.trim(), categoryGroup: groupSlug });
        toast({ title: "Category Added", description: `"${name}" added.` });
    };

    const handleAddSubInline = (catName: string) => {
        const name = inlineSubName[catName];
        if (!name?.trim()) return;

        if (hasSupabaseCategories) {
            const catRecord = categoryMap[catName];
            if (!catRecord) return;
            addSubCategory.mutate({ categoryId: catRecord.id, name: name.trim() });
        } else {
            addSubCategoryLocal(catName, name.trim());
        }
        toast({ title: "Sub-category Added", description: `"${name}" added to ${catName}.` });
        setInlineSubName(prev => ({ ...prev, [catName]: '' }));
    };

    // ... Save edits logic (same as before)
    const handleSaveCategoryEdit = async () => {
        // ... (simplified call, reusing existing logic structure)
        if (!editingCategory || !editNameValue.trim()) return;
        setIsActionPending(true);
        try {
            if (hasSupabaseCategories) {
                if (editNameValue.trim() !== editingCategory.name) await renameCategory.mutateAsync({ categoryId: editingCategory.id, name: editNameValue.trim() });
                if (editIconValue && editIconValue !== editingCategory.icon) await updateCategoryIcon.mutateAsync({ categoryId: editingCategory.id, icon: editIconValue });
                if (editColorValue !== editingCategory.color) await updateCategoryColor.mutateAsync({ categoryId: editingCategory.id, color: editColorValue });
            } else {
                // Local rename logic
                const newCats = [...settings.categories];
                const idx = newCats.indexOf(editingCategory.name);
                if (idx > -1) {
                    newCats[idx] = editNameValue.trim();
                    reorderItems('categories', newCats);
                    updateCategoryConfig(editNameValue.trim(), { color: editColorValue });
                }
            }
            toast({ title: "Updated", description: "Category updated." });
            setEditingCategory(null);
        } catch (e) { toast({ title: "Error", variant: "destructive" }); }
        finally { setIsActionPending(false); }
    };

    const handleSaveSubCategoryEdit = () => {
        if (!editingSubCategory || !editNameValue.trim()) return;
        const { category, sub, subRecord } = editingSubCategory;
        if (editNameValue.trim() !== sub) {
            if (hasSupabaseCategories && subRecord) renameSubCategory.mutate({ subCategoryId: subRecord.id, name: editNameValue.trim() });
            else renameSubCategoryLocal(category, sub, editNameValue.trim());
        }
        toast({ title: "Updated", description: "Sub-category renamed." });
        setEditingSubCategory(null);
    };

    const CategoryIcon = ({ name, className }: { name?: string, className?: string }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const IconComponent = (LucideIcons as any)[name || 'Target'] || LucideIcons.Target || Target;
        return <IconComponent className={className} />;
    };

    // --- Component Render ---
    const renderFeederGroup = (group: BudgetGroupRecord) => {
        const cats = getCategoriesByGroup(group.slug);
        const incomeCats = cats.filter(c => c.endsWith(' - Income'));
        const expenseCats = cats.filter(c => !c.endsWith(' - Income'));
        const isEmpty = incomeCats.length === 0 && expenseCats.length === 0;
        const isExpanded = expandedGroups.has(group.id);

        return (
            <Card key={group.id} className="border-slate-200 shadow-sm bg-white overflow-hidden border-none ring-1 ring-slate-200 border-l-4 border-l-purple-400">
                <div
                    className="p-4 bg-slate-50/50 border-b flex flex-col gap-4 md:flex-row md:items-center md:justify-between h-14 cursor-pointer hover:bg-slate-100/50 transition-colors"
                    onClick={() => toggleGroupExpand(group.id)}
                >
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                        <Layers className="w-5 h-5 text-purple-500" />
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                            {group.name}
                        </h3>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-400 border-slate-200">Feeder Budget</Badge>
                    </div>
                    <Button
                        variant="ghost"
                        size={confirmingDeleteId === group.id ? "sm" : "icon"}
                        className={cn(
                            confirmingDeleteId === group.id ? "h-8 px-2 w-auto bg-red-50 text-red-600 font-bold text-[10px]" : "h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-slate-100"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirmingDeleteId === group.id) {
                                deleteGroup.mutate({ id: group.id });
                                setConfirmingDeleteId(null);
                            } else {
                                setConfirmingDeleteId(group.id);
                                setTimeout(() => setConfirmingDeleteId(prev => prev === group.id ? null : prev), 3000);
                            }
                        }}
                    >
                        {confirmingDeleteId === group.id ? "CONFIRM DELETE" : <Trash2 className="w-4 h-4" />}
                    </Button>
                </div>

                {isExpanded && (
                    <div className="flex flex-col divide-y divide-slate-100 animate-in slide-in-from-top-2 duration-200">
                        {/* Setup / Empty State */}
                        {isEmpty && (
                            <div className="p-8 flex flex-col items-center justify-center text-center gap-3">
                                <p className="text-slate-500 text-sm">This Feeder Budget is empty.</p>
                                <Button
                                    size="sm"
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                    onClick={() => {
                                        // Auto-create structure
                                        addCategory.mutate({ name: `${group.name} - Income`, categoryGroup: group.slug });
                                        addCategory.mutate({ name: `${group.name} - Expenses`, categoryGroup: group.slug });
                                        toast({ title: "Structure Created", description: "Income and Expense sections added." });
                                    }}
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Initialize Structure
                                </Button>
                            </div>
                        )}

                        {/* Income Section */}
                        {incomeCats.length > 0 && (
                            <div className="bg-white">
                                <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Income</h4>
                                </div>
                                {renderCategoryTable(incomeCats, "Income", false, group.slug, true, "Income Source")}
                            </div>
                        )}

                        {/* Expense Section */}
                        {expenseCats.length > 0 && (
                            <div className="bg-white">
                                <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                                    <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Expenses</h4>
                                </div>
                                {renderCategoryTable(expenseCats, "Expenses", true, group.slug, true, "Expense Source")}
                            </div>
                        )}
                    </div>
                )}
            </Card>
        )
    };

    const renderCategoryTable = (cats: string[], title: string, isExpense: boolean, groupSlug?: string, isFeeder: boolean = false, customHeader?: string) => {
        const showLabels = isExpense && !isFeeder;
        return (
            <Card className={cn("border-slate-200 shadow-sm bg-white overflow-hidden border-none ring-1 ring-slate-200", isExpense ? "" : "border-t-4 border-t-amber-400", isFeeder ? "border-none shadow-none ring-0 rounded-none transform-none" : "")}>
                {!isFeeder && (
                    <div className="p-6 bg-slate-50/50 border-b flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                {title === 'Income' ? (
                                    <TrendingUp className="w-5 h-5 text-green-500" />
                                ) : isExpense ? (
                                    <TrendingDown className="w-5 h-5 text-red-500" />
                                ) : (
                                    <Sparkles className="w-5 h-5 text-amber-500" />
                                )}
                                {title}
                            </h3>
                            {isExpense && <p className="text-sm text-slate-500 font-medium">Standard monthly expense categories.</p>}
                            {!isExpense && title !== 'Income' && <p className="text-sm text-slate-500 font-medium">Income & Slush Fund items.</p>}
                        </div>
                        {isExpense && (
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={expandAll} className="h-8 text-xs">Expand All</Button>
                                <Button variant="outline" size="sm" onClick={collapseAll} className="h-8 text-xs">Collapse All</Button>
                            </div>
                        )}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-100">
                            <tr className="text-[11px] uppercase text-slate-500 font-bold tracking-widest">
                                <th className="py-4 px-6 w-14 text-center"></th>
                                <th className="py-4 px-6">{customHeader || "Category"}</th>
                                {showLabels && <th className="py-4 px-4 w-40">Label</th>}
                                {budgets.map(budget => (
                                    <th key={budget.id} className="py-4 px-4 text-center w-32 border-l border-slate-50">
                                        <div className="flex flex-col items-center">
                                            <span className="text-slate-800 text-sm mb-1">{budget.year}</span>
                                            <Badge variant="outline" className="text-[9px] bg-white text-blue-500 border-blue-100 font-bold px-1.5 h-4">ACTIVE</Badge>
                                        </div>
                                    </th>
                                ))}
                                <th className="py-4 px-6 w-24 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {cats.map((cat, idx) => {
                                const isExtraordinary = !isExpense;
                                // Force expansion for Feeder budgets so items are always visible
                                const expanded = isFeeder ? true : (isExpense ? expandedCategories.has(cat) : true);
                                const subCats = displaySubCategories[cat] || [];
                                const catRecord = categoryMap[cat];
                                const isFirst = idx === 0;
                                const isLast = idx === cats.length - 1;

                                // Strip prefix for Feeder Budgets
                                const displayName = isFeeder ? (cat.split(' - ').pop() || cat) : cat;
                                // For Feeder Section Headers, we want them to look like sub-headers, not clickable generic categories
                                // If isFeeder, we render a simpler row

                                return (
                                    <Fragment key={cat}>
                                        {isExpense && !isFeeder && (
                                            <tr className={cn("bg-white transition-colors group border-b border-slate-50", expanded ? "bg-slate-50/30" : "")}>
                                                <td className="py-3 px-6 w-14">
                                                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button disabled={isFirst} onClick={() => handleMoveCategory(cat, 'up', cats)} className="text-slate-400 hover:text-blue-600 disabled:opacity-20"><ArrowUp className="w-3.5 h-3.5" /></button>
                                                        <button disabled={isLast} onClick={() => handleMoveCategory(cat, 'down', cats)} className="text-slate-400 hover:text-blue-600 disabled:opacity-20"><ArrowDown className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => toggleExpand(cat)}
                                                            className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                                                        >
                                                            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                        </button>
                                                        <button
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm transition-all"
                                                            style={{
                                                                backgroundColor: catRecord?.color ? `${catRecord.color}15` : 'rgb(239 246 255)',
                                                                color: catRecord?.color || 'rgb(37 99 235)'
                                                            }}
                                                            onClick={() => {
                                                                setEditingCategory(catRecord);
                                                                setEditNameValue(catRecord.name);
                                                                setEditIconValue(catRecord.icon || 'Target');
                                                                setEditColorValue(catRecord.color || '');
                                                            }}
                                                        >
                                                            <CategoryIcon name={catRecord?.icon} className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            className="font-bold text-slate-800 hover:text-blue-600 text-sm tracking-tight text-left"
                                                            onClick={() => {
                                                                setEditingCategory(catRecord);
                                                                setEditNameValue(catRecord.name);
                                                                setEditIconValue(catRecord.icon || 'Target');
                                                                setEditColorValue(catRecord.color || '');
                                                            }}
                                                        >
                                                            {displayName} <span className="text-slate-400 font-normal text-xs ml-2">({subCats.length})</span>
                                                        </button>
                                                    </div>
                                                </td>
                                                {showLabels && (
                                                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                                                        <Select value={catRecord?.label || 'none'} onValueChange={(val) => {
                                                            if (hasSupabaseCategories && catRecord) {
                                                                updateCategoryLabel.mutate(
                                                                    { categoryId: catRecord.id, label: val === 'none' ? null : val as any },
                                                                    { onError: () => toast({ title: "Failed to set label", variant: "destructive" }) }
                                                                )
                                                            }
                                                        }}>
                                                            <SelectTrigger className="w-32 h-8 text-[11px] border-slate-200 bg-white">
                                                                <SelectValue placeholder="No label" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none" className="text-[11px] text-slate-400">No label</SelectItem>
                                                                <SelectItem value="Fixed Committed" className="text-[11px]">Fixed Committed</SelectItem>
                                                                <SelectItem value="Variable Essential" className="text-[11px]">Variable Essential</SelectItem>
                                                                <SelectItem value="Discretionary" className="text-[11px]">Discretionary</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </td>
                                                )}
                                                {budgets.map(b => <td key={b.id} className="w-32 border-l border-slate-50/50"></td>)}
                                                <td className="py-3 px-6 text-right w-24">
                                                    {/* Disable category deletion for enforced feeder categories if needed */}
                                                    <Button
                                                        variant="ghost"
                                                        size={confirmingDeleteId === catRecord.id ? "sm" : "icon"}
                                                        className={cn(
                                                            confirmingDeleteId === catRecord.id ? "h-8 px-2 w-auto bg-red-50 text-red-600 font-bold text-[10px]" : "h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        )}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirmingDeleteId === catRecord.id) {
                                                                deleteCategory.mutate({ categoryId: catRecord.id });
                                                                setConfirmingDeleteId(null);
                                                            } else {
                                                                setConfirmingDeleteId(catRecord.id);
                                                                setTimeout(() => setConfirmingDeleteId(prev => prev === catRecord.id ? null : prev), 3000);
                                                            }
                                                        }}
                                                    >
                                                        {confirmingDeleteId === catRecord.id ? "CONFIRM" : <Trash2 className="w-4 h-4" />}
                                                    </Button>
                                                </td>
                                            </tr>
                                        )}

                                        {/* For Feeder budgets, we skip the Main Category Row completely (it's redundant context) or show it as a Section Header?
                                        Actually, "Income" / "Expenses" IS the main category.
                                        And we're rendering it under the Feeder Group.
                                        So for Feeder, we might want to just show the ITEMS (subcats).
                                        But we need a way to ADD items. The Add row is inside the expanded block.
                                        So it's fine.
                                        Wait, if we skip the category row, we lose the "Add Subcategory" visual context if we aren't careful.
                                        Also, the implementation above ONLY hides the main category row if `isExpense && !isFeeder`. 
                                        So for Feeder (where `isFeeder` is true), we currently FALL THROUGH to render Nothing?
                                        Wait, line 397: `{isExpense && ( ... )}`
                                        If `isFeeder` is true, do we consider it `isExpense`?
                                        In `renderFeederGroup`, we pass `false` for Income (so `isExpense=false`) and `true` for Expense (`isExpense=true`).
                                        So for Feeder Income, standard logic (Extraordinary/Income style) applies? 
                                        Standard Income doesn't have a collapsible header row? 
                                        Looking at previous code (lines 397-437 was wrapper in `isExpense`).
                                        Income categories usually just dump the items directly?
                                        Check lines: "Income" usually hits `isExpense=false`.
                                        The logic for `expanded` at 386 was: `const expanded = isExpense ? expandedCategories.has(cat) : true;`
                                        So Income is always expanded.
                                        And the row at 397 is ONLY rendered if `isExpense`.
                                        So Income items are stripped of their parent category "Income" row?
                                        Yes. That matches current behavior.
                                        
                                        So for Feeder Expense: `isExpense=true`. We want checks to `!isFeeder`.
                                        So we HIDE the parent category row for Feeder Expenses too (because the section header "Expenses" covers it).
                                        So we change line 397 to `{isExpense && !isFeeder && ...}`
                                        This effectively hides the "Rental - Expenses" row, and just shows the items.
                                        PERFECT.
                                        And since `expanded` is forced true, the items (subcats) will show.
                                    */}

                                        {expanded && subCats.map((sub, subIdx) => {
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            const subRecord = hasSupabaseCategories ? catRecord?.sub_categories?.find((s: any) => s.name === sub) : null;
                                            const subIsFirst = subIdx === 0;
                                            const subIsLast = subIdx === subCats.length - 1;

                                            return (
                                                <tr key={`${cat}-${sub}`} className={cn("bg-white transition-colors group/sub border-b border-slate-50", isExtraordinary ? "hover:bg-amber-50/30" : "hover:bg-slate-50/50 border-t border-slate-50/50")}>
                                                    <td className="py-2 px-6">
                                                        <div className="flex flex-col gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                                            <button disabled={subIsFirst} onClick={() => handleMoveSubCategoryList(cat, sub, 'up')} className="text-slate-300 hover:text-blue-500 disabled:opacity-10"><ArrowUp className="w-3 h-3" /></button>
                                                            <button disabled={subIsLast} onClick={() => handleMoveSubCategoryList(cat, sub, 'down')} className="text-slate-300 hover:text-blue-500 disabled:opacity-10"><ArrowDown className="w-3 h-3" /></button>
                                                        </div>
                                                    </td>
                                                    <td className={cn("py-2 px-6 flex items-center gap-2", isExtraordinary && !isFeeder ? "" : "pl-10") /* Reduced padding for Feeder/Income items since no parent row */}>
                                                        {!isExtraordinary && !isFeeder && <div className="w-4 border-l-2 border-b-2 border-slate-100 h-3 -mt-3 rounded-bl-md" />}
                                                        <button
                                                            className="text-slate-600 text-[13px] font-medium hover:text-blue-600 transition-colors flex items-center gap-1.5 group/label"
                                                            onClick={() => { setEditingSubCategory({ category: cat, sub, subRecord }); setEditNameValue(sub); }}
                                                        >
                                                            {sub}
                                                            <Pencil className="w-3 h-3 opacity-0 group-hover/label:opacity-100 transition-opacity text-slate-400" />
                                                        </button>
                                                    </td>
                                                    {showLabels && (
                                                        <td className="py-2 px-4" onClick={e => e.stopPropagation()}>
                                                            <Select value={subRecord?.label || 'none'} onValueChange={(val) => {
                                                                if (hasSupabaseCategories && subRecord) {
                                                                    updateSubCategoryLabel.mutate(
                                                                        { subCategoryId: subRecord.id, label: val === 'none' ? null : val as any },
                                                                        { onError: () => toast({ title: "Failed to set label", variant: "destructive" }) }
                                                                    )
                                                                }
                                                            }}>
                                                                <SelectTrigger className="w-32 h-8 text-[11px] border-slate-200 bg-white">
                                                                    <SelectValue placeholder="No label" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none" className="text-[11px] text-slate-400">No label</SelectItem>
                                                                    <SelectItem value="Fixed Committed" className="text-[11px]">Fixed Committed</SelectItem>
                                                                    <SelectItem value="Variable Essential" className="text-[11px]">Variable Essential</SelectItem>
                                                                    <SelectItem value="Discretionary" className="text-[11px]">Discretionary</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </td>
                                                    )}
                                                    {budgets.map(budget => {
                                                        const limit = subRecord?.limits?.[budget.id];
                                                        const dbActive = limit?.is_active !== false;
                                                        const transactionExists = hasTransactions(sub, budget.year);
                                                        const isActive = dbActive || transactionExists;
                                                        const locked = transactionExists;
                                                        return (
                                                            <td key={budget.id} className="py-2 px-4 text-center border-l border-slate-50/50">
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                onClick={() => handleToggleActive(cat, sub, budget.id, !isActive)}
                                                                                disabled={isActionPending}
                                                                                className={cn("transition-all duration-200 p-2 rounded-full active:scale-95 hover:bg-slate-100/80", isActionPending && "opacity-50")}
                                                                            >
                                                                                {locked ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : isActive ? <Activity className="w-5 h-5 text-blue-500" /> : <Circle className="w-5 h-5 text-slate-200" />}
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="bg-slate-900 text-[11px] border-none shadow-xl">
                                                                            {locked ? `Active: Transactions exist` : `${isActive ? 'Enabled' : 'Disabled'}`}
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="py-2 px-6 text-right">
                                                        <div className="flex justify-end gap-1 items-center opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                                            {title !== 'Income' && (
                                                                <Select onValueChange={(val) => { if (hasSupabaseCategories && subRecord) moveSubCategory.mutate({ subCategoryId: subRecord.id, targetCategoryId: categoryMap[val].id }); }}>
                                                                    <SelectTrigger className="h-8 w-8 p-0 border-none bg-transparent hover:bg-blue-50 text-slate-400 hover:text-blue-600 shadow-none [&>svg:last-child]:hidden flex items-center justify-center"><ArrowRightLeft className="w-3.5 h-3.5" /></SelectTrigger>
                                                                    <SelectContent>{displayCategories.filter(c => c !== cat).map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                                                                </Select>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size={confirmingDeleteId === (subRecord?.id || sub) ? "sm" : "icon"}
                                                                className={cn(
                                                                    confirmingDeleteId === (subRecord?.id || sub) ? "h-8 px-2 w-auto bg-red-50 text-red-600 font-bold text-[10px]" : "h-8 w-8 p-0 text-slate-200 hover:text-red-500 hover:bg-red-50"
                                                                )}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const deleteId = subRecord?.id || sub;
                                                                    if (confirmingDeleteId === deleteId) {
                                                                        if (hasSupabaseCategories && subRecord) deleteSubCategory.mutate({ subCategoryId: subRecord.id });
                                                                        else removeSubCategoryLocal(cat, sub);
                                                                        setConfirmingDeleteId(null);
                                                                    } else {
                                                                        setConfirmingDeleteId(deleteId);
                                                                        setTimeout(() => setConfirmingDeleteId(prev => prev === deleteId ? null : prev), 3000);
                                                                    }
                                                                }}
                                                            >
                                                                {confirmingDeleteId === (subRecord?.id || sub) ? "CONFIRM" : <Trash2 className="w-3.5 h-3.5" />}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {/* Inline Add Subcategory - Show for all in Expense/Feeder, but only for the LAST one in flat sections (Income/Extraordinary) */}
                                        {expanded && (isExpense || isFeeder || idx === cats.length - 1) && (
                                            <tr className="bg-slate-50/10 group/add">
                                                <td className="py-2 px-6"></td>
                                                <td className={cn("py-2 px-6", isExtraordinary && !isFeeder ? "" : "pl-10")}>
                                                    <div className="flex items-center gap-2">
                                                        {!isExtraordinary && !isFeeder && <div className="w-4 border-l-2 border-b-2 border-slate-100 h-3 -mt-3 rounded-bl-md opacity-50" />}
                                                        <Input
                                                            placeholder="Add item..."
                                                            className="h-7 text-[12px] bg-transparent border-none shadow-none focus-visible:ring-0 placeholder:text-slate-300 w-40 hover:bg-slate-50 transition-colors"
                                                            value={inlineSubName[cat] || ''}
                                                            onChange={(e) => setInlineSubName(prev => ({ ...prev, [cat]: e.target.value }))}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubInline(cat)}
                                                        />
                                                        {inlineSubName[cat] && <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50" onClick={() => handleAddSubInline(cat)}><Plus className="w-3.5 h-3.5" /></Button>}
                                                    </div>
                                                </td>
                                                {showLabels && <td></td>}
                                                {budgets.map(b => <td key={b.id} className="w-32 border-l border-slate-50/50"></td>)}
                                                <td></td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                            {/* Add Category Row (Only for Expense or Dynamic, but HIDE for Feeder) */}
                            {!isFeeder && (
                                <tr className="bg-slate-100/50 border-t border-slate-200">
                                    <td className="py-3 px-6"></td>
                                    <td className="py-3 px-6" colSpan={budgets.length + 3}>
                                        <div className="flex items-center gap-2 max-w-sm">
                                            <div className="relative flex-1">
                                                <Input
                                                    placeholder={`Add category to ${title}...`}
                                                    className="bg-white border-slate-200 shadow-sm pl-9"
                                                    value={newCatName}
                                                    // Note: using global newCatName means typing in one input updates all.
                                                    onChange={(e) => setNewCatName(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategoryToGroup(groupSlug || 'expenditure', newCatName)}
                                                />
                                                <Plus className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                            </div>
                                            <Button size="sm" onClick={() => handleAddCategoryToGroup(groupSlug || 'expenditure', newCatName)} disabled={!newCatName.trim()} className="bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm">Add</Button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        );
    };

    if (isLoading) return <div className="p-12 flex flex-col items-center justify-center gap-4 text-slate-500"><Activity className="w-8 h-8 animate-pulse text-blue-500" /><p>Loading...</p></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Funds In (Income + Feeders) */}
            <div className="space-y-0 rounded-3xl overflow-hidden border border-slate-200">
                <div className="bg-white">
                    {renderCategoryTable(incomeGroupCats, "Income", false, 'income', false)}
                </div>

                {/* Feeder Budgets Section - Integrated */}
                <div className="bg-slate-50/30 border-t border-slate-100">
                    <div
                        className="p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between cursor-pointer hover:bg-slate-100/50 transition-colors"
                        onClick={() => setFeederSectionExpanded(!feederSectionExpanded)}
                    >
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                <Layers className="w-5 h-5 text-purple-500" />
                                Feeder Budgets
                            </h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-white text-slate-500 border-slate-200 font-medium">
                                {feederGroups.length} Sources
                            </Badge>
                            <div className="flex flex-wrap gap-1 mt-2">
                                {/* Removed preset badges per user request */}
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 px-3 text-slate-500">
                                {feederSectionExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>

                    {feederSectionExpanded && (
                        <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
                            {feederGroups.map(renderFeederGroup)}

                            {/* Add New Feeder Budget UI */}
                            <div className="border border-dashed border-slate-200 rounded-lg p-2 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3 pl-2">
                                    <Plus className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-600">Add Feeder Budget</span>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        value={newFeederName}
                                        onChange={(e) => setNewFeederName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddFeederBudget()}
                                        placeholder="Name..."
                                        className="h-8 w-40 text-sm"
                                    />
                                    <Button size="sm" onClick={handleAddFeederBudget} disabled={!newFeederName.trim()} className="h-8">Create</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Funds Out (Expenses + Unplanned) */}
            <div className="space-y-0 rounded-3xl overflow-hidden border border-slate-200">
                {/* Expense Budget Section */}
                <div className="bg-white">
                    {renderCategoryTable(expenseGroupCats, "Expense Budget", true, 'expenditure', false)}
                </div>

                {/* Slush Fund Section */}
                {specialGroupCats.length > 0 && (
                    renderCategoryTable(specialGroupCats, "Slush Fund 🍧", false, 'special', false, "Slush Fund Item")
                )}
            </div>

            {/* Note: Special section moved above Feeders and rendered as part of Expense flow */}

            {/* Dialogs */}
            <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-2">
                        <div>
                            <Label className="text-[11px] uppercase font-bold text-slate-500 mb-2 block">Category Name</Label>
                            <Input value={editNameValue} onChange={e => setEditNameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveCategoryEdit()} />
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {PRESET_CATEGORIES.map(preset => (
                                    <button
                                        key={preset}
                                        onClick={() => setEditNameValue(preset)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border",
                                            editNameValue === preset
                                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                : "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600"
                                        )}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label className="text-[11px] uppercase font-bold text-slate-500 mb-2 block">Icon Library</Label>
                            <div className="border rounded-xl bg-slate-50/50 p-3 space-y-4">
                                {ICON_SECTIONS.map(section => (
                                    <div key={section.label}>
                                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{section.label}</h5>
                                        <div className="grid grid-cols-8 gap-1">
                                            {section.icons.map(icon => (
                                                <button
                                                    key={icon}
                                                    onClick={() => setEditIconValue(icon)}
                                                    className={cn(
                                                        "p-2 rounded-lg transition-all flex justify-center",
                                                        editIconValue === icon
                                                            ? "bg-blue-600 text-white shadow-md scale-110"
                                                            : "text-slate-400 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-100"
                                                    )}
                                                >
                                                    <CategoryIcon name={icon} className="w-5 h-5" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label className="text-[11px] uppercase font-bold text-slate-500 mb-2 block">Color Palette</Label>
                            <div className="grid grid-cols-8 gap-1.5 p-3 border rounded-xl bg-slate-50/50">
                                <button
                                    onClick={() => setEditColorValue('')}
                                    className={cn(
                                        "aspect-square rounded-lg border-2 flex items-center justify-center transition-all",
                                        !editColorValue ? "border-blue-600 scale-110 shadow-md z-10" : "border-white hover:border-slate-200 shadow-sm"
                                    )}
                                    title="Default (Blue)"
                                >
                                    <div className="w-full h-full rounded-md bg-blue-500" />
                                </button>
                                {AVAILABLE_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setEditColorValue(color)}
                                        className={cn(
                                            "aspect-square rounded-lg border-2 flex items-center justify-center transition-all",
                                            editColorValue === color ? "border-blue-600 scale-110 shadow-md z-10" : "border-white hover:border-slate-200 shadow-sm"
                                        )}
                                    >
                                        <div className="w-full h-full rounded-md" style={{ backgroundColor: color }} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleSaveCategoryEdit}>Save</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingSubCategory} onOpenChange={(open) => !open && setEditingSubCategory(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Rename Sub-category</DialogTitle></DialogHeader>
                    <Input value={editNameValue} onChange={e => setEditNameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveSubCategoryEdit()} />
                    <DialogFooter><Button onClick={handleSaveSubCategoryEdit}>Save</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
