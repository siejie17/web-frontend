"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, FileBarChart, ShieldCheck, Target } from "lucide-react";

export type StatItem = {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
  accent: "green" | "gold";
};

// Placeholder defaults — swap for live data by passing a `stats` prop
// once an endpoint (e.g. /api/user-stats) is available.
export const defaultStats: StatItem[] = [
  { id: "projects", label: "Projects completed", value: "—", icon: CheckCircle2, accent: "green" },
  { id: "assessments", label: "Total assessments", value: "—", icon: FileBarChart, accent: "gold" },
  { id: "accuracy", label: "Accuracy rate", value: "—", icon: Target, accent: "green" },
  { id: "status", label: "Account status", value: "Active", icon: ShieldCheck, accent: "gold" },
];

const accentStyles = {
  green: {
    icon: "text-[#2F6B4F] bg-[#2F6B4F]/10",
    ring: "hover:border-[#2F6B4F]/25",
    bar: "from-[#2F6B4F] to-[#6FA98A]",
  },
  gold: {
    icon: "text-[#8A6B3B] bg-[#B8935A]/12",
    ring: "hover:border-[#B8935A]/30",
    bar: "from-[#B8935A] to-[#DCC08F]",
  },
} as const;

export default function UserStats({ stats = defaultStats }: { stats?: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const style = accentStyles[stat.accent];
        const Icon = stat.icon;

        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06 * index, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}
            className={`group relative overflow-hidden rounded-2xl border border-[#E7E5DE] bg-white p-4 shadow-[0_1px_2px_rgba(23,32,27,0.04)] transition-colors duration-300 sm:p-5 ${style.ring}`}
          >
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${style.bar} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
            />
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${style.icon}`}>
              <Icon size={17} strokeWidth={2} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-[#17201B]">
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs text-[#9BA39C]">{stat.label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}