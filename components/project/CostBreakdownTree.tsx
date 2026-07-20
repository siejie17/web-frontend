"use client";

import { useMemo, useRef, useState } from "react";
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
    is_certification: number;
    children?: Record<string, CostNode>;
};

export type CostBreakdown = Record<string, CostNode>;

/**
 * "assessment" — a single editable cost column. Used when the tree itself IS the thing being
 *   authored (e.g. the initial assessment predicted-cost breakdown). Edits write to `cost`.
 * "comparison" — the original behavior: a static "Budgeted" column (`cost`) next to an editable
 *   "Actual" column (`actual_cost`). Used once a predicted breakdown already exists and the user
 *   is logging real spend against it.
 */
export type CostBreakdownMode = "assessment" | "comparison";

/** Which leaf field on CostNode the tree is currently reading/writing, derived from `mode`. */
type EditableField = "cost" | "actual_cost";

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

/** Walk the tree once to seed edit state (as strings, so partial typing like "18." isn't lost).
 *  Which field seeds the edits depends on the active mode's editable field. */
function collectInitialEdits(data: CostBreakdown, field: EditableField): Record<number, string> {
    const edits: Record<number, string> = {};
    const visit = (node: CostNode) => {
        if (node.children) {
            Object.values(node.children).forEach(visit);
        } else {
            const raw = field === "cost" ? node.cost : node.actual_cost;
            edits[node.id] = raw !== undefined && raw !== null ? String(raw) : "";
        }
    };
    Object.values(data).forEach(visit);
    return edits;
}

/** A parent's live value is always the sum of its children's edited leaf values — never stored directly. */
function computeFieldSum(node: CostNode, edits: Record<number, string>, field: EditableField): number {
    if (node.children) {
        return Object.values(node.children).reduce(
            (sum, child) => sum + computeFieldSum(child, edits, field),
            0
        );
    }
    return parseEdit(edits[node.id]);
}

/** Total number of leaf line items under (and including, if it's a leaf itself) this node —
 *  used to word the delete-confirm prompt ("delete this and 3 items?"). */
function countLeaves(node: CostNode): number {
    if (!node.children) return 1;
    return Object.values(node.children).reduce((sum, child) => sum + countLeaves(child), 0);
}

function sumTop(
    data: CostBreakdown,
    key: "budgeted" | "live",
    edits: Record<number, string>,
    field: EditableField
) {
    return Object.values(data).reduce(
        (sum, node) => sum + (key === "budgeted" ? node.cost : computeFieldSum(node, edits, field)),
        0
    );
}

/* Fixed column widths shared by the header and every row so figures never drift out of line.
   Predicted/Budgeted collapses away entirely below sm — see the row's mobile caption instead. */
export const COL_BUDGET = "w-24 sm:w-28 md:w-32";
export const COL_ACTUAL = "w-28 sm:w-36 md:w-40";

/* Width of one connector-rail cell — also doubles as the per-depth indent step. */
const RAIL_W = 18;

/* Each nesting level gets its own badge hue so depth reads at a glance without heavy row tinting;
   the row surface itself stays quiet (paper/white) so the tree lines carry the structure. */
export const LEVEL_STYLES = [
    {
        border: "border-transparent",
        bg: "bg-white",
        hoverBg: "hover:bg-[#FBFAF7]",
        badgeBg: "bg-[#2C4A3A]",
        badgeText: "text-white",
        amount: "text-[#2C4A3A]",
    }, // level 0 — deep forest
    {
        border: "border-transparent",
        bg: "bg-white",
        hoverBg: "hover:bg-[#FBFAF7]",
        badgeBg: "bg-[#4E7290]",
        badgeText: "text-white",
        amount: "text-[#3B5A73]",
    }, // level 1 — slate blue
    {
        border: "border-transparent",
        bg: "bg-white",
        hoverBg: "hover:bg-[#FBFAF7]",
        badgeBg: "bg-[#8F7757]",
        badgeText: "text-white",
        amount: "text-[#71603F]",
    }, // level 2+ — warm taupe
];

/* Certification rows are the one row type that earns a full accent treatment — the tree's
   single spent "signature" moment, everything else stays disciplined. */
