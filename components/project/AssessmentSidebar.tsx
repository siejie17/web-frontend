"use client";

import { motion } from "framer-motion";
import { Bolt, Wind, MapPin, Layers, Droplet, Sparkles, type LucideIcon } from "lucide-react";
import type { Criterion } from "@/types/project";
import { cn, clampPct } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  bolt: Bolt,
  wind: Wind,
  "map-pin": MapPin,
  layers: Layers,
  droplet: Droplet,
  sparkles: Sparkles,
};

export default function AssessmentSidebar({
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
      className="sticky top-24 hidden max-h-[calc(100vh-7rem)] w-[268px] shrink-0 overflow-y-auto rounded-2xl border border-[#E5E7E0] bg-white p-3 lg:block"
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
                  isActive
                    ? "bg-[#131A17] text-white"
                    : "text-[#334138] hover:bg-[#F4F5F0]"
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