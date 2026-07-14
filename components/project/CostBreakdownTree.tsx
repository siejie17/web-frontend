"use client";

import { useMemo, useState } from "react";
import {
    ChevronRight,
    Award,
    ChevronsDownUp,
    ChevronsUpDown,
    Wallet,
    CircleDollarSign,
    TrendingUp,
    TrendingDown,
    Minus,
} from "lucide-react";

/* ---------------- Types ---------------- */

export type CostNode = {
    id: number;
    description: string;
    cost: number;
    actual_cost?: number;
    is_certification: number;
    children?: Record<string, CostNode>;
};

export type CostBreakdown = Record<string, CostNode>;

/* ---------------- Money helpers ---------------- */

/** Only allow digits with at most 2 decimal places while typing (blocks the keystroke otherwise). */
export const DECIMAL_INPUT_RE = /^\d*\.?\d{0,2}$/;

/** Always render currency to exactly 2 decimals — RM18.66 must never collapse to RM19. */
export function formatMoney(value: number): string {
    const safe = Number.isFinite(value) ? value : 0;
    return `RM ${safe.toLocaleString("en-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

/** Turn a raw stored edit string ("", "18.", "18.6") into a real number for math. */
function parseEdit(raw: string | undefined): number {
    if (!raw) return 0;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
}

/** Comma-formatted read view of a raw edit string, e.g. "1234.5" -> "1,234.5". Shown only while not focused. */
export function formatWithCommas(raw: string | undefined): string {
    if (!raw) return "";
    const [wholePart, decimalPart] = raw.split(".");
    const wholeFormatted = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decimalPart !== undefined ? `${wholeFormatted}.${decimalPart}` : wholeFormatted;
}

/* ---------------- Helpers ---------------- */

/** Walk the tree once to seed edit state (as strings, so partial typing like "18." isn't lost). */
function collectInitialEdits(data: CostBreakdown): Record<number, string> {
    const edits: Record<number, string> = {};
    const visit = (node: CostNode) => {
        if (node.children) {
            Object.values(node.children).forEach(visit);
        } else {
            edits[node.id] =
                node.actual_cost !== undefined && node.actual_cost !== null
                    ? String(node.actual_cost)
                    : "";
        }
    };
    Object.values(data).forEach(visit);
    return edits;
}

/** A parent's actual cost is always the sum of its children — never stored directly. */
function computeActualCost(node: CostNode, edits: Record<number, string>): number {
    if (node.children) {
        return Object.values(node.children).reduce(
            (sum, child) => sum + computeActualCost(child, edits),
            0
        );
    }
    return parseEdit(edits[node.id]);
}

function sumTop(data: CostBreakdown, key: "cost" | "actual", edits: Record<number, string>) {
    return Object.values(data).reduce(
        (sum, node) => sum + (key === "cost" ? node.cost : computeActualCost(node, edits)),
        0
    );
}

/* Fixed column widths shared by the header and every row so figures never drift out of line. */
export const COL_BUDGET = "w-28 sm:w-32";
export const COL_ACTUAL = "w-32 sm:w-40";

/* Each nesting level gets its own accent so depth is readable at a glance, independent of indentation. */
export const LEVEL_STYLES = [
    {
        border: "border-[#2C4A3A]",
        bg: "bg-[#E7EEE8]",
        hoverBg: "hover:bg-[#DCE6DD]",
        badgeBg: "bg-[#2C4A3A]",
        badgeText: "text-white",
        amount: "text-[#2C4A3A]",
    }, // level 0 — deep forest
    {
        border: "border-[#4E7290]",
        bg: "bg-[#E9EFF3]",
        hoverBg: "hover:bg-[#DCE6EC]",
        badgeBg: "bg-[#4E7290]",
        badgeText: "text-white",
        amount: "text-[#3B5A73]",
    }, // level 1 — slate blue
    {
        border: "border-[#8F7757]",
        bg: "bg-[#F1ECE2]",
        hoverBg: "hover:bg-[#E7DFCE]",
        badgeBg: "bg-[#8F7757]",
        badgeText: "text-white",
        amount: "text-[#71603F]",
    }, // level 2+ — warm taupe
];

/* Certification rows get their own distinct treatment, since the cost is derived from the assessment. */
export const CERT_STYLE = {
    border: "border-[#B8862E]",
    bg: "bg-[#FBF3DE]",
    hoverBg: "hover:bg-[#F7E9C4]",
    badgeBg: "bg-[#B8862E]",
    badgeText: "text-white",
    amount: "text-[#8A6420]",
};

/* ---------------- Component ---------------- */

export default function CostBreakdownTree({
    data,
    onActualCostChange,
    hideTotals = false,
}: {
    data: CostBreakdown;
    /** Optional: fires on every leaf edit (with a clean, parsed number), e.g. to persist to the server. */
    onActualCostChange?: (nodeId: number, value: number) => void;
    /** Set true when a parent screen renders its own summary cards (e.g. CostBreakdownScreen). */
    hideTotals?: boolean;
}) {
    const [edits, setEdits] = useState<Record<number, string>>(() => collectInitialEdits(data));
    const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
    const [focusedId, setFocusedId] = useState<number | null>(null);

    const totalBudgeted = useMemo(() => sumTop(data, "cost", edits), [data, edits]);
    const totalActual = useMemo(() => sumTop(data, "actual", edits), [data, edits]);
    const variance = totalActual - totalBudgeted;
    const isOverBudget = variance > 0;

    const allTopIds = useMemo(() => Object.values(data).map((n) => n.id), [data]);
    const allExpanded = allTopIds.every((id) => expanded.has(id));

    const toggleAll = () => {
        setExpanded(allExpanded ? new Set() : new Set(allTopIds));
    };

    const toggleNode = (id: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleLeafChange = (id: number, raw: string) => {
        // Strip any commas the user typed/pasted before validating the underlying number.
        const stripped = raw.replace(/,/g, "");
        // Reject anything beyond 2 decimal places instead of silently rounding later.
        if (!DECIMAL_INPUT_RE.test(stripped)) return;
        setEdits((prev) => ({ ...prev, [id]: stripped }));
        onActualCostChange?.(id, parseEdit(stripped));
    };

    const handleLeafFocus = (id: number) => setFocusedId(id);

    /** Snap "18", "18.", "" etc. to a clean 2-decimal string once the user leaves the field. */
    const handleLeafBlur = (id: number) => {
        setFocusedId(null);
        setEdits((prev) => {
            const n = parseEdit(prev[id]);
            return { ...prev, [id]: n === 0 && prev[id] === "" ? "" : n.toFixed(2) };
        });
    };

    return (
        <div>
            {/* ---------------- Toolbar ---------------- */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[13px] text-[#8A938C]">
                    Elemental cost breakdown &middot; tap a row to expand.
                </p>
                <button
                    type="button"
                    onClick={toggleAll}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#E4E1D8] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#5B655F] transition-colors hover:border-[#C9D3CC] hover:text-[#3E6B52]"
                >
                    {allExpanded ? <ChevronsDownUp size={13} /> : <ChevronsUpDown size={13} />}
                    {allExpanded ? "Collapse all" : "Expand all"}
                </button>
            </div>

            {/* ---------------- Totals ---------------- */}
            {!hideTotals && (
                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <TotalCard icon={Wallet} label="Total budgeted cost" value={formatMoney(totalBudgeted)} />
                    <TotalCard
                        icon={CircleDollarSign}
                        label="Total actual cost"
                        value={formatMoney(totalActual)}
                        highlighted
                    />
                    <TotalCard
                        icon={variance === 0 ? Minus : isOverBudget ? TrendingUp : TrendingDown}
                        label={isOverBudget ? "Over budget by" : "Under budget by"}
                        value={formatMoney(Math.abs(variance))}
                        tone={variance === 0 ? "neutral" : isOverBudget ? "over" : "under"}
                    />
                </div>
            )}

            {/* ---------------- Column headers ---------------- */}
            <div
                className="mb-1.5 flex items-center gap-3 px-3 text-[10.5px] uppercase tracking-[0.1em] text-[#8A938C]"
                style={{ fontFamily: "var(--font-mono)" }}
            >
                <span className="flex-1 text-center">Element</span>
                <span className={`${COL_BUDGET} shrink-0 text-center`}>Budgeted</span>
                <span className={`${COL_ACTUAL} shrink-0 text-center`}>Actual</span>
            </div>

            {/* ---------------- Tree ---------------- */}
            <div className="overflow-hidden rounded-2xl border border-[#EFEDE6] bg-white shadow-[0_1px_2px_rgba(30,38,33,0.03)]">
                {Object.entries(data).map(([key, node], i) => (
                    <CostRow
                        key={node.id}
                        rowKey={key}
                        node={node}
                        depth={0}
                        edits={edits}
                        expanded={expanded}
                        focusedId={focusedId}
                        onToggle={toggleNode}
                        onLeafChange={handleLeafChange}
                        onLeafFocus={handleLeafFocus}
                        onLeafBlur={handleLeafBlur}
                        isLast={i === Object.entries(data).length - 1}
                    />
                ))}
            </div>
        </div>
    );
}

/* ---------------- Row ---------------- */

function CostRow({
    rowKey,
    node,
    depth,
    edits,
    expanded,
    focusedId,
    onToggle,
    onLeafChange,
    onLeafFocus,
    onLeafBlur,
    isLast,
}: {
    rowKey: string;
    node: CostNode;
    depth: number;
    edits: Record<number, string>;
    expanded: Set<number>;
    focusedId: number | null;
    onToggle: (id: number) => void;
    onLeafChange: (id: number, raw: string) => void;
    onLeafFocus: (id: number) => void;
    onLeafBlur: (id: number) => void;
    isLast: boolean;
}) {
    const hasChildren = !!node.children;
    const isOpen = expanded.has(node.id);
    const actualCost = computeActualCost(node, edits);
    const entries = node.children ? Object.entries(node.children) : [];
    const variance = actualCost - node.cost;
    const varianceTone =
        variance === 0 ? "text-[#8A938C]" : variance > 0 ? "text-[#B0453A]" : "text-[#3E6B52]";

    const isCert = node.is_certification === 1;
    // Certification rows always get the gold treatment; other parent rows are colored by depth;
    // plain leaf rows stay neutral so they read as simple, editable line items.
    const style = isCert ? CERT_STYLE : hasChildren ? LEVEL_STYLES[depth % LEVEL_STYLES.length] : depth == 0 ? LEVEL_STYLES[0] : null;

    return (
        <div className={!isLast || isOpen ? "border-b border-[#EFEDE6]" : ""}>
            <div
                role={hasChildren ? "button" : undefined}
                tabIndex={hasChildren ? 0 : undefined}
                onClick={() => hasChildren && onToggle(node.id)}
                onKeyDown={(e) => {
                    if (hasChildren && (e.key === "Enter" || e.key === " ")) onToggle(node.id);
                }}
                className={`flex items-center gap-3 border-l-[3px] py-3 pr-3 transition-colors ${
                    hasChildren ? "cursor-pointer" : ""
                } ${style ? `${style.border} ${style.bg} ${style.hoverBg}` : "border-transparent bg-white hover:bg-[#FBFAF7]"}`}
                style={{ paddingLeft: `${12 + depth * 22}px` }}
            >
                <span className="flex w-4 shrink-0 items-center justify-center text-[#5B655F]">
                    {hasChildren && (
                        <ChevronRight
                            size={14}
                            className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                        />
                    )}
                </span>

                <span
                    className={`flex h-7 min-w-11 shrink-0 items-center justify-center rounded-full px-2 text-[10.5px] font-semibold ${
                        style ? `${style.badgeBg} ${style.badgeText}` : "bg-[#F6F6F2] text-[#7C8880]"
                    }`}
                    style={{ fontFamily: "var(--font-mono)" }}
                >
                    {rowKey}
                </span>

                <span
                    className={`min-w-0 flex-1 truncate text-[13.5px] text-[#1E2621] ${
                        hasChildren ? "font-semibold" : "font-medium"
                    }`}
                >
                    {node.description}
                </span>

                {isCert && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full border border-[#D9B968] bg-white/70 px-2 py-0.5 text-[10.5px] font-medium text-[#8A6420]">
                        <Award size={11} />
                        Certification
                    </span>
                )}

                {/* Budgeted — always plain, right-aligned text, fixed width */}
                <span
                    className={`${COL_BUDGET} shrink-0 text-right text-[13px] tabular-nums ${
                        style ? `font-semibold ${style.amount}` : "text-[#7C8880]"
                    }`}
                    style={{ fontFamily: "var(--font-mono)" }}
                >
                    {formatMoney(node.cost)}
                </span>

                {/* Actual — same fixed width as Budgeted, whether it's a sum or an editable field */}
                <span className={`${COL_ACTUAL} shrink-0`} onClick={(e) => e.stopPropagation()}>
                    {hasChildren ? (
                        <div className="flex flex-col items-end gap-0.5">
                            <span
                                className="text-right text-[13px] font-semibold tabular-nums text-[#2C4A3A]"
                                style={{ fontFamily: "var(--font-mono)" }}
                                title="Sum of child items — not directly editable"
                            >
                                {formatMoney(actualCost)}
                            </span>
                        </div>
                    ) : (
                        <div className="flex w-full justify-end">
                            <div className="relative w-[85%] max-w-[136px]">
                                <span
                                    className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-[11px] font-medium text-[#8A938C]"
                                    style={{ fontFamily: "var(--font-mono)" }}
                                >
                                    RM
                                </span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={
                                        focusedId === node.id
                                            ? edits[node.id] ?? ""
                                            : formatWithCommas(edits[node.id])
                                    }
                                    onChange={(e) => onLeafChange(node.id, e.target.value)}
                                    onFocus={() => onLeafFocus(node.id)}
                                    onBlur={() => onLeafBlur(node.id)}
                                    className="w-full rounded-xl border border-[#E4E1D8] bg-white py-1.5 pl-8 pr-2.5 text-right text-[13px] tabular-nums text-[#1E2621] transition-shadow focus:border-[#3E6B52] focus:outline-none focus:ring-2 focus:ring-[#3E6B52]/15"
                                    style={{ fontFamily: "var(--font-mono)" }}
                                />
                            </div>
                        </div>
                    )}
                </span>
            </div>

            {hasChildren && isOpen && (
                <div>
                    {entries.map(([childKey, child], i) => (
                        <CostRow
                            key={child.id}
                            rowKey={`${rowKey}.${childKey}`}
                            node={child}
                            depth={depth + 1}
                            edits={edits}
                            expanded={expanded}
                            focusedId={focusedId}
                            onToggle={onToggle}
                            onLeafChange={onLeafChange}
                            onLeafFocus={onLeafFocus}
                            onLeafBlur={onLeafBlur}
                            isLast={i === entries.length - 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ---------------- Total card ---------------- */

function TotalCard({
    icon: Icon,
    label,
    value,
    highlighted,
    tone,
}: {
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    value: string;
    highlighted?: boolean;
    tone?: "over" | "under" | "neutral";
}) {
    const toneClasses =
        tone === "over"
            ? "border-[#E7C1BA] bg-[#FBEDEB] text-[#8C3D33]"
            : tone === "under"
            ? "border-[#CFE0D6] bg-[#EEF2EC] text-[#2C4A3A]"
            : highlighted
            ? "border-[#CFE0D6] bg-[#EEF2EC] text-[#2C4A3A]"
            : "border-[#EFEDE6] bg-[#FDFDFC] text-[#1E2621]";

    const iconToneClasses =
        tone === "over"
            ? "bg-[#B0453A] text-white"
            : tone === "under"
            ? "bg-[#3E6B52] text-white"
            : highlighted
            ? "bg-[#3E6B52] text-white"
            : "bg-[#EFEDE6] text-[#7C8880]";

    return (
        <div className={`flex items-start gap-3 rounded-2xl border p-4 ${toneClasses}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconToneClasses}`}>
                <Icon size={15} />
            </span>
            <div className="min-w-0">
                <div
                    className="text-[10.5px] uppercase tracking-[0.08em] opacity-70"
                    style={{ fontFamily: "var(--font-mono)" }}
                >
                    {label}
                </div>
                <div className="mt-0.5 text-[17px] font-semibold tabular-nums">{value}</div>
            </div>
        </div>
    );
}