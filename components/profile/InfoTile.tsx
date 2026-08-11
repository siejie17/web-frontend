"use client";

import type { LucideIcon } from "lucide-react";
import { Pencil } from "lucide-react";

export default function InfoTile({
  icon: Icon,
  label,
  value,
  onEdit,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  const isEmpty = value === "Not provided";

  return (
    <div className="group flex items-center justify-between gap-4 rounded-2xl border border-transparent px-3 py-3.5 transition-colors duration-200 hover:border-[#E7E5DE] hover:bg-[#FAFAF8]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F4F3EF] text-[#6B756E] transition-colors duration-200 group-hover:bg-[#2F6B4F]/10 group-hover:text-[#2F6B4F]">
          <Icon size={15} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[#9BA39C]">
            {label}
          </p>
          <p
            className={`mt-0.5 truncate text-sm font-medium ${
              isEmpty ? "text-[#B7BEB8]" : "text-[#17201B]"
            }`}
          >
            {value}
          </p>
        </div>
      </div>

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${label.toLowerCase()}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9BA39C] opacity-0 transition-all duration-200 hover:bg-white hover:text-[#2F6B4F] hover:shadow-sm group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Pencil size={13} />
        </button>
      )}
    </div>
  );
}