import React, { useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';
import { BudgetCategory } from '@/hooks/useAnnualBudget';

interface BudgetSankeyProps {
    budgetData: BudgetCategory[];
    denominator?: number;
}

// ── Viewport ─────────────────────────────────────────────────────────────────
const W = 1100;
const H = 640;

// ── Bar dimensions ────────────────────────────────────────────────────────────
const BAR_W = 72;
const BAR_GAP = 20;
const MAX_BAR_H = 440;
// Both bars share the same bottom baseline — diff only shows at the top
const BOTTOM_Y = 574;

// Bars centered horizontally
const BARS_W = BAR_W * 2 + BAR_GAP;
const INC_BAR_X = Math.round((W - BARS_W) / 2);     // ≈ 468
const INC_BAR_RIGHT = INC_BAR_X + BAR_W;             // ≈ 540
const EXP_BAR_X = INC_BAR_RIGHT + BAR_GAP;           // ≈ 560
const EXP_BAR_RIGHT = EXP_BAR_X + BAR_W;             // ≈ 632

// ── Node / flow layout ────────────────────────────────────────────────────────
const NODE_W   = 10;   // width of node rectangle
const NODE_GAP = 8;    // vertical gap between adjacent node bands

// Nodes are anchored near the SVG edges so flows use the full available width.
// H_PAD: minimum edge padding; LABEL_W: space reserved for category name + amount.
const H_PAD   = 16;
const LABEL_W = 150;  // enough for ~22 chars at 10.5 px + currency amount

// Income nodes sit at the LEFT edge — right edge of node touches the flow start
const INC_NODE_LEFT  = H_PAD + LABEL_W;              // ≈ 166
const INC_NODE_RIGHT = INC_NODE_LEFT + NODE_W;        // ≈ 176
// Flows span from INC_NODE_RIGHT → INC_BAR_X  (≈ 292 px)
const INC_FLOW_MID   = Math.round((INC_NODE_RIGHT + INC_BAR_X) / 2); // ≈ 322

// Expense nodes sit at the RIGHT edge — left edge of node touches the flow end
const EXP_NODE_RIGHT = W - H_PAD - LABEL_W;          // ≈ 934
const EXP_NODE_LEFT  = EXP_NODE_RIGHT - NODE_W;       // ≈ 924
// Flows span from EXP_BAR_RIGHT → EXP_NODE_LEFT  (≈ 292 px)
const EXP_FLOW_MID   = Math.round((EXP_BAR_RIGHT + EXP_NODE_LEFT) / 2); // ≈ 778

// ── Colours ───────────────────────────────────────────────────────────────────
const INC_COLOR = '#10b981'; // emerald-500
const EXP_COLOR = '#f43f5e'; // rose-500
const EXP_PALETTE = [
    '#f43f5e', '#fb7185', '#e11d48', '#be123c',
    '#fb923c', '#f97316', '#ea580c', '#c2410c',
    '#f59e0b', '#84cc16', '#06b6d4', '#6366f1',
    '#a78bfa', '#ec4899', '#14b8a6', '#f472b6',
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface Band {
    name: string;
    value: number;
    color: string;
    // Bar side: contiguous, no gaps
    barTopY: number;
    barBotY: number;
    // Node side: same height as bar segment, spread with NODE_GAP between bands
    nodeTopY: number;
    nodeBotY: number;
}

// ── Core layout ───────────────────────────────────────────────────────────────
/**
 * Compute band positions for one side (income or expense).
 *
 * - Bar segments are contiguous: sum of segH = barH exactly.
 * - Node segments have the same height as their bar segment.
 * - Node stack is vertically centred on the bar. Total extra height =
 *   (N-1) * NODE_GAP — split equally above and below.
 */
function computeBands(
    nodes: { name: string; value: number; color: string }[],
    barH: number,
    barTopY: number,
): Band[] {
    if (!nodes.length || barH <= 0) return [];
    const total = nodes.reduce((s, n) => s + n.value, 0) || 1;
    const totalGaps = Math.max(0, nodes.length - 1) * NODE_GAP;
    const nodeStackTopY = barTopY - totalGaps / 2;
    let barCursor  = barTopY;
    let nodeCursor = nodeStackTopY;
    return nodes.map(n => {
        const h = (n.value / total) * barH;
        const band: Band = {
            name: n.name,
            value: n.value,
            color: n.color,
            barTopY:  barCursor,
            barBotY:  barCursor + h,
            nodeTopY: nodeCursor,
            nodeBotY: nodeCursor + h,
        };
        barCursor  += h;
        nodeCursor += h + NODE_GAP;
        return band;
    });
}

// ── Path builders ─────────────────────────────────────────────────────────────
/** Filled bezier band: node right edge → income bar left edge */
function incBandPath(b: Band): string {
    const mx = INC_FLOW_MID;
    return [
        `M${INC_NODE_RIGHT},${b.nodeTopY}`,
        `C${mx},${b.nodeTopY} ${mx},${b.barTopY} ${INC_BAR_X},${b.barTopY}`,
        `L${INC_BAR_X},${b.barBotY}`,
        `C${mx},${b.barBotY} ${mx},${b.nodeBotY} ${INC_NODE_RIGHT},${b.nodeBotY}`,
        'Z',
    ].join(' ');
}

/** Filled bezier band: expense bar right edge → node left edge */
function expBandPath(b: Band): string {
    const mx = EXP_FLOW_MID;
    return [
        `M${EXP_BAR_RIGHT},${b.barTopY}`,
        `C${mx},${b.barTopY} ${mx},${b.nodeTopY} ${EXP_NODE_LEFT},${b.nodeTopY}`,
        `L${EXP_NODE_LEFT},${b.nodeBotY}`,
        `C${mx},${b.nodeBotY} ${mx},${b.barBotY} ${EXP_BAR_RIGHT},${b.barBotY}`,
        'Z',
    ].join(' ');
}

/** Rounded-top-corners bar rect */
function roundedTopRect(x: number, y: number, w: number, h: number, r = 6): string {
    if (h <= 0) return '';
    const cr = Math.min(r, w / 2, h);
    return `M${x + cr},${y} H${x + w - cr} Q${x + w},${y} ${x + w},${y + cr} V${y + h} H${x} V${y + cr} Q${x},${y} ${x + cr},${y}Z`;
}

function trunc(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

// ── Component ─────────────────────────────────────────────────────────────────
const BudgetSankey: React.FC<BudgetSankeyProps> = ({ budgetData }) => {
    const { settings } = useSettings();
    const [hovered, setHovered] = useState<string | null>(null);

    const { incBands, expBands, totalIncome, totalExpense, incBarH, expBarH, incBarTopY, expBarTopY } =
        useMemo(() => {
            // Income: sub-categories of income categories
            const rawInc: { name: string; value: number; color: string }[] = [];
            budgetData.filter(d => d.category_group === 'income').forEach(cat => {
                (cat.sub_categories || []).forEach(sub => {
                    const v = Math.max(sub.budget_amount || 0, sub.spent || 0);
                    if (v > 0) rawInc.push({ name: sub.name, value: v, color: INC_COLOR });
                });
            });

            // Expenses: top-level categories, sorted largest first
            const rawExp: { name: string; value: number; color: string }[] = budgetData
                .filter(d => d.category_group !== 'income')
                .map((d, i) => ({
                    name: d.name,
                    value: Math.max(d.budget_amount || 0, d.spent || 0),
                    color: d.color || EXP_PALETTE[i % EXP_PALETTE.length],
                }))
                .filter(d => d.value > 0)
                .sort((a, b) => b.value - a.value);

            const totalIncome  = rawInc.reduce((s, d) => s + d.value, 0);
            const totalExpense = rawExp.reduce((s, d) => s + d.value, 0);
            const maxVal       = Math.max(totalIncome, totalExpense) || 1;

            const incBarH    = (totalIncome  / maxVal) * MAX_BAR_H;
            const expBarH    = (totalExpense / maxVal) * MAX_BAR_H;
            const incBarTopY = BOTTOM_Y - incBarH;
            const expBarTopY = BOTTOM_Y - expBarH;

            return {
                incBands:    computeBands(rawInc, incBarH, incBarTopY),
                expBands:    computeBands(rawExp, expBarH, expBarTopY),
                totalIncome, totalExpense, incBarH, expBarH, incBarTopY, expBarTopY,
            };
        }, [budgetData]);

    const dark  = settings.darkMode;
    const fg    = dark ? '#e2e8f0' : '#1e293b';
    const muted = dark ? '#64748b' : '#94a3b8';

    if (totalIncome === 0 && totalExpense === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <span className="text-4xl opacity-20">⟳</span>
                <p className="text-sm font-bold uppercase tracking-widest opacity-50">
                    No flow data for this period
                </p>
            </div>
        );
    }

    // Label visibility thresholds (in SVG pixels)
    const SHOW_NAME_MIN = 13;  // band must be at least this tall to show a name
    const SHOW_AMT_MIN  = 26;  // band must be at least this tall to show name + amount

    return (
        <div
            className="w-full mt-4 rounded-[2rem] overflow-hidden bg-white/40 dark:bg-slate-950/20 border border-slate-200/40 dark:border-slate-800/40 shadow-xl"
            style={{ position: 'relative', paddingTop: `${(H / W) * 100}%` }}
        >
            <svg
                viewBox={`0 0 ${W} ${H}`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                onMouseLeave={() => setHovered(null)}
            >
                {/* ════════ INCOME FLOWS — filled bezier bands ════════ */}
                {incBands.map((b, i) => {
                    const hi = hovered === `inc-${i}`;
                    return (
                        <path
                            key={`if-${i}`}
                            d={incBandPath(b)}
                            fill={INC_COLOR}
                            fillOpacity={hi ? 0.52 : 0.22}
                            onMouseEnter={() => setHovered(`inc-${i}`)}
                            onMouseLeave={() => setHovered(null)}
                            style={{ transition: 'fill-opacity 0.15s', cursor: 'default' }}
                        />
                    );
                })}

                {/* ════════ EXPENSE FLOWS — filled bezier bands ════════ */}
                {expBands.map((b, i) => {
                    const hi = hovered === `exp-${i}`;
                    return (
                        <path
                            key={`ef-${i}`}
                            d={expBandPath(b)}
                            fill={b.color}
                            fillOpacity={hi ? 0.52 : 0.22}
                            onMouseEnter={() => setHovered(`exp-${i}`)}
                            onMouseLeave={() => setHovered(null)}
                            style={{ transition: 'fill-opacity 0.15s', cursor: 'default' }}
                        />
                    );
                })}

                {/* ════════ INCOME BAR ════════ */}
                {incBarH > 0 && (
                    <g>
                        <path
                            d={roundedTopRect(INC_BAR_X, incBarTopY, BAR_W, incBarH)}
                            fill={INC_COLOR}
                            fillOpacity={0.9}
                        />
                        {/* Segment dividers (subtle white lines) */}
                        {incBands.slice(1).map((b, i) => (
                            <line
                                key={`id-${i}`}
                                x1={INC_BAR_X} y1={b.barTopY}
                                x2={INC_BAR_RIGHT} y2={b.barTopY}
                                stroke="rgba(255,255,255,0.3)" strokeWidth={1}
                            />
                        ))}
                        {/* Bar label — above bar */}
                        <text x={INC_BAR_X + BAR_W / 2} y={incBarTopY - 18}
                            textAnchor="middle" fill={muted}
                            fontSize={9} fontWeight={700} letterSpacing="0.1em">
                            INCOME
                        </text>
                        <text x={INC_BAR_X + BAR_W / 2} y={incBarTopY - 5}
                            textAnchor="middle" fill={INC_COLOR}
                            fontSize={11} fontWeight={800}>
                            {formatCurrency(Math.round(totalIncome), settings.currency)}
                        </text>
                    </g>
                )}

                {/* ════════ EXPENSE BAR ════════ */}
                {expBarH > 0 && (
                    <g>
                        <path
                            d={roundedTopRect(EXP_BAR_X, expBarTopY, BAR_W, expBarH)}
                            fill={EXP_COLOR}
                            fillOpacity={0.9}
                        />
                        {expBands.slice(1).map((b, i) => (
                            <line
                                key={`ed-${i}`}
                                x1={EXP_BAR_X} y1={b.barTopY}
                                x2={EXP_BAR_RIGHT} y2={b.barTopY}
                                stroke="rgba(255,255,255,0.3)" strokeWidth={1}
                            />
                        ))}
                        <text x={EXP_BAR_X + BAR_W / 2} y={expBarTopY - 18}
                            textAnchor="middle" fill={muted}
                            fontSize={9} fontWeight={700} letterSpacing="0.1em">
                            EXPENSES
                        </text>
                        <text x={EXP_BAR_X + BAR_W / 2} y={expBarTopY - 5}
                            textAnchor="middle" fill={EXP_COLOR}
                            fontSize={11} fontWeight={800}>
                            {formatCurrency(Math.round(totalExpense), settings.currency)}
                        </text>
                    </g>
                )}

                {/* ════════ INCOME NODES + LABELS ════════ */}
                {incBands.map((b, i) => {
                    const hi   = hovered === `inc-${i}`;
                    const bh   = b.nodeBotY - b.nodeTopY;
                    const midY = (b.nodeTopY + b.nodeBotY) / 2;
                    const showName = bh >= SHOW_NAME_MIN;
                    const showAmt  = bh >= SHOW_AMT_MIN;
                    return (
                        <g
                            key={`in-${i}`}
                            onMouseEnter={() => setHovered(`inc-${i}`)}
                            onMouseLeave={() => setHovered(null)}
                            style={{ cursor: 'default' }}
                        >
                            <title>{b.name}: {formatCurrency(Math.round(b.value), settings.currency)}</title>
                            {/* Node rect — right edge abuts the flow */}
                            <rect
                                x={INC_NODE_LEFT} y={b.nodeTopY}
                                width={NODE_W} height={bh}
                                fill={INC_COLOR} fillOpacity={hi ? 1 : 0.8} rx={2}
                                style={{ transition: 'fill-opacity 0.15s' }}
                            />
                            {showName && (
                                <text
                                    x={INC_NODE_LEFT - 7}
                                    y={showAmt ? midY - 4 : midY + 4}
                                    textAnchor="end"
                                    fill={hi ? INC_COLOR : fg}
                                    fontSize={10.5} fontWeight={hi ? 800 : 600}
                                    style={{ transition: 'fill 0.1s' }}
                                >
                                    {trunc(b.name, 22)}
                                </text>
                            )}
                            {showAmt && (
                                <text
                                    x={INC_NODE_LEFT - 7} y={midY + 10}
                                    textAnchor="end" fill={muted}
                                    fontSize={9} fontWeight={700}
                                >
                                    {formatCurrency(Math.round(b.value), settings.currency)}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* ════════ EXPENSE NODES + LABELS ════════ */}
                {expBands.map((b, i) => {
                    const hi   = hovered === `exp-${i}`;
                    const bh   = b.nodeBotY - b.nodeTopY;
                    const midY = (b.nodeTopY + b.nodeBotY) / 2;
                    const showName = bh >= SHOW_NAME_MIN;
                    const showAmt  = bh >= SHOW_AMT_MIN;
                    return (
                        <g
                            key={`en-${i}`}
                            onMouseEnter={() => setHovered(`exp-${i}`)}
                            onMouseLeave={() => setHovered(null)}
                            style={{ cursor: 'default' }}
                        >
                            <title>{b.name}: {formatCurrency(Math.round(b.value), settings.currency)}</title>
                            {/* Node rect — left edge abuts the flow */}
                            <rect
                                x={EXP_NODE_LEFT} y={b.nodeTopY}
                                width={NODE_W} height={bh}
                                fill={b.color} fillOpacity={hi ? 1 : 0.8} rx={2}
                                style={{ transition: 'fill-opacity 0.15s' }}
                            />
                            {showName && (
                                <text
                                    x={EXP_NODE_RIGHT + 7}
                                    y={showAmt ? midY - 4 : midY + 4}
                                    textAnchor="start"
                                    fill={hi ? b.color : fg}
                                    fontSize={10.5} fontWeight={hi ? 800 : 600}
                                    style={{ transition: 'fill 0.1s' }}
                                >
                                    {trunc(b.name, 22)}
                                </text>
                            )}
                            {showAmt && (
                                <text
                                    x={EXP_NODE_RIGHT + 7} y={midY + 10}
                                    textAnchor="start" fill={muted}
                                    fontSize={9} fontWeight={700}
                                >
                                    {formatCurrency(Math.round(b.value), settings.currency)}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default BudgetSankey;
