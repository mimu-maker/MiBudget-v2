import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOverviewData } from '@/components/Overview/hooks/useOverviewData';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import * as LucideIcons from 'lucide-react';
import { ChevronUp, ChevronDown, ChevronRight, Minus, X } from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';

// Expanded palette — 24 visually distinct hues
const BASE_PALETTE = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899',
    '#84cc16', '#f97316', '#14b8a6', '#a78bfa', '#fb7185', '#22d3ee',
    '#fbbf24', '#34d399', '#f472b6', '#818cf8', '#4ade80', '#fb923c',
    '#e879f9', '#38bdf8', '#a3e635', '#c084fc', '#fd8272', '#2dd4bf',
];

function buildUniqueColorMap(keys: string[]): Record<string, string> {
    const map: Record<string, string> = {};
    const used = new Set<string>();
    keys.forEach((key, i) => {
        // Find next unused palette colour
        let color = BASE_PALETTE[i % BASE_PALETTE.length];
        if (used.has(color)) {
            // Hue-shift until unique
            for (let j = 0; j < BASE_PALETTE.length; j++) {
                const candidate = BASE_PALETTE[(i + j) % BASE_PALETTE.length];
                if (!used.has(candidate)) { color = candidate; break; }
            }
            // If all exhausted, generate via hue rotation
            if (used.has(color)) {
                color = `hsl(${(i * 47) % 360}, 75%, 55%)`;
            }
        }
        map[key] = color;
        used.add(color);
    });
    return map;
}

// Layout constants
const TREND_H = 370;
const SPIDER_DONUT_H = 300;
const GAP = 24;
const TOTAL_H = TREND_H + GAP + SPIDER_DONUT_H;

interface CategoryOverviewProps {
    includeCore?: boolean;
    includeSpecial: boolean;
    includeKlintemarken: boolean;
}

const CardTitleClass = 'text-sm font-black tracking-tight uppercase text-muted-foreground';

