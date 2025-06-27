
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings } from 'lucide-react';

const initialBudgetData = [
  {
    category: 'Housing',
    budget: 15000,
    allocation: 32.6,
    spent: 14500,
    budgetYTD: 90000,
    vsBudget: -500,
    vsYTD: -3000,
    subcategories: [
      { name: 'Rent', budget: 12000, spent: 12000 },
      { name: 'Insurance', budget: 1500, spent: 1200 },
      { name: 'Utilities', budget: 1500, spent: 1300 }
    ]
  },
  {
    category: 'Food',
    budget: 4000,
    allocation: 8.7,
    spent: 4200,
    budgetYTD: 24000,
    vsBudget: 200,
    vsYTD: 1200,
    subcategories: [
      { name: 'Groceries', budget: 3000, spent: 3100 },
      { name: 'Dining Out', budget: 1000, spent: 1100 }
    ]
  },
  {
    category: 'Transport',
    budget: 3000,
    allocation: 6.5,
    spent: 2800,
    budgetYTD: 18000,
    vsBudget: -200,
    vsYTD: -1200,
    subcategories: [
      { name: 'Gas', budget: 1500, spent: 1400 },
      { name: 'Public Transport', budget: 800, spent: 750 },
      { name: 'Maintenance', budget: 700, spent: 650 }
    ]
  },
  {
    category: 'Entertainment',
    budget: 2500,
    allocation: 5.4,
    spent: 3000,
    budgetYTD: 15000,
    vsBudget: 500,
    vsYTD: 3000,
    subcategories: [
      { name: 'Streaming', budget: 500, spent: 500 },
      { name: 'Movies', budget: 800, spent: 1000 },
      { name: 'Other', budget: 1200, spent: 1500 }
    ]
  }
];

const Budget = () => {
  const [budgetData, setBudgetData] = useState(initialBudgetData);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);

  const updateBudget = (category: string, newBudget: number) => {
    setBudgetData(prev => prev.map(item => {
      if (item.category === category) {
        const totalBudget = prev.reduce((sum, item) => sum + (item.category === category ? 0 : item.budget), 0) + newBudget;
        const allocation = totalBudget > 0 ? (newBudget / totalBudget) * 100 : 0;
        const vsBudget = item.spent - newBudget;
        
        return {
          ...item,
          budget: newBudget,
          allocation: parseFloat(allocation.toFixed(1)),
          vsBudget
        };
      }
      return item;
    }));
    setEditingBudget(null);
  };

  const totalBudget = budgetData.reduce((sum, item) => sum + item.budget, 0);
  const totalSpent = budgetData.reduce((sum, item) => sum + item.spent, 0);
  const totalDelta = totalSpent - totalBudget;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Manage Categories
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalBudget.toLocaleString()} DKK
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {totalSpent.toLocaleString()} DKK
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalDelta >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalDelta >= 0 ? '+' : ''}{totalDelta.toLocaleString()} DKK
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Table */}
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Category</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Budget DKK</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Allocation %</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Spent</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Budget YTD</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Vs Budget</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Vs YTD</th>
                </tr>
              </thead>
              <tbody>
                {budgetData.map((item, index) => (
                  <>
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 font-semibold">{item.category}</td>
                      <td className="py-3 px-2 text-right">
                        {editingBudget === item.category ? (
                          <Input
                            type="number"
                            defaultValue={item.budget}
                            className="w-24 h-8 text-right"
                            autoFocus
                            onBlur={(e) => updateBudget(item.category, parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateBudget(item.category, parseFloat(e.currentTarget.value) || 0);
                              }
                            }}
                          />
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                            onClick={() => setEditingBudget(item.category)}
                          >
                            {item.budget.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">{item.allocation}%</td>
                      <td className="py-3 px-2 text-right font-semibold">{item.spent.toLocaleString()}</td>
                      <td className="py-3 px-2 text-right">{item.budgetYTD.toLocaleString()}</td>
                      <td className={`py-3 px-2 text-right font-semibold ${item.vsBudget >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.vsBudget >= 0 ? '+' : ''}{item.vsBudget.toLocaleString()}
                      </td>
                      <td className={`py-3 px-2 text-right font-semibold ${item.vsYTD >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.vsYTD >= 0 ? '+' : ''}{item.vsYTD.toLocaleString()}
                      </td>
                    </tr>
                    {item.subcategories.map((subcat, subIndex) => (
                      <tr key={`${index}-${subIndex}`} className="border-b border-gray-50 bg-gray-25">
                        <td className="py-2 px-6 text-sm text-gray-600">└ {subcat.name}</td>
                        <td className="py-2 px-2 text-right text-sm">{subcat.budget.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right text-sm">-</td>
                        <td className="py-2 px-2 text-right text-sm">{subcat.spent.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right text-sm">-</td>
                        <td className={`py-2 px-2 text-right text-sm ${(subcat.spent - subcat.budget) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {(subcat.spent - subcat.budget) >= 0 ? '+' : ''}{(subcat.spent - subcat.budget).toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right text-sm">-</td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Budget;
