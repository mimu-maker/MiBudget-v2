import React, { useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';
import { BudgetCategory } from '@/hooks/useAnnualBudget';

interface BudgetSankeyProps {
    budgetData: BudgetCategory[];
    denominator?: number;
}

// ── SVG viewport ─────────────────────────────────────────────────────────────
const W = 1000;
const H = 560;

// ── Bar geometry — bars centered at x=500 ────────────────────────────────────
const BAR_W = 60;
const BAR_GAP = 16;
const BARS_TOTAL_W = BAR_W + BAR_GAP + BAR_W; // 136
const INC_BAR_X = Math.round((W - BARS_TOTAL_W) / 2);  // 432
const INC_BAR_RIGHT = INC_BAR_X + BAR_W;               // 492
const EXP_BAR_X = INC_BAR_RIGHT + BAR_GAP;             // 508
const EXP_BAR_RIGHT = EXP_BAR_X + BAR_W;               // 568
const MAX_BAR_H = 420;
const BAR_CENTER_Y = H / 2; // 280

// ── Node geometry ─────────────────────────────────────────────────────────────
const NODE_W = 8;
const NODE_H = 22;
const MARGIN_V = 30;

// Income nodes — left column
// Node rect right edge is 70 px left of the income bar (bezier room)
const INC_NODE_RIGHT = INC_BAR_X - 70;                 // 362
const INC_NODE_RECT_X = INC_NODE_RIGHT - NODE_W;       // 354
const INC_LABEL_X = INC_NODE_RECT_X - 10;             // 344  (text-anchor=end)

// Expense nodes — right column (symmetric)
const EXP_NODE_LEFT = EXP_BAR_RIGHT + 70;              // 638
const EXP_NODE_RECT_X = EXP_NODE_LEFT;                 // 638
const EXP_LABEL_X = EXP_NODE_RECT_X + NODE_W + 10;    // 656  (text-anchor=start)

// ── Flow bezier control midpoints ─────────────────────────────────────────────
// Income: flow endpoint = INC_BAR_X (FLUSH with bar left edge)
const INC_MID_X = Math.round((INC_NODE_RIGHT + INC_BAR_X) / 2); // 397
// Expense: flow startpoint = EXP_BAR_RIGHT (FLUSH with bar right edge)
const EXP_MID_X = Math.round((EXP_BAR_RIGHT + EXP_NODE_LEFT) / 2); // 603

// ── Colours ───────────────────────────────────────────────────────────────────
const INC_COLOR = '#10b981'; // emerald-500 — matches Cash Flow
const EXP_COLOR = '#f43f5e'; // rose-500    — matches Cash Flow
const EXP_PALETTE = [
    '#f43f5e', '#fb7185', '#e11d48', '#be123c',
    '#fb923c', '#f97316', '#ea580c', '#c2410c',
    '#f59e0b', '#84cc16', '#06b6d4', '#6366f1',
];

// ── Layout helpers ────────────────────────────────────────────────────────────
function spreadNodes(count: number): number[] {
    if (count === 0) return [];
    if (count === 1) return [H / 2];
    const avail = H - 2 * MARGIN_V;
    // Guarantee at least 4px gap between nodes
    const gap = Math.max((avail - count * NODE_H) / (count + 1), 4);
    return Array.from({ length: count }, (_, i) =>
        MARGIN_V + gap * (i + 1) + NODE_H * i + NODE_H / 2
    );
}

// Compute each node's segment on the bar (y, height, centre)
function barSegments(values: number[], barH: number, barTopY: number) {
    const total = values.reduce((s, v) => s + v, 0) || 1;
    let y = barTopY;
    return values.map(v => {
        const h = (v / total) * barH;
        const seg = { y, h, center: y + h / 2 };
        y += h;
        return seg;
    });
}

// SVG path for a rectangle with rounded top corners only
function roundedTopPath(x: number, y: number, w: number, h: number, r = 7): string {
    if (h <= 0) return '';
    const cr = Math.min(r, w / 2, h);
    return `M${x + cr},${y} H${x + w - cr} Q${x + w},${y} ${x + w},${y + cr} V${y + h} H${x} V${y + cr} Q${x},${y} ${x + cr},${y}Z`;
}

function trunc(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// ── Component ─────────────────────────────────────────────────────────────────
const BudgetSankey: React.FC<BudgetSankeyProps> = ({ budgetData }) => {
    const { settings } = useSettings();
    const [hovered, setHovered] = useState<string | null>(null);

    const { incomeNodes, expenseNodes, totalIncome, totalExpense } = useMemo(() => {
        const incomeNodes: { name: string; value: number }[] = [];

        budgetData.filter(d => d.category_group === 'income').forEach(cat => {
            (cat.sub_categories || []).forEach(sub => {
                const v = Math.max(sub.budget_amount || 0, sub.spent || 0);
                if (v > 0) incomeNodes.push({ name: sub.name, value: v });
            });
        });

        const expenseNodes = budgetData
            .filter(d => d.category_group !== 'income')
            .filter(d => Math.max(d.budget_amount || 0, d.spent || 0) > 0)
            .sort((a, b) => (b.budget_amount || 0) - (a.budget_amount || 0))
            .map((d, i) => ({
                name: d.name,
                value: Math.max(d.budget_amount || 0, d.spent || 0),
                color: d.color || EXP_PALETTE[i % EXP_PALETTE.length],
            }));

        const totalIncome = incomeNodes.reduce((s, d) => s + d.value, 0);
        const totalExpense = expenseNodes.reduce((s, d) => s + d.value, 0);
        return { incomeNodes, expenseNodes, totalIncome, totalExpense };
    }, [budgetData]);

    const dark = settings.darkMode;
    const fg = dark ? '#e2e8f0' : '#1e293b';
    const muted = dark ? '#64748b' : '#94a3b8';

    if (totalIncome === 0 && totalExpense === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <span className="text-4xl opacity-20">—</span>
                <p className="text-sm font-bold uppercase tracking-widest opacity-50">No flow data for this period</p>
            </div>
        );
    }

    const maxVal = Math.max(totalIncome, totalExpense) || 1;
    const incBarH = (totalIncome / maxVal) * MAX_BAR_H;
    const expBarH = (totalExpense / maxVal) * MAX_BAR_H;
    const incBarTopY = BAR_CENTER_Y - incBarH / 2;
    const expBarTopY = BAR_CENTER_Y - expBarH / 2;

    const incNodeCY = spreadNodes(incomeNodes.length);
    const expNodeCY = spreadNodes(expenseNodes.length);

    const incSegs = barSegments(incomeNodes.map(n => n.value), incBarH, incBarTopY);
    const expSegs = barSegments(expenseNodes.map(n => n.value), expBarH, expBarTopY);

    return (
        <div
            className="w-full mt-4 rounded-[2rem] overflow-hidden bg-white/40 dark:bg-slate-950/20 border border-slate-200/40 dark:border-slate-800/40 shadow-xl"
            style={{ position: 'relative', paddingTop: '56%' }}
        >
            <svg
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                onMouseLeave={() => setHovered(null)}
            >
                {/* ── Soft background glows ── */}
                <defs>
                    <radialGradient id="incGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={INC_COLOR} stopOpacity="0.08" />
                        <stop offset="100%" stopColor={INC_COLOR} stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="expGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={EXP_COLOR} stopOpacity="0.08" />
                        <stop offset="100%" stopColor={EXP_COLOR} stopOpacity="0" />
                    </radialGradient>
                </defs>
                <ellipse cx={INC_BAR_X + BAR_W / 2} cy={BAR_CENTER_Y} rx={140} ry={180} fill="url(#incGlow)" />
                <ellipse cx={EXP_BAR_X + BAR_W / 2} cy={BAR_CENTER_Y} rx={140} ry={180} fill="url(#expGlow)" />

                {/* ══ INCOME FLOWS: node right edge → income bar left edge (FLUSH) ══ */}
                {incomeNodes.map((_, i) => {
                    const seg = incSegs[i];
                    const ncy = incNodeCY[i];
                    const sw = Math.max(seg.h * 0.65, 2);
                    const hi = hovered === `inc-${i}`;
                    return (
                        <path
                            key={`inc-flow-${i}`}
                            d={`M${INC_NODE_RIGHT},${ncy} C${INC_MID_X},${ncy} ${INC_MID_X},${seg.center} ${INC_BAR_X},${seg.center}`}
                            fill="none"
                            stroke={INC_COLOR}
                            strokeWidth={sw}
                            strokeOpacity={hi ? 0.7 : 0.28}
                            style={{ transition: 'stroke-opacity 0.15s' }}
                        />
                    );
                })}

                {/* ══ EXPENSE FLOWS: expense bar right edge (FLUSH) → node left edge ══ */}
                {expenseNodes.map((node, i) => {
                    const seg = expSegs[i];
                    const ncy = expNodeCY[i];
                    const sw = Math.max(seg.h * 0.65, 2);
                    const hi = hovered === `exp-${i}`;
                    return (
                        <path
                            key={`exp-flow-${i}`}
                            d={`M${EXP_BAR_RIGHT},${seg.center} C${EXP_MID_X},${seg.center} ${EXP_MID_X},${ncy} ${EXP_NODE_LEFT},${ncy}`}
                            fill="none"
                            stroke={node.color}
                            strokeWidth={sw}
                            strokeOpacity={hi ? 0.7 : 0.28}
                            style={{ transition: 'stroke-opacity 0.15s' }}
                        />
                    );
                })}

                {/* ══ INCOME BAR — solid emerald, matching Cash Flow style ══ */}
                {incBarH > 0 && (
                    <g>
                        <path d={roundedTopPath(INC_BAR_X, incBarTopY, BAR_W, incBarH)} fill={INC_COLOR} fillOpacity={0.9} />
                        <text x={INC_BAR_X + BAR_W / 2} y={incBarTopY - 20} textAnchor="middle"
                            fill={muted} fontSize={9} fontWeight={700} letterSpacing="0.12em">INCOME</text>
                        <text x={INC_BAR_X + BAR_W / 2} y={incBarTopY - 7} textAnchor="middle"
                            fill={INC_COLOR} fontSize={12} fontWeight={800}>
                            {formatCurrency(Math.round(totalIncome), settings.currency)}
                        </text>
                    </g>
                )}

                {/* ══ EXPENSE BAR — solid rose, matching Cash Flow style ══ */}
                {expBarH > 0 && (
                    <g>
                        <path d={roundedTopPath(EXP_BAR_X, expBarTopY, BAR_W, expBarH)} fill={EXP_COLOR} fillOpacity={0.9} />
                        <text x={EXP_BAR_X + BAR_W / 2} y={expBarTopY - 20} textAnchor="middle"
                            fill={muted} fontSize={9} fontWeight={700} letterSpacing="0.12em">EXPENSES</text>
                        <text x={EXP_BAR_X + BAR_W / 2} y={expBarTopY - 7} textAnchor="middle"
                            fill={EXP_COLOR} fontSize={12} fontWeight={800}>
                            {formatCurrency(Math.round(totalExpense), settings.currency)}
                        </text>
                    </g>
                )}

                {/* ══ INCOME NODES (left column) ══ */}
                {incomeNodes.map((node, i) => {
                    const cy = incNodeCY[i];
                    const hi = hovered === `inc-${i}`;
                    return (
                        <g
                            key={`inc-node-${i}`}
                            onMouseEnter={() => setHovered(`inc-${i}`)}
                            onMouseLeave={() => setHovered(null)}
                            style={{ cursor: 'default' }}
                        >
                            <rect
                                x={INC_NODE_RECT_X} y={cy - NODE_H / 2}
                                width={NODE_W} height={NODE_H}
                                fill={INC_COLOR} fillOpacity={hi ? 1 : 0.8} rx={3}
                                style={{ transition: 'fill-opacity 0.15s' }}
                            />
                            {/* Name — right-anchored above centre */}
                            <text x={INC_LABEL_X} y={cy - 3} textAnchor="end"
                                fill={hi ? INC_COLOR : fg} fontSize={11}
                                fontWeight={hi ? 800 : 600}
                                style={{ transition: 'fill 0.1s' }}>
                                {trunc(node.name, 26)}
                            </text>
                            {/* Amount — right-anchored below name */}
                            <text x={INC_LABEL_X} y={cy + 10} textAnchor="end"
                                fill={muted} fontSize={9.5} fontWeight={700}>
                                {formatCurrency(Math.round(node.value), settings.currency)}
                            </text>
                        </g>
                    );
                })}

                {/* ══ EXPENSE NODES (right column) ══ */}
                {expenseNodes.map((node, i) => {
                    const cy = expNodeCY[i];
                    const hi = hovered === `exp-${i}`;
                    return (
                        <g
                            key={`exp-node-${i}`}
                            onMouseEnter={() => setHovered(`exp-${i}`)}
                            onMouseLeave={() => setHovered(null)}
                            style={{ cursor: 'default' }}
                        >
                            <rect
                                x={EXP_NODE_RECT_X} y={cy - NODE_H / 2}
                                width={NODE_W} height={NODE_H}
                                fill={node.color} fillOpacity={hi ? 1 : 0.8} rx={3}
                                style={{ transition: 'fill-opacity 0.15s' }}
                            />
                            {/* Name — left-anchored above centre */}
                            <text x={EXP_LABEL_X} y={cy - 3} textAnchor="start"
                                fill={hi ? node.color : fg} fontSize={11}
                                fontWeight={hi ? 800 : 600}
                                style={{ transition: 'fill 0.1s' }}>
                                {trunc(node.name, 26)}
                            </text>
                            {/* Amount — left-anchored below name */}
                            <text x={EXP_LABEL_X} y={cy + 10} textAnchor="start"
                                fill={muted} fontSize={9.5} fontWeight={700}>
                                {formatCurrency(Math.round(node.value), settings.currency)}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default BudgetSankey;
