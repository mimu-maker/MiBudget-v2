import React, { useMemo } from 'react';
import { ResponsiveContainer, Sankey, Tooltip, Layer, Rectangle } from 'recharts';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';
import * as LucideIcons from 'lucide-react';
import { BudgetCategory } from '@/hooks/useAnnualBudget';

interface BudgetSankeyProps {
    budgetData: BudgetCategory[];
}

const COLORS = {
    income: '#10b981', // Emerald 500
    total: '#059669',  // Emerald 600
    expense: '#f43f5e', // Rose 500
    expensePalette: [
        '#f43f5e', '#fb7185', '#e11d48', '#be123c', '#fb923c', '#f97316', '#ea580c', '#c2410c'
    ]
};

const BudgetSankey: React.FC<BudgetSankeyProps> = ({ budgetData }) => {
    const { settings } = useSettings();

    const sankeyData = useMemo(() => {
        const nodes: { name: string; color?: string; icon?: string; type?: 'income' | 'total' | 'expense' | 'savings' }[] = [];
        const links: { source: number; target: number; value: number; color?: string; opacity?: number }[] = [];
        const nodeMap = new Map<string, number>();

        const getOrCreateNode = (name: string, color?: string, icon?: string, type?: 'income' | 'total' | 'expense' | 'savings') => {
            const key = `${type}-${name}`;
            if (nodeMap.has(key)) return nodeMap.get(key)!;
            const index = nodes.length;
            nodes.push({ name, color, icon, type });
            nodeMap.set(key, index);
            return index;
        };

        // Diagnostic logging
        console.log('Sankey Budget Data:', budgetData);

        const incomeCategories = budgetData.filter(item => item.category_group === 'income' && (item.budget_amount > 0 || item.spent > 0));
        const expenseCategories = budgetData.filter(item => item.category_group !== 'income' && (item.budget_amount > 0 || item.spent > 0));

        const totalIncome = incomeCategories.reduce((sum, item) => sum + Math.max(item.budget_amount, item.spent), 0);
        const totalExpenses = expenseCategories.reduce((sum, item) => sum + Math.max(item.budget_amount, item.spent), 0);
        const unallocated = Math.max(0, totalIncome - totalExpenses);

        const fundsNodeIndex = getOrCreateNode('Total Funds', COLORS.total, 'Wallet', 'total');

        // Stage 1: Income Sub-Categories -> Total Funds
        const incomeSubCategories: { name: string; amount: number; icon: string }[] = [];
        incomeCategories.forEach(cat => {
            cat.sub_categories.forEach(sub => {
                const value = Math.max(sub.budget_amount, sub.spent);
                if (value > 0) {
                    incomeSubCategories.push({
                        name: sub.name,
                        amount: value,
                        icon: cat.icon || 'Banknote'
                    });
                }
            });
        });

        console.log('Sankey Income SubCategories:', incomeSubCategories);

        incomeSubCategories.sort((a, b) => b.amount - a.amount).forEach((item) => {
            const nodeIndex = getOrCreateNode(item.name, COLORS.income, item.icon, 'income');
            links.push({
                source: nodeIndex,
                target: fundsNodeIndex,
                value: Math.max(item.amount, 0.01),
                color: COLORS.income,
                opacity: 0.4
            });
        });

        // Stage 2: Total Funds -> Expense Categories
        expenseCategories.sort((a, b) => b.budget_amount - a.budget_amount).forEach((item, i) => {
            const themeColor = item.color || COLORS.expensePalette[i % COLORS.expensePalette.length];
            const nodeIndex = getOrCreateNode(item.name, themeColor, item.icon || 'CreditCard', 'expense');

            links.push({
                source: fundsNodeIndex,
                target: nodeIndex,
                value: Math.max(item.budget_amount, 0.01),
                color: themeColor,
                opacity: 0.4
            });
        });

        // Stage 2b: Total Funds -> Unallocated (if any)
        if (unallocated > 0) {
            const savingsNodeIndex = getOrCreateNode('Unallocated / Savings', '#3b82f6', 'PiggyBank', 'savings');
            links.push({
                source: fundsNodeIndex,
                target: savingsNodeIndex,
                value: unallocated,
                color: '#3b82f6',
                opacity: 0.4
            });
        }

        return { nodes, links };
    }, [budgetData]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const isNode = data.name !== undefined;

            if (isNode) {
                return (
                    <div className="bg-slate-900/95 border border-slate-700 p-4 rounded-2xl shadow-2xl backdrop-blur-md">
                        <p className="font-bold text-slate-200 mb-2 truncate max-w-[200px]">{data.name}</p>
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center gap-4">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Flow</span>
                                <span className="text-sm font-black text-white">{formatCurrency(payload[0].value, settings.currency)}</span>
                            </div>
                        </div>
                    </div>
                );
            }

            // It's a link
            const isBudget = data.color === '#3b82f6';
            const sourceName = typeof data.source === 'object' ? data.source.name : sankeyData.nodes[data.source]?.name || 'Unknown';
            const targetName = typeof data.target === 'object' ? data.target.name : sankeyData.nodes[data.target]?.name || 'Unknown';

            return (
                <div className="bg-slate-900/95 border border-slate-700 p-4 rounded-2xl shadow-2xl backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${isBudget ? 'bg-blue-500' : 'bg-rose-500'}`} />
                        <p className="font-bold text-slate-200 truncate max-w-[200px]">
                            {isBudget ? 'Planned Budget' : 'Actual Spend'}
                        </p>
                    </div>
                    <div className="flex justify-between items-center gap-6">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{sourceName} ➔ {targetName}</span>
                        <span className="text-lg font-black text-white">{formatCurrency(data.value, settings.currency)}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    const CustomNode = (props: any) => {
        const { x, y, width, height, index, payload, containerWidth } = props;
        const isLeft = x < containerWidth / 3;
        const isRight = x > (containerWidth * 2) / 3;
        const color = payload.color || COLORS.expense;

        const IconComponent = (LucideIcons as any)[payload.icon || 'Circle'];

        return (
            <Layer key={`node-${index}`}>
                <Rectangle
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={color}
                    fillOpacity={0.9}
                    stroke={color}
                    strokeWidth={1}
                    radius={[6, 6, 6, 6]}
                />

                {IconComponent && (
                    <foreignObject
                        x={isRight ? x + width + 8 : x - 28}
                        y={y + (height / 2) - 10}
                        width="20"
                        height="20"
                    >
                        <div style={{ color: color }}>
                            <IconComponent size={18} strokeWidth={2.5} />
                        </div>
                    </foreignObject>
                )}

                <text
                    x={isRight ? x + width + 32 : (isLeft ? x - 34 : x + width / 2)}
                    y={y + height / 2}
                    textAnchor={isRight ? 'start' : (isLeft ? 'end' : 'middle')}
                    dominantBaseline="middle"
                    className="text-[11px] font-black uppercase tracking-wider"
                    fill={settings.darkMode ? '#e2e8f0' : '#1e293b'}
                >
                    {payload.name}
                </text>
            </Layer>
        );
    };

    return (
        <div className="w-full h-[650px] mt-4 bg-white/50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-5">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500 rounded-full blur-[120px]" />
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <Sankey
                    data={sankeyData}
                    node={<CustomNode containerWidth={1000} />}
                    nodePadding={6}
                    margin={{ top: 40, right: 180, bottom: 40, left: 180 }}
                    link={(props: any) => {
                        const { sourceX, sourceY, targetX, targetY, linkWidth, payload } = props;
                        if (!payload) return null;

                        const color = payload.color || 'url(#linkGradient)';
                        const opacity = payload.opacity || 0.3;

                        return (
                            <path
                                d={`
                                    M${sourceX},${sourceY}
                                    C${(sourceX + targetX) / 2},${sourceY}
                                    ${(sourceX + targetX) / 2},${targetY}
                                    ${targetX},${targetY}
                                `}
                                fill="none"
                                stroke={color}
                                strokeWidth={Math.max(linkWidth, 1)}
                                strokeOpacity={opacity}
                            />
                        );
                    }}
                >
                    <defs>
                        <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                            <stop offset="50%" stopColor="#059669" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.4" />
                        </linearGradient>
                    </defs>
                    <Tooltip content={<CustomTooltip />} />
                </Sankey>
            </ResponsiveContainer>
        </div >
    );
};

export default BudgetSankey;
