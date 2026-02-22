import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { CategorySelector } from '@/components/Budget/CategorySelector';
import { NewTransactionForm, RecurringInterval } from '@/types/projection';
import { useSources } from '@/hooks/useSources';
import { useBudgetCategoriesManager } from '@/hooks/useBudgetCategories';
import { useState, useMemo } from 'react';
import { ClipboardPaste } from 'lucide-react';

interface AddTransactionFormV2Props {
    showForm: boolean;
    transactionType: 'income' | 'expense';
    newTransaction: NewTransactionForm;
    onTransactionChange: (updates: Partial<NewTransactionForm>) => void;
    onSubmit: () => void;
    onCancel: () => void;
    onPasteClick: () => void;
    isEditing?: boolean;
}

const AddTransactionFormV2 = ({
    showForm,
    transactionType,
    newTransaction,
    onTransactionChange,
    onSubmit,
    onCancel,
    onPasteClick,
    isEditing = false
}: AddTransactionFormV2Props) => {
    const { data: sources = [] } = useSources();
    const { categories } = useBudgetCategoriesManager();
    const [showNewSource, setShowNewSource] = useState(false);
    const [showNewStream, setShowNewStream] = useState(false);

    // Custom/Local stream storage for additions within session is replaced by direct string input for 'new'
    // But we keep this if we want to add to the dropdown temporarily
    const [customStreams, setCustomStreams] = useState<string[]>([]);

    // Filter categories based on transaction type
    const availableCategories = useMemo(() => {
        if (!categories) return [];
        if (transactionType === 'income') {
            return categories.filter(c => c.category_group === 'income');
        } else {
            return categories.filter(c => c.category_group === 'expenditure' || c.category_group === 'special');
        }
    }, [categories, transactionType]);

    // Get sub-categories (streams) for the selected category
    const availableStreams = useMemo(() => {
        const selectedCat = categories.find(c => c.name === newTransaction.category);
        if (!selectedCat) return [];
        return selectedCat.sub_categories.map((s: any) => s.name);
    }, [categories, newTransaction.category]);

    // Initialize category if needed
    useMemo(() => {
        if (showForm && !newTransaction.category && availableCategories.length > 0) {
            // Default to first available category
            // For Income, usually 'Income'. For expense, maybe 'Food' or empty.
            if (transactionType === 'income') {
                const incomeCat = availableCategories.find(c => c.name === 'Income') || availableCategories[0];
                if (incomeCat && newTransaction.category !== incomeCat.name) {
                    // We need to use setTimeout or useEffect to avoid render loop, but this is inside a component body...
                    // Better to just rely on user or set default in parent. 
                    // Or check if current category is valid.
                }
            }
        }
    }, [showForm, availableCategories, transactionType, newTransaction.category]);


    if (!showForm) return null;

    const recurringOptions: RecurringInterval[] = ['Annually', 'Bi-annually', 'Quarterly', 'Monthly', 'N/A'];

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const handleSourceChange = (value: string) => {
        if (value === '__new__') {
            setShowNewSource(true);
            onTransactionChange({ source: '' });
        } else {
            setShowNewSource(false);
            onTransactionChange({ source: value });
        }
    };

    const handleStreamChange = (value: string) => {
        if (value === '__new__') {
            setShowNewStream(true);
            onTransactionChange({ stream: '' });
        } else {
            setShowNewStream(false);
            onTransactionChange({ stream: value });
        }
    };

    return (
        <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{isEditing ? 'Edit' : 'Add'} {transactionType === 'income' ? 'Income' : 'Expense'} Projection</CardTitle>
                <Button variant="outline" size="sm" onClick={onPasteClick} className="gap-2">
                    <ClipboardPaste className="w-4 h-4" />
                    Paste Data
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Recurring <span className="text-red-500">*</span></label>
                        <Select
                            value={newTransaction.recurring}
                            onValueChange={(value: RecurringInterval) => onTransactionChange({ recurring: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select interval" />
                            </SelectTrigger>
                            <SelectContent>
                                {recurringOptions.map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
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

                {/* Dynamic Date Selectors based on Recurring */}
                <div className="grid grid-cols-1 gap-4 mb-4">
                    {newTransaction.recurring === 'Monthly' && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Day of Month</label>
                            <Select
                                value={newTransaction.date.split('-')[2] || '01'}
                                onValueChange={(day) => {
                                    const yearMonth = new Date().toISOString().slice(0, 7);
                                    onTransactionChange({ date: `${yearMonth}-${day.padStart(2, '0')}` });
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                        <SelectItem key={day} value={day.toString().padStart(2, '0')}>
                                            {day}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {newTransaction.recurring === 'Bi-annually' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">First Month</label>
                                <Select
                                    value={new Date(newTransaction.date).getMonth().toString()}
                                    onValueChange={(month) => {
                                        const year = new Date().getFullYear();
                                        const date = new Date(year, parseInt(month), 1).toISOString().slice(0, 10);
                                        onTransactionChange({ date });
                                    }}
                                >
                                    <SelectTrigger><SelectValue placeholder="Month 1" /></SelectTrigger>
                                    <SelectContent>
                                        {months.map((m, i) => <SelectItem key={m} value={i.toString()}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Second Month (Auto)</label>
                                <div className="h-10 px-3 py-2 border rounded-md bg-muted text-muted-foreground text-sm flex items-center">
                                    {months[(new Date(newTransaction.date).getMonth() + 6) % 12]}
                                </div>
                            </div>
                        </div>
                    )}

                    {newTransaction.recurring === 'Annually' && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Month</label>
                            <Select
                                value={new Date(newTransaction.date).getMonth().toString()}
                                onValueChange={(month) => {
                                    const year = new Date().getFullYear();
                                    const date = new Date(year, parseInt(month), 1).toISOString().slice(0, 10);
                                    onTransactionChange({ date });
                                }}
                            >
                                <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                                <SelectContent>
                                    {months.map((m, i) => <SelectItem key={m} value={i.toString()}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {newTransaction.recurring === 'N/A' && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Date</label>
                            <Input
                                type="date"
                                value={newTransaction.date}
                                onChange={(e) => onTransactionChange({ date: e.target.value })}
                            />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <CategorySelector
                            value={newTransaction.category}
                            onValueChange={(value) => {
                                if (value.includes(':')) {
                                    const [cat, sub] = value.split(':');
                                    onTransactionChange({ category: cat, stream: sub });
                                } else {
                                    onTransactionChange({ category: value, stream: '' }); // Reset stream when category changes
                                }
                            }}
                            type={transactionType === 'income' ? 'income' : 'expense'}
                            suggestionLimit={3}
                            className="h-10 shadow-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{transactionType === 'income' ? 'Income Source (Sub-category)' : 'Stream (Sub-category)'}</label>
                        {showNewStream ? (
                            <div className="flex gap-2">
                                <Input
                                    value={newTransaction.stream}
                                    onChange={(e) => onTransactionChange({ stream: e.target.value })}
                                    placeholder="Enter name"
                                    autoFocus
                                />
                                <Button variant="outline" size="sm" onClick={() => setShowNewStream(false)}>Cancel</Button>
                            </div>
                        ) : (
                            <Select
                                value={newTransaction.stream}
                                onValueChange={handleStreamChange}
                                disabled={!newTransaction.category}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={!newTransaction.category ? "Select Category first" : "Select..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__new__">+ Add New</SelectItem>
                                    {availableStreams.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                    {customStreams.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Source</label>
                        {showNewSource ? (
                            <div className="flex gap-2">
                                <Input
                                    value={newTransaction.source}
                                    onChange={(e) => onTransactionChange({ source: e.target.value })}
                                    placeholder="Enter source name"
                                    autoFocus
                                />
                                <Button variant="outline" size="sm" onClick={() => setShowNewSource(false)}>Cancel</Button>
                            </div>
                        ) : (
                            <Select value={newTransaction.source} onValueChange={handleSourceChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select source (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__new__">+ Add New Source</SelectItem>
                                    {sources.map(source => (
                                        <SelectItem key={source} value={source}>
                                            {source}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <Input
                            value={newTransaction.description}
                            onChange={(e) => onTransactionChange({ description: e.target.value })}
                            placeholder="Optional notes"
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button onClick={onSubmit}>
                        {isEditing ? 'Save Changes' : 'Add Projection'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default AddTransactionFormV2;
