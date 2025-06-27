
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const pendingItems = [
  { id: 1, date: '2024-06-15', description: 'Restaurant dinner', amount: -450, status: 'Pending Marcus', category: 'Food' },
  { id: 2, date: '2024-06-18', description: 'Grocery shopping', amount: -1250, status: 'Pending Sarah', category: 'Food' },
  { id: 3, date: '2024-06-20', description: 'Gas station', amount: -380, status: 'Pending Marcus', category: 'Transport' },
  { id: 4, date: '2024-06-22', description: 'Online purchase', amount: -750, status: 'Pending', category: 'Shopping' },
  { id: 5, date: '2024-06-25', description: 'Movie tickets', amount: -290, status: 'Pending Sarah', category: 'Entertainment' },
];

const groupedItems = pendingItems.reduce((acc, item) => {
  const group = item.status.replace('Pending ', '') || 'General';
  if (!acc[group]) acc[group] = [];
  acc[group].push(item);
  return acc;
}, {} as Record<string, typeof pendingItems>);

export const ReconciliationOverview = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {Object.entries(groupedItems).map(([group, items]) => (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{group === 'General' ? 'Pending Items' : `Pending - ${group}`}</span>
                <Badge variant="secondary">{items.length} items</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.description}</span>
                        <span className={`font-bold ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.amount.toLocaleString()} DKK
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-gray-600">{item.date}</span>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{item.category}</Badge>
                          <Badge variant="secondary">{item.status}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between font-semibold">
                  <span>Total for {group}:</span>
                  <span className={`${items.reduce((sum, item) => sum + item.amount, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {items.reduce((sum, item) => sum + item.amount, 0).toLocaleString()} DKK
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
