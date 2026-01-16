
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { usePeriod } from '@/contexts/PeriodContext';
import { filterByPeriod } from '@/lib/dateUtils';

export const ReconciliationOverview = () => {
  const { transactions } = useTransactionTable();
  const { selectedPeriod } = usePeriod();

  // Filter for 'Pending' status transactions for the selected period
  const pendingTransactions = useMemo(() => {
    const periodFiltered = filterByPeriod(transactions, selectedPeriod);
    return periodFiltered.filter(t => t.status && t.status.toLowerCase().includes('pending'));
  }, [transactions, selectedPeriod]);

  const groupedItems = useMemo(() => {
    return pendingTransactions.reduce((acc, item) => {
      const group = item.status?.replace('Pending ', '') || 'General';
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {} as Record<string, typeof pendingTransactions>);
  }, [pendingTransactions]);

  const totalPendingBalance = pendingTransactions.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Pending Reconciliation</h2>
        <Badge variant="outline" className={`text-lg font-black px-4 py-1.5 rounded-full ${totalPendingBalance >= 0 ? 'text-emerald-600 border-emerald-100' : 'text-rose-600 border-rose-100'}`}>
          Net Balance: {totalPendingBalance.toLocaleString()} DKK
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {Object.entries(groupedItems).map(([group, items]) => (
          <Card key={group} className="shadow-md border-none overflow-hidden">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="font-bold text-slate-700">{group === 'General' ? 'Pending Items' : `Pending - ${group}`}</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 font-bold">{items.length} items</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all group">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{item.description}</span>
                        <span className={`font-black text-lg ${item.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {item.amount.toLocaleString()} <span className="text-xs font-normal opacity-60">DKK</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.date}</span>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase">{item.category}</Badge>
                          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-tighter">{item.status}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total for {group}</span>
                  <span className={`text-xl font-black ${items.reduce((sum, item) => sum + item.amount, 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {items.reduce((sum, item) => sum + item.amount, 0).toLocaleString()} DKK
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {pendingTransactions.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="max-w-xs mx-auto space-y-3">
              <p className="text-2xl font-black text-slate-300 tracking-tighter uppercase">Clear Skies</p>
              <p className="text-slate-400 font-medium text-sm">No pending items found in {selectedPeriod.toLowerCase()}. Everything is reconciled!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
import React from 'react';
