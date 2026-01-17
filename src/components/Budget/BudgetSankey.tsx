import React, { useMemo } from 'react';
import { ResponsiveContainer, Sankey, Tooltip, Layer, Rectangle } from 'recharts';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';

interface BudgetSankeyProps {
    budgetData: any[];
}

const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
];

const BudgetSankey: React.FC<BudgetSankeyProps> = ({ budgetData }) => {
    const { settings } = useSettings();

    const sankeyData = useMemo(() => {
        const nodes: { name: string; color?: string }[] = [];
        const links: { source: number; target: number; value: number }[] = [];
        const nodeMap = new Map<string, number>();

        const getOrCreateNode = (name: string, color?: string) => {
            if (nodeMap.has(name)) return nodeMap.get(name)!;
            const index = nodes.length;
            nodes.push({ name, color });
            nodeMap.set(name, index);
            return index;
        };

        const incomeItems = budgetData.filter(item => item.category === 'Income' && item.spent > 0);
        const expenseItems = budgetData.filter(item => item.category !== 'Income' && item.spent > 0);

        const totalIncome = incomeItems.reduce((sum, item) => sum + item.spent, 0);
        const totalExpenses = expenseItems.reduce((sum, item) => sum + item.spent, 0);

        const fundsNodeIndex = getOrCreateNode('Total Funds', '#6366f1');

        // Income -> Total Funds
        incomeItems.forEach((item, i) => {
            const nodeIndex = getOrCreateNode(item.category, '#10b981');
            links.push({
                source: nodeIndex,
                target: fundsNodeIndex,
                value: item.spent
            });
        });

        // Total Funds -> Expense Categories
        expenseItems.forEach((item, i) => {
            const nodeIndex = getOrCreateNode(item.category, COLORS[i % COLORS.length]);
            links.push({
                source: fundsNodeIndex,
                target: nodeIndex,
                value: item.spent
            });

            // Expense Categories -> Subcategories
            item.subcategories.forEach((sub, j) => {
                if (sub.spent > 0) {
                    const subNodeIndex = getOrCreateNode(`${item.category}: ${sub.name}`, COLORS[(i + j + 1) % COLORS.length]);
                    links.push({
                        source: nodeIndex,
                        target: subNodeIndex,
                        value: sub.spent
                    });
                }
            });
        });

        // Handle Surplus/Deficit
        if (totalIncome > totalExpenses) {
            const surplusNodeIndex = getOrCreateNode('Surplus / Savings', '#3b82f6');
            links.push({
                source: fundsNodeIndex,
                target: surplusNodeIndex,
                value: totalIncome - totalExpenses
            });
        } else if (totalExpenses > totalIncome) {
            const deficitNodeIndex = getOrCreateNode('Deficit / From Savings', '#f43f5e');
            links.push({
                source: deficitNodeIndex,
                target: fundsNodeIndex,
                value: totalExpenses - totalIncome
            });
        }

        return { nodes, links };
    }, [budgetData]);

    if (sankeyData.links.length === 0) {
        return (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                No transaction data to visualize in the selected period.
            </div>
        );
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const isNode = data.name !== undefined;

            return (
                <div className="bg-background/95 border border-border/50 p-3 rounded-xl shadow-xl backdrop-blur-sm">
                    <p className="font-bold text-foreground mb-1">{isNode ? data.name : `${data.source.name} → ${data.target.name}`}</p>
                    <p className="text-sm font-black text-primary">
                        {formatCurrency(payload[0].value, settings.currency)}
                    </p>
                </div>
            );
        }
        return null;
    };

    const CustomNode = (props: any) => {
        const { x, y, width, height, index, payload, containerWidth } = props;
        const isOut = x + width + 6 > containerWidth;
        const color = payload.color || COLORS[index % COLORS.length];

        return (
            <Layer key={`node-${index}`}>
                <Rectangle
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={color}
                    fillOpacity={0.8}
                    stroke={color}
                    strokeWidth={2}
                    radius={[4, 4, 4, 4]}
                />
                <text
                    x={x + (isOut ? -6 : width + 6)}
                    y={y + height / 2}
                    textAnchor={isOut ? 'end' : 'start'}
                    dominantBaseline="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill={settings.darkMode ? '#e2e8f0' : '#475569'}
                >
                    {payload.name.split(': ').pop()}
                </text>
            </Layer>
        );
    };

    return (
        <div className="w-full h-[600px] mt-8 bg-card/50 p-6 rounded-3xl border border-border/50 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
                <Sankey
                    data={sankeyData}
                    node={<CustomNode />}
                    nodePadding={40}
                    margin={{ top: 20, right: 120, bottom: 20, left: 20 }}
                    link={{ stroke: settings.darkMode ? '#334155' : '#e2e8f0', strokeOpacity: 0.4 }}
                >
                    <Tooltip content={<CustomTooltip />} />
                </Sankey>
            </ResponsiveContainer>
        </div>
    );
};

export default BudgetSankey;
