import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMerchants = () => {
    return useQuery({
        queryKey: ['merchants'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('transactions')
                .select('merchant, clean_merchant')
                .order('merchant');

            if (error) throw error;

            // Get unique merchants
            const uniqueMerchants = new Set<string>();
            data?.forEach(transaction => {
                if (transaction.clean_merchant) {
                    uniqueMerchants.add(transaction.clean_merchant);
                }
            });

            return Array.from(uniqueMerchants).sort();
        },
    });
};
