"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Criterion } from "@/types/project";
import { clampPct } from "@/lib/utils";

export default function ComparisonOverview({ criterion }: { criterion: Criterion }) {
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