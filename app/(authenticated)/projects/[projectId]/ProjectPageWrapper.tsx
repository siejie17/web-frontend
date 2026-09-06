"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2, Check, MessageSquareText } from "lucide-react";
import { useRouter } from "next/navigation";
import ProjectHeader from "@/components/project/ProjectHeader";
import ProjectDetailTabs from "@/components/tabs/ProjectDetailsTabs";
import { BackButton } from "@/components/ui/BackButton";
import CertificatePanel from "@/components/project/CertificatePanel";

interface Props {
  project: any;
  selectedProject: any;
  isShared?: boolean;
}

export default function ProjectPageWrapper({
  project,
  selectedProject,
  isShared = false,
}: Props) {
  const router = useRouter();
  const [actualRating, setActualRating] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitRef = useRef<(() => Promise<void>) | null>(null);
  const pendingNavRef = useRef<(() => void) | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "cost" | "gbi" | "chat">(
    "details",
  );
  const assessmentStatus = selectedProject?.projectData?.assessment_status;
  const projectRetired = assessmentStatus === "requires_changes";
  const [actualCost, setActualCost] = useState<number | null>(null);

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
    if (!dirty || isShared) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, isShared]);

  const confirmThenBack = useCallback(() => {
    if (dirty && !isShared) {
      pendingNavRef.current = () => router.back();
      setConfirmLeave(true);
    } else {
      router.back();
    }
  }, [dirty, isShared, router]);

  return (
    <div className="mx-auto max-w-275 pb-10 pt-6">
      <BackButton action={confirmThenBack} />
      <ProjectHeader
        project={project}
        selectedProject={selectedProject}
        liveActualRating={actualRating}
        liveActualCost={actualCost}
        activeTab={activeTab}
      />
      <ReviewerFeedback project={selectedProject?.projectData} />
      <CertificatePanel
        certificate={selectedProject?.projectData?.certificate}
        projectId={Number(selectedProject?.projectData?.id ?? project?.id)}
      />
      <ProjectDetailTabs
        selectedProject={selectedProject}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onActualRatingChange={handleActualRatingChange}
        onUnsavedChange={setDirty}
        submitRef={submitRef}
        readOnly={isShared}
        isProjectOwner={!isShared}
        onActualCostChange={setActualCost}
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

      {/* Save button — only when there are unsaved changes and not shared */}
      {dirty && !isShared && (
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

function ReviewerFeedback({ project }: { project?: Record<string, unknown> }) {
  const remarks = typeof project?.review_remarks === "string" ? project.review_remarks.trim() : "";
  const status = typeof project?.assessment_status === "string" ? project.assessment_status : "submitted";
  const reviewedAt = typeof project?.reviewed_at === "string" ? project.reviewed_at : null;
  const certified = status === "certified";
  const statusLabel = certified ? "Certified" : "Actual Review";
  const reviewedDate = reviewedAt
    ? new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(reviewedAt.replace(" ", "T")))
    : null;

  return (
    <section className="mb-6 rounded-3xl border border-[#d9e5dc] bg-[#f7faf7] p-5 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-6" aria-labelledby="reviewer-feedback-title">
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f1e9] text-[#3e6b52]">
          <MessageSquareText size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="reviewer-feedback-title" className="text-sm font-bold text-[#27332c]">
              {certified ? "Actual assessment certified" : "Evidence and Actual assessment review"}
            </h2>
            <span className="rounded-full bg-[#e5efe7] px-2.5 py-1 text-[10px] font-semibold text-[#356247]">{statusLabel}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#59675e]">
            {certified
              ? "The administrator completed certification of the Actual assessment."
              : "Your Predicted assessment is the saved planning baseline. Upload supporting evidence for the measures implemented in your project; Actual marks are awarded by the reviewer."}
          </p>
          {remarks && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#6d796f]"><span className="font-semibold">Reviewer remarks:</span> {remarks}</p>}
          {reviewedDate && <p className="mt-3 text-[10.5px] text-[#849089]">Reviewed {reviewedDate}</p>}
        </div>
      </div>
    </section>
  );
}
