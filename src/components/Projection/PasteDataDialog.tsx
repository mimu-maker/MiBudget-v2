import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FutureTransaction } from '@/types/projection';
import { parseAmount } from '@/lib/importUtils';

interface PasteDataDialogProps {
    open: boolean;
    onClose: () => void;
    onImport: (transactions: FutureTransaction[]) => void;
    transactionType: 'income' | 'expense';
}

const PasteDataDialog = ({ open, onClose, onImport, transactionType }: PasteDataDialogProps) => {
    const [pastedData, setPastedData] = useState('');
    const [preview, setPreview] = useState<FutureTransaction[]>([]);
    const [error, setError] = useState('');

    const handleParse = () => {
        try {
            setError('');
            const lines = pastedData.trim().split('\n');
            const parsed: FutureTransaction[] = [];

            lines.forEach((line, index) => {
                const parts = line.split('\t'); // Tab-separated values

                if (parts.length < 2) {
                    throw new Error(`Line ${index + 1}: Expected at least 2 columns (Month/Date and Amount)`);
                }

                const [dateStr, amountStr, ...rest] = parts;

                // Parse month/date (expecting format like "Jan 2026", "2026-01", or "31/1/2025")
                let date: string;
                if (dateStr.includes('-')) {
                    // Format: 2026-01 or 2026-01-15
                    if (dateStr.split('-').length === 2) {
                        date = `${dateStr}-01`;
                    } else {
                        date = dateStr;
                    }
                } else if (dateStr.includes('/')) {
                    // Format: 31/1/2025 or 31/01/2025
                    const dateParts = dateStr.split('/');
                    if (dateParts.length === 3) {
                        const day = dateParts[0].padStart(2, '0');
                        const month = dateParts[1].padStart(2, '0');
                        const year = dateParts[2];
                        date = `${year}-${month}-${day}`;
                    } else {
                        throw new Error(`Line ${index + 1}: Invalid date format "${dateStr}"`);
                    }
                } else {
                    // Format: "Jan 2026" or similar text
                    const monthDate = new Date(dateStr);
                    if (isNaN(monthDate.getTime())) {
                        throw new Error(`Line ${index + 1}: Invalid date format "${dateStr}"`);
                    }
                    date = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01`;
                }

                const amount = parseAmount(amountStr);

                // Ensure correct sign based on transaction type
                const finalAmount = transactionType === 'expense'
                    ? (amount > 0 ? -amount : amount)
                    : (amount < 0 ? -amount : amount);

                // Optional fields
                const stream = rest[0]?.trim() || '';
                const source = rest[1]?.trim() || '';
                const description = rest[3]?.trim() || '';

                parsed.push({
                    id: Date.now() + index,
                    date,
                    source,
                    amount: finalAmount,
                    category: transactionType === 'income' ? 'Income' : 'Food',
                    stream,
                    planned: true,
                    recurring: 'N/A',
                    description: description
                });
            });

            setPreview(parsed);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse data');
            setPreview([]);
        }
    };

    const handleImport = () => {
        if (preview.length > 0) {
            onImport(preview);
            setPastedData('');
            setPreview([]);
            setError('');
            onClose();
        }
    };

    const handleClose = () => {
        setPastedData('');
        setPreview([]);
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Paste {transactionType === 'income' ? 'Income' : 'Expense'} Data</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h3 className="text-sm font-semibold mb-2">Paste Data</h3>
                        <p className="text-xs text-gray-600 mb-2">
                            <strong>Required:</strong> Date/Month, Amount<br />
                            <strong>Optional:</strong> Stream, Source, Account, Description
                        </p>
                        <p className="text-xs text-gray-500 mb-2">
                            Paste tab-separated data. Date formats: "31/1/2025", "Jan 2026", or "2026-01"
                        </p>
                        <Textarea
                            value={pastedData}
                            onChange={(e) => setPastedData(e.target.value)}
                            placeholder={`31/1/2025\t50000\tMichael Salary\nFeb 2026\t42000\tMichael Salary`}
                            className="h-64 font-mono text-sm"
                        />
                        <div className="flex gap-2 mt-2">
                            <Button onClick={handleParse} disabled={!pastedData.trim()}>
                                Parse Data
                            </Button>
                            <Button variant="outline" onClick={() => setPastedData('')}>
                                Clear
                            </Button>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold mb-2">Preview ({preview.length} transactions)</h3>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-800 p-2 rounded text-xs mb-2">
                                {error}
                            </div>
                        )}
                        <div className="border rounded h-64 overflow-y-auto">
                            {preview.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                    No data parsed yet
                                </div>
                            ) : (
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="text-left p-2">Date</th>
                                            <th className="text-left p-2">Details</th>
                                            <th className="text-right p-2">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.map((t, i) => (
                                            <tr key={i} className="border-t">
                                                <td className="p-2">
                                                    {new Date(t.date).toLocaleDateString('en-GB', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="p-2">{t.stream || t.source || '-'}</td>
                                                <td className={`p-2 text-right ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    DKK {Math.abs(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="flex gap-2 mt-2">
                            <Button
                                onClick={handleImport}
                                disabled={preview.length === 0}
                                className="flex-1"
                            >
                                Import {preview.length} Transaction{preview.length !== 1 ? 's' : ''}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PasteDataDialog;
