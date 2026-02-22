import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FutureTransaction } from '@/types/projection';

interface SlushFundAddDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: { name: string; date: string; amount: number; category: string }) => void;
    editingTransaction?: FutureTransaction | null;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

const SlushFundAddDialog = ({ open, onOpenChange, onSubmit, editingTransaction }: SlushFundAddDialogProps) => {
    const isEditing = !!editingTransaction;

    const [name, setName] = useState('');
    const [month, setMonth] = useState(new Date().getMonth().toString());
    const [year, setYear] = useState(currentYear.toString());
    const [amount, setAmount] = useState('');

    // Populate form when editing
    useEffect(() => {
        if (editingTransaction) {
            setName(editingTransaction.source || editingTransaction.stream || editingTransaction.description || '');
            const d = new Date(editingTransaction.date);
            setMonth(d.getMonth().toString());
            setYear(d.getFullYear().toString());
            setAmount(Math.abs(editingTransaction.amount).toString());
        } else {
            setName('');
            setMonth(new Date().getMonth().toString());
            setYear(currentYear.toString());
            setAmount('');
        }
    }, [editingTransaction, open]);

    const handleSubmit = () => {
        const parsedAmount = parseFloat(amount);
        if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

        const day = '01';
        const monthPadded = (parseInt(month) + 1).toString().padStart(2, '0');
        const date = `${year}-${monthPadded}-${day}`;

        onSubmit({
            name: name.trim(),
            date,
            amount: -Math.abs(parsedAmount), // always negative for expense
            category: 'Slush Fund'
        });

        onOpenChange(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSubmit();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
                <DialogHeader>
                    <DialogTitle className="text-purple-900">
                        {isEditing ? 'Edit Slush Fund Transaction' : 'Add Slush Fund Transaction'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="slush-name" className="text-sm font-semibold text-purple-800">
                            Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="slush-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. New iPhone, Holiday, Car repair..."
                            className="border-purple-200 focus-visible:ring-purple-400"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-purple-800">
                                Month <span className="text-red-500">*</span>
                            </Label>
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger className="border-purple-200 focus:ring-purple-400">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTHS.map((m, i) => (
                                        <SelectItem key={m} value={i.toString()}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-purple-800">
                                Year <span className="text-red-500">*</span>
                            </Label>
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger className="border-purple-200 focus:ring-purple-400">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {YEARS.map((y) => (
                                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="slush-amount" className="text-sm font-semibold text-purple-800">
                            Amount (DKK) <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 font-bold text-sm">DKK</span>
                            <Input
                                id="slush-amount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="pl-12 border-purple-200 focus-visible:ring-purple-400"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="border-purple-200 text-purple-700 hover:bg-purple-50">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!name.trim() || !amount || parseFloat(amount) <= 0}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        {isEditing ? 'Save Changes' : 'Add Transaction'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SlushFundAddDialog;
