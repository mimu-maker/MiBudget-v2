import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSources = () => {
    return useQuery({
        queryKey: ['sources'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('transactions')
                .select('merchant, clean_source')
                .order('merchant');

            if (error) throw error;

            // Get unique sources
            const uniqueSources = new Set<string>();
            data?.forEach(transaction => {
                if (transaction.clean_source) {
                    uniqueSources.add(transaction.clean_source);
                }
            });

            return Array.from(uniqueSources).sort();
        },
    });
};
