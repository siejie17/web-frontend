"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarClock,
  MapPin,
  User2,
  Building2,
  Bolt,
  Wind,
  Layers,
  Droplet,
  Sparkles,
  type LucideIcon,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Ruler,
  HardHat,
  Scale,
  ListChecks,
} from "lucide-react";

import type { CertificationLevel, Criterion, ProjectMeta, ScoreSummary } from "@/types/project";
import AssessmentItemCard from "./AssessmentItemCard";

const tokens = {
  canvas: "#FAFAF7",
  surface: "#FFFFFF",
  ink: "#131A17",
  inkMuted: "#5B6A62",
  border: "#E5E7E0",
  predicted: "#3E5C8A",
  predictedSoft: "#EAEEF6",
  actual: "#1C7A5E",
  actualSoft: "#E4F3EC",
  amber: "#B3791E",
  amberSoft: "#FBF0DD",
  rust: "#AE4B32",
  rustSoft: "#FBEAE4",
} as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clampPct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const certificationPalette: Record<
  CertificationLevel,
  { bg: string; text: string; ring: string }
> = {
  Platinum: { bg: "bg-slate-900", text: "text-slate-50", ring: "ring-slate-700" },
  Gold: { bg: "bg-[#B3791E]", text: "text-amber-50", ring: "ring-[#8f5f16]" },
  Silver: { bg: "bg-slate-400", text: "text-white", ring: "ring-slate-300" },
  Certified: { bg: "bg-[#1C7A5E]", text: "text-white", ring: "ring-[#155c46]" },
  "Not Certified": { bg: "bg-[#AE4B32]", text: "text-white", ring: "ring-[#8c3a26]" },
};

const ICONS: Record<string, LucideIcon> = {
  bolt: Bolt,
  wind: Wind,
  layers: Layers,
  droplet: Droplet,
  sparkles: Sparkles,
};

const projectMeta: ProjectMeta = {
  projectName: "Riverine Business Park - Tower B",
  buildingType: "Commercial Office (New Construction)",
  assessmentTitle: "GBI Predicted vs. Actual Assessment",
  status: "In Review",
  lastUpdated: "Jul 14, 2026 · 4:32 PM",
  location: "Kuching, Sarawak",
  assessor: "N. Bujang, GBI Facilitator",
};

const criteria: Criterion[] = [
  {
    id: 1, name: "Energy Efficiency", icon: "bolt", totalMarks: 39, predictedMarks: 27, actualMarks: 24, items: [
      {
        id: 101,
        kind: "checkbox",
        description:
          "Building envelope achieves an OTTV of 35 W/m² or lower, verified by simulation.",
        info:
          "OTTV (Overall Thermal Transfer Value) measures heat gain through the envelope. Lower is better.",
        marks: 6,
        predictedChecked: true,
        actualChecked: true,
        predictedMarks: 6,
        actualMarks: 6,
      },
      {
        id: 102,
        kind: "options",
        description: "Renewable energy contribution to total building demand.",
        marks: 8,
        predictedMarks: 5,
        actualMarks: 3,
        optionGroups: [
          {
            id: 1,
            label: "Renewable sources installed",
            options: [
              { id: 1, description: "Rooftop photovoltaic array ≥ 5% of demand", marks: 3, predictedChecked: true, actualChecked: true },
              { id: 2, description: "Solar hot water for common areas", marks: 2, predictedChecked: true, actualChecked: false },
              { id: 3, description: "On-site energy storage integration", marks: 3, predictedChecked: false, actualChecked: false },
            ],
          },
        ],
      },
      {
        id: 103,
        kind: "selection",
        description: "Chiller plant efficiency band (kW/RT).",
        marks: 10,
        predictedMarks: 10,
        actualMarks: 6,
        selectionGroups: [
          {
            id: 1,
            label: "Measured plant efficiency",
            exclusive: true,
            predictedChoiceId: 3,
            actualChoiceId: 2,
            selections: [
              { id: 1, description: "0.55 – 0.60 kW/RT", marks: 6 },
              { id: 2, description: "0.50 – 0.55 kW/RT", marks: 8 },
              { id: 3, description: "Below 0.50 kW/RT", marks: 10 },
            ],
          },
        ],
      },
    ], subcriteria: null
  },
  { id: 2, name: "Indoor Environmental Quality", icon: "wind", totalMarks: 21, predictedMarks: 16, actualMarks: 12, items: null, subcriteria: null },
  { id: 3, name: "Sustainable Site Planning", icon: "layers", totalMarks: 16, predictedMarks: 11, actualMarks: 11, items: null, subcriteria: null },
  { id: 4, name: "Materials & Resources", icon: "layers", totalMarks: 10, predictedMarks: 5, actualMarks: 2, items: null, subcriteria: null },
  { id: 5, name: "Water Efficiency", icon: "droplet", totalMarks: 10, predictedMarks: 7, actualMarks: 7, items: null, subcriteria: null },
  { id: 6, name: "Innovation", icon: "sparkles", totalMarks: 4, predictedMarks: 2, actualMarks: 2, items: null, subcriteria: null },
];

