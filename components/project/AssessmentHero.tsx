"use client";

import { motion } from "framer-motion";
import { CalendarClock, MapPin, User2, Building2 } from "lucide-react";
import type { ProjectMeta, ScoreSummary } from "@/types/project";

const statusStyles: Record<ProjectMeta["status"], string> = {
  Draft: "bg-slate-100 text-slate-600 ring-slate-200",
  "In Review": "bg-[#FBF0DD] text-[#8f5f16] ring-[#eddcb3]",
  Submitted: "bg-[#EAEEF6] text-[#3E5C8A] ring-[#cdd7ea]",
  Certified: "bg-[#E4F3EC] text-[#155c46] ring-[#bfe4d3]",
};

export default function AssessmentHero({
  meta,
  summary,
}: {
  meta: ProjectMeta;
  summary: ScoreSummary;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#E5E7E0] bg-[#131A17]">
      {/* Blueprint grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(#3E5C8A 1px, transparent 1px), linear-gradient(90deg, #3E5C8A 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Decorative glow */}
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
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[meta.status]}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {meta.status}
            </span>

            <h1 className="mt-4 text-[28px] font-semibold leading-tight tracking-tight text-white sm:text-[34px]">
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

          {/* Blueprint → Built dial */}
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
        {/* Predicted — dashed "blueprint" outline (the plan) */}
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
