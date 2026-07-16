"use client";

import type { LucideIcon } from "lucide-react";

import AnimatedToggle from "./AnimatedToggle";

export default function PreferenceCard({
  icon: Icon,
  title,
  description,
  checked,
  loading,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  loading: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div
      className={`group flex items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 transition-all duration-200 ${
        checked
          ? "border-[#2F6B4F]/20 bg-[#2F6B4F]/[0.04]"
          : "border-transparent hover:border-[#E7E5DE] hover:bg-[#FAFAF8]"
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
            checked
              ? "bg-[#2F6B4F] text-white"
              : "bg-[#F4F3EF] text-[#6B756E]"
          }`}
        >
          <Icon size={15} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#17201B]">{title}</p>
          <p className="mt-0.5 text-sm text-[#9BA39C]">{description}</p>
        </div>
      </div>

      <AnimatedToggle checked={checked} disabled={loading} label={title} onChange={onChange} />
    </div>
  );
}