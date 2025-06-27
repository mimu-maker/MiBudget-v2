
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Plus } from 'lucide-react';

const Settings = () => {
  const [sidAmount, setSidAmount] = useState('5000');
  const [specialAmount, setSpecialAmount] = useState('15%');
  const [saveMessage, setSaveMessage] = useState('');
  
  const [categories, setCategories] = useState([
    'Housing', 'Food', 'Transport', 'Entertainment', 'Healthcare', 'Utilities'
  ]);
  
  const [accounts, setAccounts] = useState([
    'Master', 'Joint', 'Savings', 'Investment'
  ]);
  
  const [statuses, setStatuses] = useState([
    'Complete', 'Pending', 'Pending Marcus', 'Pending Sarah'
  ]);
  
  const [budgetTypes, setBudgetTypes] = useState([
    'Budgeted', 'Special', 'Klintemarken', 'Exclude'
  ]);
  
  const [recurringOptions, setRecurringOptions] = useState([
    'No', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'
  ]);

  const removeItem = (list: string[], setList: (items: string[]) => void, item: string) => {
    setList(list.filter(i => i !== item));
  };

  const addItem = (list: string[], setList: (items: string[]) => void, newItem: string) => {
    if (newItem && !list.includes(newItem)) {
      setList([...list, newItem]);
    }
  };

  const handleSave = () => {
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

    // Save to localStorage (in a real app, this would be sent to a backend)
    const settings = {
      sidAmount: sidValue,
      specialAmount: specialValue,
      categories,
      accounts,
      statuses,
      budgetTypes,
      recurringOptions,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('financeSettings', JSON.stringify(settings));
    setSaveMessage('Settings saved successfully!');
    
    // Clear message after 3 seconds
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const EnumSection = ({ 
    title, 
    items, 
    setItems 
  }: { 
    title: string; 
    items: string[]; 
    setItems: (items: string[]) => void;
  }) => {
    const [newItem, setNewItem] = useState('');

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {items.map((item, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-2">
                  {item}
                  <button
                    onClick={() => removeItem(items, setItems, item)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={`Add new ${title.toLowerCase()}`}
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addItem(items, setItems, newItem);
                    setNewItem('');
                  }
                }}
              />
              <Button
                onClick={() => {
                  addItem(items, setItems, newItem);
                  setNewItem('');
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
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Save Message */}
        {saveMessage && (
          <Alert>
            <AlertDescription>{saveMessage}</AlertDescription>
          </Alert>
        )}

        {/* SID & Special Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sid-amount">SID Amount (DKK)</Label>
                <Input
                  id="sid-amount"
                  type="number"
                  value={sidAmount}
                  onChange={(e) => setSidAmount(e.target.value)}
                  placeholder="5000"
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
                />
                <p className="text-xs text-gray-500 mt-1">Use % for percentage of income or fixed amount</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enum Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EnumSection 
            title="Categories" 
            items={categories} 
            setItems={setCategories} 
          />
          
          <EnumSection 
            title="Accounts" 
            items={accounts} 
            setItems={setAccounts} 
          />
          
          <EnumSection 
            title="Status Options" 
            items={statuses} 
            setItems={setStatuses} 
          />
          
          <EnumSection 
            title="Budget Types" 
            items={budgetTypes} 
            setItems={setBudgetTypes} 
          />
          
          <EnumSection 
            title="Recurring Options" 
            items={recurringOptions} 
            setItems={setRecurringOptions} 
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button size="lg" onClick={handleSave}>Save Settings</Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
