"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  X,
  Clock,
  Building2,
  Layers,
  MapPin,
  Ruler,
  Wallet,
  Calendar,
  Tag,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
} from "lucide-react";
import { formatCurrency, formatSize } from "@/lib/utils";
import { computeActualMarks } from "@/lib/assessment-utils";

const BUILDING_TYPE_MAPPING : Record<string, string> = {
  "NRNC": "Non-Residential New Construction (NRNC)",
  "RNC": "Residential New Construction (RNC)",
  "NREB": "Non-Residential Existing Building (NREB)",
}

/* ── Cost helpers (mirror CostBreakdownHierarchy totals) ── */

function sumPredictedCost(tree?: Record<string, any> | null): number {
  if (!tree) return 0;
  return Object.values(tree).reduce((sum, node) => sum + (node.cost ?? 0), 0);
}

function sumActualCost(tree?: Record<string, any> | null): number {
  if (!tree) return 0;
  let total = 0;
  const walk = (nodes: Record<string, any>) => {
    for (const node of Object.values(nodes)) {
      if (node.children) walk(node.children);
      else total += node.actual_cost ?? node.cost ?? 0;
    }
  };
  walk(tree);
  return total;
}

function formatDateTime(value?: string) {
  if (!value) return "Not provided";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/* ── Delta chip: green if favorable, amber if not, neutral if flat/no data ── */

function DeltaChip({
  value,
  favorable,
  label,
}: {
  value: number | null;
  favorable: boolean | null;
  label: string;
}) {
  if (value == null || favorable == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F0EA] px-2.5 py-1 text-[11px] font-semibold text-[#8A938C]">
        <Minus size={11} />
        No comparison
      </span>
    );
  }
  const isFlat = value === 0;
  const Icon = isFlat ? Minus : value > 0 ? TrendingUp : TrendingDown;
  const tone = isFlat ? "neutral" : favorable ? "good" : "warning";
  const colors = {
    good: { bg: "rgba(62,107,82,0.10)", fg: "#3E6B52" },
    warning: { bg: "rgba(200,138,62,0.13)", fg: "#8A6420" },
    neutral: { bg: "rgba(124,136,128,0.12)", fg: "#5B655F" },
  }[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ backgroundColor: colors.bg, color: colors.fg }}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}

/* ── GBI progress track: fill = actual, marker = predicted ── */

