"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import ProjectHeader from "@/components/project/ProjectHeader";
import ProjectDetailTabs from "@/components/tabs/ProjectDetailsTabs";
import { BackButton } from "@/components/ui/BackButton";

interface Props {
  project: any;
  selectedProject: any;
}

export default function ProjectPageWrapper({ project, selectedProject }: Props) {
  const router = useRouter();
  const [actualRating, setActualRating] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitRef = useRef<(() => Promise<void>) | null>(null);
  const pendingNavRef = useRef<(() => void) | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "cost" | "gbi">(
    "details",
  );

  const handleActualRatingChange = (rating: number) => {
    setActualRating(rating);
  };

  const handleSubmit = useCallback(async () => {
    if (!submitRef.current || submitting) return;
    setSubmitting(true);
    await submitRef.current();
    setSubmitting(false);
  }, [submitting]);

  // Warn on refresh/close/browser-back
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const confirmThenBack = useCallback(() => {
    if (dirty) {
      pendingNavRef.current = () => router.back();
      setConfirmLeave(true);
    } else {
      router.back();
    }
  }, [dirty, router]);

  return (
    <div className="mx-auto max-w-275 pb-10 pt-6">
      <BackButton action={confirmThenBack} />
      <ProjectHeader
        project={project}
        selectedProject={selectedProject}
        liveActualRating={actualRating}
        activeTab={activeTab}
      />
      <ProjectDetailTabs
        selectedProject={selectedProject}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onActualRatingChange={handleActualRatingChange}
        onUnsavedChange={setDirty}
        submitRef={submitRef}
      />

      {/* Loading overlay — blocks interaction while submitting */}
      {submitting && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-[#1E2621]/8 backdrop-blur-[3px]"
          style={{ animation: 'overlayFadeIn 0.25s ease-out' }}
        >
          <div
            className="flex flex-col items-center gap-4 rounded-[28px] border border-[#E4E1D8]/80 bg-white/95 px-10 py-8"
            style={{
              boxShadow:
                '0 24px 48px -12px rgba(30,38,33,0.18), 0 8px 20px -8px rgba(30,38,33,0.10), 0 0 0 1px rgba(228,225,216,0.6)',
              animation: 'cardRiseIn 0.35s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {/* Gradient ring spinner */}
            <div className="relative h-11 w-11">
              <svg viewBox="0 0 44 44" className="h-11 w-11" style={{ animation: 'spin 0.9s linear infinite' }}>
                <circle cx="22" cy="22" r="18" fill="none" stroke="#EDEAE0" strokeWidth="3.5" />
                <circle
                  cx="22" cy="22" r="18" fill="none"
                  stroke="url(#saveRingGradient)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="113"
                  strokeDashoffset="82"
                />
                <defs>
                  <linearGradient id="saveRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3E6B52" />
                    <stop offset="100%" stopColor="#8FB89C" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[14.5px] font-semibold tracking-[-0.01em] text-[#1E2621]">
                Saving changes
              </span>
              <span className="text-[12px] text-[#8A8F85]">This&lsquo;ll just take a second</span>
            </div>
          </div>

          <style>{`
            @keyframes overlayFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes cardRiseIn {
              from { opacity: 0; transform: scale(0.94) translateY(6px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Save button — only when there are unsaved changes */}
      {dirty && (
        <div className="flex items-center justify-end gap-3 bg-transparent">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-full bg-[#3E6B52] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(62,107,82,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(62,107,82,0.30)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {submitting ? "Saving\u2026" : "Save Changes"}
          </button>
        </div>
      )}

      {/* Confirm leave modal */}
      {confirmLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E2621]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-[#E4E1D8] bg-white px-6 py-6 shadow-[0_24px_48px_rgba(30,38,33,0.16)]">
            <p
              className="text-[15px] font-semibold text-[#1E2621]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Unsaved changes
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#5B655F]">
              You have changes that haven&apos;t been saved yet. Leaving will discard them.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  pendingNavRef.current = null;
                  setConfirmLeave(false);
                }}
                className="rounded-full border border-[#E4E1D8] bg-[#FBFAF7] px-4 py-2 text-[12.5px] font-medium text-[#5B655F] transition-colors hover:border-[#C9D3CC] hover:text-[#3E6B52]"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmLeave(false);
                  pendingNavRef.current?.();
                  pendingNavRef.current = null;
                }}
                className="rounded-full bg-[#B4483C] px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#963B31]"
              >
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
