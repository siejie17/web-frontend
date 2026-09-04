"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
    Plus,
    Check,
    X,
    Trash2,
} from "lucide-react";

/* ---------------- Types ---------------- */

export type CostNode = {
    id: number;
    description: string;
    cost: number;
    actual_cost?: number;
    actual_pct?: number;
    actual_direction?: "up" | "down";
    is_certification: number;
    certificationLabel?: string;
    actualCertificationLabel?: string;
    children?: Record<string, CostNode>;
};

export type CostBreakdown = Record<string, CostNode>;

export type CostBreakdownMode = "assessment" | "comparison";

type EditableField = "cost" | "actual_cost";

/* ---------------- Money helpers ---------------- */

export function formatMoney(value: number): string {
    const safe = Number.isFinite(value) ? value : 0;
    return `RM ${safe.toLocaleString("en-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function normalizeCents(raw: string | undefined): string {
    const digits = (raw ?? "").replace(/\D/g, "");
    if (!digits) return "0";
    return digits.replace(/^0+(?=\d)/, "") || "0";
}

export function formatWithCommas(raw: string | undefined): string {
    const normalized = normalizeCents(raw);
    const padded = normalized.padStart(3, "0");
    const whole = padded.slice(0, -2);
    const cents = padded.slice(-2);
    const wholeFormatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${wholeFormatted}.${cents}`;
}

function parseEdit(raw: string | undefined): number {
    return Number(normalizeCents(raw)) / 100;
}

function normalizePct(raw: string | undefined): number {
    const cleaned = (raw ?? "").replace(/[^\d.]/g, "");
    const firstDot = cleaned.indexOf(".");
    const sanitized =
        firstDot === -1
            ? cleaned
            : cleaned.slice(0, firstDot + 1) +
              cleaned.slice(firstDot + 1).replace(/\./g, "");

    const v = parseFloat(sanitized);
    if (isNaN(v)) return 0;

    return Math.max(0, Math.min(100, Math.round(v * 10) / 10));
}

function formatPct(v: number): string {
    if (!Number.isFinite(v)) return "0";
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
}

function sumPredictedCost(node: CostNode): number {
    if (!node.children) return node.cost ?? 0;

    return Object.values(node.children).reduce(
        (sum, child) => sum + sumPredictedCost(child),
        0,
    );
}

function driftPct(predicted: number, actual: number): number {
    if (!predicted || predicted === 0) return 0;
    return Math.round(((actual - predicted) / predicted) * 1000) / 10;
}

/* ---------------- Percentage-drift helper ---------------- */

export type PctDirection = "up" | "down";

export type PctOverride = {
    pct: number;
    direction: PctDirection;
};

export function computePctActual(
    cost: number,
    pct: number,
    direction: PctDirection,
): number {
    const safeCost = Number.isFinite(cost) ? cost : 0;
    const safePct = Number.isFinite(pct) ? pct : 0;
    const factor =
        1 + (direction === "down" ? -1 : 1) * (safePct / 100);

    return Math.round(safeCost * factor * 100) / 100;
}

export function effectivePct(
    node: CostNode,
    overrides?: Record<number, PctOverride>,
): PctOverride {
    const override = overrides?.[node.id];

    return {
        pct: override?.pct ?? node.actual_pct ?? 0,
        direction: override?.direction ?? node.actual_direction ?? "up",
    };
}

/* ---------------- Helpers ---------------- */

function collectInitialEdits(
    data: CostBreakdown,
    field: EditableField,
): Record<number, string> {
    const edits: Record<number, string> = {};

    const visit = (node: CostNode) => {
        if (node.children) {
            Object.values(node.children).forEach(visit);
        } else {
            const raw = field === "cost" ? node.cost : node.actual_cost;

            edits[node.id] =
                raw !== undefined && raw !== null
                    ? String(Math.round(Number(raw) * 100))
                    : "0";
        }
    };

    Object.values(data).forEach(visit);

    return edits;
}

function computeFieldSum(
    node: CostNode,
    edits: Record<number, string>,
    field: EditableField,
    pctOverrides?: Record<number, PctOverride>,
): number {
    if (node.children) {
        return Object.values(node.children).reduce(
            (sum, child) =>
                sum + computeFieldSum(child, edits, field, pctOverrides),
            0,
        );
    }

    if (node.is_certification === 1) {
        return node[field] ?? 0;
    }

    if (field === "actual_cost" && (node.cost ?? 0) > 0) {
        const { pct, direction } = effectivePct(node, pctOverrides);

        return computePctActual(node.cost, pct, direction);
    }

    return parseEdit(edits[node.id]);
}

function countLeaves(node: CostNode): number {
    if (!node.children) return 1;

    return Object.values(node.children).reduce(
        (sum, child) => sum + countLeaves(child),
        0,
    );
}

function sumTop(
    data: CostBreakdown,
    key: "budgeted" | "live",
    edits: Record<number, string>,
    field: EditableField,
    pctOverrides?: Record<number, PctOverride>,
) {
    return Object.values(data).reduce(
        (sum, node) =>
            sum +
            (key === "budgeted"
                ? node.cost
                : computeFieldSum(node, edits, field, pctOverrides)),
        0,
    );
}

/*
 * Responsive column widths.
 *
 * Mobile:
 *   Predicted + Δ% collapse into the description area/caption.
 *   Actual remains compact enough to preserve readable Element content.
 *
 * Tablet:
 *   Slightly narrower fixed numeric columns prevent the Element column
 *   from becoming unnecessarily cramped.
 *
 * Laptop/Desktop:
 *   Restore the original visual proportions.
 */
export const COL_BUDGET =
    "w-28 sm:w-32 md:w-36 lg:w-40";

export const COL_ACTUAL =
    "w-28 sm:w-32 md:w-36 lg:w-40";

export const COL_PCT =
    "w-20 sm:w-20 md:w-24 lg:w-28";

