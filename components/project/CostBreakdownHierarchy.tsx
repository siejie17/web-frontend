"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Wallet, TrendingUp, ShieldCheck, CheckCircle2, RotateCcw, CircleDollarSign, Trash2 } from "lucide-react";

import CostBreakdownTree, {
    type CostBreakdown,
    type CostNode,
    type CostBreakdownMode,
    formatMoney,
} from "./CostBreakdownTree";

/* ---------------- Shared tone tokens ---------------- */
/** Single source of truth for good/bad/neutral colors, reused throughout the statement,
 *  the gauge bar, the budget stamp, the toast, and the submit button. */
const TONE = {
    good: {
        text: "#2C4A3A",
        bg: "#EEF2EC",
        border: "#CFE0D6",
        solid: "#3E6B52",
        solidHover: "#325A44",
    },
    bad: {
        text: "#8C3D33",
        bg: "#FBEDEB",
        border: "#E7C1BA",
        solid: "#B0453A",
        solidHover: "#963B31",
    },
    neutral: {
        text: "#1E2621",
        bg: "#FDFDFC",
        border: "#D8D4C8",
        solid: "#8A938C",
        solidHover: "#78807A",
    },
} as const;

type Tone = keyof typeof TONE;

/** Which leaf field this hierarchy screen reads/writes, derived from `mode`. Mirrors the
 *  field CostBreakdownTree itself edits, so the two stay in lockstep. */
function fieldForMode(mode: CostBreakdownMode): "cost" | "actual_cost" {
    return mode === "assessment" ? "cost" : "actual_cost";
}

/* ---------------- Baseline helpers ---------------- */

/** Map every leaf id -> its current value for the active mode's field (falls back to `cost`
 *  when reading actual_cost that hasn't been set yet). */
function buildBaselineMap(data: CostBreakdown | null | undefined, mode: CostBreakdownMode): Record<number, number> {
    const map: Record<number, number> = {};
    if (!data) return map;
    const visit = (node: CostNode) => {
        if (node.children) {
            Object.values(node.children).forEach(visit);
        } else {
            map[node.id] = mode === "assessment" ? node.cost ?? 0 : node.actual_cost ?? node.cost ?? 0;
        }
    };
    Object.values(data).forEach(visit);
    return map;
}

/** Deep-clone the tree, patching in any values that were already saved this session (savedOverrides)
 *  onto the field the active mode edits. */
function applyOverrides(
    data: CostBreakdown | null | undefined,
    overrides: Record<number, number>,
    mode: CostBreakdownMode
): CostBreakdown {
    if (!data) return {};
    const field = fieldForMode(mode);
    const visit = (node: CostNode): CostNode => {
        if (node.children) {
            const children: Record<string, CostNode> = {};
            for (const [key, child] of Object.entries(node.children)) {
                children[key] = visit(child);
            }
            return { ...node, children };
        }
        return overrides[node.id] !== undefined ? { ...node, [field]: overrides[node.id] } : node;
    };
    const next: CostBreakdown = {};
    for (const [key, node] of Object.entries(data)) {
        next[key] = visit(node);
    }
    return next;
}

function sumBudgeted(data: CostBreakdown | null | undefined): number {
    if (!data) return 0;
    return Object.values(data).reduce((sum, node) => sum + node.cost, 0);
}

/* ---------------- Tree mutation helpers ---------------- */

function findMaxId(tree: CostBreakdown): number {
    let max = 0;
    const walk = (nodes: Record<string, CostNode>) => {
        for (const node of Object.values(nodes)) {
            if (node.id > max) max = node.id;
            if (node.children) walk(node.children);
        }
    };
    walk(tree);
    return max;
}

function nextTopKey(tree: CostBreakdown): string {
    const existing = new Set(Object.keys(tree));
    for (let i = 0; i < 26; i++) {
        const key = String.fromCharCode(65 + i);
        if (!existing.has(key)) return key;
    }
    for (let i = 0; i < 26; i++) {
        for (let j = 0; j < 26; j++) {
            const key = String.fromCharCode(65 + i) + String.fromCharCode(65 + j);
            if (!existing.has(key)) return key;
        }
    }
    return "ZZ";
}

function getExistingCategoryNames(tree: CostBreakdown): Set<string> {
    const names = new Set<string>();
    for (const node of Object.values(tree)) {
        names.add(node.description.toLowerCase());
    }
    return names;
}

function collectDescendantIds(node: CostNode): number[] {
    const ids: number[] = [];
    const walk = (n: CostNode) => {
        ids.push(n.id);
        if (n.children) Object.values(n.children).forEach(walk);
    };
    walk(node);
    return ids;
}

/** Remove a node by id from a Record of siblings and renumber subsequent sibling keys.
 *  Returns the ids of all removed nodes (the node itself + its descendants). */
function removeNodeFromSiblings(
    siblings: Record<string, CostNode>,
    targetId: number
): { deletedIds: number[] } | null {
    let deletedKey = "";
    let deletedNode: CostNode | null = null;
    for (const [key, node] of Object.entries(siblings)) {
        if (node.id === targetId) {
            deletedKey = key;
            deletedNode = node;
            break;
        }
    }
    if (!deletedNode) return null;

    const deletedIds = collectDescendantIds(deletedNode);
    const sortedKeys = Object.keys(siblings).sort((a, b) => {
        const an = parseInt(a, 10);
        const bn = parseInt(b, 10);
        if (!isNaN(an) && !isNaN(bn)) return an - bn;
        if (a.length !== b.length) return a.length - b.length;
        return a.localeCompare(b);
    });

    const result: Record<string, CostNode> = {};
    let pastDeleted = false;
    for (const key of sortedKeys) {
        if (key === deletedKey) { pastDeleted = true; continue; }
        if (pastDeleted) {
            const numVal = parseInt(key, 10);
            if (!isNaN(numVal)) {
                result[String(numVal - 1)] = siblings[key];
            } else if (key.length === 1 && key >= "A" && key <= "Z") {
                result[String.fromCharCode(key.charCodeAt(0) - 1)] = siblings[key];
            } else {
                result[key] = siblings[key];
            }
        } else {
            result[key] = siblings[key];
        }
    }

    // Mutate the original Record in place
    for (const key of Object.keys(siblings)) delete siblings[key];
    for (const [key, node] of Object.entries(result)) siblings[key] = node;

    return { deletedIds };
}

