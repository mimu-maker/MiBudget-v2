import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Trash2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const EmergencyDataManagement = () => {
    const { clearAllTransactions, factoryReset, fixUnplannedStatus } = useTransactionTable();
    const [confirmText, setConfirmText] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const { toast } = useToast();

    const handleClearTransactions = async () => {
        if (confirm("Are you sure you want to delete ALL transactions? This will keep your rules and categories, but remove all imported data.")) {
            setIsResetting(true);
            try {
                await clearAllTransactions();
                toast({ title: "Transactions Cleared", description: "All transaction data has been removed from the server." });
            } catch (e) {
                toast({ title: "Error", description: "Failed to clear transactions.", variant: "destructive" });
            } finally {
                setIsResetting(false);
            }
        }
    };

    const handleFactoryReset = async () => {
        if (confirmText !== 'DELETE') return;

        if (confirm("FINAL WARNING: This will wipe EVERYTHING. Transactions, rules, categories, budgets. You will start from scratch. Are you sure?")) {
            setIsResetting(true);
            try {
                await factoryReset();
                // factoryReset triggers a reload, so no toast needed here usually
            } catch (e) {
                setIsResetting(false);
                toast({ title: "Factory Reset Failed", description: "Could not wipe data. Check console.", variant: "destructive" });
            }
        }
    };

    return (
        <div className="space-y-8">
            <Card className="border-amber-200 shadow-sm bg-white">
                <CardHeader className="pb-4 border-b bg-amber-50/50">
                    <CardTitle className="text-lg font-semibold text-amber-800 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Data Cleanup
                    </CardTitle>
                    <CardDescription>Manage your transaction data without losing your configuration.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="space-y-1">
                            <h4 className="font-medium text-amber-900">Clear Transactions Only</h4>
                            <p className="text-sm text-slate-500">
                                Removes all imported transactions. Keeps your Source Rules, Categories, and Budget Limits intact.
                                Use this if you want to re-import your data from scratch.
                            </p>
                        </div>
                        <Button
                            onClick={handleClearTransactions}
                            disabled={isResetting}
                            variant="destructive"
                            className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shrink-0"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear Transactions
                        </Button>
                    </div>

                    <div className="border-t pt-4 mt-4">
                        <Button
                            onClick={fixUnplannedStatus}
                            variant="outline"
                            className="w-full border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Reset All "Unplanned" Status
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-red-200 shadow-sm bg-white ring-1 ring-red-100">
                <CardHeader className="pb-4 border-b bg-red-50/50">
                    <CardTitle className="text-lg font-semibold text-red-800 flex items-center gap-2">
                        <Trash2 className="h-5 w-5" />
                        Danger Zone
                    </CardTitle>
                    <CardDescription className="text-red-700 font-medium">
                        Irreversible actions that affect your entire account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-6">
                        <Alert className="border-red-200 bg-red-50">
                            <AlertTitle className="text-red-800 font-bold flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Factory Reset
                            </AlertTitle>
                            <AlertDescription className="text-red-700 mt-2">
                                This will permanently delete <strong>EVERYTHING</strong>:
                                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                                    <li>All Transactions</li>
                                    <li>All Source Rules & Mappings</li>
                                    <li>All Categories & Budgets</li>
                                    <li>All Settings</li>
                                </ul>
                                <p className="mt-2 font-bold">You will be logged out and the app will reload.</p>
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">
                                    Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
                                </label>
                                <Input
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="Type DELETE"
                                    className="border-red-200 focus-visible:ring-red-500 font-mono"
                                />
                            </div>

                            <Button
                                onClick={handleFactoryReset}
                                disabled={confirmText !== 'DELETE' || isResetting}
                                variant="destructive"
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12"
                            >
                                {isResetting ? "Resetting..." : "🚫 FACTORY RESET - WIPE EVERYTHING"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