const COL_ACTION =
    "w-14 sm:w-17.5";

const RAIL_W = 18;

const LEVEL_STYLES = [
    {
        border: "border-transparent",
        bg: "bg-white",
        hoverBg: "hover:bg-[#FBFAF7]",
        badgeBg: "bg-[#2C4A3A]",
        badgeText: "text-white",
        amount: "text-[#2C4A3A]",
    },
    {
        border: "border-transparent",
        bg: "bg-white",
        hoverBg: "hover:bg-[#FBFAF7]",
        badgeBg: "bg-[#4E7290]",
        badgeText: "text-white",
        amount: "text-[#3B5A73]",
    },
    {
        border: "border-transparent",
        bg: "bg-white",
        hoverBg: "hover:bg-[#FBFAF7]",
        badgeBg: "bg-[#8F7757]",
        badgeText: "text-white",
        amount: "text-[#71603F]",
    },
];

const CERT_STYLE = {
    border: "border-[#B8862E]",
    bg: "bg-[#FBF3DE]",
    hoverBg: "hover:bg-[#F7E9C4]",
    badgeBg: "bg-[#B8862E]",
    badgeText: "text-white",
    amount: "text-[#8A6420]",
};

const RAIL_LINE = "#DCD8CB";

/* ---------------- Component ---------------- */