function GbiTrack({
  predicted,
  actual,
}: {
  predicted: number | null;
  actual: number;
}) {
  const [revealed, setRevealed] = useState(false);
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  const actualPct = clamp(actual);
  const predictedPct = predicted != null ? clamp(predicted) : null;

  useEffect(() => {
    setRevealed(false);
    const timer = window.setTimeout(() => setRevealed(true), 180);
    return () => window.clearTimeout(timer);
  }, [predicted, actual]);

  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#EFEDE6]">
      {!revealed ? (
        <motion.div
          key="gbi-track-skeleton"
          className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,#DFE4DE_0%,#EEF2EC_50%,#DFE4DE_100%)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        />
      ) : (
        <motion.div
          key="gbi-track-fill"
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-[#3E6B52] to-[#5A9172]"
            style={{ width: `${actualPct}%` }}
          />
          {predictedPct != null && (
            <div
              className="group absolute top-1/2 -translate-y-1/2"
              style={{ left: `calc(${predictedPct}% - 5px)` }}
            >
              <div className="h-4 w-0.75 rounded-full bg-[#1E2621]" />
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* ── Diverging cost bars: outlined predicted vs filled actual ── */

function CostBars({
  predicted,
  actual,
}: {
  predicted: number | null;
  actual: number | null;
}) {
  const [revealed, setRevealed] = useState(false);
  const max = Math.max(predicted ?? 0, actual ?? 0, 1) * 1.12;
  const predPct = predicted != null ? (predicted / max) * 100 : 0;
  const actPct = actual != null ? (actual / max) * 100 : 0;

  useEffect(() => {
    setRevealed(false);
    const timer = window.setTimeout(() => setRevealed(true), 180);
    return () => window.clearTimeout(timer);
  }, [predicted, actual]);

  return (
    <div className="space-y-2.5">
      {!revealed ? (
        <>
          <div className="flex items-center gap-2.5">
            <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#8A938C]">
              Predicted
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#EFEDE6]">
              <div className="h-2.5 w-3/4 animate-pulse rounded-full bg-[linear-gradient(90deg,#DFE4DE_0%,#EEF2EC_50%,#DFE4DE_100%)]" />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#8A938C]">
              Actual
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#EFEDE6]">
              <div className="h-2.5 w-5/6 animate-pulse rounded-full bg-[linear-gradient(90deg,#DCE8E0_0%,#F2F6F3_50%,#DCE8E0_100%)]" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#8A938C]">
              Predicted
            </span>
            <div className="h-2.5 flex-1 rounded-full bg-[#EFEDE6]">
              <div
                className="h-2.5 rounded-full border-2 border-[#B7C2BA]"
                style={{ width: `${predPct}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#8A938C]">
              Actual
            </span>
            <div className="h-2.5 flex-1 rounded-full bg-[#EFEDE6]">
              <div
                className="h-2.5 rounded-full bg-linear-to-r from-[#3E6B52] to-[#5A9172]"
                style={{ width: `${actPct}%` }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Props ── */

interface ProjectHeaderProps {
  project: {
    name: string;
    created_at?: string;
    rating?: number | null;
    target_certification?: string | null;
    location?: string | null;
    building_type?: string | null;
    category?: string | null;
    structure?: string | null;
    size?: string | null;
    budget?: string | null;
    year?: string | null;
  };
  selectedProject: any;
  liveActualRating?: number | null;
  liveActualCost?: number | null;
  activeTab?: "details" | "cost" | "gbi" | "chat";
}

/* ── Component ── */

export default function ProjectHeader({
  project,
  selectedProject,
  liveActualRating,
  liveActualCost,
  activeTab = "details",
}: ProjectHeaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const rating = useMemo(() => {
    if (liveActualRating != null) return liveActualRating;
    const greenElements = selectedProject?.green_elements ?? [];
    const projectData = selectedProject?.projectData ?? selectedProject;
    if (!Array.isArray(greenElements) || greenElements.length === 0) {
      return project.rating ?? 0;
    }
    return computeActualMarks(greenElements, projectData);
  }, [liveActualRating, selectedProject, project.rating]);

  const targetCert = project.target_certification;
  const isNotCert = !targetCert || targetCert === "Not Certified";
  const predicted = project.rating ?? null;
  const marksDiff = predicted != null ? rating - predicted : null;
  const marksFavorable = marksDiff == null ? null : marksDiff >= 0;

  const costBreakdown = selectedProject?.projectData?.cost_breakdown;
  const hasCostBreakdown =
    costBreakdown && Object.keys(costBreakdown).length > 0;
  const predictedCost = hasCostBreakdown
    ? sumPredictedCost(costBreakdown)
    : null;
  const actualCost =
    liveActualCost != null
      ? liveActualCost
      : hasCostBreakdown
        ? sumActualCost(costBreakdown)
        : null;
  const costDiff =
    predictedCost != null && actualCost != null
      ? actualCost - predictedCost
      : null;
  const costFavorable = costDiff == null ? null : costDiff <= 0;

  const marksDeltaLabel =
    marksDiff == null
      ? ""
      : marksDiff === 0
        ? "On predicted"
        : `${marksDiff > 0 ? "+" : ""}${marksDiff} pts vs predicted`;

  const costDeltaLabel =
    costDiff == null
      ? ""
      : costDiff === 0
        ? "On budget"
        : `${costDiff > 0 ? "+" : "−"}${formatCurrency(Math.abs(costDiff))} vs predicted`;

  /* ── Right-panel content, branched by active tab ── */

  let panel: React.ReactNode;

  if (activeTab === "cost") {
    // Cost breakdown tab → feature the GBI marks comparison
    panel = isNotCert ? (
      <NoticePanel
        eyebrow="GBI Assessment"
        title="Assessment locked"
        description="This project is set to Not Certified, so marks comparison stays locked until the target rating is raised."
        badge="Locked"
      />
    ) : (
      <StatPanel eyebrow="GBI Assessment" badge={targetCert ?? "GBI"}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p
              className="text-[30px] font-semibold leading-none text-[#1E2621]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {rating}
              <span className="text-[16px] font-medium text-[#8A938C]">
                {" "}
                /100
              </span>
            </p>
            <p className="mt-1.5 text-[12px] text-[#5B655F]">
              Predicted {predicted ?? "—"} pts
            </p>
          </div>
        </div>
        <div className="mt-4">
          <GbiTrack predicted={predicted} actual={rating} />
          <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-[#8A938C]">
            <span className="h-0.75 w-3 rounded-full bg-[#1E2621]" /> Predicted
            marker
          </div>
        </div>
      </StatPanel>
    );
  } else if (activeTab === "gbi") {
    // GBI Assessment tab → feature the cost comparison
    panel = (
      <StatPanel eyebrow="Cost vs Predicted" badge="Cost">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p
              className="text-[24px] font-semibold leading-none text-[#1E2621]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {actualCost != null ? formatCurrency(actualCost) : "—"}
            </p>
            <p className="mt-1.5 text-[12px] text-[#5B655F]">
              Predicted{" "}
              {predictedCost != null ? formatCurrency(predictedCost) : "—"}
            </p>
          </div>
          <DeltaChip
            value={costDiff}
            favorable={costFavorable}
            label={costDeltaLabel}
          />
        </div>
        <div className="mt-4">
          <CostBars predicted={predictedCost} actual={actualCost} />
        </div>
      </StatPanel>
    );
  } else {
    // Details tab → glimpse of both, side by side
    panel = (
      <DetailsComparisonPanel
        isNotCert={isNotCert}
        rating={rating}
        predicted={predicted}
        marksDiff={marksDiff}
        marksFavorable={marksFavorable}
        marksDeltaLabel={marksDeltaLabel}
        actualCost={actualCost}
        predictedCost={predictedCost}
        costDiff={costDiff}
        costFavorable={costFavorable}
        costDeltaLabel={costDeltaLabel}
      />
    );
  }

  return (
    <>
      <div className="mb-6 overflow-hidden rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.05)]">
        <div className="grid grid-cols-1">
          <div
            className={`${panelOpen ? "border-b border-[#E4E1D8]" : ""} px-5 py-7 sm:px-7 sm:py-8 md:px-9 md:py-9`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3E6B52]">
                    Project Overview
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    aria-label="View project details"
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[#8A938C] transition-colors hover:bg-[#F1F0EA] hover:text-[#3E6B52] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
                  >
                    <Eye size={12} />
                  </button>
                </div>
                <h2
                  className="mt-2 text-[22px] font-semibold leading-tight text-[#1E2621] sm:text-[26px] lg:text-[30px]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {project.name || "Untitled Project"}
                </h2>
                {project.building_type && (
                  <p className="mt-1 text-[13.5px] font-medium text-[#5B655F]">
                    {BUILDING_TYPE_MAPPING[project.building_type]}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPanelOpen((o) => !o)}
                aria-expanded={panelOpen}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E4E1D8] bg-[#FBFAF7] px-4 py-2 text-[12.5px] font-medium text-[#5B655F] transition-colors hover:border-[#C9D3CC] hover:text-[#3E6B52] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
              >
                {panelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {panelOpen ? "Hide summary" : "Show summary"}
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {panelOpen && (
              <motion.div
                key="summary-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="p-5 sm:px-7 sm:py-6 md:px-9 md:py-7">
                  {panel}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showModal && (
        <ProjectDetailsModal
          project={project}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

/* ── Shared panel shells ── */

function StatPanel({
  eyebrow,
  badge,
  children,
}: {
  eyebrow: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A938C]">
          {eyebrow}
        </p>
        {badge && (
          <span className="rounded-full bg-[rgba(62,107,82,0.10)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#3E6B52]">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function NoticePanel({
  eyebrow,
  title,
  description,
  badge,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A938C]">
        {eyebrow}
      </p>
      <div className="mt-3 flex items-start gap-3 rounded-2xl border border-[#E4DFC0] bg-[#FFF9E6] px-4 py-3.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C08A3E] text-white">
          <AlertTriangle size={15} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#8A6420]">{title}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#71603F]">
            {description}
          </p>
          {badge && (
            <span className="mt-2 inline-flex rounded-full border border-[#E8D8A2] bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#8A6420]">
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Details tab: unified predicted-vs-actual snapshot ── */

function DetailsComparisonPanel({
  isNotCert,
  rating,
  predicted,
  marksDiff,
  marksFavorable,
  marksDeltaLabel,
  actualCost,
  predictedCost,
  costDiff,
  costFavorable,
  costDeltaLabel,
}: {
  isNotCert: boolean;
  rating: number;
  predicted: number | null;
  marksDiff: number | null;
  marksFavorable: boolean | null;
  marksDeltaLabel: string;
  actualCost: number | null;
  predictedCost: number | null;
  costDiff: number | null;
  costFavorable: boolean | null;
  costDeltaLabel: string;
}) {
  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A938C]">
          Assessment Snapshot
        </p>
        <span className="rounded-full bg-[rgba(124,136,128,0.10)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#5B655F]">
          Comparison
        </span>
      </div>

      {isNotCert ? (
        /* Not Certified → no GBI Assessment tab, so only show the cost gauge */
        <div className="pt-1">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-[#8A938C]">
            <Wallet size={12} />
            Cost
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <p
              className="text-[24px] font-semibold leading-none text-[#1E2621]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {actualCost != null ? formatCurrency(actualCost) : "—"}
            </p>
            <DeltaChip
              value={costDiff}
              favorable={costFavorable}
              label={costDeltaLabel}
            />
          </div>
          <p className="mt-0.5 text-[11.5px] text-[#5B655F]">
            Predicted{" "}
            {predictedCost != null ? formatCurrency(predictedCost) : "—"}
          </p>
          <div className="mt-2.5">
            <CostBars predicted={predictedCost} actual={actualCost} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 divide-y divide-[#EFEDE6] sm:grid-cols-2 sm:gap-6 sm:divide-x sm:divide-y-0">
          {/* GBI marks column */}
          <div className="pt-1 sm:pr-6 sm:pt-0">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-[#8A938C]">
              <Target size={12} />
              GBI Marks
            </div>

            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <p
                className="text-[24px] font-semibold leading-none text-[#1E2621]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {rating}
                <span className="text-[13px] font-medium text-[#8A938C]">
                  /100
                </span>
              </p>
              <DeltaChip
                value={marksDiff}
                favorable={marksFavorable}
                label={marksDeltaLabel}
              />
            </div>
            <p className="mt-0.5 text-[11.5px] text-[#5B655F]">
              Predicted {predicted ?? "—"} pts
            </p>
            <div className="mt-2.5">
              <GbiTrack predicted={predicted} actual={rating} />
            </div>
          </div>

          {/* Cost column */}
          <div className="pt-4 sm:pl-6 sm:pt-0">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-[#8A938C]">
              <Wallet size={12} />
              Cost
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <p
                className="text-[24px] font-semibold leading-none text-[#1E2621]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {actualCost != null ? formatCurrency(actualCost) : "—"}
              </p>
              <DeltaChip
                value={costDiff}
                favorable={costFavorable}
                label={costDeltaLabel}
              />
            </div>
            <p className="mt-0.5 text-[11.5px] text-[#5B655F]">
              Predicted{" "}
              {predictedCost != null ? formatCurrency(predictedCost) : "—"}
            </p>
            <div className="mt-2.5">
              <CostBars predicted={predictedCost} actual={actualCost} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Details modal (unchanged) ── */

function ProjectDetailsModal({
  project,
  onClose,
}: {
  project: ProjectHeaderProps["project"];
  onClose: () => void;
}) {
  const rows: { label: string; value: string; icon: React.ReactNode }[] = [
    {
      label: "Building Type",
      value: project.building_type || "\u2014",
      icon: <Building2 size={14} />,
    },
    {
      label: "Category",
      value: project.category || "\u2014",
      icon: <Layers size={14} />,
    },
    { label: "Classification", value: "Not provided", icon: <Tag size={14} /> },
    {
      label: "Structure",
      value: project.structure || "\u2014",
      icon: <Building2 size={14} />,
    },
    {
      label: "Location",
      value: project.location || "\u2014",
      icon: <MapPin size={14} />,
    },
    {
      label: "Size",
      value: project.size ? formatSize(project.size) : "\u2014",
      icon: <Ruler size={14} />,
    },
    {
      label: "Budget",
      value: project.budget ? formatCurrency(project.budget) : "\u2014",
      icon: <Wallet size={14} />,
    },
    {
      label: "Year",
      value: project.year || "\u2014",
      icon: <Calendar size={14} />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E2621]/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_24px_48px_rgba(30,38,33,0.16)]">
        <div className="flex items-center justify-between border-b border-[#EFEDE6] px-6 py-4">
          <span
            className="text-[12px] uppercase tracking-[0.08em] text-[#7C8880]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Project Details
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#8A938C] transition-colors hover:bg-[#F6F6F2] hover:text-[#1E2621]"
          >
            <X size={15} />
          </button>
        </div>
        <div className="divide-y divide-[#EFEDE6] px-6 py-4">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 py-3"
            >
              <span className="flex items-center gap-2 text-[12.5px] font-medium text-[#5B655F]">
                {row.icon}
                {row.label}
              </span>
              <span className="text-right text-[13px] font-semibold text-[#1E2621]">
                {row.value}
              </span>
            </div>
          ))}
        </div>
        {project.created_at && (
          <div className="flex items-center gap-2 border-t border-[#EFEDE6] px-6 py-3.5 text-[11.5px] text-[#8A938C]">
            <Clock size={13} />
            Created {formatDateTime(project.created_at)}
          </div>
        )}
      </div>
    </div>
  );
}
