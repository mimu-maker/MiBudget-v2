import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Sparkles, AlertTriangle } from 'lucide-react';
import { useSettings, AppSettings } from '@/hooks/useSettings';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';

const Settings = () => {
  const { settings, saveSettings, addItem, removeItem } = useSettings();
  const { transactions } = useTransactionTable();

  const [sidAmount, setSidAmount] = useState(settings.sidAmount.toString());
  const [specialAmount, setSpecialAmount] = useState(settings.specialAmount.toString());
  const [saveMessage, setSaveMessage] = useState('');

  // Scan & Suggest State
  const [suggestions, setSuggestions] = useState<{
    categories: string[];
    subCategories: string[];
    merchants: string[]; // Potential future use
  } | null>(null);

  const handleSaveConfig = () => {
    // Validate SID amount
    const sidValue = parseFloat(sidAmount);
    if (isNaN(sidValue) || sidValue < 0) {
      setSaveMessage('SID amount must be a valid positive number');
      return;
    }

    // Validate Special amount (can be percentage or fixed amount)
    let specialValue: number | string = specialAmount;
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

    setSaveMessage('Configuration saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleScanHistory = () => {
    if (!transactions.length) return;

    const usedCategories = new Set<string>();
    const usedSubCategories = new Set<string>();

    transactions.forEach(t => {
      if (t.category) usedCategories.add(t.category);
      if (t.subCategory) usedSubCategories.add(t.subCategory);
    });

    // Find items NOT in current settings
    const newCategories = Array.from(usedCategories).filter(c => !settings.categories.includes(c));

    // For subcategories, we don't have a strict list yet, but we can list them for info
    const allSubCats = Array.from(usedSubCategories);

    if (newCategories.length === 0) {
      setSaveMessage('Scan complete. No new categories found.');
      setTimeout(() => setSaveMessage(''), 3000);
    } else {
      setSuggestions({
        categories: newCategories,
        subCategories: allSubCats, // Just showing top ones or all?
        merchants: []
      });
    }
  };

  const EnumSection = ({
    title,
    field,
    items
  }: {
    title: string;
    field: keyof AppSettings;
    items: string[];
  }) => {
    const [newItem, setNewItem] = useState('');

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {items.map((item, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-2 py-1 px-2 text-sm font-normal">
                  {item}
                  <button
                    onClick={() => removeItem(field, item)}
                    className="text-gray-400 hover:text-red-500 ml-1 transition-colors"
                  >
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newItem.trim()) {
                    addItem(field, newItem.trim());
                    setNewItem('');
                  }
                }}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (newItem.trim()) {
                    addItem(field, newItem.trim());
                    setNewItem('');
                  }
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Manage your budget preferences and lists.</p>
        </div>
        <Button variant="outline" onClick={handleScanHistory} className="gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          Scan History for Suggestions
        </Button>
      </div>

      {saveMessage && (
        <Alert className={saveMessage.includes('No new') ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"}>
          <AlertTitle>Notification</AlertTitle>
          <AlertDescription>{saveMessage}</AlertDescription>
        </Alert>
      )}

      {suggestions && suggestions.categories.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Sparkles className="w-5 h-5" />
              Found New Categories
            </CardTitle>
            <CardDescription className="text-purple-700">
              We found these categories in your transactions that aren't in your settings list.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {suggestions.categories.map(cat => (
                <div key={cat} className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-purple-200 shadow-sm">
                  <span className="font-medium text-purple-900">{cat}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-purple-100 rounded-full"
                    onClick={() => {
                      addItem('categories', cat);
                      setSuggestions(prev => prev ? ({
                        ...prev,
                        categories: prev.categories.filter(c => c !== cat)
                      }) : null);
                    }}
                  >
                    <Plus className="w-4 h-4 text-green-600" />
                  </Button>
                </div>
              ))}
            </div>
            {suggestions.categories.length === 0 && (
              <p className="text-sm text-purple-800 italic">All found categories have been added!</p>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setSuggestions(null)} className="text-purple-700 hover:text-purple-900 hover:bg-purple-200">
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="lists" className="w-full">
        <TabsList>
          <TabsTrigger value="lists">Lists & Dropdowns</TabsTrigger>
          <TabsTrigger value="config">Budget Config</TabsTrigger>
        </TabsList>

        <TabsContent value="lists" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <EnumSection
              title="Categories"
              field="categories"
              items={settings.categories}
            />

            <EnumSection
              title="Accounts"
              field="accounts"
              items={settings.accounts}
            />

            <EnumSection
              title="Status Options"
              field="statuses"
              items={settings.statuses}
            />

            <EnumSection
              title="Budget Types"
              field="budgetTypes"
              items={settings.budgetTypes}
            />

            <EnumSection
              title="Recurring Options"
              field="recurringOptions"
              items={settings.recurringOptions}
            />
          </div>
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Allocations</CardTitle>
              <CardDescription>Configure your standard budget amounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="sid-amount">SID Amount (DKK)</Label>
                  <Input
                    id="sid-amount"
                    type="number"
                    value={sidAmount}
                    onChange={(e) => setSidAmount(e.target.value)}
                    placeholder="5000"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Fixed monthly SID allocation</p>
                </div>
                <div>
                  <Label htmlFor="special-amount">Special Amount (DKK or %)</Label>
                  <Input
                    id="special-amount"
                    type="text"
                    value={specialAmount}
                    onChange={(e) => setSpecialAmount(e.target.value)}
                    placeholder="15% or 7000"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use % for percentage of income or fixed amount</p>
                </div>
                <Button onClick={handleSaveConfig} className="w-full">Save Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
