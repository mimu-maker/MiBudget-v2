
import React, { useMemo, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Activity, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

export const BudgetIncomeSection = () => {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);

    // Fetch Projections from Supabase (Income only)
    const { data: projections = [], isLoading } = useQuery({
        queryKey: ['projections', 'income'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('projections')
                .select('*')
                .gte('amount', 0) // Income only
                .order('date', { ascending: true });
            if (error) throw error;
            return data || [];
        }
    });

    const yearlyTotal = useMemo(() => {
        let total = 0;
        projections.forEach(p => {
            // Simple yearly calculation approximation for now
            if (p.recurring === 'Monthly') total += p.amount * 12;
            else if (p.recurring === 'Annually') total += p.amount;
            else if (p.recurring === 'Quarterly') total += p.amount * 4;
            else if (p.recurring === 'Bi-annually') total += p.amount * 2;
            else if (p.recurring === 'N/A' && p.date.startsWith(selectedYear.toString())) total += p.amount;
        });
        return total;
    }, [projections, selectedYear]);

    const monthlyAverage = yearlyTotal / 12;

    if (isLoading) return <div className="h-24 animate-pulse bg-slate-50 rounded-lg"></div>;

    return (
        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-100 overflow-hidden mb-6">
            <div className="p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-white/80 text-emerald-700 border-emerald-200">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Updated Projections
                            </Badge>
                            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Income Sources</span>
                        </div>
                        <h3 className="text-2xl font-bold text-emerald-950 tracking-tight">
                            {new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(monthlyAverage)}
                            <span className="text-sm font-medium text-emerald-600/70 ml-2">/ month (avg)</span>
                        </h3>
                        <p className="text-sm text-emerald-700/80 mt-1">
                            Total allocatable income for {selectedYear}: <span className="font-semibold">{new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(yearlyTotal)}</span>
                        </p>
                    </div>
                </div>

                {/* Simple List for now */}
                <div className="mt-6 space-y-2">
                    {projections.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-emerald-600/60 italic">
                            <AlertCircle className="w-4 h-4" />
                            No income projections found. Go to Projections to add income sources.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {projections.slice(0, 6).map((p) => (
                                <div key={p.id} className="bg-white/60 hover:bg-white/80 transition-colors rounded-md p-3 flex items-center justify-between border border-emerald-100/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-emerald-900">{p.source || p.description}</div>
                                            <div className="text-[10px] text-emerald-600 font-medium uppercase">{p.recurring}</div>
                                        </div>
                                    </div>
                                    <div className="font-bold text-emerald-700">
                                        {new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(p.amount)}
                                    </div>
                                </div>
                            ))}
                            {projections.length > 6 && (
                                <div className="flex items-center justify-center text-xs text-emerald-600 font-medium">
                                    + {projections.length - 6} more sources
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};