export const CERT_STYLE = {
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
    onActualCostChange,
    hideTotals = false,
    mode = "comparison",
    editable = false,
    onAddChild,
    onDeleteNode,
    onDescriptionChange,
    addMode = false,
    onSplitLeaf,
    deleteMode = false,
    onDeleteLeaf,
    onAddRootCategory,
}: {
    data: CostBreakdown;
    /** Optional: fires on every leaf edit (with a clean, parsed number), e.g. to persist to the server.
     *  Fires for whichever field is active in the current mode (`cost` in assessment, `actual_cost` in comparison). */
    onActualCostChange?: (nodeId: number, value: number) => void;
    /** Set true when a parent screen renders its own summary cards (e.g. CostBreakdownHierarchy). */
    hideTotals?: boolean;
    /** "assessment" = single editable cost column. "comparison" (default) = Budgeted + editable Actual. */
    mode?: CostBreakdownMode;
    /** When true, every row exposes hover affordances to add a child item, rename itself, or be
     *  deleted, and a "add top-level cost code" control appears under the tree. Structural editing
     *  only makes sense while a breakdown is still being authored, so this is normally tied to
     *  `mode === "assessment"`. */
    editable?: boolean;
    /** Requests a new child be added under `parentId` (or as a new top-level item when `parentId` is null). */
    onAddChild?: (parentId: number | null) => void;
    /** Requests the node with this id (and everything under it) be removed. Confirmation happens in this component. */
    onDeleteNode?: (nodeId: number) => void;
    /** Fires as the user types a node's name. */
    onDescriptionChange?: (nodeId: number, value: string) => void;
    /** When true, eligible leaf nodes show a "+" icon for splitting, and an
     *  "Add Other Category" button appears below the tree. */
    addMode?: boolean;
    deleteMode?: boolean;
    /** Called when the user clicks "+" on a leaf node that can be split. */
    onSplitLeaf?: (nodeId: number) => void;
    /** Called when the user clicks the trash icon on a row while in delete mode. */
    onDeleteLeaf?: (nodeId: number) => void;
    /** Called when the user clicks "Add Other Category" at the bottom of the tree. */
    onAddRootCategory?: () => void;
}) {
    const field: EditableField = mode === "assessment" ? "cost" : "actual_cost";

    const [edits, setEdits] = useState<Record<number, string>>(() => collectInitialEdits(data, field));
    const prevDataRef = useRef(data);
    // Re-initialise edits when data changes structurally (e.g. new nodes from split/add)
    if (data !== prevDataRef.current) {
        prevDataRef.current = data;
        setEdits(collectInitialEdits(data, field));
    }
    const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
    const [focusedId, setFocusedId] = useState<number | null>(null);
    // Row currently showing the inline "delete this?" confirm bar in place of its normal actions.
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);

    const totalBudgeted = useMemo(() => sumTop(data, "budgeted", edits, field), [data, edits, field]);
    const totalLive = useMemo(() => sumTop(data, "live", edits, field), [data, edits, field]);
    const variance = totalLive - totalBudgeted;
    const isOverBudget = variance > 0;

    const allTopIds = useMemo(() => Object.values(data).map((n) => n.id), [data]);
    const allExpanded = allTopIds.length > 0 && allTopIds.every((id) => expanded.has(id));

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

    // Adding a node instantly expands its new (would-be) parent so the freshly created row is visible,
    // and clears any lingering delete-confirm state so the two flows never fight for the same row.
    const handleAddChild = (parentId: number | null) => {
        if (parentId !== null) setExpanded((prev) => new Set(prev).add(parentId));
        setConfirmingDeleteId(null);
        onAddChild?.(parentId);
    };

    const isAssessment = mode === "assessment";
    const topEntries = Object.entries(data);

    return (
        <div>
            {/* ---------------- Toolbar ---------------- */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-1">
                <span
                    className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#9A9186]"
                    style={{ fontFamily: "var(--font-mono)" }}
                >
                    Cost Ledger
                </span>

                <button
                    type="button"
                    onClick={toggleAll}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#E4E1D8] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5B655F] transition-colors hover:border-[#BFD6C8] hover:text-[#2C4A3A] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#2C4A3A]"
                >
                    {allExpanded ? <ChevronsDownUp size={13} /> : <ChevronsUpDown size={13} />}
                    {allExpanded ? "Collapse all" : "Expand all"}
                </button>
            </div>

            {/* ---------------- Totals ---------------- */}
            {!hideTotals && (
                <div className={`mb-5 grid grid-cols-1 gap-3 ${isAssessment ? "sm:grid-cols-1" : "sm:grid-cols-3"}`}>
                    {isAssessment ? (
                        <TotalCard icon={CircleDollarSign} label="Total predicted cost" value={formatMoney(totalLive)} highlighted />
                    ) : (
                        <>
                            <TotalCard icon={Wallet} label="Total budgeted cost" value={formatMoney(totalBudgeted)} />
                            <TotalCard
                                icon={CircleDollarSign}
                                label="Total actual cost"
                                value={formatMoney(totalLive)}
                                highlighted
                            />
                            <TotalCard
                                icon={variance === 0 ? Minus : isOverBudget ? TrendingUp : TrendingDown}
                                label={isOverBudget ? "Over budget by" : "Under budget by"}
                                value={formatMoney(Math.abs(variance))}
                                tone={variance === 0 ? "neutral" : isOverBudget ? "over" : "under"}
                            />
                        </>
                    )}
                </div>
            )}

            {/* ---------------- Tree ---------------- */}
            <div className="overflow-hidden rounded-2xl border border-[#E4E1D8] bg-white shadow-[0_1px_2px_rgba(30,38,33,0.03)]">
                <div className="flex items-stretch">
                    {/* Ledger-binder margin — a quiet signature touch, hidden on the smallest screens
                        where every pixel of width matters more than the flourish. */}
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
                        {/* Table header — sits inside the same bordered box as the rows, sharing its corners */}
                        <div className="flex items-center border-b border-[#EFEDE6] bg-[#FBFAF7]">
                            <span
                                className="flex flex-1 items-center justify-center py-2.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#8A938C]"
                                style={{ fontFamily: "var(--font-mono)" }}
                            >
                                Element
                            </span>

                            {!isAssessment && (
                                <span
                                    className={`${COL_BUDGET} hidden shrink-0 items-center justify-center border-l border-[#EFEDE6] py-2.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#8A938C] sm:flex`}
                                    style={{ fontFamily: "var(--font-mono)" }}
                                >
                                    Predicted
                                </span>
                            )}

                            <span
                                className={`${COL_ACTUAL} flex shrink-0 items-center justify-center border-l border-[#EFEDE6] py-2.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#8A938C]`}
                                style={{ fontFamily: "var(--font-mono)" }}
                            >
                                {isAssessment ? "Cost" : "Actual"}
                            </span>

                            {(editable || addMode || deleteMode) && (
                                <span
                                    className="flex w-[70px] shrink-0 items-center justify-center border-l border-[#EFEDE6] py-2.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#8A938C]"
                                    style={{ fontFamily: "var(--font-mono)" }}
                                >
                                    Action
                                </span>
                            )}
                        </div>

                        {topEntries.map(([key, node], i) => (
                            <CostRow
                                key={node.id}
                                rowKey={key}
                                node={node}
                                depth={0}
                                ancestorContinues={[]}
                                isLastChild={i === topEntries.length - 1}
                                edits={edits}
                                expanded={expanded}
                                focusedId={focusedId}
                                mode={mode}
                                field={field}
                                editable={editable}
                                addMode={addMode}
                                deleteMode={deleteMode}
                                confirmingDeleteId={confirmingDeleteId}
                                onToggle={toggleNode}
                                onLeafChange={handleLeafChange}
                                onLeafFocus={handleLeafFocus}
                                onLeafBlur={handleLeafBlur}
                                onAddChild={handleAddChild}
                                onRequestDelete={setConfirmingDeleteId}
                                onDeleteNode={onDeleteNode}
                                onDescriptionChange={onDescriptionChange}
                                onSplitLeaf={onSplitLeaf}
                                onDeleteLeaf={onDeleteLeaf}
                                isLast={i === topEntries.length - 1}
                            />
                        ))}

                        {addMode ? (
                            <button
                                type="button"
                                onClick={onAddRootCategory}
                                className="flex w-full items-center justify-center gap-1.5 border-t border-dashed border-[#E4E1D8] bg-[#FBFAF7] py-3 text-[12.5px] font-medium text-[#5B655F] transition-colors hover:bg-[#EEF2EC] hover:text-[#2C4A3A] focus-visible:outline focus-visible:outline-offset-[-2px] focus-visible:outline-[#2C4A3A]"
                            >
                                <Plus size={13} />
                                Add Other Category
                            </button>
                        ) : editable ? (
                            <button
                                type="button"
                                onClick={() => handleAddChild(null)}
                                className="flex w-full items-center justify-center gap-1.5 border-t border-dashed border-[#E4E1D8] bg-[#FBFAF7] py-3 text-[12.5px] font-medium text-[#5B655F] transition-colors hover:bg-[#EEF2EC] hover:text-[#2C4A3A] focus-visible:outline focus-visible:outline-offset-[-2px] focus-visible:outline-[#2C4A3A]"
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
    onAddChild,
    onRequestDelete,
    onDeleteNode,
    onDescriptionChange,
    onSplitLeaf,
    onDeleteLeaf,
    isLast,
}: {
    rowKey: string;
    node: CostNode;
    depth: number;
    /** For each ancestor level above this row, whether that ancestor had further siblings after it
     *  (i.e. whether the rail's vertical guide should keep running through this row). */
    ancestorContinues: boolean[];
    /** Whether this row is the last child among its own siblings — shapes its own elbow. */
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
    onAddChild: (parentId: number | null) => void;
    onRequestDelete: (id: number | null) => void;
    onDeleteNode?: (nodeId: number) => void;
    onDescriptionChange?: (nodeId: number, value: string) => void;
    onSplitLeaf?: (nodeId: number) => void;
    onDeleteLeaf?: (nodeId: number) => void;
    isLast: boolean;
}) {
    const hasChildren = !!node.children;
    const isOpen = expanded.has(node.id);
    const liveValue = computeFieldSum(node, edits, field);
    const entries = node.children ? Object.entries(node.children) : [];
    const isConfirmingDelete = confirmingDeleteId === node.id;

    const isCert = node.is_certification === 1;
    const style = isCert ? CERT_STYLE : hasChildren ? LEVEL_STYLES[depth % LEVEL_STYLES.length] : null;

    const isAssessment = mode === "assessment";
    const divider = "border-l border-[#EFEDE6]";
    const childAncestorContinues = [...ancestorContinues, !isLastChild];

    return (
        <div className={!isLast || isOpen ? "border-b border-[#EFEDE6]" : ""}>
            <div
                role={hasChildren ? "button" : undefined}
                tabIndex={hasChildren ? 0 : undefined}
                onClick={() => hasChildren && onToggle(node.id)}
                onKeyDown={(e) => {
                    if (hasChildren && (e.key === "Enter" || e.key === " ")) onToggle(node.id);
                }}
                className={`group flex items-stretch border-l-[3px] transition-colors ${
                    hasChildren ? "cursor-pointer focus-visible:outline focus-visible:outline-offset-[-2px] focus-visible:outline-[#2C4A3A]" : ""
                } ${style ? `${style.border} ${style.bg} ${style.hoverBg}` : "border-transparent bg-white hover:bg-[#FBFAF7]"}`}
            >
                {/* ---- Connector rail ---- */}
                {depth > 0 && (
                    <div className="flex shrink-0 items-stretch" aria-hidden>
                        {ancestorContinues.map((cont, i) => (
                            <span key={i} className="relative shrink-0" style={{ width: RAIL_W * 1.8 }}>
                                {cont && (
                                    <span
                                        className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2"
                                        // style={{ backgroundColor: RAIL_LINE }}
                                    />
                                )}
                            </span>
                        ))}
                        <span className="relative shrink-0" style={{ width: RAIL_W * 0.5 }}>
                            <span
                                className="absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2"
                                style={{ backgroundColor: RAIL_LINE }}
                            />
                            {!isLastChild && (
                                <span
                                    className="absolute left-1/2 top-1/2 h-1/2 w-px -translate-x-1/2"
                                    style={{ backgroundColor: RAIL_LINE }}
                                />
                            )}
                            <span
                                className="absolute left-1/2 top-1/2 h-px -translate-y-1/2"
                                style={{ width: RAIL_W / 2, backgroundColor: RAIL_LINE }}
                            />
                        </span>
                    </div>
                )}

                {/* ---- Element column ---- */}
                <div className={`flex min-w-0 flex-1 items-center gap-2.5 py-3 pr-3 ${depth === 0 ? "pl-3" : "pl-0"}`}>
                    <span className="flex w-4 shrink-0 items-center justify-center text-[#8A938C]">
                        {hasChildren && (
                            <ChevronRight
                                size={14}
                                strokeWidth={2.25}
                                className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                            />
                        )}
                    </span>

                    <span
                        className={`flex h-6 min-w-10 shrink-0 items-center justify-center rounded-full px-2 text-[10px] font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] ${
                            style ? `${style.badgeBg} ${style.badgeText}` : "bg-[#F1EFE7] text-[#8A8074]"
                        }`}
                        style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.01em" }}
                    >
                        {rowKey}
                    </span>

                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {editable ? (
                                <input
                                    type="text"
                                    value={node.description}
                                    placeholder="Untitled cost item"
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => onDescriptionChange?.(node.id, e.target.value)}
                                    className={`min-w-[110px] flex-1 truncate rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-[13.5px] tracking-[0.005em] text-[#1E2621] transition-colors hover:border-[#E4E1D8] focus:border-[#2C4A3A] focus:bg-white focus:outline-none ${
                                        hasChildren ? "font-semibold" : "font-medium"
                                    }`}
                                />
                            ) : (
                                <span
                                    className={`min-w-0 truncate text-[13.5px] tracking-[0.005em] text-[#1E2621] ${
                                        hasChildren ? "font-semibold" : "font-medium"
                                    }`}
                                >
                                    {node.description}
                                </span>
                            )}

                            {isCert && (
                                <span className="flex shrink-0 items-center gap-1 rounded-full border border-[#D9B968] bg-white/70 px-2 py-0.5 text-[10px] font-medium text-[#8A6420] shadow-[0_1px_1px_rgba(138,100,32,0.08)]">
                                    <Award size={10.5} />
                                    Certification
                                </span>
                            )}
                        </div>

                        {/* Mobile-only: Predicted collapses out of its own column below sm, so it
                            rides along as a caption instead of disappearing entirely. */}
                        {!isAssessment && (
                            <span
                                className="mt-0.5 truncate text-[10.5px] font-medium text-[#9A9186] sm:hidden"
                                style={{ fontFamily: "var(--font-mono)" }}
                            >
                                Predicted {formatMoney(node.cost)}
                            </span>
                        )}
                    </div>
                </div>

                {isConfirmingDelete ? (
                    /* Inline delete confirm — spans the remaining columns, replacing amounts + actions. */
                    <span
                        className={`flex shrink-0 items-center gap-2 ${divider} bg-[#FDFBF9] px-3 sm:px-4`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span className="hidden text-[12px] font-medium text-[#8C3D33] sm:inline">
                            Delete{hasChildren ? ` this + ${countLeaves(node)} items` : ""}?
                        </span>
                        <span className="text-[12px] font-medium text-[#8C3D33] sm:hidden">Delete?</span>
                        <button
                            type="button"
                            title="Confirm delete"
                            onClick={() => {
                                onDeleteNode?.(node.id);
                                onRequestDelete(null);
                            }}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#B0453A] text-white shadow-sm transition-colors hover:bg-[#963B31]"
                        >
                            <Check size={13} />
                        </button>
                        <button
                            type="button"
                            title="Cancel"
                            onClick={() => onRequestDelete(null)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#E4E1D8] bg-white text-[#5B655F] transition-colors hover:border-[#C9D3CC]"
                        >
                            <X size={13} />
                        </button>
                    </span>
                ) : (
                    <>
                        {/* ---- Predicted / Budgeted column ---- */}
                        {!isAssessment && (
                            <span
                                className={`${COL_BUDGET} ${divider} hidden shrink-0 items-center justify-end py-3 pr-3 text-[13px] tabular-nums sm:flex ${
                                    style ? `font-semibold ${style.amount}` : "text-[#7C8880]"
                                }`}
                                style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.01em" }}
                            >
                                {formatMoney(node.cost)}
                            </span>
                        )}

                        {/* ---- Cost / Actual column ---- */}
                        <span
                            className={`${COL_ACTUAL} ${divider} flex shrink-0 items-center py-2.5 pl-2 pr-2.5 sm:pl-3 sm:pr-3`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {hasChildren ? (
                                <span
                                    className="w-full text-right text-[13px] font-semibold tabular-nums text-[#2C4A3A]"
                                    style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.01em" }}
                                    title="Sum of child items — not directly editable"
                                >
                                    {formatMoney(liveValue)}
                                </span>
                            ) : (
                                <div className="relative w-full">
                                    <span
                                        className="pointer-events-none absolute inset-y-0 left-1.5 flex items-center text-[10.5px] font-medium text-[#ADA695]"
                                        style={{ fontFamily: "var(--font-mono)" }}
                                    >
                                        RM
                                    </span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={formatWithCommas(edits[node.id])}
                                        onChange={(e) => onLeafChange(node.id, e.target.value)}
                                        onFocus={() => onLeafFocus(node.id)}
                                        onBlur={() => onLeafBlur(node.id)}
                                        className="w-full rounded-lg border border-[#D6D1C3] bg-[#FCFBF8] py-1.5 pl-6 pr-2 text-right text-[13px] tabular-nums text-[#1E2621] shadow-[inset_0_1px_2px_rgba(30,38,33,0.05)] transition-colors hover:border-[#C4CBC4] focus:border-[#2C4A3A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2C4A3A]/15"
                                        style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.01em" }}
                                    />
                                </div>
                            )}
                        </span>
                    </>
                )}

                {/* ---- Row actions ---- */}
                {(addMode || editable || deleteMode) && !isConfirmingDelete && (
                    <span className={`flex w-[70px] shrink-0 items-center justify-center gap-1 ${divider}`}>
                        {addMode && !hasChildren && depth < 2 ? (
                            <button
                                type="button"
                                title="Split this item"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSplitLeaf?.(node.id);
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-full text-sage transition-colors hover:bg-sage-100 hover:text-sage-dark focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sage"
                            >
                                <Plus size={13} strokeWidth={2.5} />
                            </button>
                        ) : editable ? (
                            <>
                                <button
                                    type="button"
                                    title="Add child item"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddChild(node.id);
                                    }}
                                    className="flex h-6 w-6 items-center justify-center rounded-full text-[#8A938C] opacity-0 transition-opacity hover:bg-[#EEF2EC] hover:text-[#2C4A3A] focus-visible:opacity-100 group-hover:opacity-100"
                                >
                                    <Plus size={13} />
                                </button>
                                <button
                                    type="button"
                                    title="Delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRequestDelete(node.id);
                                    }}
                                    className="flex h-6 w-6 items-center justify-center rounded-full text-[#8A938C] opacity-0 transition-opacity hover:bg-[#FBEDEB] hover:text-[#B0453A] focus-visible:opacity-100 group-hover:opacity-100"
                                >
                                    <X size={13} />
                                </button>
                            </>
                        ) : deleteMode && !isCert ? (
                            <button
                                type="button"
                                title="Delete this item"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteLeaf?.(node.id);
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FBEDEB] text-[#B0453A] transition-colors hover:bg-[#E7C1BA] hover:text-[#8C3D33]"
                            >
                                <Trash2 size={14} />
                            </button>
                        ) : null}
                    </span>
                )}
            </div>

            {hasChildren && isOpen && (
                <div>
                    {entries.map(([childKey, child], i) => (
                        <CostRow
                            key={child.id}
                            rowKey={`${rowKey}.${childKey}`}
                            node={child}
                            depth={depth + 1}
                            ancestorContinues={childAncestorContinues}
                            isLastChild={i === entries.length - 1}
                            edits={edits}
                            expanded={expanded}
                            focusedId={focusedId}
                            mode={mode}
                            field={field}
                            editable={editable}
                            addMode={addMode}
                            deleteMode={deleteMode}
                            confirmingDeleteId={confirmingDeleteId}
                            onToggle={onToggle}
                            onLeafChange={onLeafChange}
                            onLeafFocus={onLeafFocus}
                            onLeafBlur={onLeafBlur}
                            onAddChild={onAddChild}
                            onRequestDelete={onRequestDelete}
                            onDeleteNode={onDeleteNode}
                            onDescriptionChange={onDescriptionChange}
                            onSplitLeaf={onSplitLeaf}
                            onDeleteLeaf={onDeleteLeaf}
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
        <div className={`rounded-2xl border-2 border-dashed p-4 transition-colors ${toneClasses}`}>
            <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconToneClasses}`}>
                    <Icon size={13} />
                </span>
                <div
                    className="min-w-0 truncate text-[10.5px] uppercase tracking-[0.1em] opacity-70"
                    style={{ fontFamily: "var(--font-mono)" }}
                >
                    {label}
                </div>
            </div>
            <div
                className="mt-2.5 truncate text-[21px] font-semibold tabular-nums sm:text-[23px]"
                style={{ fontFamily: "var(--font-display)" }}
                title={value}
            >
                {value}
            </div>
        </div>
    );
}
