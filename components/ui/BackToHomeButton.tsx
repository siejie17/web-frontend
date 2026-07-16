"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackToHomeButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/dashboard")}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E1D8] bg-white px-3.5 py-2 text-sm font-semibold text-[#1E2621] shadow-[0_4px_12px_rgba(30,38,33,0.05)] transition-colors duration-200 hover:bg-[#FBFAF7]"
    >
      <ChevronLeft size={16} />
      Back to Home
    </button>
  );
}