import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { usePeriod } from '@/contexts/PeriodContext';
import { filterByPeriod } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';

export const ReconciliationOverview = () => {
  const { transactions } = useTransactionTable();
  const { selectedPeriod, customDateRange } = usePeriod();
  const { settings } = useSettings();

  // Filter for 'Pending' status transactions for the selected period
  const pendingTransactions = useMemo(() => {
    const periodFiltered = filterByPeriod(transactions, selectedPeriod, customDateRange);
    return periodFiltered.filter(t => t.status && t.status.toLowerCase().includes('pending') && !t.excluded && t.budget !== 'Exclude');
  }, [transactions, selectedPeriod, customDateRange]);

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
        <h2 className="text-xl font-bold text-foreground tracking-tight">Pending Reconciliation</h2>
        <Badge variant="outline" className={`text-lg font-black px-4 py-1.5 rounded-full transition-colors ${totalPendingBalance >= 0 ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5' : 'text-rose-500 border-rose-500/30 bg-rose-500/5'}`}>
          Net Balance: {formatCurrency(totalPendingBalance, settings.currency)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {Object.entries(groupedItems).map(([group, items]) => (
          <Card key={group} className="shadow-md border-none overflow-hidden bg-card transition-colors">
            <CardHeader className="bg-muted/30 transition-colors">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="font-bold text-foreground/80">{group === 'General' ? 'Pending Items' : `Pending - ${group}`}</span>
                <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">{items.length} items</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border border-border/50 rounded-2xl bg-background/50 shadow-sm hover:shadow-md hover:bg-background transition-all group">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground/90">{item.description}</span>
                        <span className={`font-black text-lg ${item.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {formatCurrency(item.amount, settings.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.date}</span>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase border-border/50">{item.category}</Badge>
                          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-tighter bg-muted hover:bg-muted text-muted-foreground">{item.status}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-border/30">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Total for {group}</span>
                  <span className={`text-xl font-black ${items.reduce((sum, item) => sum + item.amount, 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatCurrency(items.reduce((sum, item) => sum + item.amount, 0), settings.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {pendingTransactions.length === 0 && (
          <div className="text-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-border transition-colors">
            <div className="max-w-xs mx-auto space-y-3">
              <p className="text-2xl font-black text-foreground/20 tracking-tighter uppercase">Clear Skies</p>
              <p className="text-muted-foreground font-medium text-sm">No pending items found in {(selectedPeriod === 'Custom' ? 'custom range' : selectedPeriod).toLowerCase()}. Everything is reconciled!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
