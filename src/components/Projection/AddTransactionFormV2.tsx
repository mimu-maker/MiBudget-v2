import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NewTransactionForm } from '@/types/projection';
import { useMerchants } from '@/hooks/useMerchants';
import { useState } from 'react';

interface AddTransactionFormV2Props {
    showForm: boolean;
    transactionType: 'income' | 'expense';
    newTransaction: NewTransactionForm;
    onTransactionChange: (updates: Partial<NewTransactionForm>) => void;
    onSubmit: () => void;
    onCancel: () => void;
}

const AddTransactionFormV2 = ({
    showForm,
    transactionType,
    newTransaction,
    onTransactionChange,
    onSubmit,
    onCancel
}: AddTransactionFormV2Props) => {
    const { data: merchants = [] } = useMerchants();
    const [showNewMerchant, setShowNewMerchant] = useState(false);

    if (!showForm) return null;

    // Generate month options (current month + next 24 months)
    const getMonthOptions = () => {
        const options = [];
        const now = new Date();

        for (let i = 0; i < 24; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const value = date.toISOString().slice(0, 7); // YYYY-MM format
            const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            options.push({ value, label });
        }

        return options;
    };

    const monthOptions = getMonthOptions();

    const handleMerchantChange = (value: string) => {
        if (value === '__new__') {
            setShowNewMerchant(true);
            onTransactionChange({ merchant: '' });
        } else {
            setShowNewMerchant(false);
            onTransactionChange({ merchant: value });
        }
    };

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Add {transactionType === 'income' ? 'Income' : 'Expense'} Transaction</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Month <span className="text-red-500">*</span></label>
                        <Select
                            value={newTransaction.date.slice(0, 7)}
                            onValueChange={(value) => {
                                // Set to first day of selected month
                                onTransactionChange({ date: `${value}-01` });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Amount (DKK) <span className="text-red-500">*</span></label>
                        <Input
                            type="number"
                            step="0.01"
                            value={newTransaction.amount}
                            onChange={(e) => {
                                const value = e.target.value;
                                // For expenses, ensure negative value
                                if (transactionType === 'expense' && parseFloat(value) > 0) {
                                    onTransactionChange({ amount: `-${value}` });
                                } else if (transactionType === 'income' && parseFloat(value) < 0) {
                                    onTransactionChange({ amount: Math.abs(parseFloat(value)).toString() });
                                } else {
                                    onTransactionChange({ amount: value });
                                }
                            }}
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Details (Sub-category)</label>
                        <Input
                            value={newTransaction.subCategory}
                            onChange={(e) => onTransactionChange({ subCategory: e.target.value })}
                            placeholder={transactionType === 'income' ? 'e.g., Michael Salary' : 'e.g., Rent, Groceries'}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Merchant</label>
                        {showNewMerchant ? (
                            <div className="flex gap-2">
                                <Input
                                    value={newTransaction.merchant}
                                    onChange={(e) => onTransactionChange({ merchant: e.target.value })}
                                    placeholder="Enter merchant name"
                                    autoFocus
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setShowNewMerchant(false);
                                        onTransactionChange({ merchant: '' });
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        ) : (
                            <Select value={newTransaction.merchant} onValueChange={handleMerchantChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select merchant (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__new__">+ Add New Merchant</SelectItem>
                                    {merchants.map(merchant => (
                                        <SelectItem key={merchant} value={merchant}>
                                            {merchant}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Account</label>
                        <Select value={newTransaction.account} onValueChange={(value) => onTransactionChange({ account: value })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Master">Master</SelectItem>
                                <SelectItem value="Joint">Joint</SelectItem>
                                <SelectItem value="Savings">Savings</SelectItem>
                                <SelectItem value="Investment">Investment</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Budget</label>
                        <Select value={newTransaction.budget} onValueChange={(value) => onTransactionChange({ budget: value })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Budgeted">Budgeted</SelectItem>
                                <SelectItem value="Special">Special</SelectItem>
                                <SelectItem value="Klintemarken">Klintemarken</SelectItem>
                                <SelectItem value="Exclude">Exclude</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {transactionType === 'expense' && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Category</label>
                            <Select value={newTransaction.category} onValueChange={(value) => onTransactionChange({ category: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Food">Food</SelectItem>
                                    <SelectItem value="Housing">Housing</SelectItem>
                                    <SelectItem value="Transport">Transport</SelectItem>
                                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                                    <SelectItem value="Utilities">Utilities</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="planned"
                            checked={newTransaction.planned}
                            onChange={(e) => onTransactionChange({ planned: e.target.checked })}
                            className="rounded border-input bg-background text-primary focus:ring-ring"
                        />
                        <label htmlFor="planned" className="text-sm font-medium">Planned</label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="recurring"
                            checked={newTransaction.recurring}
                            onChange={(e) => onTransactionChange({ recurring: e.target.checked })}
                            className="rounded border-input bg-background text-primary focus:ring-ring"
                        />
                        <label htmlFor="recurring" className="text-sm font-medium">Recurring</label>
                    </div>
                </div>

                <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button onClick={onSubmit}>
                        Add Transaction
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default AddTransactionFormV2;
