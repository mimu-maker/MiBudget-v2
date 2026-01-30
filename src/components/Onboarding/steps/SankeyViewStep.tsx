import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, BarChart3, Table, TrendingUp, TrendingDown } from 'lucide-react';

// Mock Sankey component - in real implementation, use d3-sankey or similar
const MockSankeyChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="w-full h-96 bg-muted/20 rounded-lg flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <BarChart3 className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-medium">Sankey Diagram</h3>
        <p className="text-muted-foreground">
          Interactive flow visualization will appear here
        </p>
        <div className="text-sm text-muted-foreground">
          {data.length} transactions visualized
        </div>
      </div>
    </div>
  );
};

// Mock Table component
const MockTableView: React.FC<{ data: any[], years: number[] }> = ({ data, years }) => {
  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium">Transaction Table</h3>
        <Select defaultValue={new Date().getFullYear().toString()}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Merchant</th>
                <th className="text-right p-3 font-medium">Amount</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-left p-3 font-medium">Account</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 20).map((transaction, index) => (
                <tr key={index} className="border-b hover:bg-muted/50">
                  <td className="p-3">{transaction.date}</td>
                  <td className="p-3">{transaction.merchant}</td>
                  <td className={`p-3 text-right font-medium ${parseFloat(transaction.amount) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {parseFloat(transaction.amount) >= 0 ? '+' : ''}{transaction.amount}
                  </td>
                  <td className="p-3">
                    {transaction.category && (
                      <Badge variant="outline">{transaction.category}</Badge>
                    )}
                  </td>
                  <td className="p-3">{transaction.account || 'Checking'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data.length > 20 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Showing 20 of {data.length} transactions
        </div>
      )}
    </div>
  );
};

export const SankeyViewStep: React.FC = () => {
  const { importData, nextPhase, previousPhase } = useOnboarding();
  const [viewMode, setViewMode] = useState<'sankey' | 'table'>('sankey');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Generate mock transaction data from import data
  const generateTransactionData = () => {
    if (!importData) return [];

    return importData.sampleData.map((row, index) => {
      const merchant = row[Object.keys(row).find(k =>
        k.toLowerCase().includes('merchant') ||
        k.toLowerCase().includes('description') ||
        k.toLowerCase().includes('payee')
      )] || `Merchant ${index + 1}`;

      const amount = row[Object.keys(row).find(k =>
        k.toLowerCase().includes('amount') ||
        k.toLowerCase().includes('value')
      )] || '0';

      const date = row[Object.keys(row).find(k =>
        k.toLowerCase().includes('date')
      )] || new Date().toISOString().split('T')[0];

      return {
        id: index + 1,
        date,
        merchant,
        amount: parseFloat(amount) || 0,
        category: row.category || 'Uncategorized',
        account: row.account || 'Checking'
      };
    });
  };

  const transactionData = generateTransactionData();

  // Get available years from data
  const getAvailableYears = () => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();

    // Add current year
    years.add(currentYear);

    // Add years from transaction data
    transactionData.forEach(transaction => {
      const year = new Date(transaction.date).getFullYear();
      if (!isNaN(year) && year > 2000) {
        years.add(year);
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  };

  const availableYears = getAvailableYears();

  // Calculate summary statistics
  const totalIncome = transactionData
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = Math.abs(transactionData
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0));

  const netFlow = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Your Financial Overview</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Here's a visualization of your imported data. Switch between Sankey and table views to explore your finances.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${totalIncome.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Income</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                ${totalExpenses.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Expenses</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className={`text-2xl font-bold ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                ${netFlow.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Net Flow</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Data Visualization
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'sankey' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('sankey')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Sankey
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <Table className="w-4 h-4 mr-2" />
                Table
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            {viewMode === 'sankey'
              ? 'Interactive flow diagram showing money movement between categories'
              : 'Detailed table view of all transactions'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {viewMode === 'sankey' ? (
            <MockSankeyChart data={transactionData} />
          ) : (
            <MockTableView data={transactionData} years={availableYears} />
          )}
        </CardContent>
      </Card>

      {/* Year Filter Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Available Years</h4>
              <p className="text-sm text-muted-foreground">
                Data available for {availableYears.length} year{availableYears.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              {availableYears.map(year => (
                <Badge
                  key={year}
                  variant={year === selectedYear ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedYear(year)}
                >
                  {year}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <strong>Top Spending Category:</strong>
                <div className="text-muted-foreground">
                  {/* Calculate top category from data */}
                  {transactionData.length > 0 ? 'Food & Dining' : 'No data'}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingDown className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <strong>Average Transaction:</strong>
                <div className="text-muted-foreground">
                  ${transactionData.length > 0
                    ? Math.abs(netFlow / transactionData.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '0.00'
                  }
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={previousPhase}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={nextPhase}
          className="flex items-center gap-2"
        >
          Continue to Income Analysis
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
