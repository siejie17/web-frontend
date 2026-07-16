"use client";

import { useEffect, useMemo, useState } from "react";
import { Wallet, TrendingUp, ShieldCheck, CheckCircle2, RotateCcw, CircleDollarSign } from "lucide-react";

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
        return Object.entries(effectiveBaseline).reduce(
            (sum, [id, base]) => sum + (changedNodes[Number(id)] ?? base),
            0
        );
    }, [effectiveBaseline, changedNodes]);

    const hasBudget = projectBudget !== null && projectBudget !== undefined;
    const isOverBudget = hasBudget && (projectBudget as number) > 0 && totalBudgeted > (projectBudget as number);
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
        setTreeKey((k) => k + 1); // remounts the tree, re-reading treeData (baseline + saved, not unsaved edits)
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
                    <section className="relative mb-6 overflow-hidden rounded-3xl border border-[#E4E1D8] bg-[#FDFDFC] p-6 shadow-[0_1px_2px_rgba(30,38,33,0.04)] sm:p-8">
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
                                    <span className="font-serif text-[34px] font-semibold leading-none tabular-nums text-[#2C4A3A] sm:text-[42px]">
                                        {formatMoney(totalLive)}
                                    </span>
                                </div>
                                <div className="mt-1 text-[12.5px] text-[#8A938C]">
                                    Enter predicted costs against each element below.
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 rounded-lg border-2 border-dashed border-[#CFE0D6] px-3.5 py-2 text-[#2C4A3A]">
                                <CircleDollarSign size={15} />
                                <span
                                    className="text-[11.5px] font-bold uppercase tracking-[0.06em]"
                                    style={{ fontFamily: "var(--font-mono)" }}
                                >
                                    Initial assessment
                                </span>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="relative mb-6 overflow-hidden rounded-3xl border border-[#E4E1D8] bg-[#FDFDFC] p-6 shadow-[0_1px_2px_rgba(30,38,33,0.04)] sm:p-8">
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
                                        className="font-serif text-[34px] font-semibold leading-none tabular-nums sm:text-[42px]"
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
                        <div className="relative mt-6 grid grid-cols-3 gap-4 border-t border-dashed border-[#E4E1D8] pt-4">
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
                <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-[13px] text-[#8A938C]">
                        {isAssessment
                            ? "Enter predicted costs against each line item — the total above updates as you type."
                            : "Enter actual costs against each line item — the statement above updates as you type."}
                    </p>
                    {hasChanges && (
                        <button
                            type="button"
                            onClick={handleResetChanges}
                            className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#E4E1D8] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#5B655F] transition-colors hover:border-[#E7C1BA] hover:text-[#B0453A]"
                        >
                            <RotateCcw size={12.5} />
                            Reset changes
                        </button>
                    )}
                </div>

                <div className="rounded-3xl border border-[#E4E1D8] bg-[#FDFDFC] p-2 sm:p-3">
                    <CostBreakdownTree
                        key={treeKey}
                        data={treeData}
                        onActualCostChange={handleLeafEdit}
                        hideTotals
                        mode={mode}
                    />
                </div>
            </div>

            {/* ---------------- Sticky submit bar ---------------- */}
            <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[#E4E1D8] bg-white/95 px-5 py-4 shadow-[0_-4px_16px_rgba(30,38,33,0.05)] backdrop-blur">
                <div className="mx-auto flex max-w-275 items-center justify-between gap-4">
                    <span className="text-[12.5px] text-[#8A938C]">
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
                        className="flex items-center gap-2 rounded-2xl px-5 py-3 text-[13.5px] font-semibold text-white shadow-sm transition-colors"
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

            {/* ---------------- Toast ---------------- */}
            {toast && (
                <div
                    className="fixed bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-2xl px-4 py-3 text-[13px] font-medium text-white shadow-lg"
                    style={{ backgroundColor: toast.tone === "success" ? TONE.good.solid : TONE.bad.solid }}
                >
                    {toast.message}
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
}: {
    budgeted: number;
    predicted?: number;
    actual: number;
    tone: Tone;
}) {
    const max = Math.max(budgeted, predicted ?? 0, actual, 1) * 1.08;
    const pct = (n: number) => Math.min(100, Math.max(0, (n / max) * 100));
    const showPredictedTick = predicted !== undefined && predicted > 0 && predicted !== budgeted;

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
                <LegendDot color={TONE[tone].solid} label="Actual" />
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
        <div>
            <div
                className="text-[10.5px] uppercase tracking-[0.08em] text-[#8A938C]"
                style={{ fontFamily: "var(--font-mono)" }}
            >
                {label}
            </div>
            <div
                className="mt-0.5 text-[15px] font-semibold tabular-nums"
                style={{ color: valueColor ?? "#1E2621" }}
            >
                {value}
            </div>
        </div>
    );
}