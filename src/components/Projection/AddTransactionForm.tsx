
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NewTransactionForm } from '@/types/projection';

interface AddTransactionFormProps {
  showForm: boolean;
  newTransaction: NewTransactionForm;
  onTransactionChange: (updates: Partial<NewTransactionForm>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const AddTransactionForm = ({
  showForm,
  newTransaction,
  onTransactionChange,
  onSubmit,
  onCancel
}: AddTransactionFormProps) => {
  if (!showForm) return null;

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add Future Transaction</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <Input
              type="date"
              value={newTransaction.date}
              min={getMinDate()}
              onChange={(e) => onTransactionChange({ date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount (DKK)</label>
            <Input
              type="number"
              step="0.01"
              value={newTransaction.amount}
              onChange={(e) => onTransactionChange({ amount: e.target.value })}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Merchant</label>
            <Input
              value={newTransaction.merchant}
              onChange={(e) => onTransactionChange({ merchant: e.target.value })}
              placeholder="Merchant name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Input
              value={newTransaction.description}
              onChange={(e) => onTransactionChange({ description: e.target.value })}
              placeholder="Optional description"
            />
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

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <Select value={newTransaction.category} onValueChange={(value) => onTransactionChange({ category: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Income">Income</SelectItem>
                <SelectItem value="Food">Food</SelectItem>
                <SelectItem value="Housing">Housing</SelectItem>
                <SelectItem value="Transport">Transport</SelectItem>
                <SelectItem value="Entertainment">Entertainment</SelectItem>
                <SelectItem value="Healthcare">Healthcare</SelectItem>
                <SelectItem value="Utilities">Utilities</SelectItem>
              </SelectContent>
            </Select>
          </div>
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

export default AddTransactionForm;
