"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
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
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { formatCurrency, formatSize } from "@/lib/utils";
import { computeActualMarks } from "@/lib/assessment-utils";

const BUILDING_TYPE_MAPPING: Record<string, string> = {
  NRNC: "Non-Residential New Construction (NRNC)",
  RNC: "Residential New Construction (RNC)",
  NREB: "Non-Residential Existing Building (NREB)",
};

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
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#F1F0EA] px-2 py-1 text-[10px] font-semibold text-[#8A938C] sm:px-2.5 sm:text-[11px]">
        <Minus size={11} />
        <span className="hidden xs:inline">No comparison</span>
        <span className="xs:hidden">N/A</span>
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
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold sm:px-2.5 sm:text-[11px]"
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
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[#EFEDE6] sm:h-3">
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
              <div className="h-3.5 w-0.75 rounded-full bg-[#1E2621] sm:h-4" />
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
    <div className="space-y-2 sm:space-y-2.5">
      {!revealed ? (
        <>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="w-14 shrink-0 text-[9.5px] font-semibold uppercase tracking-wide text-[#8A938C] sm:w-16 sm:text-[10px]">
              Predicted
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#EFEDE6]">
              <div className="h-2.5 w-3/4 animate-pulse rounded-full bg-[linear-gradient(90deg,#DFE4DE_0%,#EEF2EC_50%,#DFE4DE_100%)]" />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="w-14 shrink-0 text-[9.5px] font-semibold uppercase tracking-wide text-[#8A938C] sm:w-16 sm:text-[10px]">
              Actual
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#EFEDE6]">
              <div className="h-2.5 w-5/6 animate-pulse rounded-full bg-[linear-gradient(90deg,#DCE8E0_0%,#F2F6F3_50%,#DCE8E0_100%)]" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="w-14 shrink-0 text-[9.5px] font-semibold uppercase tracking-wide text-[#8A938C] sm:w-16 sm:text-[10px]">
              Predicted
            </span>
            <div className="h-2.5 flex-1 rounded-full bg-[#EFEDE6]">
              <div
                className="h-2.5 rounded-full border-2 border-[#B7C2BA]"
                style={{ width: `${predPct}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="w-14 shrink-0 text-[9.5px] font-semibold uppercase tracking-wide text-[#8A938C] sm:w-16 sm:text-[10px]">
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
    changed_cert?: number;
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
  const isNotCert = !targetCert || (targetCert === "Not Certified" && project.changed_cert == 0);
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

  /* ── Comparison content, branched by active tab ── */

  let panel: React.ReactNode;

  if (activeTab === "cost") {
    panel = isNotCert ? (
      <NoticeCard
        eyebrow="GBI Assessment"
        title="Assessment locked"
        description="Set to Not Certified, so marks comparison stays locked until the target rating is raised."
        badge="Locked"
      />
    ) : (
      <MetricCard eyebrow="GBI Assessment" badge={targetCert ?? "GBI"} accent="sage" icon={Target}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p
              className="text-[26px] font-semibold leading-none text-[#1E2621] sm:text-[30px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {rating}
              <span className="text-[14px] font-medium text-[#8A938C] sm:text-[16px]">
                {" "}
                /100
              </span>
            </p>
            <p className="mt-1.5 text-[11.5px] text-[#5B655F] sm:text-[12px]">
              Predicted {predicted ?? "—"} pts
            </p>
          </div>
        </div>
        <div className="mt-4">
          <GbiTrack predicted={predicted} actual={rating} />
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[#8A938C] sm:text-[10.5px]">
            <span className="h-0.75 w-3 rounded-full bg-[#1E2621]" /> Predicted marker
          </div>
        </div>
      </MetricCard>
    );
  } else if (activeTab === "gbi") {
    panel = (
      <MetricCard eyebrow="Cost vs Predicted" badge="Cost" accent="amber" icon={Wallet}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p
              className="text-[20px] font-semibold leading-none text-[#1E2621] sm:text-[24px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {actualCost != null ? formatCurrency(actualCost) : "—"}
            </p>
            <p className="mt-1.5 text-[11.5px] text-[#5B655F] sm:text-[12px]">
              Predicted{" "}
              {predictedCost != null ? formatCurrency(predictedCost) : "—"}
            </p>
          </div>
          <DeltaChip value={costDiff} favorable={costFavorable} label={costDeltaLabel} />
        </div>
        <div className="mt-4">
          <CostBars predicted={predictedCost} actual={actualCost} />
        </div>
      </MetricCard>
    );
  } else {
    panel = (
      <DetailsComparisonGrid
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
      <div className="mb-6 overflow-hidden rounded-2xl border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.05)] sm:rounded-3xl">
        {/* ── Title block ── */}
        <div className="border-b border-[#E4E1D8] bg-[linear-gradient(180deg,#FBFAF7_0%,#FFFFFF_100%)] px-4 py-5 sm:px-7 sm:py-7 md:px-9 md:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#3E6B52] sm:text-[11px]">
                  Project Overview
                </p>
              </div>
              <h2
                className="mt-1.5 truncate text-[20px] font-semibold leading-tight text-[#1E2621] xs:text-[22px] sm:text-[26px] lg:text-[30px]"
                style={{ fontFamily: "var(--font-display)" }}
                title={project.name}
              >
                {project.name || "Untitled Project"}
              </h2>
              {project.building_type && (
                <p className="mt-1 text-[12.5px] font-medium text-[#5B655F] sm:text-[13.5px]">
                  {BUILDING_TYPE_MAPPING[project.building_type]}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex w-fit shrink-0 items-center gap-1.5 self-start rounded-full border border-[#E4E1D8] bg-white px-3.5 py-2 text-[12px] font-medium text-[#5B655F] transition-colors hover:border-[#C9D3CC] hover:text-[#3E6B52] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] sm:text-[12.5px]"
            >
              <Eye size={13} />
              View details
              <ArrowUpRight size={12} className="text-[#8A938C]" />
            </button>
          </div>
        </div>

        {/* ── Comparison panel — always visible, reflows per breakpoint ── */}
        <div className="px-4 py-5 sm:px-7 sm:py-6 md:px-9 md:py-7">{panel}</div>
      </div>

      {showModal && (
        <ProjectDetailsModal project={project} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

/* ── Shared card shells ── */

const ACCENTS = {
  sage: { bar: "#3E6B52", badgeBg: "rgba(62,107,82,0.10)", badgeFg: "#3E6B52", iconBg: "rgba(62,107,82,0.10)" },
  amber: { bar: "#C08A3E", badgeBg: "rgba(200,138,62,0.13)", badgeFg: "#8A6420", iconBg: "rgba(200,138,62,0.13)" },
} as const;

function MetricCard({
  eyebrow,
  badge,
  accent,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  badge?: string;
  accent: keyof typeof ACCENTS;
  icon: any;
  children: React.ReactNode;
}) {
  const c = ACCENTS[accent];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#E4E1D8] bg-[#FBFAF7] p-4 sm:p-5">
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: c.bar }}
      />
      <div className="flex items-center justify-between pl-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: c.iconBg, color: c.bar }}
          >
            <Icon size={12} />
          </span>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8A938C] sm:text-[11px]">
            {eyebrow}
          </p>
        </div>
        {badge && (
          <span
            className="rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.06em] sm:text-[10px]"
            style={{ backgroundColor: c.badgeBg, color: c.badgeFg }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="pl-2 pt-3">{children}</div>
    </div>
  );
}

function NoticeCard({
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
    <div className="rounded-2xl border border-[#E4DFC0] bg-[#FFF9E6] p-4 sm:p-5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8A6420] sm:text-[11px]">
        {eyebrow}
      </p>
      <div className="mt-2.5 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C08A3E] text-white">
          <AlertTriangle size={15} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#8A6420]">{title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#71603F] sm:text-[12.5px]">
            {description}
          </p>
          {badge && (
            <span className="mt-2 inline-flex rounded-full border border-[#E8D8A2] bg-white/70 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[#8A6420] sm:text-[10px]">
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Details tab: unified predicted-vs-actual snapshot ── */

function DetailsComparisonGrid({
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
    <div className={`grid grid-cols-1 gap-3 sm:gap-4 ${isNotCert ? "" : "sm:grid-cols-2"}`}>
      {!isNotCert && (
        <MetricCard eyebrow="GBI Marks" accent="sage" icon={Target}>
          <div className="flex items-baseline justify-between gap-2">
            <p
              className="text-[22px] font-semibold leading-none text-[#1E2621] sm:text-[24px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {rating}
              <span className="text-[12px] font-medium text-[#8A938C] sm:text-[13px]">/100</span>
            </p>
            <DeltaChip value={marksDiff} favorable={marksFavorable} label={marksDeltaLabel} />
          </div>
          <p className="mt-0.5 text-[11px] text-[#5B655F] sm:text-[11.5px]">
            Predicted {predicted ?? "—"} pts
          </p>
          <div className="mt-2.5">
            <GbiTrack predicted={predicted} actual={rating} />
          </div>
        </MetricCard>
      )}

      <MetricCard eyebrow="Cost" accent="amber" icon={Wallet}>
        <div className="flex items-baseline justify-between gap-2">
          <p
            className="text-[22px] font-semibold leading-none text-[#1E2621] sm:text-[24px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {actualCost != null ? formatCurrency(actualCost) : "—"}
          </p>
          <DeltaChip value={costDiff} favorable={costFavorable} label={costDeltaLabel} />
        </div>
        <p className="mt-0.5 text-[11px] text-[#5B655F] sm:text-[11.5px]">
          Predicted {predictedCost != null ? formatCurrency(predictedCost) : "—"}
        </p>
        <div className="mt-2.5">
          <CostBars predicted={predictedCost} actual={actualCost} />
        </div>
      </MetricCard>

      {isNotCert && (
        <p className="text-[11.5px] text-[#8A938C]">
          GBI marks comparison is locked while this project is set to Not Certified.
        </p>
      )}
    </div>
  );
}

/* ── Details modal ── */

function ProjectDetailsModal({
  project,
  onClose,
}: {
  project: ProjectHeaderProps["project"];
  onClose: () => void;
}) {
  const rows: { label: string; value: string; icon: React.ReactNode }[] = [
    { label: "Building Type", value: project.building_type || "\u2014", icon: <Building2 size={14} /> },
    { label: "Category", value: project.category || "\u2014", icon: <Layers size={14} /> },
    { label: "Classification", value: "Not provided", icon: <Tag size={14} /> },
    { label: "Structure", value: project.structure || "\u2014", icon: <Building2 size={14} /> },
    { label: "Location", value: project.location || "\u2014", icon: <MapPin size={14} /> },
    { label: "Size", value: project.size ? formatSize(project.size) : "\u2014", icon: <Ruler size={14} /> },
    { label: "Budget", value: project.budget ? formatCurrency(project.budget) : "\u2014", icon: <Wallet size={14} /> },
    { label: "Year", value: project.year || "\u2014", icon: <Calendar size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E2621]/40 p-3 backdrop-blur-sm sm:p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#E4E1D8] bg-white shadow-[0_24px_48px_rgba(30,38,33,0.16)] sm:max-h-[90vh] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[#EFEDE6] px-5 py-4 sm:px-6">
          <span
            className="text-[11.5px] uppercase tracking-[0.08em] text-[#7C8880] sm:text-[12px]"
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
        <div className="divide-y divide-[#EFEDE6] px-5 py-4 sm:px-6">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 py-3">
              <span className="flex items-center gap-2 text-[12px] font-medium text-[#5B655F] sm:text-[12.5px]">
                {row.icon}
                {row.label}
              </span>
              <span className="max-w-[55%] truncate text-right text-[12.5px] font-semibold text-[#1E2621] sm:text-[13px]">
                {row.value}
              </span>
            </div>
          ))}
        </div>
        {project.created_at && (
          <div className="flex items-center gap-2 border-t border-[#EFEDE6] px-5 py-3.5 text-[11px] text-[#8A938C] sm:px-6 sm:text-[11.5px]">
            <Clock size={13} />
            Created {formatDateTime(project.created_at)}
          </div>
        )}
      </div>
    </div>
  );
}