export default function CostBreakdownTree({
    data,
    onActualCostChangeAction,
    hideTotals = false,
    mode = "comparison",
    editable = false,
    onAddChildAction,
    onDeleteNodeAction,
    onDescriptionChangeAction,
    addMode = false,
    onSplitLeafAction,
    deleteMode = false,
    onDeleteLeafAction,
    onAddRootCategoryAction,
    toolbarActions,
    readOnly = false,
    pctOverrides,
    onPctChangeAction,
}: {
    data: CostBreakdown;
    onActualCostChangeAction?: (nodeId: number, value: number) => void;
    hideTotals?: boolean;
    mode?: CostBreakdownMode;
    editable?: boolean;
    onAddChildAction?: (parentId: number | null) => void;
    onDeleteNodeAction?: (nodeId: number) => void;
    onDescriptionChangeAction?: (nodeId: number, value: string) => void;
    addMode?: boolean;
    deleteMode?: boolean;
    onSplitLeafAction?: (nodeId: number) => void;
    onDeleteLeafAction?: (nodeId: number) => void;
    onAddRootCategoryAction?: () => void;
    toolbarActions?: ReactNode;
    readOnly?: boolean;
    pctOverrides?: Record<number, PctOverride>;
    onPctChangeAction?: (
        nodeId: number,
        pct: number,
        direction: PctDirection,
        computedActual: number,
    ) => void;
}) {
    const field: EditableField =
        mode === "assessment" ? "cost" : "actual_cost";

    const [edits, setEdits] = useState<Record<number, string>>(
        () => collectInitialEdits(data, field),
    );

    const [expanded, setExpanded] = useState<Set<number>>(
        () => new Set(),
    );

    const [focusedId, setFocusedId] = useState<number | null>(null);

    const [confirmingDeleteId, setConfirmingDeleteId] =
        useState<number | null>(null);

    const totalBudgeted = useMemo(
        () => sumTop(data, "budgeted", edits, field),
        [data, edits, field],
    );

    const totalLive = useMemo(
        () => sumTop(data, "live", edits, field, pctOverrides),
        [data, edits, field, pctOverrides],
    );

    const variance = totalLive - totalBudgeted;
    const isOverBudget = variance > 0;

    const allTopIds = useMemo(
        () => Object.values(data).map((n) => n.id),
        [data],
    );

    const allExpanded =
        allTopIds.length > 0 &&
        allTopIds.every((id) => expanded.has(id));

    useEffect(() => {
        setEdits((prev) => {
            const next = { ...prev };

            const visit = (node: CostNode) => {
                if (node.children) {
                    Object.values(node.children).forEach(visit);
                } else if (!(node.id in next)) {
                    const raw =
                        field === "cost"
                            ? node.cost
                            : node.actual_cost;

                    next[node.id] =
                        raw !== undefined && raw !== null
                            ? String(Math.round(Number(raw) * 100))
                            : "0";
                }
            };

            Object.values(data).forEach(visit);

            return next;
        });
    }, [data, field]);

    const toggleAll = () => {
        setExpanded(
            allExpanded ? new Set() : new Set(allTopIds),
        );
    };

    const toggleNode = (id: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);

            next.has(id)
                ? next.delete(id)
                : next.add(id);

            return next;
        });
    };

    const handleLeafChange = (id: number, raw: string) => {
        const normalized = normalizeCents(raw);

        setEdits((prev) => ({
            ...prev,
            [id]: normalized,
        }));

        onActualCostChangeAction?.(
            id,
            parseEdit(normalized),
        );
    };

    const handleLeafFocus = (id: number) => {
        setFocusedId(id);
    };

    const handleLeafBlur = (id: number) => {
        setFocusedId(null);

        setEdits((prev) => ({
            ...prev,
            [id]: normalizeCents(prev[id]),
        }));
    };

    const handleAddChild = (parentId: number | null) => {
        if (parentId !== null) {
            setExpanded((prev) =>
                new Set(prev).add(parentId),
            );
        }

        setConfirmingDeleteId(null);
        onAddChildAction?.(parentId);
    };

    const isAssessment = mode === "assessment";
    const topEntries = Object.entries(data);

    return (
        <div className="min-w-0 w-full">
            {/* ---------------- Toolbar ---------------- */}
            <div className="mb-4 flex min-w-0 flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
                <span
                    className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#9A9186]"
                    style={{ fontFamily: "var(--font-mono)" }}
                >
                    Cost Ledger
                </span>

                <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
                    {toolbarActions}

                    <button
                        type="button"
                        onClick={toggleAll}
                        className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#E4E1D8] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5B655F] transition-colors hover:border-[#BFD6C8] hover:text-[#2C4A3A] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#2C4A3A]"
                    >
                        {allExpanded ? (
                            <ChevronsDownUp size={13} />
                        ) : (
                            <ChevronsUpDown size={13} />
                        )}
                        {allExpanded
                            ? "Collapse all"
                            : "Expand all"}
                    </button>
                </div>
            </div>

            {/* ---------------- Totals ---------------- */}
            {!hideTotals && (
                <div
                    className={`mb-5 grid min-w-0 grid-cols-1 gap-3 ${
                        isAssessment
                            ? "sm:grid-cols-1"
                            : "sm:grid-cols-3"
                    }`}
                >
                    {isAssessment ? (
                        <TotalCard
                            icon={CircleDollarSign}
                            label="Total predicted cost"
                            value={formatMoney(totalLive)}
                            highlighted
                        />
                    ) : (
                        <>
                            <TotalCard
                                icon={Wallet}
                                label="Total budgeted cost"
                                value={formatMoney(totalBudgeted)}
                            />

                            <TotalCard
                                icon={CircleDollarSign}
                                label="Total actual cost"
                                value={formatMoney(totalLive)}
                                highlighted
                            />

                            <TotalCard
                                icon={
                                    variance === 0
                                        ? Minus
                                        : isOverBudget
                                          ? TrendingUp
                                          : TrendingDown
                                }
                                label={
                                    isOverBudget
                                        ? "Over budget by"
                                        : "Under budget by"
                                }
                                value={formatMoney(
                                    Math.abs(variance),
                                )}
                                tone={
                                    variance === 0
                                        ? "neutral"
                                        : isOverBudget
                                          ? "over"
                                          : "under"
                                }
                            />
                        </>
                    )}
                </div>
            )}

            {/* ---------------- Tree ---------------- */}
            <div className="min-w-0 overflow-hidden rounded-2xl border border-[#E4E1D8] bg-white shadow-[0_1px_2px_rgba(30,38,33,0.03)]">
                <div className="flex min-w-0 items-stretch">
                    <div
                        className="hidden w-3 shrink-0 border-r border-[#EFEDE6] sm:block"
                        style={{
                            backgroundImage: `radial-gradient(circle, ${RAIL_LINE} 1.4px, transparent 1.4px)`,
                            backgroundSize: "100% 16px",
                            backgroundPosition: "center 10px",
                        }}
                        aria-hidden
                    />

                    <div className="min-w-0 flex-1">
                        {/* Header */}
                        <div className="flex min-w-0 items-center border-b border-[#EFEDE6] bg-[#FBFAF7]">
                            <span
                                className="flex min-w-0 flex-1 items-center justify-center py-2.5 px-2 text-center text-[10.5px] font-semibold uppercase tracking-widest text-[#8A938C]"
                                style={{
                                    fontFamily: "var(--font-mono)",
                                }}
                            >
                                Element
                            </span>

                            {!isAssessment && (
                                <span
                                    className={`${COL_BUDGET} hidden shrink-0 items-center justify-center border-l border-[#EFEDE6] py-2.5 text-center text-[10.5px] font-semibold uppercase tracking-widest text-[#8A938C] sm:flex`}
                                    style={{
                                        fontFamily: "var(--font-mono)",
                                    }}
                                >
                                    Predicted
                                </span>
                            )}

                            {!isAssessment && (
                                <span
                                    className={`${COL_PCT} hidden shrink-0 items-center justify-center border-l border-[#EFEDE6] py-2.5 text-center text-[10.5px] font-semibold uppercase tracking-widest text-[#8A938C] sm:flex`}
                                    style={{
                                        fontFamily: "var(--font-mono)",
                                    }}
                                >
                                    Δ%
                                </span>
                            )}

                            <span
                                className={`${COL_ACTUAL} flex shrink-0 items-center justify-center border-l border-[#EFEDE6] py-2.5 px-1.5 text-center text-[10.5px] font-semibold uppercase tracking-widest text-[#8A938C] sm:px-2`}
                                style={{
                                    fontFamily: "var(--font-mono)",
                                }}
                            >
                                {isAssessment
                                    ? "Cost"
                                    : "Actual"}
                            </span>

                            {(editable ||
                                addMode ||
                                deleteMode) && (
                                <span
                                    className={`${COL_ACTION} flex shrink-0 items-center justify-center border-l border-[#EFEDE6] py-2.5 text-center text-[10.5px] font-semibold uppercase tracking-widest text-[#8A938C]`}
                                    style={{
                                        fontFamily: "var(--font-mono)",
                                    }}
                                >
                                    Action
                                </span>
                            )}
                        </div>

                        {topEntries.map(
                            ([key, node], i) => (
                                <CostRow
                                    key={node.id}
                                    rowKey={key}
                                    node={node}
                                    depth={0}
                                    ancestorContinues={[]}
                                    isLastChild={
                                        i ===
                                        topEntries.length - 1
                                    }
                                    edits={edits}
                                    expanded={expanded}
                                    focusedId={focusedId}
                                    mode={mode}
                                    field={field}
                                    editable={editable}
                                    addMode={addMode}
                                    deleteMode={deleteMode}
                                    confirmingDeleteId={
                                        confirmingDeleteId
                                    }
                                    onToggle={toggleNode}
                                    onLeafChange={
                                        handleLeafChange
                                    }
                                    onLeafFocus={
                                        handleLeafFocus
                                    }
                                    onLeafBlur={
                                        handleLeafBlur
                                    }
                                    onAddChildAction={
                                        handleAddChild
                                    }
                                    onRequestDelete={
                                        setConfirmingDeleteId
                                    }
                                    onDeleteNodeAction={
                                        onDeleteNodeAction
                                    }
                                    onDescriptionChangeAction={
                                        onDescriptionChangeAction
                                    }
                                    onSplitLeafAction={
                                        onSplitLeafAction
                                    }
                                    onDeleteLeafAction={
                                        onDeleteLeafAction
                                    }
                                    isLast={
                                        i ===
                                        topEntries.length - 1
                                    }
                                    readOnly={readOnly}
                                    pctOverrides={
                                        pctOverrides
                                    }
                                    onPctChangeAction={
                                        onPctChangeAction
                                    }
                                />
                            ),
                        )}

                        {addMode ? (
                            <button
                                type="button"
                                onClick={
                                    onAddRootCategoryAction
                                }
                                className="flex min-h-11 w-full items-center justify-center gap-1.5 border-t border-dashed border-[#E4E1D8] bg-[#FBFAF7] px-3 py-3 text-center text-[12.5px] font-medium text-[#5B655F] transition-colors hover:bg-[#EEF2EC] hover:text-[#2C4A3A] focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-[#2C4A3A]"
                            >
                                <Plus size={13} />
                                Add Other Category
                            </button>
                        ) : editable ? (
                            <button
                                type="button"
                                onClick={() =>
                                    handleAddChild(null)
                                }
                                className="flex min-h-11 w-full items-center justify-center gap-1.5 border-t border-dashed border-[#E4E1D8] bg-[#FBFAF7] px-3 py-3 text-center text-[12.5px] font-medium text-[#5B655F] transition-colors hover:bg-[#EEF2EC] hover:text-[#2C4A3A] focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-[#2C4A3A]"
                            >
                                <Plus size={13} />
                                Add top-level cost code
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ---------------- Certification badge ---------------- */

function CertificationBadge({
    label,
}: {
    label?: string;
}) {
    return (
        <span className="flex max-w-full min-w-0 shrink items-center gap-1 rounded-full border border-[#D9B968] bg-white/70 px-2 py-0.5 text-[10px] font-medium text-[#8A6420] shadow-[0_1px_1px_rgba(138,100,32,0.08)]">
            <Award
                size={10.5}
                className="shrink-0"
            />

            <span className="min-w-0 truncate">
                {label ?? "Certification"}
            </span>
        </span>
    );
}

/* ---------------- Row ---------------- */

function CostRow({
    rowKey,
    node,
    depth,
    ancestorContinues,
    isLastChild,
    edits,
    expanded,
    focusedId,
    mode,
    field,
    editable,
    addMode,
    deleteMode = false,
    confirmingDeleteId,
    onToggle,
    onLeafChange,
    onLeafFocus,
    onLeafBlur,
    onAddChildAction,
    onRequestDelete,
    onDeleteNodeAction,
    onDescriptionChangeAction,
    onSplitLeafAction,
    onDeleteLeafAction,
    isLast,
    readOnly = false,
    pctOverrides,
    onPctChangeAction,
}: {
    rowKey: string;
    node: CostNode;
    depth: number;
    ancestorContinues: boolean[];
    isLastChild: boolean;
    edits: Record<number, string>;
    expanded: Set<number>;
    focusedId: number | null;
    mode: CostBreakdownMode;
    field: EditableField;
    editable: boolean;
    addMode: boolean;
    deleteMode?: boolean;
    confirmingDeleteId: number | null;
    onToggle: (id: number) => void;
    onLeafChange: (id: number, raw: string) => void;
    onLeafFocus: (id: number) => void;
    onLeafBlur: (id: number) => void;
    onAddChildAction: (parentId: number | null) => void;
    onRequestDelete: (id: number | null) => void;
    onDeleteNodeAction?: (nodeId: number) => void;
    onDescriptionChangeAction?: (
        nodeId: number,
        value: string,
    ) => void;
    onSplitLeafAction?: (nodeId: number) => void;
    onDeleteLeafAction?: (nodeId: number) => void;
    isLast: boolean;
    readOnly?: boolean;
    pctOverrides?: Record<number, PctOverride>;
    onPctChangeAction?: (
        nodeId: number,
        pct: number,
        direction: PctDirection,
        computedActual: number,
    ) => void;
}) {
    const hasChildren = !!node.children;
    const isOpen = expanded.has(node.id);

    const liveValue = computeFieldSum(
        node,
        edits,
        field,
        pctOverrides,
    );

    const entries = node.children
        ? Object.entries(node.children)
        : [];

    const isConfirmingDelete =
        confirmingDeleteId === node.id;

    const isCert = node.is_certification === 1;

    const style = isCert
        ? CERT_STYLE
        : hasChildren
          ? LEVEL_STYLES[
                depth % LEVEL_STYLES.length
            ]
          : null;

    const isAssessment = mode === "assessment";

    const isPctLeaf =
        mode === "comparison" &&
        !hasChildren &&
        !isCert &&
        (node.cost ?? 0) > 0;

    const isLeafNode =
        !hasChildren && !isCert;

    const pctCfg = isPctLeaf
        ? effectivePct(node, pctOverrides)
        : {
              pct: 0,
              direction: "up" as PctDirection,
          };

    const computedActual = isPctLeaf
        ? computePctActual(
              node.cost,
              pctCfg.pct,
              pctCfg.direction,
          )
        : null;

    const displayPct = isLeafNode
        ? pctCfg.pct
        : driftPct(
              isCert
                  ? node.cost
                  : sumPredictedCost(node),
              liveValue,
          );

    const displayDir: PctDirection =
        isLeafNode
            ? pctCfg.direction
            : displayPct < 0
              ? "down"
              : "up";

    const divider =
        "border-l border-[#EFEDE6]";

    const childAncestorContinues = [
        ...ancestorContinues,
        !isLastChild,
    ];

    return (
        <div
            className={
                !isLast || isOpen
                    ? "border-b border-[#EFEDE6]"
                    : ""
            }
        >
            <div
                role={
                    hasChildren ? "button" : undefined
                }
                tabIndex={
                    hasChildren ? 0 : undefined
                }
                onClick={() =>
                    hasChildren &&
                    onToggle(node.id)
                }
                onKeyDown={(e) => {
                    if (
                        hasChildren &&
                        (e.key === "Enter" ||
                            e.key === " ")
                    ) {
                        onToggle(node.id);
                    }
                }}
                className={`group flex min-w-0 items-stretch border-l-[3px] transition-colors ${
                    hasChildren
                        ? "cursor-pointer focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-[#2C4A3A]"
                        : ""
                } ${
                    style
                        ? `${style.border} ${style.bg} ${style.hoverBg}`
                        : "border-transparent bg-white hover:bg-[#FBFAF7]"
                }`}
            >
                {/* ---- Connector rail ---- */}
                {depth > 0 && (
                    <div
                        className="flex shrink-0 items-stretch"
                        aria-hidden
                    >
                        {ancestorContinues.map(
                            (cont, i) => (
                                <span
                                    key={i}
                                    className="relative shrink-0"
                                    style={{
                                        width:
                                            typeof window !==
                                            "undefined"
                                                ? undefined
                                                : RAIL_W *
                                                  1.8,
                                    }}
                                >
                                    <span
                                        className={`absolute left-1/2 top-0 h-full w-px -translate-x-1/2 ${
                                            cont
                                                ? ""
                                                : "hidden"
                                        }`}
                                        style={{
                                            backgroundColor:
                                                RAIL_LINE,
                                        }}
                                    />
                                </span>
                            ),
                        )}

                        <span className="relative w-[9px] shrink-0 sm:w-[10px]">
                            <span
                                className="absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2"
                                style={{
                                    backgroundColor:
                                        RAIL_LINE,
                                }}
                            />

                            {!isLastChild && (
                                <span
                                    className="absolute left-1/2 top-1/2 h-1/2 w-px -translate-x-1/2"
                                    style={{
                                        backgroundColor:
                                            RAIL_LINE,
                                    }}
                                />
                            )}

                            <span
                                className="absolute left-1/2 top-1/2 h-px w-[9px] -translate-y-1/2 sm:w-[10px]"
                                style={{
                                    backgroundColor:
                                        RAIL_LINE,
                                }}
                            />
                        </span>
                    </div>
                )}

                {/* ---- Element column ---- */}
                <div
                    className={`flex min-w-0 flex-1 items-center gap-1.5 py-2.5 pr-2 sm:gap-2.5 sm:py-3 sm:pr-3 ${
                        depth === 0
                            ? "pl-2.5 sm:pl-3"
                            : "pl-1.5 sm:pl-2"
                    }`}
                >
                    <span className="flex w-4 shrink-0 items-center justify-center text-[#8A938C]">
                        {hasChildren && (
                            <ChevronRight
                                size={14}
                                strokeWidth={2.25}
                                className={`transition-transform duration-200 ${
                                    isOpen
                                        ? "rotate-90"
                                        : ""
                                }`}
                            />
                        )}
                    </span>

                    <span
                        className={`flex h-6 min-w-9 max-w-[4.5rem] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] sm:min-w-10 sm:max-w-none sm:px-2 ${
                            style
                                ? `${style.badgeBg} ${style.badgeText}`
                                : "bg-[#F1EFE7] text-[#8A8074]"
                        }`}
                        style={{
                            fontFamily:
                                "var(--font-mono)",
                            letterSpacing: "0.01em",
                        }}
                    >
                        <span className="truncate">
                            {rowKey}
                        </span>
                    </span>

                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 sm:gap-x-2">
                            {editable ? (
                                <input
                                    type="text"
                                    value={
                                        node.description
                                    }
                                    placeholder="Untitled cost item"
                                    onClick={(e) =>
                                        e.stopPropagation()
                                    }
                                    onChange={(e) =>
                                        onDescriptionChangeAction?.(
                                            node.id,
                                            e.target.value,
                                        )
                                    }
                                    className={`min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-[13.5px] leading-5 tracking-[0.005em] text-[#1E2621] transition-colors hover:border-[#E4E1D8] focus:border-[#2C4A3A] focus:bg-white focus:outline-none ${
                                        hasChildren
                                            ? "font-semibold"
                                            : "font-medium"
                                    }`}
                                />
                            ) : (
                                <span
                                    className={`min-w-0 flex-1 text-[13.5px] leading-5 tracking-[0.005em] text-[#1E2621] ${
                                        hasChildren
                                            ? "font-semibold"
                                            : "font-medium"
                                    }`}
                                    title={
                                        node.description
                                    }
                                >
                                    <span className="line-clamp-2 sm:line-clamp-1">
                                        {
                                            node.description
                                        }
                                    </span>
                                </span>
                            )}

                            {isCert &&
                                mode ===
                                    "assessment" && (
                                    <CertificationBadge
                                        label={
                                            node.certificationLabel
                                        }
                                    />
                                )}
                        </div>

                        {/* Mobile predicted caption */}
                        {!isAssessment && (
                            <span
                                className="mt-0.5 min-w-0 truncate text-[10.5px] font-medium text-[#9A9186] sm:hidden"
                                style={{
                                    fontFamily:
                                        "var(--font-mono)",
                                }}
                            >
                                Predicted{" "}
                                {formatMoney(
                                    node.cost,
                                )}
                            </span>
                        )}
                    </div>
                </div>

                {isConfirmingDelete ? (
                    /* ---- Inline delete confirmation ---- */
                    <span
                        className={`flex min-w-0 flex-1 items-center justify-end gap-1.5 ${divider} bg-[#FDFBF9] px-2 sm:flex-none sm:gap-2 sm:px-4`}
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >
                        <span className="hidden min-w-0 truncate text-[12px] font-medium text-[#8C3D33] sm:inline">
                            Delete
                            {hasChildren
                                ? ` this + ${countLeaves(node)} items`
                                : ""}
                            ?
                        </span>

                        <span className="text-[12px] font-medium text-[#8C3D33] sm:hidden">
                            Delete?
                        </span>

                        <button
                            type="button"
                            title="Confirm delete"
                            onClick={() => {
                                onDeleteNodeAction?.(
                                    node.id,
                                );
                                onRequestDelete(null);
                            }}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#B0453A] text-white shadow-sm transition-colors hover:bg-[#963B31] sm:h-7 sm:w-7"
                        >
                            <Check size={13} />
                        </button>

                        <button
                            type="button"
                            title="Cancel"
                            onClick={() =>
                                onRequestDelete(null)
                            }
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E4E1D8] bg-white text-[#5B655F] transition-colors hover:border-[#C9D3CC] sm:h-7 sm:w-7"
                        >
                            <X size={13} />
                        </button>
                    </span>
                ) : (
                    <>
                        {/* ---- Predicted / Budgeted ---- */}
                        {!isAssessment && (
                            <span
                                className={`${COL_BUDGET} ${divider} hidden shrink-0 flex-col items-end justify-center gap-1 py-3 pr-3 sm:flex md:pr-3`}
                            >
                                <span
                                    className={`max-w-full truncate text-[13px] tabular-nums ${
                                        style
                                            ? `font-semibold ${style.amount}`
                                            : "text-[#7C8880]"
                                    }`}
                                    style={{
                                        fontFamily:
                                            "var(--font-mono)",
                                        letterSpacing:
                                            "0.01em",
                                    }}
                                    title={formatMoney(
                                        node.cost,
                                    )}
                                >
                                    {formatMoney(
                                        node.cost,
                                    )}
                                </span>

                                {isCert && (
                                    <CertificationBadge
                                        label={
                                            node.certificationLabel
                                        }
                                    />
                                )}
                            </span>
                        )}

                        {/* ---- Δ% ---- */}
                        {!isAssessment && (
                            <span
                                className={`${COL_PCT} ${divider} hidden shrink-0 items-center justify-center py-2.5 sm:flex`}
                                onClick={(e) =>
                                    e.stopPropagation()
                                }
                            >
                                {isLeafNode &&
                                !readOnly ? (
                                    <span className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            title={
                                                pctCfg.direction ===
                                                "up"
                                                    ? "Rising (actual above predicted)"
                                                    : "Dropping (actual below predicted)"
                                            }
                                            onClick={() => {
                                                const nextDir: PctDirection =
                                                    pctCfg.direction ===
                                                    "up"
                                                        ? "down"
                                                        : "up";

                                                onPctChangeAction?.(
                                                    node.id,
                                                    pctCfg.pct,
                                                    nextDir,
                                                    computePctActual(
                                                        node.cost,
                                                        pctCfg.pct,
                                                        nextDir,
                                                    ),
                                                );
                                            }}
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors sm:h-6 sm:w-6 ${
                                                pctCfg.direction ===
                                                "up"
                                                    ? "bg-[#3E6B52] text-white"
                                                    : "bg-[#B0453A] text-white"
                                            }`}
                                        >
                                            {pctCfg.direction ===
                                            "up" ? (
                                                <TrendingUp
                                                    size={12}
                                                    strokeWidth={
                                                        2.5
                                                    }
                                                />
                                            ) : (
                                                <TrendingDown
                                                    size={12}
                                                    strokeWidth={
                                                        2.5
                                                    }
                                                />
                                            )}
                                        </button>

                                        <span className="flex items-center rounded-lg border border-[#D6D1C3] bg-[#FCFBF8] px-1.5 py-1">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0"
                                                value={formatPct(
                                                    pctCfg.pct,
                                                )}
                                                onChange={(
                                                    e,
                                                ) => {
                                                    const v =
                                                        normalizePct(
                                                            e.target
                                                                .value,
                                                        );

                                                    onPctChangeAction?.(
                                                        node.id,
                                                        v,
                                                        pctCfg.direction,
                                                        computePctActual(
                                                            node.cost,
                                                            v,
                                                            pctCfg.direction,
                                                        ),
                                                    );
                                                }}
                                                className="w-10 bg-transparent pr-1.5 text-right text-[11.5px] font-medium tabular-nums text-[#1E2621] focus:outline-none"
                                                style={{
                                                    fontFamily:
                                                        "var(--font-mono)",
                                                }}
                                            />

                                            <span className="text-[10px] font-semibold text-[#8A938C]">
                                                %
                                            </span>
                                        </span>
                                    </span>
                                ) : (
                                    <span
                                        className="flex items-center gap-1.5"
                                        title={
                                            formatPct(
                                                displayPct,
                                            ) +
                                            "% vs predicted"
                                        }
                                    >
                                        <span
                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                                                displayDir ===
                                                "up"
                                                    ? "bg-[#3E6B52]/12 text-[#3E6B52]"
                                                    : "bg-[#B0453A]/12 text-[#B0453A]"
                                            }`}
                                        >
                                            {displayDir ===
                                            "up" ? (
                                                <TrendingUp
                                                    size={11}
                                                    strokeWidth={
                                                        2.5
                                                    }
                                                />
                                            ) : (
                                                <TrendingDown
                                                    size={11}
                                                    strokeWidth={
                                                        2.5
                                                    }
                                                />
                                            )}
                                        </span>

                                        <span
                                            className="text-[11.5px] font-semibold tabular-nums"
                                            style={{
                                                fontFamily:
                                                    "var(--font-mono)",
                                            }}
                                        >
                                            {formatPct(
                                                displayPct,
                                            )}
                                            %
                                        </span>
                                    </span>
                                )}
                            </span>
                        )}

                        {/* ---- Actual / Cost ---- */}
                        <span
                            className={`${COL_ACTUAL} ${divider} flex shrink-0 items-center py-2 pl-1.5 pr-1.5 sm:py-2.5 sm:pl-3 sm:pr-3`}
                            onClick={(e) =>
                                e.stopPropagation()
                            }
                        >
                            {hasChildren || isCert ? (
                                <span className="flex w-full min-w-0 flex-col items-end gap-1">
                                    <span
                                        className="w-full truncate text-right text-[12.5px] font-semibold tabular-nums text-[#2C4A3A] sm:text-[13px]"
                                        style={{
                                            fontFamily:
                                                "var(--font-mono)",
                                            letterSpacing:
                                                "0.01em",
                                        }}
                                        title={formatMoney(
                                            liveValue,
                                        )}
                                    >
                                        {formatMoney(
                                            liveValue,
                                        )}
                                    </span>

                                    {isCert &&
                                        !isAssessment && (
                                            <CertificationBadge
                                                label={
                                                    node.actualCertificationLabel ??
                                                    node.certificationLabel
                                                }
                                            />
                                        )}
                                </span>
                            ) : isPctLeaf ? (
                                <span
                                    className="w-full truncate text-right text-[12.5px] font-semibold tabular-nums text-[#1E2621] sm:text-[13px]"
                                    style={{
                                        fontFamily:
                                            "var(--font-mono)",
                                        letterSpacing:
                                            "0.01em",
                                    }}
                                    title={formatMoney(
                                        computedActual!,
                                    )}
                                >
                                    {formatMoney(
                                        computedActual!,
                                    )}
                                </span>
                            ) : readOnly ? (
                                <span
                                    className="w-full truncate text-right text-[12.5px] font-semibold tabular-nums text-[#1E2621] sm:text-[13px]"
                                    style={{
                                        fontFamily:
                                            "var(--font-mono)",
                                        letterSpacing:
                                            "0.01em",
                                    }}
                                    title={formatMoney(
                                        parseEdit(
                                            edits[node.id],
                                        ),
                                    )}
                                >
                                    {formatMoney(
                                        parseEdit(
                                            edits[node.id],
                                        ),
                                    )}
                                </span>
                            ) : (
                                <div className="relative w-full min-w-0">
                                    <span
                                        className="pointer-events-none absolute inset-y-0 left-1 flex items-center text-[9.5px] font-medium text-[#ADA695] sm:left-1.5 sm:text-[10.5px]"
                                        style={{
                                            fontFamily:
                                                "var(--font-mono)",
                                        }}
                                    >
                                        RM
                                    </span>

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={formatWithCommas(
                                            edits[node.id],
                                        )}
                                        onChange={(e) => {
                                            const input =
                                                e.currentTarget;

                                            onLeafChange(
                                                node.id,
                                                e.target.value,
                                            );

                                            const end =
                                                formatWithCommas(
                                                    e.target
                                                        .value,
                                                ).length;

                                            requestAnimationFrame(
                                                () => {
                                                    input?.setSelectionRange(
                                                        end,
                                                        end,
                                                    );
                                                },
                                            );
                                        }}
                                        onFocus={(e) => {
                                            const input =
                                                e.currentTarget;

                                            onLeafFocus(
                                                node.id,
                                            );

                                            const end =
                                                formatWithCommas(
                                                    e.target
                                                        .value,
                                                ).length;

                                            requestAnimationFrame(
                                                () => {
                                                    input?.setSelectionRange(
                                                        end,
                                                        end,
                                                    );
                                                },
                                            );
                                        }}
                                        onKeyDown={(e) => {
                                            if (
                                                e.metaKey ||
                                                e.ctrlKey ||
                                                e.altKey
                                            ) {
                                                return;
                                            }

                                            if (
                                                e.key ===
                                                    "ArrowLeft" ||
                                                e.key ===
                                                    "ArrowRight" ||
                                                e.key === "Home" ||
                                                e.key === "End"
                                            ) {
                                                e.preventDefault();

                                                const input =
                                                    e.currentTarget;

                                                const end =
                                                    formatWithCommas(
                                                        input.value,
                                                    ).length;

                                                requestAnimationFrame(
                                                    () => {
                                                        input?.setSelectionRange(
                                                            end,
                                                            end,
                                                        );
                                                    },
                                                );
                                            }
                                        }}
                                        onClick={(e) => {
                                            const input =
                                                e.currentTarget;

                                            const end =
                                                formatWithCommas(
                                                    input.value,
                                                ).length;

                                            requestAnimationFrame(
                                                () => {
                                                    input?.setSelectionRange(
                                                        end,
                                                        end,
                                                    );
                                                },
                                            );
                                        }}
                                        onBlur={() =>
                                            onLeafBlur(
                                                node.id,
                                            )
                                        }
                                        className="w-full min-w-0 rounded-lg border border-[#D6D1C3] bg-[#FCFBF8] py-2 pl-5 pr-1.5 text-right text-[12px] tabular-nums text-[#1E2621] shadow-[inset_0_1px_2px_rgba(30,38,33,0.05)] transition-colors hover:border-[#C4CBC4] focus:border-[#2C4A3A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2C4A3A]/15 sm:py-1.5 sm:pl-6 sm:pr-2 sm:text-[13px]"
                                        style={{
                                            fontFamily:
                                                "var(--font-mono)",
                                            letterSpacing:
                                                "0.01em",
                                        }}
                                    />
                                </div>
                            )}
                        </span>
                    </>
                )}

                {/* ---- Row actions ---- */}
                {(addMode ||
                    editable ||
                    deleteMode) &&
                    !isConfirmingDelete && (
                        <span
                            className={`${COL_ACTION} ${divider} flex shrink-0 items-center justify-center gap-0.5 sm:gap-1`}
                        >
                            {addMode &&
                            mode === "comparison" &&
                            !isCert &&
                            hasChildren ? (
                                <button
                                    type="button"
                                    title="Add child actual cost node"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSplitLeafAction?.(
                                            node.id,
                                        );
                                    }}
                                    className="flex h-9 w-9 items-center justify-center rounded-full text-sage transition-colors hover:bg-sage-100 hover:text-sage-dark focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sage sm:h-6 sm:w-6"
                                >
                                    <Plus
                                        size={13}
                                        strokeWidth={2.5}
                                    />
                                </button>
                            ) : addMode &&
                              !isCert &&
                              !hasChildren &&
                              depth < 2 ? (
                                <button
                                    type="button"
                                    title="Split this item"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSplitLeafAction?.(
                                            node.id,
                                        );
                                    }}
                                    className="flex h-9 w-9 items-center justify-center rounded-full text-sage transition-colors hover:bg-sage-100 hover:text-sage-dark focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sage sm:h-6 sm:w-6"
                                >
                                    <Plus
                                        size={13}
                                        strokeWidth={2.5}
                                    />
                                </button>
                            ) : editable ? (
                                <>
                                    <button
                                        type="button"
                                        title="Add child item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAddChildAction(
                                                node.id,
                                            );
                                        }}
                                        className="flex h-9 w-9 items-center justify-center rounded-full text-[#8A938C] opacity-100 transition-opacity hover:bg-[#EEF2EC] hover:text-[#2C4A3A] focus-visible:opacity-100 sm:h-6 sm:w-6 sm:opacity-0 sm:group-hover:opacity-100"
                                    >
                                        <Plus size={13} />
                                    </button>

                                    <button
                                        type="button"
                                        title="Delete"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRequestDelete(
                                                node.id,
                                            );
                                        }}
                                        className="flex h-9 w-9 items-center justify-center rounded-full text-[#8A938C] opacity-100 transition-opacity hover:bg-[#FBEDEB] hover:text-[#B0453A] focus-visible:opacity-100 sm:h-6 sm:w-6 sm:opacity-0 sm:group-hover:opacity-100"
                                    >
                                        <X size={13} />
                                    </button>
                                </>
                            ) : deleteMode &&
                              !isCert ? (
                                <button
                                    type="button"
                                    title="Delete this item"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteLeafAction?.(
                                            node.id,
                                        );
                                    }}
                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FBEDEB] text-[#B0453A] transition-colors hover:bg-[#E7C1BA] hover:text-[#8C3D33] sm:h-7 sm:w-7"
                                >
                                    <Trash2 size={14} />
                                </button>
                            ) : null}
                        </span>
                    )}
            </div>

            {hasChildren && isOpen && (
                <div>
                    {entries.map(
                        ([childKey, child], i) => (
                            <CostRow
                                key={child.id}
                                rowKey={`${rowKey}.${childKey}`}
                                node={child}
                                depth={depth + 1}
                                ancestorContinues={
                                    childAncestorContinues
                                }
                                isLastChild={
                                    i ===
                                    entries.length - 1
                                }
                                edits={edits}
                                expanded={expanded}
                                focusedId={focusedId}
                                mode={mode}
                                field={field}
                                editable={editable}
                                addMode={addMode}
                                deleteMode={deleteMode}
                                confirmingDeleteId={
                                    confirmingDeleteId
                                }
                                onToggle={onToggle}
                                onLeafChange={
                                    onLeafChange
                                }
                                onLeafFocus={
                                    onLeafFocus
                                }
                                onLeafBlur={
                                    onLeafBlur
                                }
                                onAddChildAction={
                                    onAddChildAction
                                }
                                onRequestDelete={
                                    onRequestDelete
                                }
                                onDeleteNodeAction={
                                    onDeleteNodeAction
                                }
                                onDescriptionChangeAction={
                                    onDescriptionChangeAction
                                }
                                onSplitLeafAction={
                                    onSplitLeafAction
                                }
                                onDeleteLeafAction={
                                    onDeleteLeafAction
                                }
                                isLast={
                                    i ===
                                    entries.length - 1
                                }
                                readOnly={readOnly}
                                pctOverrides={
                                    pctOverrides
                                }
                                onPctChangeAction={
                                    onPctChangeAction
                                }
                            />
                        ),
                    )}
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
    icon: React.ComponentType<{
        size?: number;
    }>;
    label: string;
    value: string;
    highlighted?: boolean;
    tone?: "over" | "under" | "neutral";
}) {
    const toneClasses =
        tone === "over"
            ? "border-[#D9A79E] bg-[#FBEDEB] text-[#8C3D33]"
            : tone === "under"
              ? "border-[#BFD6C8] bg-[#EEF2EC] text-[#2C4A3A]"
              : highlighted
                ? "border-[#BFD6C8] bg-[#EEF2EC] text-[#2C4A3A]"
                : "border-[#E4E1D8] bg-[#FDFDFC] text-[#1E2621]";

    const iconToneClasses =
        tone === "over"
            ? "bg-[#B0453A] text-white"
            : tone === "under"
              ? "bg-[#3E6B52] text-white"
              : highlighted
                ? "bg-[#3E6B52] text-white"
                : "bg-[#EFEDE6] text-[#7C8880]";

    return (
        <div
            className={`min-w-0 overflow-hidden rounded-2xl border-2 border-dashed p-3.5 transition-colors sm:p-4 ${toneClasses}`}
        >
            <div className="flex min-w-0 items-center gap-2">
                <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconToneClasses}`}
                >
                    <Icon size={13} />
                </span>

                <div
                    className="min-w-0 truncate text-[10.5px] uppercase tracking-widest opacity-70"
                    style={{
                        fontFamily:
                            "var(--font-mono)",
                    }}
                    title={label}
                >
                    {label}
                </div>
            </div>

            <div
                className="mt-2.5 min-w-0 truncate text-[20px] font-semibold tabular-nums sm:text-[23px]"
                style={{
                    fontFamily:
                        "var(--font-display)",
                }}
                title={value}
            >
                {value}
            </div>
        </div>
    );
}
