import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Sparkles, Settings as SettingsIcon, Info, ArrowUp, ArrowDown, ExternalLink, Store, Search, Forward, Check, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useSettings, AppSettings } from '@/hooks/useSettings';
import { useTransactionTable, Transaction } from '@/components/Transactions/hooks/useTransactionTable';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Settings = () => {
  const { settings, saveSettings, addItem, removeItem, updateCategoryBudget, updateSubCategoryBudget, addSubCategory, removeSubCategory, updateCategoryConfig, reorderItems, moveSubCategory } = useSettings();
  const { transactions, bulkUpdate } = useTransactionTable();

  const [saveMessage, setSaveMessage] = useState('');



  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const newCats = [...settings.categories];
    if (direction === 'up' && index > 0) {
      [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
      reorderItems('categories', newCats);
    } else if (direction === 'down' && index < newCats.length - 1) {
      [newCats[index + 1], newCats[index]] = [newCats[index], newCats[index + 1]];
      reorderItems('categories', newCats);
    }
  };

  const handleMoveSubCategory = (category: string, index: number, direction: 'up' | 'down') => {
    const currentSubs = settings.subCategories[category] || [];
    const newSubs = [...currentSubs];
    if (direction === 'up' && index > 0) {
      [newSubs[index - 1], newSubs[index]] = [newSubs[index], newSubs[index - 1]];
      reorderItems('subCategories', newSubs, category);
    } else if (direction === 'down' && index < newSubs.length - 1) {
      [newSubs[index + 1], newSubs[index]] = [newSubs[index], newSubs[index + 1]];
      reorderItems('subCategories', newSubs, category);
    }
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

    const handleInitialMove = (sub: string, from: string, to: string) => {
      if (from === to) return;

      const matching = transactions.filter(t => t.category === from && (t.subCategory === sub || t.sub_category === sub));

      if (matching.length === 0) {
        moveSubCategory(sub, from, to);
        return;
      }

      setMoveDialog({
        open: true,
        subCategory: sub,
        fromCategory: from,
        toCategory: to,
        matchingTransactions: matching
      });
      setMigrationMode('all');
      setTargetSubCategory(sub); // Default to same sub-category name

      // Initialize individual mappings
      const initialMappings: any = {};
      matching.forEach(t => {
        initialMappings[t.id] = { category: to, subCategory: sub };
      });
      setIndividualMappings(initialMappings);
    };

    const confirmMigration = async () => {
      if (migrationMode === 'all') {
        const ids = moveDialog.matchingTransactions.map(t => t.id);
        await bulkUpdate({
          ids,
          updates: {
            category: moveDialog.toCategory,
            subCategory: targetSubCategory
          }
        });
      } else {
        // Handle individual updates
        for (const t of moveDialog.matchingTransactions) {
          const mapping = individualMappings[t.id];
          await bulkUpdate({
            ids: [t.id],
            updates: {
              category: mapping.category,
              subCategory: mapping.subCategory
            }
          });
        }
      }

      moveSubCategory(moveDialog.subCategory, moveDialog.fromCategory, moveDialog.toCategory, migrationMode === 'all' ? targetSubCategory : undefined);
      setMoveDialog({ ...moveDialog, open: false });
    };

    return (
      <div className="space-y-4">
        <Dialog open={moveDialog.open} onOpenChange={(open) => setMoveDialog(prev => ({ ...prev, open }))}>
          <DialogContent className={cn("sm:max-w-[600px] transition-all duration-300", migrationMode === 'individual' && "sm:max-w-[900px]")}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Forward className="w-5 h-5 text-blue-500" />
                Move Sub-category
              </DialogTitle>
              <DialogDescription>
                Moving <strong>{moveDialog.subCategory}</strong> from <strong>{moveDialog.fromCategory}</strong> to <strong>{moveDialog.toCategory}</strong>.
                There are {moveDialog.matchingTransactions.length} existing transactions in this sub-category.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-6">
              <RadioGroup value={migrationMode} onValueChange={(v: any) => setMigrationMode(v)} className="grid grid-cols-1 gap-4">
                <div className={cn(
                  "flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors",
                  migrationMode === 'all' ? "border-blue-500 bg-blue-50 hover:bg-blue-100" : "border-slate-200 hover:bg-slate-50"
                )} onClick={() => setMigrationMode('all')}>
                  <RadioGroupItem value="all" id="mode-all" />
                  <div className="flex-1">
                    <Label htmlFor="mode-all" className="font-bold cursor-pointer">Move all existing records</Label>
                    <p className="text-xs text-slate-500">All {moveDialog.matchingTransactions.length} transactions will be updated to the new category and selected sub-category.</p>
                  </div>
                </div>

                <div className={cn(
                  "flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors",
                  migrationMode === 'individual' ? "border-blue-500 bg-blue-50 hover:bg-blue-100" : "border-slate-200 hover:bg-slate-50"
                )} onClick={() => setMigrationMode('individual')}>
                  <RadioGroupItem value="individual" id="mode-individual" />
                  <div className="flex-1">
                    <Label htmlFor="mode-individual" className="font-bold cursor-pointer">Review each transaction individually</Label>
                    <p className="text-xs text-slate-500">Manually select a new category for each record before moving.</p>
                  </div>
                </div>
              </RadioGroup>

              {migrationMode === 'all' && (
                <div className="animate-in slide-in-from-top-2">
                  <Label className="text-xs uppercase font-bold text-slate-500 mb-2 block">New Sub-category name in {moveDialog.toCategory}</Label>
                  <Input
                    value={targetSubCategory}
                    onChange={(e) => setTargetSubCategory(e.target.value)}
                    placeholder="Sub-category name..."
                  />
                </div>
              )}

              {migrationMode === 'individual' && (
                <div className="border rounded-lg overflow-hidden animate-in fade-in duration-500 shadow-inner">
                  <ScrollArea className="h-[350px]">
                    <Table>
                      <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                        <TableRow>
                          <TableHead className="text-[10px] py-2">Date</TableHead>
                          <TableHead className="text-[10px] py-2">Merchant</TableHead>
                          <TableHead className="text-[10px] py-2 text-right">Amount</TableHead>
                          <TableHead className="text-[10px] py-2">New Cat / Sub</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {moveDialog.matchingTransactions.map(t => (
                          <TableRow key={t.id} className="hover:bg-slate-50/50">
                            <TableCell className="py-2 text-[11px] whitespace-nowrap">{t.date}</TableCell>
                            <TableCell className="py-2 text-[11px] font-medium max-w-[150px] truncate">{t.merchant}</TableCell>
                            <TableCell className="py-2 text-[11px] text-right font-mono">{t.amount.toLocaleString()} {settings.currency}</TableCell>
                            <TableCell className="py-2">
                              <div className="flex gap-1 items-center">
                                <Select
                                  value={individualMappings[t.id]?.category}
                                  onValueChange={(val) => setIndividualMappings(prev => ({
                                    ...prev,
                                    [t.id]: { ...prev[t.id], category: val }
                                  }))}
                                >
                                  <SelectTrigger className="h-7 text-[10px] w-28 bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {settings.categories.map(c => <SelectItem key={c} value={c} className="text-[10px]">{c}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <ChevronRight className="w-3 h-3 text-slate-300" />
                                <Input
                                  className="h-7 text-[10px] w-28 bg-white"
                                  value={individualMappings[t.id]?.subCategory}
                                  onChange={(e) => setIndividualMappings(prev => ({
                                    ...prev,
                                    [t.id]: { ...prev[t.id], subCategory: e.target.value }
                                  }))}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}
            </div>

            <DialogFooter className="bg-slate-50/50 -mx-6 -mb-6 p-6 border-t mt-4">
              <Button variant="ghost" onClick={() => setMoveDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
              <Button onClick={confirmMigration} className="bg-blue-600 hover:bg-blue-700 gap-2 px-6">
                <Check className="w-4 h-4" /> Confirm & Move Records
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Budget Categories</h3>
            <div className="flex gap-2">
              <Input
                placeholder="New Category..."
                className="w-48 bg-white h-9"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCatName.trim()) {
                    addItem('categories', newCatName.trim());
                    setNewCatName('');
                  }
                }}
              />
              <Button size="sm" onClick={() => {
                if (newCatName.trim()) {
                  addItem('categories', newCatName.trim());
                  setNewCatName('');
                }
              }}>Add Category</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold tracking-wider">
                  <th className="py-3 px-4 w-14 text-center"></th>
                  <th className="py-3 px-4">Category / Subcategory</th>
                  <th className="py-3 px-4 w-32 text-right">Budget</th>
                  <th className="py-3 px-4 w-40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settings.categories.map((cat, idx) => {
                  const subCats = settings.subCategories[cat] || [];
                  const catBudget = settings.categoryBudgets[cat];
                  const catConfig = settings.categoryConfigs[cat] || {};

                  return (
                    <div key={cat} style={{ display: 'contents' }}>
                      {/* Category Row */}
                      <tr className="bg-white hover:bg-slate-50 group border-b border-slate-100/50">
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button disabled={idx === 0} onClick={() => handleMoveCategory(idx, 'up')} className="text-slate-400 hover:text-blue-600 disabled:opacity-20"><ArrowUp className="w-4 h-4" /></button>
                            <button disabled={idx === settings.categories.length - 1} onClick={() => handleMoveCategory(idx, 'down')} className="text-slate-400 hover:text-blue-600 disabled:opacity-20"><ArrowDown className="w-4 h-4" /></button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{cat}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="text-sm font-bold text-slate-700">
                            {(() => {
                              const subs = settings.subCategoryBudgets[cat] || {};
                              const total = Object.values(subs).reduce((sum: number, val) => {
                                if (typeof val === 'number') return sum + val;
                                if (typeof val === 'string' && !val.includes('%')) return sum + (parseFloat(val) || 0);
                                return sum;
                              }, 0);
                              return total.toLocaleString();
                            })()} {settings.currency}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-50" onClick={() => {
                              const name = prompt(`New subcategory for ${cat}:`);
                              if (name) addSubCategory(cat, name);
                            }}>
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:bg-red-50 hover:text-red-600" onClick={() => removeItem('categories', cat)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Subcategory Rows */}
                      {subCats.map((sub, subIdx) => (
                        <tr key={`${cat}-${sub}`} className="bg-slate-50/40 hover:bg-slate-50 group/sub border-b border-slate-100/30">
                          <td className="py-2 px-4">
                            <div className="flex flex-col gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                              <button disabled={subIdx === 0} onClick={() => handleMoveSubCategory(cat, subIdx, 'up')} className="text-slate-300 hover:text-blue-500 disabled:opacity-10"><ArrowUp className="w-3 h-3" /></button>
                              <button disabled={subIdx === subCats.length - 1} onClick={() => handleMoveSubCategory(cat, subIdx, 'down')} className="text-slate-300 hover:text-blue-500 disabled:opacity-10"><ArrowDown className="w-3 h-3" /></button>
                            </div>
                          </td>
                          <td className="py-2 px-4 pl-12 flex items-center gap-2">
                            <span className="w-6 border-l-2 border-b-2 border-slate-200 h-3 inline-block rounded-bl-md mr-1 -mt-2"></span>
                            <span className="text-slate-600 text-sm font-medium">{sub}</span>
                          </td>
                          <td className="py-2 px-4 text-right">
                            <div className="relative inline-block w-24">
                              <Input
                                className="h-7 text-right text-xs bg-white"
                                value={settings.subCategoryBudgets?.[cat]?.[sub] ?? ''}
                                placeholder="0"
                                onChange={(e) => updateSubCategoryBudget(cat, sub, e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="py-2 px-4 text-right">
                            <div className="flex justify-end gap-1 items-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="inline-block">
                                      <Select onValueChange={(val) => handleInitialMove(sub, cat, val)}>
                                        <SelectTrigger className="h-7 w-7 p-0 border-none bg-transparent hover:bg-blue-50 text-blue-400 group-hover/sub:text-blue-600 transition-colors [&>svg]:hidden">
                                          <Forward className="w-3.5 h-3.5" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem disabled value={cat} className="text-xs font-bold">Move to:</SelectItem>
                                          {settings.categories.filter(c => c !== cat).map(c => (
                                            <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Move to different category</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors" onClick={() => removeSubCategory(cat, sub)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </div>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
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
                  {settings.categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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


      <Tabs defaultValue="budget" className="w-full">
        <TabsList className="mb-6 bg-slate-100 p-1">
          <TabsTrigger value="general" className="px-6">General</TabsTrigger>
          <TabsTrigger value="budget" className="px-6">Budget Configuration</TabsTrigger>
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
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">

          {/* Unified Categories Section */}
          <UnifiedCategoryManager />

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
                      {settings.categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