export default function AssessmentWorkspace() {
  const [activeCriterionId, setActiveCriterionId] = useState(criteria[0].id);

  const activeCriterion = useMemo(
    () => criteria.find((criterion) => criterion.id === activeCriterionId) ?? criteria[0],
    [activeCriterionId]
  );

  const item = activeCriterion.items?.[2];

  console.log(item);

  const summary = useMemo<ScoreSummary>(() => {
    const predicted = criteria.reduce((sum, item) => sum + item.predictedMarks, 0);
    const actual = criteria.reduce((sum, item) => sum + item.actualMarks, 0);
    const total = criteria.reduce((sum, item) => sum + item.totalMarks, 0);

    return {
      predicted,
      actual,
      total,
      predictedPct: clampPct((predicted / total) * 100),
      actualPct: clampPct((actual / total) * 100),
      predictedLevel: "Certified",
      actualLevel: "Certified",
      completedCriteria: criteria.filter((item) => item.actualMarks >= item.totalMarks * 0.6).length,
      remainingCriteria: criteria.filter((item) => item.actualMarks < item.totalMarks * 0.6).length,
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* <AssessmentHero meta={projectMeta} summary={summary} /> */}

      <div className="flex flex-col gap-6 lg:flex-row">
        <AssessmentSidebar
          criteria={criteria}
          activeCriterionId={activeCriterionId}
          onSelect={setActiveCriterionId}
        />

        <div className="min-w-0 flex-1 space-y-4">
          <AssessmentSummary summary={summary} />
          <ComparisonOverview criterion={activeCriterion} />

          {item && (
            <AssessmentItemCard
              item={item}
              isPredictedChecked={item?.predictedChecked ?? false}
              isPredictedOptionChecked={(groupId, optionId) => {
                const group = item?.optionGroups?.find((g) => g.id === groupId);
                return !!group?.options?.find((opt) => opt.id === optionId)?.predictedChecked;
              }}
              predictedSelectionId={(groupId) => {
                const group = item?.selectionGroups?.find((g) => g.id === groupId);
                return group?.predictedChoiceId ?? null;
              }}
              actualAnswers={{
                items: {},
                options: {},
                subitems: {},
                customEntries: {},
              }}
              actualSelectionAnswers={{}}
              activeExclusiveGroup={null}
              predictedSubitemIds={[]}
              predictedCustomInputs={[]}
              actualOnlyCustomInputs={[]}
              customItems={[]}
              customInputValue=""
              onToggleItem={(key) => console.log("toggle item", key)}
              onToggleOption={(groupId, optionId) => console.log(groupId, optionId)}
              onSelectionChange={(groupId, selectionId, exclusive) =>
                console.log(groupId, selectionId, exclusive)
              }
              onToggleSubitem={(itemId, subitemId) => console.log(itemId, subitemId)}
              onToggleCustomEntry={(auditKey) => console.log(auditKey)}
              onCustomInputChange={(value) => console.log(value)}
              onAddCustomItem={() => console.log("add custom item")}
              onDeleteCustomItem={(customItemId) => console.log(customItemId)}
              onOpenInfo={(text, title, label) => console.log(text, title, label)}
              actualItemMarks={0}
              customEntryAuditKey={(itemId, value, index) => `${itemId}:${index}:${value}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AssessmentHero({
  meta,
  summary,
}: {
  meta: ProjectMeta;
  summary: ScoreSummary;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#E5E7E0] bg-[#131A17]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(#3E5C8A 1px, transparent 1px), linear-gradient(90deg, #3E5C8A 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#1C7A5E] opacity-[0.25] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#3E5C8A] opacity-[0.18] blur-3xl"
      />

      <div className="relative px-6 py-8 sm:px-10 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-wrap items-start justify-between gap-6"
        >
          <div className="max-w-2xl">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1",
                "bg-[#FBF0DD] text-[#8f5f16] ring-[#eddcb3]"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {meta.status}
            </span>

            <h1 className="mt-4 font-(--font-display,inherit) text-[28px] leading-tight tracking-tight text-white sm:text-[34px]">
              {meta.assessmentTitle}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-slate-400" />
                {meta.projectName}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                {meta.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <User2 className="h-4 w-4 text-slate-400" />
                {meta.assessor}
              </span>
            </div>

            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
              {meta.buildingType}. Compare the predicted design-stage score against
              the verified as-built score, section by section.
            </p>
          </div>

          <ScoreDial summary={summary} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mt-6 flex items-center gap-1.5 text-xs text-slate-400"
        >
          <CalendarClock className="h-3.5 w-3.5" />
          Last updated {meta.lastUpdated}
        </motion.div>
      </div>
    </div>
  );
}

function ScoreDial({ summary }: { summary: ScoreSummary }) {
  const size = 148;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const actualOffset = c - (summary.actualPct / 100) * c;

  return (
    <div className="relative shrink-0 rounded-2xl border border-white/10 bg-white/4 p-5 backdrop-blur-md">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#7A94C4"
          strokeWidth={stroke}
          strokeDasharray="2 5"
          strokeLinecap="round"
          fill="none"
          opacity={0.9}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r - stroke - 3}
          stroke="#233029"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r - stroke - 3}
          stroke="#25B587"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: actualOffset }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-white">{summary.actualPct}%</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          built to date
        </span>
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-dashed border-[#7A94C4]" />
          Predicted {summary.predictedPct}%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#25B587]" />
          Actual {summary.actualPct}%
        </span>
      </div>
    </div>
  );
}

function AssessmentSidebar({
  criteria,
  activeCriterionId,
  onSelect,
}: {
  criteria: Criterion[];
  activeCriterionId: number;
  onSelect: (id: number) => void;
}) {
  return (
    <nav
      aria-label="Assessment sections"
      className="sticky top-24 hidden max-h-[calc(100vh-7rem)] w-67 shrink-0 overflow-y-auto rounded-2xl border border-[#E5E7E0] bg-white p-3 lg:block"
    >
      <p className="px-3 pb-2 pt-1.5 text-xs font-semibold uppercase tracking-wide text-[#5B6B63]">
        Sections
      </p>
      <ul className="space-y-1">
        {criteria.map((criterion) => {
          const Icon = (criterion.icon && ICONS[criterion.icon]) || Layers;
          const pct = clampPct((criterion.actualMarks / (criterion.totalMarks || 1)) * 100);
          const isActive = criterion.id === activeCriterionId;

          return (
            <li key={criterion.id}>
              <button
                type="button"
                onClick={() => onSelect(criterion.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  isActive ? "bg-[#131A17] text-white" : "text-[#334138] hover:bg-[#F4F5F0]"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#25B587]"
                  />
                )}
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                    isActive ? "bg-white/10 text-white" : "bg-[#F0F1EC] text-[#5B6B63]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{criterion.name}</span>
                  <span className={cn("block text-[11px]", isActive ? "text-slate-300" : "text-[#98A399]")}>
                    {criterion.actualMarks}/{criterion.totalMarks} pts
                  </span>
                </span>

                <span className="relative h-8 w-8 shrink-0">
                  <svg viewBox="0 0 32 32" className="h-8 w-8 -rotate-90">
                    <circle cx={16} cy={16} r={13} strokeWidth={3} fill="none" stroke={isActive ? "rgba(255,255,255,0.15)" : "#EDEEE8"} />
                    <circle
                      cx={16}
                      cy={16}
                      r={13}
                      strokeWidth={3}
                      fill="none"
                      stroke={isActive ? "#25B587" : "#1C7A5E"}
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 13}
                      strokeDashoffset={2 * Math.PI * 13 * (1 - pct / 100)}
                    />
                  </svg>
                  <span
                    className={cn(
                      "absolute inset-0 flex items-center justify-center text-[9px] font-semibold",
                      isActive ? "text-white" : "text-[#334138]"
                    )}
                  >
                    {pct}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AssessmentSummary({ summary }: { summary: ScoreSummary }) {
  const diff = summary.actual - summary.predicted;
  const diffDirection = diff > 0 ? "up" : diff < 0 ? "down" : "flat";

  const cards = [
    {
      label: "Predicted score",
      value: `${summary.predicted}`,
      suffix: `/ ${summary.total}`,
      icon: Ruler,
      accent: tokens.predicted,
      accentSoft: tokens.predictedSoft,
      pct: summary.predictedPct,
    },
    {
      label: "Actual score",
      value: `${summary.actual}`,
      suffix: `/ ${summary.total}`,
      icon: HardHat,
      accent: tokens.actual,
      accentSoft: tokens.actualSoft,
      pct: summary.actualPct,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i, duration: 0.45, ease: "easeOut" }}
          whileHover={{ y: -3 }}
          className="group relative overflow-hidden rounded-2xl border border-[#E5E7E0] bg-white p-5 shadow-[0_1px_2px_rgba(19,26,23,0.04)] transition-shadow hover:shadow-[0_12px_24px_-12px_rgba(19,26,23,0.18)]"
        >
          <div className="flex items-start justify-between">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: card.accentSoft, color: card.accent }}
            >
              <card.icon className="h-4.5 w-4.5" strokeWidth={2} />
            </span>
            <span className="text-xs font-medium text-[#5B6B63]">{card.pct}%</span>
          </div>

          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-[#5B6B63]">
            {card.label}
          </p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tracking-tight text-[#131A17]">
              {card.value}
            </span>
            <span className="text-sm text-[#98A399]">{card.suffix}</span>
          </p>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#F0F1EC]">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: card.accent }}
              initial={{ width: 0 }}
              animate={{ width: `${card.pct}%` }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.05, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45, ease: "easeOut" }}
        whileHover={{ y: -3 }}
        className="relative overflow-hidden rounded-2xl border border-[#E5E7E0] bg-white p-5 shadow-[0_1px_2px_rgba(19,26,23,0.04)] transition-shadow hover:shadow-[0_12px_24px_-12px_rgba(19,26,23,0.18)]"
      >
        <div className="flex items-start justify-between">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              backgroundColor:
                diffDirection === "up" ? tokens.actualSoft : diffDirection === "down" ? tokens.rustSoft : "#F0F1EC",
              color:
                diffDirection === "up" ? tokens.actual : diffDirection === "down" ? tokens.rust : "#5B6B63",
            }}
          >
            <Scale className="h-4.5 w-4.5" strokeWidth={2} />
          </span>
          {diffDirection !== "flat" && (
            <span
              className="inline-flex items-center gap-0.5 text-xs font-semibold"
              style={{ color: diffDirection === "up" ? tokens.actual : tokens.rust }}
            >
              {diffDirection === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(diff)} pts
            </span>
          )}
        </div>

        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-[#5B6B63]">Difference</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tracking-tight text-[#131A17]">
            {diff > 0 ? "+" : ""}
            {diff}
          </span>
          <span className="text-sm text-[#98A399]">points</span>
        </p>
        <p className="mt-3 flex items-center gap-1 text-xs text-[#5B6B63]">
          {diffDirection === "flat" ? (
            <>
              <Minus className="h-3.5 w-3.5" /> As built matches the design intent
            </>
          ) : diffDirection === "up" ? (
            "As-built exceeded the design-stage prediction"
          ) : (
            "As-built fell short of the design-stage prediction"
          )}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45, ease: "easeOut" }}
        whileHover={{ y: -3 }}
        className="relative overflow-hidden rounded-2xl border border-[#E5E7E0] bg-white p-5 shadow-[0_1px_2px_rgba(19,26,23,0.04)] transition-shadow hover:shadow-[0_12px_24px_-12px_rgba(19,26,23,0.18)]"
      >
        <div className="flex items-start justify-between">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F1EC] text-[#131A17]">
            <ListChecks className="h-4.5 w-4.5" strokeWidth={2} />
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${certificationPalette[summary.actualLevel].bg} ${certificationPalette[summary.actualLevel].text}`}
          >
            {summary.actualLevel}
          </span>
        </div>

        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-[#5B6B63]">Criteria completed</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tracking-tight text-[#131A17]">
            {summary.completedCriteria}
          </span>
          <span className="text-sm text-[#98A399]">/ {summary.completedCriteria + summary.remainingCriteria}</span>
        </p>
        <p className="mt-3 text-xs text-[#5B6B63]">{summary.remainingCriteria} sections still open</p>
      </motion.div>
    </div>
  );
}

function ComparisonOverview({ criterion }: { criterion: Criterion }) {
  const total = criterion.totalMarks || 1;
  const predictedPct = clampPct((criterion.predictedMarks / total) * 100);
  const actualPct = clampPct((criterion.actualMarks / total) * 100);
  const diff = criterion.actualMarks - criterion.predictedMarks;

  return (
    <div className="rounded-2xl border border-[#E5E7E0] bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#131A17]">{criterion.name}</h3>
          <p className="text-xs text-[#5B6B63]">Predicted vs. actual for this section</p>
        </div>
        {diff !== 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              backgroundColor: diff > 0 ? "#E4F3EC" : "#FBEAE4",
              color: diff > 0 ? "#155c46" : "#8c3a26",
            }}
          >
            {diff > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(diff)} pts
          </span>
        )}
      </div>

      <div className="mt-5 space-y-4">
        <Row label="Predicted" color="#3E5C8A" track="#EAEEF6" value={criterion.predictedMarks} total={total} pct={predictedPct} dashed />
        <Row label="Actual" color="#1C7A5E" track="#E4F3EC" value={criterion.actualMarks} total={total} pct={actualPct} />
      </div>
    </div>
  );
}

function Row({
  label,
  color,
  track,
  value,
  total,
  pct,
  dashed,
}: {
  label: string;
  color: string;
  track: string;
  value: number;
  total: number;
  pct: number;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={dashed ? { border: `1.5px dashed ${color}` } : { backgroundColor: color }}
      />
      <span className="w-16 shrink-0 text-xs font-medium text-[#5B6B63]">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: track }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-sm font-semibold text-[#131A17]">
        {value}
        <span className="font-normal text-[#98A399]">/{total}</span>
      </span>
    </div>
  );
}