export const CategoryOverview = ({ includeCore = true, includeSpecial, includeKlintemarken }: CategoryOverviewProps) => {
    const { monthlyData, radarData, settings, amountFormat } = useOverviewData({
        includeCore, includeSpecial, includeKlintemarken,
    });

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [hoveredSubCat, setHoveredSubCat] = useState<string | null>(null);

    const chartColors = {
        grid: settings.darkMode ? '#1e293b' : '#f0f0f0',
        text: settings.darkMode ? '#94a3b8' : '#64748b',
        tooltip: settings.darkMode ? '#0f172a' : '#fff',
        radarGrid: settings.darkMode ? '#334155' : '#e2e8f0',
    };

    const totalActual = radarData.reduce((s, d) => s + d.actual, 0);

    // Sub-category list for selected category
    const drawerSubCategories = useMemo(() => {
        if (!selectedCategory) return [];
        const all = new Set<string>();
        monthlyData.forEach(p => {
            const splits = (p as any).subCategorySplits?.[selectedCategory] as Record<string, number> | undefined;
            if (splits) Object.keys(splits).forEach(k => all.add(k));
        });
        return [...all];
    }, [selectedCategory, monthlyData]);

    // Unique colour map for sub-categories — no repeats
    const subCatColorMap = useMemo(() => buildUniqueColorMap(drawerSubCategories), [drawerSubCategories]);

    // Sub-cat totals + monthly average
    const subCatTotals = useMemo(() => {
        if (!selectedCategory) return [];
        const numPeriods = monthlyData.length || 1;
        return drawerSubCategories.map(sub => {
            const total = monthlyData.reduce((acc, p) => {
                const splits = (p as any).subCategorySplits?.[selectedCategory] as Record<string, number> | undefined;
                return acc + (splits?.[sub] || 0);
            }, 0);
            return { name: sub, total, avg: total / numPeriods };
        }).sort((a, b) => b.total - a.total);
    }, [selectedCategory, drawerSubCategories, monthlyData]);

    // Zero-origin helper
    const applyZeroOrigin = (data: any[], keys: string[]) => {
        if (!data.length || !keys.length) return data;
        const firstIdx: Record<string, number> = {};
        keys.forEach(k => {
            for (let i = 0; i < data.length; i++) {
                if ((data[i][k] || 0) > 0) { firstIdx[k] = i; break; }
            }
        });
        return data.map((period, i) => {
            const patch: Record<string, number> = {};
            keys.forEach(k => {
                const first = firstIdx[k];
                if (first === undefined) return;
                if (i === first - 1 && i >= 0) { if (!period[k]) patch[k] = 0; }
                else if (i >= first) { if (!period[k]) patch[k] = 0; }
            });
            return Object.keys(patch).length ? { ...period, ...patch } : period;
        });
    };

    const trendData = useMemo(() =>
        applyZeroOrigin(monthlyData as any[], radarData.map(d => d.category)),
        [monthlyData, radarData]
    );

    const subCatTrendData = useMemo(() => {
        if (!selectedCategory || !drawerSubCategories.length) return [];
        const raw = monthlyData.map(period => ({
            month: period.month,
            fullMonth: period.fullMonth,
            ...((period as any).subCategorySplits?.[selectedCategory] as Record<string, number> | undefined || {}),
        }));
        return applyZeroOrigin(raw, drawerSubCategories);
    }, [selectedCategory, drawerSubCategories, monthlyData]);

    const activeChartData = selectedCategory ? subCatTrendData : trendData;
    const activeChartLines: { key: string; color: string; name: string }[] = selectedCategory
        ? drawerSubCategories.map(sub => ({ key: sub, color: subCatColorMap[sub], name: sub }))
        : radarData.map(cat => ({ key: cat.category, color: cat.color || '#94a3b8', name: cat.category }));

    const TrendTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const fullMonth = payload[0]?.payload?.fullMonth || label;
        const sorted = [...payload]
            .filter((p: any) => p.value != null && p.value !== 0)
            .sort((a: any, b: any) => Math.abs(b.value) - Math.abs(a.value));
        if (!sorted.length) return null;
        return (
            <div className="bg-card border border-border rounded-xl shadow-xl p-3 min-w-[180px]">
                <p className="text-xs font-bold mb-2 text-foreground border-b pb-1.5">{fullMonth}</p>
                <div className="space-y-1">
                    {sorted.map((entry: any) => (
                        <div key={entry.dataKey} className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.stroke }} />
                                <span className="text-[11px] text-foreground/70 truncate max-w-[120px]">{entry.name}</span>
                            </div>
                            <span className="text-[11px] font-mono font-bold shrink-0" style={{ color: entry.stroke }}>
                                {formatCurrency(Number(entry.value), settings.currency, amountFormat)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const handleCategoryClick = (cat: string) =>
        setSelectedCategory(prev => prev === cat ? null : cat);

    const TrendLegend = () => (
        <div className="flex flex-wrap gap-1.5 justify-center mt-1.5 px-1">
            {activeChartLines.map(line => {
                const Icon = !selectedCategory ? (LucideIcons as any)[(radarData.find(r => r.category === line.key)?.icon) || 'Circle'] : null;
                return (
                    <button
                        key={line.key}
                        onClick={() => !selectedCategory && handleCategoryClick(line.key)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-border/50 hover:border-current hover:opacity-80 transition-all"
                        style={{ color: line.color }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: line.color }} />
                        {Icon && <Icon size={10} />}
                        {line.name}
                    </button>
                );
            })}
            {selectedCategory && (
                <button
                    onClick={() => setSelectedCategory(null)}
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] text-muted-foreground border border-border/50 hover:bg-accent/10 transition-all"
                >
                    <X size={9} /> All categories
                </button>
            )}
        </div>
    );

    // ── Donut: legend-list layout ────────────────────────────────────────────
    const DonutLegend = () => {
        const donutData = radarData.filter(d => d.actual > 0);
        return (
            <div className="flex flex-col gap-0.5 overflow-y-auto max-h-full justify-center py-2">
                {donutData.map(d => {
                    const pct = totalActual > 0 ? ((d.actual / totalActual) * 100).toFixed(1) : '0';
                    return (
                        <div key={d.category} className="flex items-center gap-2 px-1 py-1 rounded-md hover:bg-accent/10 transition-colors cursor-default">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color || '#94a3b8' }} />
                            <span className="text-[11px] text-foreground/80 truncate flex-1">{d.category}</span>
                            <span className="text-[10px] font-mono font-bold text-muted-foreground shrink-0">{pct}%</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex gap-6" style={{ height: `${TOTAL_H}px` }}>

            {/* LEFT 20% — category list */}
            <Card
                className="flex-none flex flex-col shadow-sm border-none bg-card/50 backdrop-blur-sm overflow-hidden"
                style={{ width: '20%' }}
            >
                <CardHeader className="shrink-0 px-4 pt-4 pb-2">
                    <CardTitle className={CardTitleClass}>Categories</CardTitle>
                </CardHeader>

                <CardContent className="flex-1 min-h-0 px-2 pb-3 pt-0 overflow-y-auto">
                    {radarData.length > 0 ? (
                        <div className="space-y-0.5">
                            {radarData.map(cat => {
                                const pct = cat.budgeted > 0
                                    ? Math.round(((cat.actual / cat.budgeted) - 1) * 100)
                                    : null;
                                const isOver = pct !== null && pct > 0;
                                const isSelected = selectedCategory === cat.category;
                                const Icon = (LucideIcons as any)[cat.icon || 'Circle'];

                                return (
                                    <div key={cat.category}>
                                        <button
                                            onClick={() => handleCategoryClick(cat.category)}
                                            className={cn(
                                                'w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all',
                                                isSelected ? 'bg-accent/20' : 'hover:bg-accent/8'
                                            )}
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#94a3b8' }} />
                                                {Icon && <Icon size={11} style={{ color: cat.color || '#94a3b8' }} className="shrink-0" />}
                                                <span className="text-xs font-semibold text-foreground/90 truncate">{cat.category}</span>
                                            </div>
                                            <div className="flex items-center gap-0.5 shrink-0 ml-1">
                                                {pct !== null ? (
                                                    <>
                                                        {isOver
                                                            ? <ChevronUp className="w-3 h-3 text-rose-500" />
                                                            : <ChevronDown className="w-3 h-3 text-emerald-500" />
                                                        }
                                                        <span className={cn('text-[11px] font-bold font-mono tabular-nums', isOver ? 'text-rose-500' : 'text-emerald-500')}>
                                                            {isOver ? '+' : ''}{pct}%
                                                        </span>
                                                    </>
                                                ) : (
                                                    <Minus className="w-3 h-3 text-muted-foreground/40" />
                                                )}
                                                <ChevronRight
                                                    size={11}
                                                    className={cn('ml-1 shrink-0 transition-transform text-muted-foreground/50', isSelected && 'rotate-90')}
                                                />
                                            </div>
                                        </button>

                                        {/* Sub-category rows (inline expand) */}
                                        {isSelected && subCatTotals.length > 0 && (
                                            <div className="ml-4 mt-0.5 mb-1 space-y-0.5">
                                                {subCatTotals.map(sub => {
                                                    const color = subCatColorMap[sub.name];
                                                    const isHovered = hoveredSubCat === sub.name;
                                                    return (
                                                        <div
                                                            key={sub.name}
                                                            onMouseEnter={() => setHoveredSubCat(sub.name)}
                                                            onMouseLeave={() => setHoveredSubCat(null)}
                                                            className="flex items-center justify-between px-2 py-1.5 rounded-md transition-all cursor-default"
                                                            style={{
                                                                backgroundColor: isHovered ? `${color}22` : undefined,
                                                                boxShadow: isHovered ? `inset 3px 0 0 ${color}` : undefined,
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                                                <span
                                                                    className="text-[10px] truncate transition-colors"
                                                                    style={{ color: isHovered ? color : undefined }}
                                                                >
                                                                    {sub.name}
                                                                </span>
                                                            </div>
                                                            {/* Item 3: avg (bold) first, total (normal) below */}
                                                            <div className="flex flex-col items-end shrink-0 ml-1">
                                                                <span className="text-[10px] font-mono font-bold text-foreground/80">
                                                                    {formatCurrency(Math.round(sub.avg), settings.currency, amountFormat)}/mo
                                                                </span>
                                                                <span className="text-[9px] font-mono text-muted-foreground/60">
                                                                    {formatCurrency(sub.total, settings.currency, amountFormat)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                            <LucideIcons.SearchX className="w-8 h-8 opacity-20" />
                            <span className="text-xs font-medium italic">No categories found</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* RIGHT 80% — Item 5: Trend top, Spider + Donut bottom */}
            <div className="flex-1 flex flex-col" style={{ gap: `${GAP}px` }}>

                {/* TOP: Trend chart */}
                <Card
                    className="flex-none flex flex-col min-h-0 shadow-sm border-none bg-card/80 backdrop-blur-sm overflow-hidden rounded-3xl"
                    style={{ height: `${TREND_H}px` }}
                >
                    <CardHeader className="shrink-0 flex flex-row items-center justify-between px-4 pt-4 pb-2">
                        <CardTitle className={CardTitleClass}>
                            {selectedCategory ? (
                                <span className="flex items-center gap-1.5">
                                    <span className="cursor-pointer hover:underline" onClick={() => setSelectedCategory(null)}>
                                        Expenses Trend
                                    </span>
                                    <ChevronRight size={12} className="text-muted-foreground/50" />
                                    <span style={{ color: radarData.find(r => r.category === selectedCategory)?.color }}>
                                        {selectedCategory}
                                    </span>
                                </span>
                            ) : 'Expenses Trend'}
                        </CardTitle>
                        {selectedCategory && (
                            <button onClick={() => setSelectedCategory(null)} className="text-muted-foreground hover:text-foreground">
                                <X size={13} />
                            </button>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col min-h-0 px-2 pb-1 pt-2">
                        <div className="flex-1 min-h-0">
                            {activeChartLines.length > 0 && activeChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={activeChartData} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                        <XAxis
                                            dataKey="month"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: chartColors.text, fontSize: 11 }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: chartColors.text, fontSize: 10 }}
                                            tickFormatter={(val) =>
                                                !val ? '0' : formatCurrency(val, settings.currency, amountFormat)
                                                    .split(' ')[0].split('.')[0].split(',')[0]
                                            }
                                            width={54}
                                        />
                                        <Tooltip content={<TrendTooltip />} />
                                        {activeChartLines.map(line => {
                                            const isHovHighlighted = !!selectedCategory && hoveredSubCat === line.key;
                                            const isHovDimmed = !!selectedCategory && hoveredSubCat !== null && hoveredSubCat !== line.key;
                                            return (
                                                <Line
                                                    key={line.key}
                                                    type="monotone"
                                                    dataKey={line.key}
                                                    stroke={line.color}
                                                    strokeWidth={isHovHighlighted ? 4 : isHovDimmed ? 1.5 : 2.5}
                                                    strokeOpacity={isHovDimmed ? 0.15 : 1}
                                                    name={line.name}
                                                    dot={false}
                                                    activeDot={isHovDimmed ? false : { r: 4, strokeWidth: 2, stroke: settings.darkMode ? '#0f172a' : '#fff' }}
                                                    onClick={() => !selectedCategory && handleCategoryClick(line.key)}
                                                    style={{ cursor: selectedCategory ? 'default' : 'pointer' }}
                                                />
                                            );
                                        })}
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                    <LucideIcons.LineChart className="w-8 h-8 opacity-20" />
                                    <span className="text-xs italic">No data for this period</span>
                                </div>
                            )}
                        </div>
                        {activeChartLines.length > 0 && <TrendLegend />}
                    </CardContent>
                </Card>

                {/* BOTTOM: Spider (left) | Donut (right) */}
                <div className="grid grid-cols-2 gap-6 flex-1 min-h-0" style={{ height: `${SPIDER_DONUT_H}px` }}>

                    {/* Spider chart */}
                    <Card className="flex flex-col overflow-hidden shadow-sm border-none bg-card/50 backdrop-blur-sm">
                        <CardHeader className="shrink-0 px-4 pt-4 pb-1">
                            <CardTitle className={CardTitleClass}>Spending vs Budget</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 px-1 pb-3 pt-0">
                            {radarData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="97%">
                                    <RadarChart data={radarData} outerRadius="75%">
                                        <PolarGrid stroke={chartColors.radarGrid} />
                                        <PolarAngleAxis dataKey="category" tick={{ fill: chartColors.text, fontSize: 9 }} />
                                        <PolarRadiusAxis axisLine={false} tick={false} />
                                        <Radar name="Budget" dataKey="budgeted" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.12} strokeWidth={1.5} strokeDasharray="4 2" />
                                        <Radar name="Actual" dataKey="actual" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.35} strokeWidth={2} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: chartColors.tooltip, border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                                            formatter={(value: any) => formatCurrency(Number(value), settings.currency, amountFormat)}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                    <LucideIcons.BarChart3 className="w-8 h-8 opacity-20" />
                                    <span className="text-xs italic">No budget data</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Item 6 — Donut chart redesign: left donut, right legend list */}
                    <Card className="flex flex-col overflow-hidden shadow-sm border-none bg-card/50 backdrop-blur-sm">
                        <CardHeader className="shrink-0 px-4 pt-4 pb-1">
                            <CardTitle className={CardTitleClass}>Expense Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 p-3">
                            {totalActual > 0 ? (
                                <div className="flex h-full gap-2 items-center">
                                    {/* Donut: fixed square area */}
                                    <div className="relative shrink-0" style={{ width: '48%', height: '100%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={radarData.filter(d => d.actual > 0)}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius="45%"
                                                    outerRadius="78%"
                                                    paddingAngle={2}
                                                    dataKey="actual"
                                                    nameKey="category"
                                                    stroke="none"
                                                    startAngle={90}
                                                    endAngle={-270}
                                                >
                                                    {radarData.map((entry, i) => (
                                                        <Cell key={`cell-${i}`} fill={entry.color || '#94a3b8'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: chartColors.tooltip, border: 'none', borderRadius: '10px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                                                    formatter={(value: any) => formatCurrency(Number(value), settings.currency, amountFormat)}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        {/* Centre label */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-[8px] uppercase font-black tracking-widest text-muted-foreground">Total</span>
                                            <span className="text-xs font-black text-foreground leading-tight text-center px-1">
                                                {formatCurrency(Math.round(totalActual), settings.currency, amountFormat)}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Legend list */}
                                    <div className="flex-1 min-w-0 min-h-0 overflow-y-auto" style={{ maxHeight: '100%' }}>
                                        <DonutLegend />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                    <LucideIcons.PieChart className="w-8 h-8 opacity-20" />
                                    <span className="text-xs italic">No data</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
