"use client";

import { motion, Variants } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus, Ruler, HardHat, Scale, ListChecks } from "lucide-react";
import type { ScoreSummary } from "@/types/project";
import { certificationPalette, tokens } from "@/lib/utils";

const cardVariants : Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 * i, duration: 0.45, ease: "easeOut" },
  }),
};

export default function AssessmentSummary({ summary }: { summary: ScoreSummary }) {
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
          custom={i}
          variants={cardVariants}
          initial="hidden"
          animate="show"
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

      {/* Difference */}
      <motion.div
        custom={2}
        variants={cardVariants}
        initial="hidden"
        animate="show"
        whileHover={{ y: -3 }}
        className="relative overflow-hidden rounded-2xl border border-[#E5E7E0] bg-white p-5 shadow-[0_1px_2px_rgba(19,26,23,0.04)] transition-shadow hover:shadow-[0_12px_24px_-12px_rgba(19,26,23,0.18)]"
      >
        <div className="flex items-start justify-between">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              backgroundColor: diffDirection === "up" ? tokens.actualSoft : diffDirection === "down" ? tokens.rustSoft : "#F0F1EC",
              color: diffDirection === "up" ? tokens.actual : diffDirection === "down" ? tokens.rust : "#5B6B63",
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

      {/* Completion */}
      <motion.div
        custom={3}
        variants={cardVariants}
        initial="hidden"
        animate="show"
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