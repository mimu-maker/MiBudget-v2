import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { FutureTransaction } from '@/types/projection';

interface ExpenseTransactionsTableProps {
    transactions: FutureTransaction[];
    onDelete: (id: number) => void;
    onAddClick: () => void;
    onPasteClick: () => void;
}

const ExpenseTransactionsTable = ({
    transactions,
    onDelete,
    onAddClick,
    onPasteClick
}: ExpenseTransactionsTableProps) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Projected Expenses 2025</CardTitle>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onPasteClick}
                        >
                            Paste Data
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onAddClick}
                            className="h-8 w-8 p-0"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-400 bg-gray-200">
                                <th className="text-left py-3 px-4 font-bold text-gray-900">Date</th>
                                <th className="text-left py-3 px-4 font-bold text-gray-900">Details</th>
                                <th className="text-right py-3 px-4 font-bold text-gray-900">Projected</th>
                                <th className="text-right py-3 px-4 font-bold text-gray-900">Actual</th>
                                <th className="text-right py-3 px-4 font-bold text-gray-900">Deviation</th>
                                <th className="text-center py-3 px-4 font-bold text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-500">
                                        No expense transactions planned. Click + to add one.
                                    </td>
                                </tr>
                            ) : (
                                transactions
                                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                    .map((transaction) => {
                                        const date = new Date(transaction.date);
                                        const dateDisplay = date.toLocaleDateString('en-GB', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        });

                                        // For now, Actual and Deviation are placeholders
                                        const actual = 0;
                                        const deviation = actual - Math.abs(transaction.amount);

                                        return (
                                            <tr key={transaction.id} className="border-b border-gray-200 hover:bg-gray-50">
                                                <td className="py-3 px-4 text-sm font-semibold">{dateDisplay}</td>
                                                <td className="py-3 px-4">
                                                    <div className="font-medium">{transaction.subCategory || transaction.merchant}</div>
                                                </td>
                                                <td className="py-3 px-4 text-right font-semibold">
                                                    DKK {Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3 px-4 text-right font-semibold text-green-600">
                                                    {actual > 0 ? `DKK ${actual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                                </td>
                                                <td className={`py-3 px-4 text-right font-semibold ${deviation > 0 ? 'text-green-600' : deviation < 0 ? 'text-red-600' : ''
                                                    }`}>
                                                    {actual > 0 ? `${deviation >= 0 ? '' : '-'}DKK ${Math.abs(deviation).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onDelete(transaction.id)}
                                                        className="text-red-600 hover:bg-red-50 text-xs"
                                                    >
                                                        Delete
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};

export default ExpenseTransactionsTable;
