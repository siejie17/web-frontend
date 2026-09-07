"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2, Check, MessageSquareText } from "lucide-react";
import ProjectHeader from "@/components/project/ProjectHeader";
import ProjectDetailTabs from "@/components/tabs/ProjectDetailsTabs";
import CertificatePanel from "@/components/project/CertificatePanel";
import LoadingOverlay from "@/components/ui/LoadingOverlay";

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
  const [actualRating, setActualRating] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitRef = useRef<(() => Promise<void>) | null>(null);
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

  return (
    <div className="mx-auto max-w-375 pb-10 pt-6">
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
        <LoadingOverlay
          variant="light"
          title="Saving changes"
          description="This'll just take a second"
          className="z-30"
        />
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
