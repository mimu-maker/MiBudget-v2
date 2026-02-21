import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WifiOff } from 'lucide-react';

export const ConnectionStatus = () => {
    const [isOffline, setIsOffline] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkConnection = async () => {
            try {
                // Simple query to check connectivity
                const { error } = await supabase.from('transactions').select('count', { count: 'exact', head: true });

                if (error) {
                    console.error("Supabase connection error:", error);
                    // If the error indicates a connection issue or paused project (code 503 or specific string)
                    setIsOffline(true);
                } else {
                    setIsOffline(false);
                }
            } catch (err) {
                console.error("Network error checking Supabase:", err);
                setIsOffline(true);
            } finally {
                setLoading(false);
            }
        };

        checkConnection();
    }, []);

    if (!isOffline) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5">
            <Alert variant="destructive" className="bg-red-50 border-red-200">
                <WifiOff className="h-4 w-4" />
                <AlertTitle>Connection Issue</AlertTitle>
                <AlertDescription>
                    Could not connect to the database. Your Supabase project might be paused due to inactivity.
                    Please check your Supabase dashboard.
                </AlertDescription>
            </Alert>
        </div>
    );
};
