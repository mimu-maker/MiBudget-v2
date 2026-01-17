
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FutureTransaction } from '@/types/projection';

interface FutureTransactionsTableProps {
  transactions: FutureTransaction[];
  onDelete: (id: number) => void;
}

const FutureTransactionsTable = ({ transactions, onDelete }: FutureTransactionsTableProps) => {
  const getBudgetBadgeVariant = (budget: string) => {
    switch (budget) {
      case 'Budgeted': return 'default';
      case 'Special': return 'secondary';
      case 'Klintemarken': return 'outline';
      case 'Exclude': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Future Transactions ({transactions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Merchant</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Account</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Budget</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Category</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Sub-category</th>
                <th className="text-center py-3 px-2 font-semibold text-gray-700">Planned</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Recurring</th>
                <th className="text-center py-3 px-2 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-gray-500">
                    No future transactions planned. Add some to see your projection.
                  </td>
                </tr>
              ) : (
                transactions
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 text-sm">{transaction.date}</td>
                      <td className="py-3 px-2">
                        <div className="font-medium">{transaction.merchant}</div>
                        {transaction.description && (
                          <div className="text-xs text-gray-500 mt-1">{transaction.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={`font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                          {transaction.amount.toLocaleString()} DKK
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm">{transaction.account}</td>
                      <td className="py-3 px-2">
                        <Badge variant="secondary">{transaction.status}</Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={getBudgetBadgeVariant(transaction.budget)}>
                          {transaction.budget}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-sm">{transaction.category}</td>
                      <td className="py-3 px-2 text-sm">{transaction.subCategory}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant={transaction.planned ? 'default' : 'outline'}>
                          {transaction.planned ? 'Yes' : 'No'}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-sm">{transaction.recurring}</td>
                      <td className="py-3 px-2 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDelete(transaction.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default FutureTransactionsTable;
