"use client";

import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <section className="mx-auto flex max-w-200 items-center justify-center px-10 py-20">
      <div className="w-full max-w-140 rounded-3xl border border-[#E4E1D8] bg-[#FCFCF8] px-8 py-11 text-center shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:px-10">
        {/* Icon badge — echoes the success-state check badge on the assessment page */}
        <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#EFEDE6] text-[#7C8880]">
          <FileQuestion size={22} strokeWidth={1.75} />
        </span>

        <p
          className="mb-2 text-[12px] uppercase tracking-[0.08em] text-[#7C8880]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          404 — Page unavailable
        </p>

        <h1
          className="text-[28px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[30px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          We couldn&apos;t find that page
        </h1>

        <p className="mx-auto mt-3 max-w-110 text-[14px] leading-relaxed text-[#5B655F]">
          It may have been moved, renamed, or the link you followed could be out
          of date.
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-full bg-[#3E6B52] px-6 py-2.75 text-[13.5px] font-semibold text-[#F6F6F2] shadow-[0_12px_28px_rgba(62,107,82,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#345943] hover:shadow-[0_16px_36px_rgba(62,107,82,0.30)] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] sm:w-auto"
          >
            Return to dashboard
          </Link>

          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#E4E1D8] bg-white px-6 py-2.75 text-[13.5px] font-medium text-[#5B655F] transition-all hover:-translate-y-0.5 hover:border-[#C9D3CC] hover:text-[#3E6B52] hover:shadow-[0_10px_24px_rgba(30,38,33,0.08)] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] sm:w-auto"
          >
            <ArrowLeft size={14} />
            Go back
          </button>
        </div>
      </div>
    </section>
  );
}
