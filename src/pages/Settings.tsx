
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';

const Settings = () => {
  const [sidAmount, setSidAmount] = useState('5000');
  const [specialAmount, setSpecialAmount] = useState('15%');
  
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
                  type="text"
                  value={sidAmount}
                  onChange={(e) => setSidAmount(e.target.value)}
                  placeholder="5000"
                />
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
          <Button size="lg">Save Settings</Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