function mutateNode(
    nodes: Record<string, CostNode>,
    nodeId: number,
    mutator: (node: CostNode) => void
): boolean {
    for (const node of Object.values(nodes)) {
        if (node.id === nodeId) {
            mutator(node);
            return true;
        }
        if (node.children && mutateNode(node.children, nodeId, mutator)) return true;
    }
    return false;
}

function sumLeaves(tree: CostBreakdown, overrides?: Record<number, number>): number {
    let total = 0;
    const walk = (nodes: Record<string, CostNode>) => {
        for (const node of Object.values(nodes)) {
            if (node.children) {
                walk(node.children);
            } else {
                total += overrides?.[node.id] ?? node.cost;
            }
        }
    };
    walk(tree);
    return total;
}

/* ---------------- Component ---------------- */

export type SubmitResult = { success: boolean; message: string };

export default function CostBreakdownHierarchy({
    value,
    onChange,
    projectId,
    predictedCost,
    projectBudget,
    onSubmit,
    onChangedNodesUpdate,
    mode = "comparison",
}: {
    /** The "as loaded" tree — source of truth for diffing. Only its leaf values for the active
     *  mode's field are compared. */
    value: CostBreakdown | null | undefined;
    /** Fires with the live tree (baseline + saved + any unsaved edits) any time something changes — same contract as CostBreakdownEditor. */
    onChange?: (next: CostBreakdown) => void;
    /** Needed only for the built-in default submit call — omit if you pass `onSubmit` yourself. */
    projectId?: string | number;
    /** Optional reference figure (e.g. an assessment-predicted cost) shown alongside the live actual total.
     *  Only used in "comparison" mode. */
    predictedCost?: number;
    /** Optional budget ceiling for the indicator card. Only used in "comparison" mode. */
    projectBudget?: number | null;
    /** Called with only the leaf nodes that changed this session: { [nodeId]: newValue }. */
    onSubmit?: (changedNodes: Record<number, number>) => Promise<SubmitResult>;
    /** Fires on every edit so a parent can mirror dirty state (e.g. disable navigation, show an "unsaved" badge). */
    onChangedNodesUpdate?: (changedNodes: Record<number, number>, hasChanges: boolean) => void;
    /**
     * "assessment" — single editable cost column, for authoring the initial predicted cost
     *   breakdown from scratch. No predicted/actual/budget statement card; edits write to `cost`.
     * "comparison" (default) — the original screen: predicted vs actual vs budget, with only the
     *   innermost `actual_cost` leaves editable. Used once a predicted breakdown already exists
     *   and the user is entering real implementation spend against it.
     */
    mode?: CostBreakdownMode;
}) {
    const isAssessment = mode === "assessment";

    const [addMode, setAddMode] = useState(false);
    const [deleteMode, setDeleteMode] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [deletingNodeId, setDeletingNodeId] = useState<number | null>(null);
    const [localTree, setLocalTree] = useState<CostBreakdown | null>(null);
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splittingNodeId, setSplittingNodeId] = useState<number | null>(null);

    // Leaf id -> baseline value for the active mode's field, as loaded from the server.
    const baselineMap = useMemo(() => buildBaselineMap(value, mode), [value, mode]);
    // Leaf id -> value from a change that was already submitted successfully this session.
    const [savedOverrides, setSavedOverrides] = useState<Record<number, number>>({});
    // Leaf id -> value the user has typed but not yet submitted.
    const [changedNodes, setChangedNodes] = useState<Record<number, number>>({});
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
    // Bumped to force CostBreakdownTree to remount and re-derive its inputs (used by "Reset changes").
    const [treeKey, setTreeKey] = useState(0);

    // Can we actually submit anywhere? Without either of these, submission is intentionally disabled
    // rather than throwing — useful while this view is wired up with a stubbed onChange for now.
    const canSubmit = !!onSubmit || projectId !== undefined;

    // If the parent hands us a genuinely different tree (new project loaded) or the mode flips,
    // drop local session state so stale edits from one field/mode never leak into the other.
    useEffect(() => {
        setSavedOverrides({});
        setChangedNodes({});
        setLocalTree(null);
        setTreeKey((k) => k + 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, mode]);

    const effectiveBaseline = useMemo(
        () => ({ ...baselineMap, ...savedOverrides }),
        [baselineMap, savedOverrides]
    );

    // What the tree should actually render — baseline patched with anything already saved this session.
    const treeData = useMemo(
        () => applyOverrides(value, savedOverrides, mode),
        [value, savedOverrides, mode]
    );

    const hasChanges = Object.keys(changedNodes).length > 0;

    useEffect(() => {
        onChangedNodesUpdate?.(changedNodes, hasChanges);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [changedNodes, hasChanges]);

    // Keep the parent's controlled value in sync with the live tree (baseline + saved + unsaved edits),
    // same contract CostBreakdownEditor uses.
    useEffect(() => {
        onChange?.(applyOverrides(value, { ...effectiveBaseline, ...changedNodes }, mode));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveBaseline, changedNodes, mode]);

    const totalBudgeted = useMemo(() => sumBudgeted(value), [value]);

    // Live total for the active field = baseline/saved values, overlaid with whatever's currently unsaved-edited.
    // In assessment mode this is simply "total predicted cost entered so far"; in comparison mode it's "total actual".
    const totalLive = useMemo(() => {
        if (localTree) {
            return sumLeaves(localTree, changedNodes);
        }
        return Object.entries(effectiveBaseline).reduce(
            (sum, [id, base]) => sum + (changedNodes[Number(id)] ?? base),
            0
        );
    }, [localTree, effectiveBaseline, changedNodes]);

    const hasBudget = projectBudget !== null && projectBudget !== undefined;
    const budgetComparison = isAssessment ? totalLive : totalBudgeted;
    const isOverBudget = hasBudget && (projectBudget as number) > 0 && budgetComparison > (projectBudget as number);
    const comparisonBase = predictedCost ?? totalBudgeted;
    const isActualOverPredicted = totalLive > comparisonBase;

    // Delta between actual and the comparison base, surfaced as text so the headline number's
    // color isn't the only signal the user has to interpret. Only meaningful in comparison mode.
    const delta = totalLive - comparisonBase;
    const deltaLabel =
        delta === 0
            ? "On target"
            : `${delta > 0 ? "+" : "\u2212"}${formatMoney(Math.abs(delta))} ${delta > 0 ? "over" : "under"} predicted`;

    const budgetTone: Tone = !hasBudget ? "neutral" : isOverBudget ? "bad" : "good";
    const actualTone: Tone = isActualOverPredicted ? "bad" : "good";

    /** Wired into CostBreakdownTree's onActualCostChange — this is the "track which node changed" logic.
     *  Works the same regardless of which field is active; the id -> value map doesn't care. */
    const handleLeafEdit = (nodeId: number, val: number) => {
        setChangedNodes((prev) => {
            const baseline = effectiveBaseline[nodeId] ?? 0;
            const next = { ...prev };
            if (val === baseline) {
                delete next[nodeId];
            } else {
                next[nodeId] = val;
            }
            return next;
        });
    };

    const handleResetChanges = () => {
        setChangedNodes({});
        setLocalTree(null);
        setTreeKey((k) => k + 1); // remounts the tree, re-reading treeData (baseline + saved, not unsaved edits)
    };

    const handleEnterAddMode = () => {
        const merged = structuredClone(localTree ?? treeData);
        // Bake any pending value edits into the tree before structural editing
        for (const [nodeIdStr, val] of Object.entries(changedNodes)) {
            mutateNode(merged, Number(nodeIdStr), (node) => { node.cost = val; });
        }
        setLocalTree(merged);
        setChangedNodes({});
        setAddMode(true);
    };

    const handleExitAddMode = () => {
        setAddMode(false);
        if (localTree) {
            // Bake value edits into localTree so they survive the mode exit
            for (const [nodeIdStr, val] of Object.entries(changedNodes)) {
                mutateNode(localTree, Number(nodeIdStr), (node) => { node.cost = val; });
            }
            setChangedNodes({});
            onChange?.(localTree);
        }
    };

    const handleEnterDeleteMode = () => {
        const merged = structuredClone(localTree ?? treeData);
        for (const [nodeIdStr, val] of Object.entries(changedNodes)) {
            mutateNode(merged, Number(nodeIdStr), (node) => { node.cost = val; });
        }
        setLocalTree(merged);
        setChangedNodes({});
        setDeleteMode(true);
    };

    const handleExitDeleteMode = () => {
        setDeleteMode(false);
        if (localTree) {
            for (const [nodeIdStr, val] of Object.entries(changedNodes)) {
                mutateNode(localTree, Number(nodeIdStr), (node) => { node.cost = val; });
            }
            setChangedNodes({});
            onChange?.(localTree);
        }
    };

    const handleDeleteRequest = (nodeId: number) => {
        setDeletingNodeId(nodeId);
        setShowDeleteConfirmModal(true);
    };

    const handleDeleteConfirm = () => {
        if (deletingNodeId === null || !localTree) return;
        const nextTree = structuredClone(localTree);
        // Bake pending value edits into the clone so they survive the re-initialisation
        for (const [nodeIdStr, val] of Object.entries(changedNodes)) {
            mutateNode(nextTree, Number(nodeIdStr), (node) => { node.cost = val; });
        }
        const deletedIds: number[] = [];

        const findAndRemove = (nodes: Record<string, CostNode>): boolean => {
            const result = removeNodeFromSiblings(nodes, deletingNodeId);
            if (result) {
                deletedIds.push(...result.deletedIds);
                return true;
            }
            for (const node of Object.values(nodes)) {
                if (node.children && findAndRemove(node.children)) return true;
            }
            return false;
        };

        findAndRemove(nextTree);
        setLocalTree(nextTree);
        onChange?.(nextTree);
        // Remove any changedNodes entries for the deleted nodes (others are baked into nextTree)
        setChangedNodes({});
        setShowDeleteConfirmModal(false);
        setDeletingNodeId(null);
    };

    const handleSplitRequest = (nodeId: number) => {
        setSplittingNodeId(nodeId);
        setShowSplitModal(true);
    };

    const handleSplitConfirm = (childName: string, cost: number) => {
        if (splittingNodeId === null || !localTree) return;
        const nextTree = structuredClone(localTree);
        // Bake pending value edits into the clone so they survive the re-initialisation
        for (const [nodeIdStr, val] of Object.entries(changedNodes)) {
            mutateNode(nextTree, Number(nodeIdStr), (node) => { node.cost = val; });
        }
        const maxId = findMaxId(nextTree);
        mutateNode(nextTree, splittingNodeId, (node) => {
            const inheritedId = maxId + 1;
            const newId = maxId + 2;
            node.children = {
                "1": {
                    id: inheritedId,
                    description: node.description,
                    cost: node.cost,
                    is_certification: 0,
                },
                "2": {
                    id: newId,
                    description: childName,
                    cost: cost,
                    is_certification: 0,
                },
            };
        });
        setLocalTree(nextTree);
        setChangedNodes({});
        onChange?.(nextTree);
        setShowSplitModal(false);
        setSplittingNodeId(null);
    };

    const splittingNodeName = splittingNodeId !== null && localTree
        ? (() => {
              let name = "";
              const walk = (nodes: Record<string, CostNode>) => {
                  for (const n of Object.values(nodes)) {
                      if (n.id === splittingNodeId) { name = n.description; return true; }
                      if (n.children && walk(n.children)) return true;
                  }
                  return false;
              };
              walk(localTree);
              return name;
          })()
        : "";

    const deletingNodeName = deletingNodeId !== null && localTree
        ? (() => {
              let name = "";
              const walk = (nodes: Record<string, CostNode>) => {
                  for (const n of Object.values(nodes)) {
                      if (n.id === deletingNodeId) { name = n.description; return true; }
                      if (n.children && walk(n.children)) return true;
                  }
                  return false;
              };
              walk(localTree);
              return name;
          })()
        : "";

    const handleAddCategory = (formData: {
        categoryType: "Customise" | "Others";
        categoryName: string;
        childName: string;
        cost: number;
    }) => {
        if (!localTree) return;
        const nextTree = structuredClone(localTree);
        // Bake pending value edits into the clone so they survive the re-initialisation
        for (const [nodeIdStr, val] of Object.entries(changedNodes)) {
            mutateNode(nextTree, Number(nodeIdStr), (node) => { node.cost = val; });
        }
        const maxId = findMaxId(nextTree);
        const key = nextTopKey(nextTree);
        const name =
            formData.categoryType === "Others"
                ? "OTHERS"
                : formData.categoryName.trim();

        const newNodeId = maxId + 1;

        if (formData.childName.trim()) {
            const childId = maxId + 2;
            nextTree[key] = {
                id: newNodeId,
                description: name,
                cost: 0,
                is_certification: 0,
                children: {
                    "1": {
                        id: childId,
                        description: formData.childName.trim(),
                        cost: formData.cost,
                        is_certification: 0,
                    },
                },
            };
        } else {
            nextTree[key] = {
                id: newNodeId,
                description: name,
                cost: formData.cost,
                is_certification: 0,
            };
        }

        setLocalTree(nextTree);
        setChangedNodes({});
        onChange?.(nextTree);
    };

    const showToast = (message: string, tone: "success" | "error") => {
        setToast({ message, tone });
        setTimeout(() => setToast(null), 3000);
    };

    const defaultSubmit = async (nodes: Record<number, number>): Promise<SubmitResult> => {
        const endpoint = isAssessment ? "predicted-cost" : "actual-cost";
        const res = await fetch(`/api/projects/${projectId}/${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ changedNodes: nodes }),
        });
        const data = await res.json().catch(() => ({}));
        return {
            success: res.ok && data.success !== false,
            message:
                data.message ??
                (res.ok
                    ? isAssessment
                        ? "Predicted costs saved."
                        : "Actual costs updated."
                    : isAssessment
                        ? "Failed to save predicted costs."
                        : "Failed to update actual costs."),
        };
    };

    const handleSubmit = async () => {
        if (!hasChanges || submitting || !canSubmit) return;
        setSubmitting(true);
        const snapshot = { ...changedNodes };
        try {
            const result = onSubmit ? await onSubmit(snapshot) : await defaultSubmit(snapshot);
            showToast(result.message, result.success ? "success" : "error");
            if (result.success) {
                setSavedOverrides((prev) => ({ ...prev, ...snapshot }));
                setChangedNodes({});
            }
        } catch {
            showToast("Something went wrong. Please try again.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    if (!value) {
        return (
            <div className="rounded-2xl border border-dashed border-[#E4E1D8] bg-[#FDFDFC] py-16 text-center text-[13px] text-[#8A938C]">
                Cost breakdown data isn&apos;t available yet.
            </div>
        );
    }

    return (
        <>
            <div className="mb-4">
                {/* ---------------- Statement / summary card ---------------- */}
                {isAssessment ? (
                    <section className="relative mb-6 overflow-hidden rounded-3xl border border-[#E4E1D8] bg-[#FDFDFC] p-5 shadow-[0_1px_2px_rgba(30,38,33,0.04)] sm:p-8">
                        <div
                            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-[0.4]"
                            style={{ background: `radial-gradient(circle, ${TONE.neutral.border}55 0%, transparent 70%)` }}
                        />
                        <div className="relative flex flex-wrap items-start justify-between gap-5">
                            <div>
                                <div
                                    className="text-[11px] uppercase tracking-[0.14em] text-[#8A938C]"
                                    style={{ fontFamily: "var(--font-mono)" }}
                                >
                                    Total predicted cost
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                    <span className="font-serif text-[28px] font-semibold leading-none tabular-nums text-[#2C4A3A] sm:text-[34px] md:text-[42px]">
                                        {formatMoney(totalLive)}
                                    </span>
                                </div>
                                <div className="mt-1 text-[12.5px] text-[#8A938C]">
                                    Enter predicted costs against each element below.
                                </div>
                            </div>

                            {/* Budget stamp */}
                            <div
                                className="flex shrink-0 -rotate-2 items-center gap-2 rounded-lg border-2 border-dashed px-3.5 py-2"
                                style={{ borderColor: TONE[budgetTone].solid, color: TONE[budgetTone].text }}
                            >
                                {!hasBudget ? (
                                    <Wallet size={15} />
                                ) : isOverBudget ? (
                                    <TrendingUp size={15} />
                                ) : (
                                    <ShieldCheck size={15} />
                                )}
                                <span
                                    className="text-[11.5px] font-bold uppercase tracking-[0.06em]"
                                    style={{ fontFamily: "var(--font-mono)" }}
                                >
                                    {!hasBudget ? "No budget set" : isOverBudget ? "Over budget" : "Within budget"}
                                </span>
                            </div>
                        </div>

                        {/* Gauge bar: predicted vs budget */}
                        <CostGaugeBar
                            budgeted={hasBudget ? (projectBudget as number) : totalBudgeted}
                            actual={totalLive}
                            tone={budgetTone}
                            actualLabel="Predicted"
                        />

                        {/* Figures row */}
                        <div className="relative mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-dashed border-[#E4E1D8] pt-4">
                            <Figure label="Budget" value={hasBudget ? formatMoney(projectBudget as number) : "N/A"} />
                            <Figure label="Predicted" value={formatMoney(totalLive)} />
                        </div>
                    </section>
                ) : (
                    <section className="relative mb-6 overflow-hidden rounded-3xl border border-[#E4E1D8] bg-[#FDFDFC] p-5 shadow-[0_1px_2px_rgba(30,38,33,0.04)] sm:p-8">
                        {/* faint ledger rule in the corner — a quiet nod to the statement/audit feel */}
                        <div
                            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-[0.4]"
                            style={{ background: `radial-gradient(circle, ${TONE.neutral.border}55 0%, transparent 70%)` }}
                        />

                        <div className="relative flex flex-wrap items-start justify-between gap-5">
                            <div>
                                <div
                                    className="text-[11px] uppercase tracking-[0.14em] text-[#8A938C]"
                                    style={{ fontFamily: "var(--font-mono)" }}
                                >
                                    Actual cost to date
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                    <span
                                        className="font-serif text-[28px] font-semibold leading-none tabular-nums sm:text-[34px] md:text-[42px]"
                                        style={{ color: TONE[actualTone].text }}
                                    >
                                        {formatMoney(totalLive)}
                                    </span>
                                    <span
                                        className="text-[13px] font-medium"
                                        style={{ color: delta === 0 ? "#8A938C" : TONE[actualTone].text }}
                                    >
                                        {deltaLabel}
                                    </span>
                                </div>
                                <div className="mt-1 text-[12.5px] text-[#8A938C]">
                                    Predicted {formatMoney(comparisonBase)}
                                </div>
                            </div>

                            {/* Budget stamp — reads like an audit seal, tone mirrors budget status */}
                            <div
                                className="flex shrink-0 -rotate-2 items-center gap-2 rounded-lg border-2 border-dashed px-3.5 py-2"
                                style={{ borderColor: TONE[budgetTone].solid, color: TONE[budgetTone].text }}
                            >
                                {!hasBudget ? (
                                    <Wallet size={15} />
                                ) : isOverBudget ? (
                                    <TrendingUp size={15} />
                                ) : (
                                    <ShieldCheck size={15} />
                                )}
                                <span
                                    className="text-[11.5px] font-bold uppercase tracking-[0.06em]"
                                    style={{ fontFamily: "var(--font-mono)" }}
                                >
                                    {!hasBudget ? "No budget set" : isOverBudget ? "Over budget" : "Within budget"}
                                </span>
                            </div>
                        </div>

                        {/* ---------------- Gauge bar: budgeted / predicted / actual on one axis ---------------- */}
                        <CostGaugeBar
                            budgeted={totalBudgeted}
                            predicted={predictedCost}
                            actual={totalLive}
                            tone={actualTone}
                        />

                        {/* ---------------- Figures row ---------------- */}
                        <div className="relative mt-6 grid grid-cols-3 gap-x-3 gap-y-3 border-t border-dashed border-[#E4E1D8] pt-4">
                            <Figure label="Budgeted" value={formatMoney(totalBudgeted)} />
                            <Figure
                                label="Predicted"
                                value={predictedCost !== undefined ? formatMoney(predictedCost) : "\u2014"}
                            />
                            <Figure
                                label="Budget"
                                value={hasBudget ? formatMoney(projectBudget as number) : "N/A"}
                                valueColor={hasBudget ? undefined : "#8A938C"}
                            />
                        </div>
                    </section>
                )}

                {/* ---------------- Editable tree ---------------- */}
                {!isAssessment && (
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[13px] text-[#8A938C]">
                      Enter actual costs against each line item — the statement above updates as you type.
                    </p>
                    {hasChanges && (
                      <button
                        type="button"
                        onClick={handleResetChanges}
                        className="flex shrink-0 items-center justify-center gap-1.5 self-start rounded-full border border-[#E4E1D8] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#5B655F] transition-colors hover:border-[#E7C1BA] hover:text-[#B0453A] sm:self-auto"
                      >
                        <RotateCcw size={12.5} />
                        Reset changes
                      </button>
                    )}
                  </div>
                )}

                {isAssessment && (
                  <div className="mb-4 flex w-full flex-col items-stretch gap-2.5 px-1 sm:flex-row sm:gap-3 sm:px-4">
                    {!deleteMode && (
                      <button
                        type="button"
                        onClick={addMode ? handleExitAddMode : handleEnterAddMode}
                        className="flex flex-1 basis-0 items-center justify-center gap-1.5 rounded-full border bg-white px-4 py-2.5 text-[12.5px] font-semibold shadow-[0_1px_2px_rgba(30,38,33,0.04)] transition-colors"
                        style={{ borderColor: addMode ? TONE.neutral.border : TONE.good.border, color: addMode ? TONE.neutral.text : TONE.good.text }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = addMode ? TONE.neutral.bg : TONE.good.bg;
                          e.currentTarget.style.borderColor = addMode ? TONE.neutral.solid : TONE.good.solid;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#FFFFFF";
                          e.currentTarget.style.borderColor = addMode ? TONE.neutral.border : TONE.good.border;
                        }}
                      >
                        <CircleDollarSign size={14} />
                        {addMode ? "Done Adding Cost Node" : "Add Cost Node"}
                      </button>
                    )}

                    {!addMode && (
                      <button
                        type="button"
                        onClick={deleteMode ? handleExitDeleteMode : handleEnterDeleteMode}
                        className="flex flex-1 basis-0 items-center justify-center gap-1.5 rounded-full border bg-white px-4 py-2.5 text-[12.5px] font-semibold shadow-[0_1px_2px_rgba(30,38,33,0.04)] transition-colors"
                        style={{ borderColor: deleteMode ? TONE.neutral.border : TONE.bad.border, color: deleteMode ? TONE.neutral.text : TONE.bad.text }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = deleteMode ? TONE.neutral.bg : TONE.bad.bg;
                          e.currentTarget.style.borderColor = deleteMode ? TONE.neutral.solid : TONE.bad.solid;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#FFFFFF";
                          e.currentTarget.style.borderColor = deleteMode ? TONE.neutral.border : TONE.bad.border;
                        }}
                      >
                        <Trash2 size={14} />
                        {deleteMode ? "Done Deleting" : "Delete Cost Code"}
                      </button>
                    )}
                  </div>
                )}

                <div className=" bg-[#FDFDFC] p-2 sm:p-3">
                    <CostBreakdownTree
                        key={treeKey}
                        data={localTree ?? treeData}
                        onActualCostChange={handleLeafEdit}
                        hideTotals
                        mode={mode}
                        addMode={addMode}
                        deleteMode={deleteMode}
                        onSplitLeaf={handleSplitRequest}
                        onDeleteLeaf={handleDeleteRequest}
                        onAddRootCategory={() => setShowAddCategoryModal(true)}
                    />
                </div>
            </div>

            {/* ---------------- Sticky submit bar ---------------- */}
            {mode === "comparison" && (
              <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[#E4E1D8] bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(30,38,33,0.05)] backdrop-blur sm:px-5 sm:py-4">
                <div className="mx-auto flex max-w-275 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="text-center text-[12.5px] text-[#8A938C] sm:text-left">
                    {!canSubmit
                      ? "Submit isn't connected yet"
                      : hasChanges
                        ? `${Object.keys(changedNodes).length} item${Object.keys(changedNodes).length === 1 ? "" : "s"
                        } changed`
                        : "No changes yet"}
                  </span>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!hasChanges || submitting || !canSubmit}
                    title={!canSubmit ? "Pass a projectId or onSubmit to enable saving" : undefined}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[13.5px] font-semibold text-white shadow-sm transition-colors sm:w-auto"
                    style={{
                      backgroundColor:
                        hasChanges && !submitting && canSubmit ? TONE.good.solid : TONE.neutral.border,
                      cursor: hasChanges && !submitting && canSubmit ? "pointer" : "not-allowed",
                    }}
                    onMouseEnter={(e) => {
                      if (hasChanges && !submitting && canSubmit) {
                        e.currentTarget.style.backgroundColor = TONE.good.solidHover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (hasChanges && !submitting && canSubmit) {
                        e.currentTarget.style.backgroundColor = TONE.good.solid;
                      }
                    }}
                  >
                    <CheckCircle2 size={16} />
                    {submitting ? "Submitting…" : hasChanges ? "Submit changes" : "No changes"}
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- Toast ---------------- */}
            {toast && (
                <div
                    className="fixed bottom-20 left-1/2 z-20 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-2xl px-4 py-3 text-center text-[13px] font-medium text-white shadow-lg sm:w-fit"
                    style={{ backgroundColor: toast.tone === "success" ? TONE.good.solid : TONE.bad.solid }}
                >
                    {toast.message}
                </div>
            )}

            {/* ---------------- Add Category Modal ---------------- */}
            <AddCategoryModal
                open={showAddCategoryModal}
                onClose={() => setShowAddCategoryModal(false)}
                existingNames={getExistingCategoryNames(localTree ?? treeData)}
                onSubmit={(formData) => {
                    handleAddCategory(formData);
                    setShowAddCategoryModal(false);
                }}
            />

            {/* ---------------- Split Node Modal ---------------- */}
            <SplitNodeModal
                open={showSplitModal}
                parentName={splittingNodeName}
                parentCost={(() => {
                    if (splittingNodeId === null || !localTree) return 0;
                    let cost = 0;
                    const walk = (nodes: Record<string, CostNode>) => {
                        for (const n of Object.values(nodes)) {
                            if (n.id === splittingNodeId) { cost = n.cost; return true; }
                            if (n.children && walk(n.children)) return true;
                        }
                        return false;
                    };
                    walk(localTree);
                    return cost;
                })()}
                onClose={() => {
                    setShowSplitModal(false);
                    setSplittingNodeId(null);
                }}
                onConfirm={handleSplitConfirm}
            />

            {/* ---------------- Delete Confirm Modal ---------------- */}
            {showDeleteConfirmModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
                    onClick={() => { setShowDeleteConfirmModal(false); setDeletingNodeId(null); }}
                >
                    <div
                        className="mx-4 w-full max-w-sm rounded-3xl border border-[#E4E1D8] bg-white p-6 shadow-[0_24px_48px_rgba(30,38,33,0.12)] sm:p-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="mb-2 text-lg font-semibold text-[#1E2621]">Delete this item?</h3>
                        <p className="mb-6 text-[13px] leading-relaxed text-[#5B655F]">
                            You are about to delete <span className="font-medium text-[#1E2621]">{deletingNodeName}</span> and all its sub-items. This cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => { setShowDeleteConfirmModal(false); setDeletingNodeId(null); }}
                                className="flex flex-1 items-center justify-center rounded-2xl border border-[#E4E1D8] bg-white px-4 py-2.5 text-[13px] font-medium text-[#5B655F] transition-colors hover:bg-[#FBFAF7]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#B0453A] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#963B31]"
                            >
                                <Trash2 size={14} />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ---------------- Gauge bar ---------------- */

/**
 * A single axis showing budgeted, predicted, and actual spend at once — the statement's
 * signature element. The filled bar is the running actual; the two tick marks are reference
 * points, so a glance tells you both "how much" and "compared to what" without reading three
 * separate cards. Only rendered in "comparison" mode.
 */
function CostGaugeBar({
    budgeted,
    predicted,
    actual,
    tone,
    actualLabel = "Actual",
    isAssessment = false,
}: {
    budgeted: number;
    predicted?: number;
    actual: number;
    tone: Tone;
    actualLabel?: string;
    isAssessment?: boolean;
}) {
    const max = Math.max(budgeted, predicted ?? 0, actual, 1) * 1.08;
    const pct = (n: number) => Math.min(100, Math.max(0, (n / max) * 100));
    const showPredictedTick = predicted !== undefined && predicted > 0 && predicted !== budgeted && predicted !== actual;

    return (
        <div className="relative mt-6">
            <div className="relative h-2.5 rounded-full bg-[#EFEDE6]">
                <div
                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
                    style={{ width: `${pct(actual)}%`, backgroundColor: TONE[tone].solid }}
                />
                {budgeted > 0 && (
                    <div
                        className="absolute top-1/2 h-4 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1E2621]"
                        style={{ left: `${pct(budgeted)}%` }}
                    />
                )}
                {showPredictedTick && (
                    <div
                        className="absolute top-1/2 h-4 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8A938C]"
                        style={{ left: `${pct(predicted as number)}%` }}
                    />
                )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <LegendDot color={TONE[tone].solid} label={actualLabel} />
                {budgeted > 0 && <LegendDot color="#1E2621" label="Budgeted" line />}
                {showPredictedTick && <LegendDot color="#8A938C" label="Predicted" line />}
            </div>
        </div>
    );
}

function LegendDot({ color, label, line = false }: { color: string; label: string; line?: boolean }) {
    return (
        <span className="flex items-center gap-1.5 text-[11px] text-[#8A938C]" style={{ fontFamily: "var(--font-mono)" }}>
            <span
                className={line ? "inline-block h-3 w-[2px] rounded-full" : "inline-block h-2 w-2 rounded-full"}
                style={{ backgroundColor: color }}
            />
            {label}
        </span>
    );
}

/* ---------------- Figure ---------------- */

function Figure({
    label,
    value,
    valueColor,
}: {
    label: string;
    value: string;
    valueColor?: string;
}) {
    return (
        <div className="min-w-0">
            <div
                className="text-[10.5px] uppercase tracking-[0.08em] text-[#8A938C]"
                style={{ fontFamily: "var(--font-mono)" }}
            >
                {label}
            </div>
            <div
                className="mt-0.5 truncate text-[13.5px] font-semibold tabular-nums sm:text-[15px]"
                style={{ color: valueColor ?? "#1E2621" }}
                title={value}
            >
                {value}
            </div>
        </div>
    );
}

/* ---------------- Split Node Modal ---------------- */

function SplitNodeModal({
    open,
    parentName,
    parentCost,
    onClose,
    onConfirm,
}: {
    open: boolean;
    parentName: string;
    parentCost: number;
    onClose: () => void;
    onConfirm: (childName: string, cost: number) => void;
}) {
    const costInputRef = useRef<HTMLInputElement>(null);
    const [childName, setChildName] = useState("");
    const [rawDigits, setRawDigits] = useState("");
    const [childNameError, setChildNameError] = useState("");
    const [costError, setCostError] = useState("");

    const displayCost = rawDigits
        ? (parseInt(rawDigits, 10) / 100).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "0.00";

    // Keep cursor at the end after each value update
    useEffect(() => {
        if (costInputRef.current) {
            costInputRef.current.setSelectionRange(displayCost.length, displayCost.length);
        }
    }, [displayCost]);

    if (!open) return null;

    const handleSubmit = () => {
        setChildNameError("");
        setCostError("");
        let valid = true;
        if (!childName.trim()) {
            setChildNameError("Give this sub-item a name.");
            valid = false;
        }
        if (!rawDigits) {
            setCostError("Enter a cost for this sub-item.");
            valid = false;
        }
        if (!valid) return;
        const cost = parseInt(rawDigits, 10) / 100;
        onConfirm(childName.trim(), cost);
        setChildName("");
        setRawDigits("");
        setChildNameError("");
        setCostError("");
    };

    const handleClose = () => {
        setChildNameError("");
        setCostError("");
        setChildName("");
        setRawDigits("");
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                className="mx-4 w-full max-w-md rounded-3xl border border-[#E4E1D8] bg-white p-6 shadow-[0_24px_48px_rgba(30,38,33,0.12)] sm:p-8"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="mb-5 text-lg font-semibold text-[#1E2621]">Break down this item</h3>
                <p className="-mt-3 mb-5 text-[13px] text-[#8A938C]">
                    Add a sub-item to <span className="font-medium text-[#5B655F]">{parentName}</span>
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-[12px] font-medium text-[#5B655F]">
                            Name for the new sub-item
                        </label>
                        <input
                            type="text"
                            value={childName}
                            onChange={(e) => { setChildName(e.target.value); setChildNameError(""); }}
                            placeholder="e.g. Basic Piling"
                            className={`w-full rounded-xl border px-3.5 py-2.5 text-[13.5px] text-[#1E2621] placeholder:text-[#ADA695] focus:outline-none focus:ring-2 ${
                                childNameError ? "border-[#B0453A] focus:border-[#B0453A] focus:ring-[#B0453A]/20" : "border-[#E4E1D8] focus:border-[#3E6B52] focus:ring-[#3E6B52]/20"
                            }`}
                        />
                        {childNameError && (
                            <p className="mt-1 text-[11.5px] font-medium text-[#B0453A]">{childNameError}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-[12px] font-medium text-[#5B655F]">
                            Cost for this sub-item (RM)
                        </label>
                        <input
                            ref={costInputRef}
                            type="text"
                            inputMode="decimal"
                            value={displayCost}
                            onChange={() => { if (costError) setCostError(""); }}
                            onKeyDown={(e) => {
                                if (e.key === "Backspace") {
                                    e.preventDefault();
                                    setRawDigits((prev) => prev.slice(0, -1));
                                } else if (/^\d$/.test(e.key)) {
                                    e.preventDefault();
                                    setRawDigits((prev) => prev + e.key);
                                }
                            }}
                            className={`w-full rounded-xl border px-3.5 py-2.5 text-[13.5px] text-[#1E2621] placeholder:text-[#ADA695] focus:outline-none focus:ring-2 ${
                                costError ? "border-[#B0453A] focus:border-[#B0453A] focus:ring-[#B0453A]/20" : "border-[#E4E1D8] focus:border-[#3E6B52] focus:ring-[#3E6B52]/20"
                            }`}
                        />
                        {costError && (
                            <p className="mt-1 text-[11.5px] font-medium text-[#B0453A]">{costError}</p>
                        )}
                    </div>
                </div>

                <p className="mt-3 text-[12px] text-[#ADA695]">
                    The item &ldquo;{parentName}&rdquo; will keep its current cost. The sub-item you add here is extra.
                </p>

                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 rounded-xl border border-[#E4E1D8] bg-white px-4 py-2.5 text-[13px] font-medium text-[#5B655F] transition-colors hover:border-[#C9D3CC] hover:text-[#2C4A3A]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="flex-1 rounded-xl bg-[#3E6B52] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#325A44]"
                    >
                        Add sub-item
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ---------------- Add Category Modal ---------------- */

function AddCategoryModal({
    open,
    onClose,
    existingNames,
    onSubmit,
}: {
    open: boolean;
    onClose: () => void;
    existingNames: Set<string>;
    onSubmit: (data: {
        categoryType: "Customise" | "Others";
        categoryName: string;
        childName: string;
        cost: number;
    }) => void;
}) {
    const costInputRef = useRef<HTMLInputElement>(null);
    const [categoryType, setCategoryType] = useState<"Customise" | "Others">("Customise");
    const [categoryName, setCategoryName] = useState("");
    const [childName, setChildName] = useState("");
    const [rawDigits, setRawDigits] = useState("");
    const [categoryNameError, setCategoryNameError] = useState("");
    const [costError, setCostError] = useState("");

    const displayCost = rawDigits
        ? (parseInt(rawDigits, 10) / 100).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "0.00";

    useEffect(() => {
        if (costInputRef.current) {
            costInputRef.current.setSelectionRange(displayCost.length, displayCost.length);
        }
    }, [displayCost]);

    if (!open) return null;

    const handleSubmit = () => {
        setCategoryNameError("");
        setCostError("");
        let valid = true;
        if (!rawDigits) {
            setCostError("Enter a cost for this category.");
            valid = false;
        }
        const cost = parseInt(rawDigits || "0", 10) / 100;
        if (categoryType === "Customise") {
            const trimmed = categoryName.trim().toLowerCase();
            if (!trimmed) {
                setCategoryNameError("Give this category a name.");
                valid = false;
            } else if (trimmed === "certification" || trimmed === "others") {
                setCategoryNameError(`"${categoryName.trim()}" is a reserved name — pick something else.`);
                valid = false;
            } else if (existingNames.has(trimmed)) {
                setCategoryNameError(`"${categoryName.trim()}" already exists — try a different name.`);
                valid = false;
            }
        }
        if (!valid) return;
        onSubmit({
            categoryType,
            categoryName: categoryName.trim(),
            childName: childName.trim(),
            cost,
        });
        setCategoryName("");
        setChildName("");
        setRawDigits("");
        setCategoryType("Customise");
        setCategoryNameError("");
        setCostError("");
    };

    const handleClose = () => {
        setCategoryNameError("");
        setCostError("");
        setCategoryName("");
        setChildName("");
        setRawDigits("");
        setCategoryType("Customise");
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                className="mx-4 w-full max-w-md rounded-3xl border border-[#E4E1D8] bg-white p-6 shadow-[0_24px_48px_rgba(30,38,33,0.12)] sm:p-8"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="mb-5 text-lg font-semibold text-[#1E2621]">Add a new category</h3>

                <div className="space-y-4">
{existingNames.has("others") ? null : (
                    <div>
                        <label className="mb-1.5 block text-[12px] font-medium text-[#5B655F]">
                            Category
                        </label>
                        <div className="flex rounded-xl border border-[#E4E1D8] bg-[#F6F6F2] p-0.5">
                            <button
                                type="button"
                                onClick={() => setCategoryType("Customise")}
                                className={`flex-1 rounded-lg px-3.5 py-2 text-[12.5px] font-medium transition-all ${
                                    categoryType === "Customise"
                                        ? "bg-white text-[#1E2621] shadow-[0_1px_3px_rgba(30,38,33,0.08)]"
                                        : "text-[#8A938C] hover:text-[#5B655F]"
                                }`}
                            >
                                Customise
                            </button>
                            <button
                                type="button"
                                onClick={() => setCategoryType("Others")}
                                className={`flex-1 rounded-lg px-3.5 py-2 text-[12.5px] font-medium transition-all ${
                                    categoryType === "Others"
                                        ? "bg-white text-[#1E2621] shadow-[0_1px_3px_rgba(30,38,33,0.08)]"
                                        : "text-[#8A938C] hover:text-[#5B655F]"
                                }`}
                            >
                                Others
                            </button>
                        </div>
                    </div>
                    )}

                    <div>
                        <label className="mb-1.5 block text-[12px] font-medium text-[#5B655F]">
                            Category name
                        </label>
                        <input
                            type="text"
                            value={categoryType === "Others" ? "OTHERS" : categoryName}
                            onChange={(e) => { setCategoryName(e.target.value); setCategoryNameError(""); }}
                            disabled={categoryType === "Others"}
                            placeholder="e.g. Mechanical & Electrical"
                            className={`w-full rounded-xl border px-3.5 py-2.5 text-[13.5px] text-[#1E2621] placeholder:text-[#ADA695] focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-[#F6F6F2] disabled:text-[#8A938C] ${
                                categoryNameError ? "border-[#B0453A] focus:border-[#B0453A] focus:ring-[#B0453A]/20" : "border-[#E4E1D8] focus:border-[#3E6B52] focus:ring-[#3E6B52]/20"
                            }`}
                        />
                        {categoryNameError && (
                            <p className="mt-1 text-[11.5px] font-medium text-[#B0453A]">{categoryNameError}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-[12px] font-medium text-[#5B655F]">
                            Sub-item name <span className="text-[#ADA695]">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={childName}
                            onChange={(e) => setChildName(e.target.value)}
                            placeholder="Add a sub-item, or leave blank to assign the cost to this category"
                            className="w-full rounded-xl border border-[#E4E1D8] bg-white px-3.5 py-2.5 text-[13.5px] text-[#1E2621] placeholder:text-[#ADA695] focus:border-[#3E6B52] focus:outline-none focus:ring-2 focus:ring-[#3E6B52]/20"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-[12px] font-medium text-[#5B655F]">
                            Cost for this category (RM)
                        </label>
                        <input
                            ref={costInputRef}
                            type="text"
                            inputMode="decimal"
                            value={displayCost}
                            onChange={() => { if (costError) setCostError(""); }}
                            onKeyDown={(e) => {
                                if (e.key === "Backspace") {
                                    e.preventDefault();
                                    setRawDigits((prev) => prev.slice(0, -1));
                                } else if (/^\d$/.test(e.key)) {
                                    e.preventDefault();
                                    setRawDigits((prev) => prev + e.key);
                                }
                            }}
                            className={`w-full rounded-xl border px-3.5 py-2.5 text-[13.5px] text-[#1E2621] placeholder:text-[#ADA695] focus:outline-none focus:ring-2 ${
                                costError ? "border-[#B0453A] focus:border-[#B0453A] focus:ring-[#B0453A]/20" : "border-[#E4E1D8] focus:border-[#3E6B52] focus:ring-[#3E6B52]/20"
                            }`}
                        />
                        {costError && (
                            <p className="mt-1 text-[11.5px] font-medium text-[#B0453A]">{costError}</p>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 rounded-xl border border-[#E4E1D8] bg-white px-4 py-2.5 text-[13px] font-medium text-[#5B655F] transition-colors hover:border-[#C9D3CC] hover:text-[#2C4A3A]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="flex-1 rounded-xl bg-[#3E6B52] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#325A44]"
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
}
