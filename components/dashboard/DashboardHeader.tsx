"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { getTimePeriod } from "@/lib/utils";

export function DashboardHeader({ firstName }: { firstName: string | undefined }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1
          className="truncate text-[22px] font-bold leading-tight tracking-[-0.01em] text-[#1E2621] sm:text-[26px] md:text-[28px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Good {getTimePeriod()}, {firstName || "there"}.
        </h1>
        <p className="mt-1 text-[13.5px] leading-relaxed text-[#5B655F] sm:text-[14.5px]">
          Here&apos;s an overview of your building assessment portfolio.
        </p>
      </div>

      <Link
        href="/assessments/new"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#3E6B52] px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_rgba(62,107,82,0.25)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] sm:px-5 sm:py-3 sm:text-[14px]"
      >
        <Plus size={18} />
        New assessment
      </Link>
    </div>
  );
}