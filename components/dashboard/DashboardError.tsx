"use client";

import { AlertTriangle } from "lucide-react";

export function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-260 flex-col items-center gap-3 rounded-xl2 border border-[#E4E1D8] bg-white px-6 py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F7EAE8] text-[#C4574A]">
        <AlertTriangle size={20} />
      </div>
      <div className="text-[15px] font-semibold text-[#1E2621]">
        Unable to load portfolio analytics.
      </div>
      <p className="max-w-sm text-[13px] text-[#5B655F]">
        Something went wrong while fetching your dashboard data. Check your connection and try again.
      </p>
      <button
        onClick={onRetry}
        className="mt-2 rounded-xl bg-[#3E6B52] px-5 py-2.5 text-[13.5px] font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
      >
        Try again
      </button>
    </div>
  );
}