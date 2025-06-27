
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';

const specialData = [
  { month: 'Jan', vacation: 5000, gifts: -2000, bonus: 15000 },
  { month: 'Feb', vacation: 0, gifts: -1500, bonus: 0 },
  { month: 'Mar', vacation: 3000, gifts: -800, bonus: 0 },
  { month: 'Apr', vacation: 0, gifts: -1200, bonus: 0 },
  { month: 'May', vacation: 8000, gifts: -2500, bonus: 0 },
  { month: 'Jun', vacation: 2000, gifts: -900, bonus: 10000 },
];

const categories = [
  { 
    name: 'Vacation Fund', 
    total: 18000, 
    transactions: 6,
    subcategories: [
      { name: 'Summer Trip', amount: 12000, transactions: 3 },
      { name: 'Weekend Getaways', amount: 4000, transactions: 2 },
      { name: 'Travel Insurance', amount: 2000, transactions: 1 }
    ]
  },
  { 
    name: 'Gift Fund', 
    total: -8900, 
    transactions: 12,
    subcategories: [
      { name: 'Birthday Gifts', amount: -3200, transactions: 4 },
      { name: 'Holiday Gifts', amount: -4500, transactions: 6 },
      { name: 'Anniversary', amount: -1200, transactions: 2 }
    ]
  },
  { 
    name: 'Bonus Income', 
    total: 25000, 
    transactions: 2,
    subcategories: [
      { name: 'Q1 Performance Bonus', amount: 15000, transactions: 1 },
      { name: 'Project Completion Bonus', amount: 10000, transactions: 1 }
    ]
  },
];

export const SpecialOverview = () => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const totalAmount = categories.reduce((sum, cat) => sum + cat.total, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Special Categories
              <div className={`text-lg font-bold ${totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Total: {totalAmount >= 0 ? '+' : ''}{totalAmount.toLocaleString()} DKK
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category.name} className="border border-gray-200 rounded-lg">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleCategory(category.name)}
                  >
                    <div className="flex items-center space-x-3">
                      <Button variant="ghost" size="sm" className="p-0 h-auto">
                        {expandedCategories.has(category.name) ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />
                        }
                      </Button>
                      <div>
                        <h3 className="font-semibold">{category.name}</h3>
                        <p className="text-sm text-gray-600">{category.transactions} transactions</p>
                      </div>
                    </div>
                    <div className={`text-right font-bold text-lg ${category.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {category.total >= 0 ? '+' : ''}{category.total.toLocaleString()} DKK
                    </div>
                  </div>
                  
                  {expandedCategories.has(category.name) && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="space-y-2 mt-3">
                        {category.subcategories.map((subcat) => (
                          <div key={subcat.name} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium text-sm">{subcat.name}</div>
                              <div className="text-xs text-gray-500">{subcat.transactions} transactions</div>
                            </div>
                            <div className={`font-semibold text-sm ${subcat.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {subcat.amount >= 0 ? '+' : ''}{subcat.amount.toLocaleString()} DKK
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Special Items Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={specialData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toLocaleString()} DKK`} />
                <Line type="monotone" dataKey="vacation" stroke="#10b981" strokeWidth={2} name="Vacation" />
                <Line type="monotone" dataKey="gifts" stroke="#ef4444" strokeWidth={2} name="Gifts" />
                <Line type="monotone" dataKey="bonus" stroke="#3b82f6" strokeWidth={2} name="Bonus" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
