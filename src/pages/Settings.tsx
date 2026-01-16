import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Sparkles, ChevronDown, ChevronUp, Info, Settings as SettingsIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useSettings, AppSettings } from '@/hooks/useSettings';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { cn } from '@/lib/utils';

const Settings = () => {
  const { settings, saveSettings, addItem, removeItem, updateCategoryBudget, addSubCategory, removeSubCategory, updateCategoryConfig } = useSettings();
  const { transactions } = useTransactionTable();

  const [sidAmount, setSidAmount] = useState(settings.sidAmount.toString());
  const [specialAmount, setSpecialAmount] = useState(settings.specialAmount.toString());
  const [saveMessage, setSaveMessage] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Scan & Suggest State
  const [suggestions, setSuggestions] = useState<{
    categories: string[];
    subCategories: string[];
  } | null>(null);

  const handleSaveGlobalConfig = () => {
    const sidValue = parseFloat(sidAmount);
    let specialValue: number | string = specialAmount;

    if (isNaN(sidValue) || sidValue < 0) {
      setSaveMessage('SID amount must be a valid positive number');
      return;
    }

    if (specialAmount.includes('%')) {
      const percentValue = parseFloat(specialAmount.replace('%', ''));
      if (isNaN(percentValue) || percentValue < 0 || percentValue > 100) {
        setSaveMessage('Special percentage must be between 0% and 100%');
        return;
      }
    } else {
      const fixedValue = parseFloat(specialAmount);
      if (isNaN(fixedValue) || fixedValue < 0) {
        setSaveMessage('Special amount must be a valid positive number or percentage');
        return;
      }
    }

    saveSettings({
      sidAmount: sidValue,
      specialAmount: specialValue
    });

    setSaveMessage('Global configuration saved!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleScanHistory = () => {
    if (!transactions.length) return;
    const usedCategories = new Set<string>();
    transactions.forEach(t => { if (t.category) usedCategories.add(t.category); });
    const newCategories = Array.from(usedCategories).filter(c => !settings.categories.includes(c));

    if (newCategories.length === 0) {
      setSaveMessage('Scan complete. No new categories found.');
      setTimeout(() => setSaveMessage(''), 3000);
    } else {
      setSuggestions({ categories: newCategories, subCategories: [] });
    }
  };

  const CategoryItem = ({ category }: { category: string }) => {
    const [newSub, setNewSub] = useState('');
    const budget = settings.categoryBudgets[category] || 0;
    const subCats = settings.subCategories[category] || [];
    const config = settings.categoryConfigs[category] || {};
    const isExpanded = expandedCategory === category;

    return (
      <Collapsible open={isExpanded} onOpenChange={() => setExpandedCategory(isExpanded ? null : category)} className="border rounded-xl bg-white shadow-sm mb-3 overflow-hidden transition-all duration-200">
        <div className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => setExpandedCategory(isExpanded ? null : category)}>
          <div className="flex items-center gap-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
              </Button>
            </CollapsibleTrigger>
            <span className="font-semibold text-slate-800 text-lg">{category}</span>
            <Badge variant="outline" className="text-xs bg-white text-slate-500 font-normal">{subCats.length} Sub-categories</Badge>
          </div>
          <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Monthly Budget</Label>
              <div className="relative">
                <Input
                  type="number"
                  className="w-28 text-right font-mono pr-8 h-9 bg-white"
                  value={budget}
                  onChange={(e) => updateCategoryBudget(category, parseFloat(e.target.value) || 0)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs text-xs">kr</span>
              </div>
            </div>
          </div>
        </div>

        <CollapsibleContent>
          <div className="p-4 border-t bg-white space-y-6">
            {/* Overflow Setting */}
            <div className="flex items-center gap-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-blue-500" />
                <Label className="text-sm font-medium text-slate-700">Overflow Setting</Label>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm text-slate-500">Unspent budget moves to:</span>
                <Select
                  value={config.overflowCategory || 'Savings'}
                  onValueChange={(val) => updateCategoryConfig(category, { overflowCategory: val })}
                >
                  <SelectTrigger className="w-[180px] h-8 bg-white text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.categories.filter(c => c !== category).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>At the end of the month, any remaining positive balance from this category will be automatically re-allocated to the selected overflow category (default: Savings).</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Sub Categories */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sub-categories</Label>
              <div className="flex flex-wrap gap-2">
                {subCats.map((sub, idx) => (
                  <Badge key={idx} variant="secondary" className="pl-3 pr-1 py-1 h-7 flex items-center gap-1 bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 transition-colors">
                    {sub}
                    <button onClick={() => removeSubCategory(category, sub)} className="hover:bg-slate-300 rounded-full p-0.5 ml-1 transition-colors">
                      <Trash2 className="w-3 h-3 text-slate-500" />
                    </button>
                  </Badge>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add sub-category..."
                    className="h-7 w-40 text-xs"
                    value={newSub}
                    onChange={(e) => setNewSub(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSub.trim()) {
                        addSubCategory(category, newSub.trim());
                        setNewSub('');
                      }
                    }}
                  />
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => {
                    if (newSub.trim()) {
                      addSubCategory(category, newSub.trim());
                      setNewSub('');
                    }
                  }}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => removeItem('categories', category)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 text-xs gap-1">
                <Trash2 className="w-3 h-3" /> Delete Category
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-slate-500 mt-1">Manage budget categories, allocations, and application defaults.</p>
        </div>
        <Button variant="outline" onClick={handleScanHistory} className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
          <Sparkles className="w-4 h-4" /> Scan Suggestions
        </Button>
      </div>

      {saveMessage && (
        <Alert className={saveMessage.includes('No new') ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-100 text-green-800"}>
          <AlertTitle>System Notification</AlertTitle>
          <AlertDescription>{saveMessage}</AlertDescription>
        </Alert>
      )}

      {suggestions && suggestions.categories.length > 0 && (
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardHeader><CardTitle className="text-indigo-700 flex items-center gap-2"><Sparkles className="w-4 h-4" /> New Categories Found</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {suggestions.categories.map(c => (
                <Badge key={c} className="bg-white text-indigo-700 hover:bg-indigo-100 cursor-pointer border-indigo-200" onClick={() => { addItem('categories', c); setSuggestions(prev => prev ? ({ ...prev, categories: prev.categories.filter(x => x !== c) }) : null); }}>
                  {c} <Plus className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="budget" className="w-full">
        <TabsList className="mb-6 bg-slate-100 p-1">
          <TabsTrigger value="budget" className="px-6">Budget Configuration</TabsTrigger>
          <TabsTrigger value="lists" className="px-6">System Lists</TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="space-y-6">
          {/* Global Config Card */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-4 border-b bg-slate-50/50">
              <CardTitle className="text-lg font-semibold text-slate-800">Global Allocations</CardTitle>
              <CardDescription>Set your standard monthly SID (Spending Money) and Special savings targets.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <Label htmlFor="sid-amount" className="text-slate-600 font-medium">SID Amount (Monthly)</Label>
                  <div className="flex gap-2 mt-2">
                    <div className="relative flex-1">
                      <Input id="sid-amount" type="number" value={sidAmount} onChange={(e) => setSidAmount(e.target.value)} className="pr-8" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{settings.currency}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">Usually 5.000 {settings.currency}. Allocated for personal spending.</p>
                </div>
                <div>
                  <Label htmlFor="special-amount" className="text-slate-600 font-medium">Special Savings Target</Label>
                  <div className="flex gap-2 mt-2">
                    <Input id="special-amount" value={specialAmount} onChange={(e) => setSpecialAmount(e.target.value)} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">Fixed amount (e.g. 7000) or % of income (e.g. 15%).</p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Regional & Format Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium">Date Format</Label>
                    <Select value={settings.dateFormat} onValueChange={(val: any) => saveSettings({ dateFormat: val })}>
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd-mm-yyyy">Danish (31-01-2024)</SelectItem>
                        <SelectItem value="mm-dd-yyyy">International / US (01-31-2024)</SelectItem>
                        <SelectItem value="yyyy-mm-dd">ISO (2024-01-31)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium">Number Format</Label>
                    <Select value={settings.amountFormat} onValueChange={(val: any) => saveSettings({ amountFormat: val })}>
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eu">Danish (1.234,56)</SelectItem>
                        <SelectItem value="us">International / US (1,234.56)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium">Currency Symbol</Label>
                    <Input
                      value={settings.currency}
                      onChange={(e) => saveSettings({ currency: e.target.value })}
                      className="bg-white"
                      placeholder="e.g. DKK, $, €"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                {saveMessage && (
                  <span className={cn("text-sm font-medium animate-in fade-in slide-in-from-right-2", saveMessage.includes('error') ? "text-red-500" : "text-emerald-600")}>
                    {saveMessage}
                  </span>
                )}
                <Button onClick={handleSaveGlobalConfig} className="bg-slate-800 text-white hover:bg-slate-700">Save Globals</Button>
              </div>
            </CardContent>
          </Card>

          {/* Unified Categories Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Categories & Budgets</h3>
              <div className="flex gap-2">
                <Input placeholder="New Category Name..." id="new-cat-input" className="w-48 bg-white h-9" onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    if (val) { addItem('categories', val); (e.target as HTMLInputElement).value = ''; }
                  }
                }} />
                <Button size="sm" onClick={() => {
                  const el = document.getElementById('new-cat-input') as HTMLInputElement;
                  if (el && el.value) { addItem('categories', el.value); el.value = ''; }
                }}>Add</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {settings.categories.map(cat => (
                <CategoryItem key={cat} category={cat} />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lists">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SimpleListSection title="Accounts" field="accounts" items={settings.accounts} />
            <SimpleListSection title="Status Labels" field="statuses" items={settings.statuses} />
            <SimpleListSection title="Budget Types" field="budgetTypes" items={settings.budgetTypes} />
            <SimpleListSection title="Recurring Options" field="recurringOptions" items={settings.recurringOptions} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
