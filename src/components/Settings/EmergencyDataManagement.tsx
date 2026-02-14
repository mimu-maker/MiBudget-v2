import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';

export const EmergencyDataManagement = () => {
    const { emergencyClearAll, fixUnplannedStatus } = useTransactionTable();

    return (
        <Card className="border-red-200 shadow-sm bg-white">
            <CardHeader className="pb-4 border-b bg-red-50/50">
                <CardTitle className="text-lg font-semibold text-red-800">🚨 Emergency Data Management</CardTitle>
                <CardDescription>Dangerous operations - use with caution.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    <Alert className="border-red-200 bg-red-50">
                        <AlertTitle className="text-red-800">⚠️ Warning</AlertTitle>
                        <AlertDescription className="text-red-700">
                            This will permanently delete all transactions from your local cache and refresh your data. This action cannot be undone.
                        </AlertDescription>
                    </Alert>

                    <Button
                        onClick={emergencyClearAll}
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                    >
                        🚨 Clear All Transaction Data
                    </Button>

                    <Button
                        onClick={fixUnplannedStatus}
                        variant="outline"
                        className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                    >
                        Reset All "Unplanned" Status
                    </Button>

                    <p className="text-xs text-slate-500">
                        Use this when you need to completely reset the transaction system and start fresh.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};
