"use client";

import { ArrowUpRight, BadgeCheck, BookOpen, CheckCircle2, CircleAlert, ExternalLink, LoaderCircle, Paperclip, Save, Search, ShieldX, Trash2, UserMinus, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { AdminUser, administrationApi, Assessment, Paginated } from "@/lib/administrationApi";
import { ErrorState, inputClass, LoadingState, PageHeading, primaryButton, secondaryButton, StatusBadge } from "./AdminUI";
import EvidenceRemovalDialog from "@/components/assessment/EvidenceRemovalDialog";
import CertificatePanel, { IssuedCertificate } from "@/components/project/CertificatePanel";
import { isDistinctPurpose } from "@/lib/adminReviewContent";
import { calculateActualAwardedMarks, getCertificationReviewState, getReviewResultCategory, type ReviewResultCategory } from "@/lib/adminReviewResults";

type ScoreReviewItem = {
  item_id: number;
  criterion?: string | null;
  subcriterion?: string | null;
  description: string;
  info?: string | null;
  max_score: number;
  predicted_score: number;
  predicted_selections: string[];
  predicted_choices: Array<{ choice_key: string; label: string; score: number; selected: boolean }>;
  submitted_actual_score: number;
  actual_score: number;
  actual_selections: string[];
  actual_choices: Array<{ choice_key: string; label: string; score: number; submitted: boolean; accepted: boolean }>;
  remarks?: string | null;
  evidence?: Array<{ id: number; original_name: string; filename: string; kind: string; size: number; uploaded_at?: string | null }>;
};

type ScoreReview = {
  items: ScoreReviewItem[];
  predicted_total: number;
  actual_total: number;
  total_items: number;
  all_actual_reviewed: boolean;
  calculated_certification_level?: string | null;
  verification_status: string;
  certification_status: string;
};

type Detail = {
  assessment: Assessment & {
    review_remarks?: string;
    attachments?: Array<{ id: number; original_name: string; filename: string; kind: string; assessment_item_id?: number | null }>;
    reviews?: Array<{ id: number; action: string; remarks?: string; created_at: string; approved_actual_total?: number | null; certification_level?: string | null; reviewer?: AdminUser }>;
  };
  recommendation?: { title: string; content: string } | null;
  score_review: ScoreReview;
  certificate?: IssuedCertificate | null;
};

type ScoreUpdateResponse = {
  assessment: Detail["assessment"];
  score_review: ScoreReview;
};

type FacilitatorAssignment = NonNullable<Assessment["facilitator_assignments"]>[number];
type ReviewSectionKey = "summary" | "items" | "history" | "decision";
type ReviewItemFilter = "all" | "awarded" | "not_awarded";
type ReviewItemInsight = {
  item: ScoreReviewItem;
  predictedClaimed: boolean;
  evidenceSubmitted: boolean;
  actualAwarded: boolean;
  actualAwardedScore: number;
  hasRemark: boolean;
  decisionDirty: boolean;
  resultCategory: ReviewResultCategory;
};

const CHANGE_REQUEST_MIN_CHARACTERS = 80;
const CHANGE_REQUEST_MIN_WORDS = 12;

export default function AssessmentManagement({ mode }: { mode: "admin" | "facilitator" }) {
  const prefix = mode === "admin" ? "admin" : "facilitator";
  const [items, setItems] = useState<Assessment[]>([]);
  const [facilitators, setFacilitators] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [selected, setSelected] = useState<Detail | null>(null);
  const [remarks, setRemarks] = useState("");
  const [remarksRequired, setRemarksRequired] = useState(false);
  const [facilitatorId, setFacilitatorId] = useState("");
  const [awardedActualDraft, setAwardedActualDraft] = useState<Record<string, boolean>>({});
  const [itemRemarksDraft, setItemRemarksDraft] = useState<Record<number, string>>({});
  const [actualSelectionsDirty, setActualSelectionsDirty] = useState(false);
  const actualSelectionsDirtyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [removingEvidenceId, setRemovingEvidenceId] = useState<number | null>(null);
  const [pendingEvidenceRemoval, setPendingEvidenceRemoval] = useState<{ itemId: number; file: NonNullable<ScoreReviewItem["evidence"]>[number] } | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<FacilitatorAssignment | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pendingReviewConfirmation, setPendingReviewConfirmation] = useState<"certify" | "reopen" | null>(null);
  const [confirmCertificateRevocation, setConfirmCertificateRevocation] = useState(false);
  const [certificateRevocationReason, setCertificateRevocationReason] = useState("");
  const [requirementItem, setRequirementItem] = useState<ScoreReviewItem | null>(null);
  const [activeReviewSection, setActiveReviewSection] = useState<ReviewSectionKey>("summary");
  const [reviewItemFilter, setReviewItemFilter] = useState<ReviewItemFilter>("all");
  const reviewScrollRef = useRef<HTMLDivElement>(null);
  const reviewToolbarRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ q });
      if (status) params.set("status", status);
      const result = await administrationApi<Paginated<Assessment>>(`${prefix}/assessments?${params}`);
      setItems(result.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load assessments.");
    } finally {
      setLoading(false);
    }
  }, [prefix, q, status]);

  useEffect(() => {
    const id = setTimeout(load, 200);
    return () => clearTimeout(id);
  }, [load]);

  useEffect(() => {
    if (mode !== "admin") return;
    administrationApi<Paginated<AdminUser>>("admin/users?role=facilitator_admin")
      .then((result) => setFacilitators(result.data))
      .catch(() => null);
  }, [mode]);

  useEffect(() => {
    if (!selected) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (pendingEvidenceRemoval) {
        setPendingEvidenceRemoval(null);
      } else if (pendingRevoke) {
        setPendingRevoke(null);
      } else if (pendingReviewConfirmation) {
        setPendingReviewConfirmation(null);
      } else if (confirmCertificateRevocation) {
        setConfirmCertificateRevocation(false);
        setCertificateRevocationReason("");
      } else if (confirmDiscard) {
        setConfirmDiscard(false);
      } else if (actualSelectionsDirtyRef.current) {
        setConfirmDiscard(true);
      } else {
        setSelected(null);
      }
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selected, actualSelectionsDirty, pendingEvidenceRemoval, pendingRevoke, pendingReviewConfirmation, confirmCertificateRevocation, confirmDiscard]);

  useEffect(() => {
    const root = reviewScrollRef.current;
    if (!selected || !root) return;

    const sections: Array<{ key: ReviewSectionKey; id: string }> = [
      { key: "summary", id: "assessment-summary" },
      { key: "items", id: "review-items" },
      { key: "history", id: "review-history" },
      { key: "decision", id: "review-decision" },
    ];
    const visibleSections = new Set<ReviewSectionKey>();
    const toolbarOffset = reviewToolbarRef.current?.offsetHeight || 72;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const section = sections.find(({ id }) => id === entry.target.id);
        if (!section) return;
        if (entry.isIntersecting) visibleSections.add(section.key);
        else visibleSections.delete(section.key);
      });
      const active = sections.findLast(({ key }) => visibleSections.has(key));
      if (active) setActiveReviewSection((current) => current === active.key ? current : active.key);
    }, {
      root,
      rootMargin: `-${toolbarOffset + 12}px 0px -70% 0px`,
      threshold: 0,
    });

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [selected]);

  const applyDetail = (detail: Detail) => {
    setActiveReviewSection("summary");
    setSelected(detail);
    setAwardedActualDraft(Object.fromEntries(
      detail.score_review.items.flatMap((item) => item.actual_choices.map((choice) => [choice.choice_key, choice.accepted])),
    ));
    setItemRemarksDraft(Object.fromEntries(
      detail.score_review.items.map((item) => [item.item_id, item.remarks || ""]),
    ));
    actualSelectionsDirtyRef.current = false;
    setActualSelectionsDirty(false);
    setRemarks("");
    setRemarksRequired(false);
    setFacilitatorId("");
    setModalError("");
    setPendingReviewConfirmation(null);
    setConfirmCertificateRevocation(false);
    setCertificateRevocationReason("");
    setReviewItemFilter("all");
  };

  const open = async (item: Assessment) => {
    setError("");
    try {
      applyDetail(await administrationApi<Detail>(`${prefix}/assessments/${item.id}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to open assessment.");
    }
  };

  const assign = async () => {
    if (!selected || !facilitatorId) return;
    setBusy(true);
    setModalError("");
    try {
      const currentAssignments = selected.assessment.facilitator_assignments || [];
      const isReplacement = currentAssignments.length === 1;
      const assignment = await administrationApi<FacilitatorAssignment>(isReplacement
        ? `admin/assignments/${currentAssignments[0].id}`
        : `admin/assessments/${selected.assessment.id}/assign`, {
        method: isReplacement ? "PATCH" : "POST",
        body: JSON.stringify({ user_id: Number(facilitatorId) }),
      });
      setSelected((current) => current ? {
        ...current,
        assessment: {
          ...current.assessment,
          facilitator_assignments: isReplacement
            ? [assignment]
            : [...(current.assessment.facilitator_assignments || []), assignment],
        },
      } : current);
      setFacilitatorId("");
      await load();
    } catch (reason) {
      setModalError(reason instanceof Error ? reason.message : "Appointment failed.");
    } finally {
      setBusy(false);
    }
  };

  const revokeAssignment = async () => {
    if (!pendingRevoke) return;
    const assignment = pendingRevoke;
    setBusy(true);
    setModalError("");
    try {
      await administrationApi(`admin/assignments/${assignment.id}`, { method: "DELETE" });
      setSelected((current) => current ? {
        ...current,
        assessment: {
          ...current.assessment,
          facilitator_assignments: current.assessment.facilitator_assignments?.filter((item) => item.id !== assignment.id),
        },
      } : current);
      setFacilitatorId("");
      setPendingRevoke(null);
      await load();
    } catch (reason) {
      setModalError(reason instanceof Error ? reason.message : "Unable to revoke facilitator access.");
    } finally {
      setBusy(false);
    }
  };

  const saveActualSelections = async () => {
    if (!selected || selected.score_review.items.length === 0) return;
    setBusy(true);
    setModalError("");
    try {
      const result = await administrationApi<ScoreUpdateResponse>(`${prefix}/assessments/${selected.assessment.id}/actual-selections`, {
        method: "PATCH",
        body: JSON.stringify({
          items: selected.score_review.items.map((item) => ({
            item_id: item.item_id,
            accepted_choice_keys: item.actual_choices
              .filter((choice) => awardedActualDraft[choice.choice_key])
              .map((choice) => choice.choice_key),
            remarks: itemRemarksDraft[item.item_id]?.trim() || null,
          })),
        }),
      });
      applyDetail({
        ...selected,
        assessment: { ...selected.assessment, ...result.assessment },
        score_review: result.score_review,
      });
      await load();
    } catch (reason) {
      setModalError(reason instanceof Error ? reason.message : "Unable to save the Actual selections.");
    } finally {
      setBusy(false);
    }
  };

  const review = async (action: "verify" | "certify" | "reject" | "reopen") => {
    if (!selected) return;
    const trimmedRemarks = remarks.trim();
    const remarkWordCount = trimmedRemarks.split(/\s+/).filter(Boolean).length;
    if (action === "reject" && (trimmedRemarks.length < CHANGE_REQUEST_MIN_CHARACTERS || remarkWordCount < CHANGE_REQUEST_MIN_WORDS)) {
      setModalError("");
      setRemarksRequired(true);
      return;
    }
    setRemarksRequired(false);
    setPendingReviewConfirmation(null);
    setBusy(true);
    setModalError("");
    try {
      await administrationApi(`${prefix}/assessments/${selected.assessment.id}/review`, {
        method: "POST",
        body: JSON.stringify({ action, remarks }),
      });
      setSelected(null);
      await load();
    } catch (reason) {
      setModalError(reason instanceof Error ? reason.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  };

  const revokeCertificate = async () => {
    if (!selected || mode !== "admin") return;
    const reason = certificateRevocationReason.trim();
    if (!reason) return;

    setBusy(true);
    setModalError("");
    try {
      await administrationApi(`admin/assessments/${selected.assessment.id}/certificate`, {
        method: "DELETE",
        body: JSON.stringify({ reason }),
      });
      applyDetail(await administrationApi<Detail>(`admin/assessments/${selected.assessment.id}`));
      await load();
    } catch (reason) {
      setModalError(reason instanceof Error ? reason.message : "Unable to revoke the certificate.");
    } finally {
      setBusy(false);
    }
  };

  const removeEvidence = async (itemId: number, file: NonNullable<ScoreReviewItem["evidence"]>[number]) => {
    if (!selected || removingEvidenceId) return;
    setRemovingEvidenceId(file.id);
    setModalError("");
    try {
      const response = await fetch(`/be-api/projects/${selected.assessment.id}/attachments/${file.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Unable to remove evidence.");
      setSelected((current) => current ? {
        ...current,
        assessment: {
          ...current.assessment,
          attachments: current.assessment.attachments?.filter((attachment) => attachment.id !== file.id),
        },
        score_review: {
          ...current.score_review,
          items: current.score_review.items.map((item) => item.item_id === itemId
            ? { ...item, evidence: item.evidence?.filter((evidence) => evidence.id !== file.id) }
            : item),
        },
      } : current);
      setPendingEvidenceRemoval(null);
    } catch (reason) {
      setModalError(reason instanceof Error ? reason.message : "Unable to remove evidence.");
    } finally {
      setRemovingEvidenceId(null);
    }
  };

  const closeReview = () => {
    if (actualSelectionsDirtyRef.current) {
      setConfirmDiscard(true);
      return;
    }
    setSelected(null);
  };

  const discardAndClose = () => {
    actualSelectionsDirtyRef.current = false;
    setActualSelectionsDirty(false);
    setConfirmDiscard(false);
    setSelected(null);
  };

  const draftTotal = selected?.score_review.items.reduce(
    (sum, item) => sum + calculateActualAwardedMarks(item.actual_choices, awardedActualDraft, item.max_score),
    0,
  ) ?? 0;
  const maximumTotal = selected?.score_review.items.reduce((sum, item) => sum + item.max_score, 0) ?? 0;
  const formatScore = (score: number) => maximumTotal > 0 ? `${score} / ${maximumTotal}` : score;
  const everyItemReviewed = selected?.score_review.all_actual_reviewed ?? false;
  const certificationQualified = Boolean(
    selected?.score_review.calculated_certification_level
      && selected.score_review.calculated_certification_level !== "Not Certified",
  );
  const predictionApproved = selected
    ? ["verified", "certified"].includes(selected.assessment.assessment_status)
    : false;
  const predictionRejected = selected?.assessment.assessment_status === "requires_changes";
  const activeAssignments = selected?.assessment.facilitator_assignments || [];
  const availableFacilitators = facilitators.filter((facilitator) =>
    !activeAssignments.some((assignment) => assignment.user_id === facilitator.id),
  );
  const reviewSummary = buildReviewSummary(
    selected?.score_review.items || [],
    awardedActualDraft,
    itemRemarksDraft,
  );
  const visibleActualItems = reviewSummary.insights.filter((insight) => {
    if (reviewItemFilter === "all") return true;
    if (reviewItemFilter === "awarded") return insight.resultCategory === "awarded";
    return insight.resultCategory === "not-awarded";
  });
  const emptyFilterMessage = reviewItemFilter === "awarded"
    ? "No items currently have awarded Actual marks."
    : "No items currently have zero Actual marks.";
  const certificateIssued = selected?.certificate?.status === "issued";
  const { certificationDoesNotQualify, certificationReady } = getCertificationReviewState({
    predictionApproved,
    everyItemReviewed,
    hasUnsavedChanges: actualSelectionsDirty,
    certificationQualified,
    certificateIssued,
  });
  const readinessReasons = predictionApproved ? [
    ...(selected?.score_review.total_items === 0 ? ["No assessment items are available to review."] : []),
    ...(!everyItemReviewed ? ["Save reviewer decisions before certification."] : []),
    ...(actualSelectionsDirty ? ["Actual selections or reviewer remarks have unsaved changes."] : []),
    ...(everyItemReviewed && !certificationQualified ? ["The saved Actual score does not qualify for a configured certification level."] : []),
  ] : [];
  const reviewNavigationColumnClass = predictionRejected
    ? selected?.assessment.reviews?.length ? "grid-cols-3" : "grid-cols-2"
    : selected?.assessment.reviews?.length ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3";
  const reviewSectionClass = (section: ReviewSectionKey) => `inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition ${activeReviewSection === section ? "bg-white text-[#315b45] shadow-sm ring-1 ring-[#dce6de]" : "text-[#66756c] hover:bg-white/70 hover:text-[#315b45]"}`;
  const scrollToReviewSection = (section: ReviewSectionKey, id: string) => {
    const container = reviewScrollRef.current;
    if (!container) return;
    setActiveReviewSection(section);

    if (section === "summary") {
      container.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const target = container.querySelector<HTMLElement>(`#${id}`);
    if (!target) return;
    const toolbarOffset = reviewToolbarRef.current?.offsetHeight || 0;
    const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - toolbarOffset - 12;
    container.scrollTo({ top, behavior: "smooth" });
  };
  const scrollToFacilitatorAccess = () => {
    const container = reviewScrollRef.current;
    const target = container?.querySelector<HTMLElement>("#facilitator-access");
    if (!container || !target) return;
    const toolbarOffset = reviewToolbarRef.current?.offsetHeight || 0;
    const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - toolbarOffset - 12;
    container.scrollTo({ top, behavior: "smooth" });
  };
  return (
    <>
      <PageHeading
        eyebrow={mode === "admin" ? "Assessment operations" : "Assigned verification"}
        title={mode === "admin" ? "Assessment management" : "My appointments"}
        description={mode === "admin"
          ? "Approve the Predicted assessment before construction, then review evidence and certify the Actual result."
          : "Verify the Predicted assessment first, then review construction evidence and the Actual result."}
      />

      <div className="mb-5 grid gap-3 rounded-2xl border border-[#e1e5de] bg-white p-4 sm:grid-cols-[1fr_220px]">
        <label className="relative">
          <Search className="absolute left-3.5 top-3 text-[#819087]" size={17} />
          <input className={`${inputClass} pl-10`} value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search project or client email" />
        </label>
        <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {[{ value: "awaiting_verification", label: "Awaiting Verification" }, { value: "changes_requested", label: "Changes Requested" }, { value: "verified", label: "Verified" }, { value: "certified", label: "Certified" }].map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      {loading ? <LoadingState /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <button key={item.id} onClick={() => open(item)} className="group relative overflow-hidden rounded-3xl border border-[#dfe5df] bg-white text-left shadow-[0_8px_24px_rgba(30,38,33,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-[#a9c0af] hover:shadow-[0_16px_34px_rgba(30,65,43,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3e6b52]">
              <span className="block h-1 bg-linear-to-r from-[#2f6849] to-[#6b9a7d]" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf2ec] text-[#356b4d] ring-1 ring-[#dce8df]"><BadgeCheck size={19} /></span>
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a8880]">Assessment #{item.id}</span>
                  </div>
                  <StatusBadge value={item.assessment_status} />
                </div>

                <h2 className="mt-5 truncate text-lg font-bold text-[#203229]">{item.name}</h2>
                <p className="mt-1.5 truncate text-sm text-[#6b7970]">{item.owner?.email}</p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#f4f7f3] px-3.5 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7a8780]">Predicted score</p>
                    <p className="mt-1 text-base font-bold text-[#203229]">{item.rating ?? 0} <span className="text-xs font-semibold text-[#7b8780]">/ 100</span></p>
                  </div>
                  <div className="rounded-xl bg-[#eef5ef] px-3.5 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#708078]">Target</p>
                    <p className="mt-1 truncate text-sm font-bold text-[#356247]">{item.target_certification || "Unclassified"}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-1.5 text-sm font-semibold text-[#3e6b52]">
                  Open assessment <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
              </div>
            </button>
          ))}
          {items.length === 0 && <div className="col-span-full rounded-3xl border border-dashed border-[#ced7cf] bg-white p-12 text-center text-sm text-[#77827b]">No assessments match this view.</div>}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-60 flex items-end justify-center overflow-hidden bg-black/30 p-0 sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="assessment-review-title"
            className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-auto sm:max-h-[94dvh] sm:rounded-3xl"
          >
            <div className="z-20 flex shrink-0 items-start justify-between gap-4 border-b border-[#edf0eb] bg-white px-6 py-5 shadow-[0_8px_18px_rgba(30,38,33,0.04)] sm:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#789083]">Assessment #{selected.assessment.id}</p>
                <h2 id="assessment-review-title" className="mt-2 text-2xl font-bold text-[#173b2a]">{selected.assessment.name}</h2>
                <p className="mt-1 text-sm text-[#6d796f]">{selected.assessment.owner?.email}</p>
                {mode === "admin" && <div className="mt-2 flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold text-[#536159]">Facilitator:</span><span className={activeAssignments.length > 0 ? "font-semibold text-[#315b45]" : "text-[#8a948e]"}>{activeAssignments.length > 0 ? activeAssignments.map((assignment) => `${assignment.facilitator?.first_name || ""} ${assignment.facilitator?.last_name || ""}`.trim()).filter(Boolean).join(", ") : "Not assigned"}</span><button type="button" aria-controls="facilitator-access" onClick={scrollToFacilitatorAccess} className="rounded-md bg-[#eaf2eb] px-2 py-1 font-semibold text-[#315b45] transition hover:bg-[#dce9df]">{activeAssignments.length > 0 ? "Change" : "Assign facilitator"}</button></div>}
              </div>
              <button onClick={closeReview} className="rounded-full bg-[#f1f3ef] p-2 text-[#65736a]" aria-label="Close assessment"><X size={18} /></button>
            </div>

            <div ref={reviewScrollRef} className="scrollbar-hidden min-h-0 flex-1 overscroll-contain overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-8">

            <div ref={reviewToolbarRef} className="sticky top-0 z-10 -mx-6 flex flex-col gap-2 border-b border-[#dbe4dc] bg-[#fbfcfa] px-6 py-3 shadow-[0_8px_20px_rgba(30,38,33,0.06)] sm:-mx-8 sm:px-8">
              <div className={predictionApproved ? "grid w-full items-stretch gap-2 sm:grid-cols-2 lg:grid-cols-4" : "flex flex-wrap items-center gap-2"}>
                {predictionApproved ? <>
                  <span className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-[#dce5de] bg-white px-3 py-2 text-sm text-[#65736a]">Actual score <strong className="ml-1 text-[#294334]">{formatScore(draftTotal)}</strong></span>
                  <span className="inline-flex items-center justify-center rounded-xl bg-[#edf4ee] px-3 py-2 text-sm text-[#53645a]">Evidence submitted <strong className="ml-1 text-[#294334]">{reviewSummary.evidenceSubmittedItems}</strong></span>
                  <span className="inline-flex items-center justify-center rounded-xl bg-[#f1f3ef] px-3 py-2 text-sm text-[#65736a]">Evidence not submitted <strong className="ml-1 text-[#294334]">{reviewSummary.evidenceNotSubmittedItems}</strong></span>
                  <span className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-center text-sm font-semibold ${certificateIssued || certificationReady ? "bg-[#eaf4ec] text-[#356247]" : "bg-[#fff4df] text-[#8a6420]"}`}>
                    {certificateIssued || certificationReady ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
                    {certificateIssued ? "Certification issued" : certificationReady ? "Ready for certification" : certificationDoesNotQualify ? "Does not currently qualify" : "Not ready for certification"}
                  </span>
                </> : <>
                  <span className="rounded-xl border border-[#dce5de] bg-white px-3 py-2 text-sm text-[#65736a]">Predicted score <strong className="ml-1 text-[#294334]">{formatScore(selected.score_review.predicted_total)}</strong></span>
                  <span className="rounded-xl bg-[#eef3ef] px-3 py-2 text-sm font-semibold text-[#53645a]">{selected.score_review.total_items} GBI items</span>
                </>}
              </div>
              <nav aria-label="Assessment review sections" className={`grid w-full gap-1 rounded-xl border border-[#e0e6e0] bg-[#f0f4f0] p-1 ${reviewNavigationColumnClass}`}>
                <button type="button" onClick={() => scrollToReviewSection("summary", "assessment-summary")} className={reviewSectionClass("summary")}>Summary</button>
                <button type="button" onClick={() => scrollToReviewSection("items", "review-items")} className={reviewSectionClass("items")}>Review items</button>
                {!!selected.assessment.reviews?.length && <button type="button" onClick={() => scrollToReviewSection("history", "review-history")} className={reviewSectionClass("history")}>History</button>}
                {!predictionRejected && <button type="button" onClick={() => scrollToReviewSection("decision", "review-decision")} className={reviewSectionClass("decision")}>Decision</button>}
              </nav>
            </div>

            <div id="assessment-summary" className="mt-6 scroll-mt-20 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              <Summary label="Predicted total score" value={formatScore(selected.score_review.predicted_total)} />
              {predictionApproved && <>
                <Summary label="Actual total score" value={formatScore(actualSelectionsDirty ? draftTotal : selected.score_review.actual_total)} />
              </>}
              <div className="rounded-xl bg-[#f4f6f2] p-4"><p className="text-sm text-[#7c8880]">Verification</p><div className="mt-1"><StatusBadge value={selected.score_review.verification_status} /></div></div>
              {predictionApproved && <div className="rounded-xl bg-[#f4f6f2] p-4"><p className="text-sm text-[#7c8880]">Certification</p><div className="mt-1"><StatusBadge value={selected.score_review.certification_status} /></div>{selected.score_review.calculated_certification_level && <p className="mt-1 text-sm font-semibold text-[#3e6b52]">{selected.score_review.calculated_certification_level}</p>}</div>}
            </div>

            {selected.certificate && (
              <div className="mt-6">
                <CertificatePanel certificate={selected.certificate} projectId={selected.assessment.id} />
                {mode === "admin" && selected.certificate.status === "issued" && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmCertificateRevocation(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#d7b7b2] bg-white px-3 py-2 text-sm font-semibold text-[#a04438] transition hover:bg-[#fff6f4] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ShieldX size={15} />
                      Revoke certificate
                    </button>
                  </div>
                )}
              </div>
            )}

            {modalError && <div className="mt-5"><ErrorState message={modalError} /></div>}

            {!predictionApproved && (
              <section id="review-items" className={`mt-6 scroll-mt-20 rounded-2xl border p-5 ${predictionRejected ? "border-[#ead9bd] bg-[#fffaf0]" : "border-[#dce5dd] bg-[#f5f9f5]"}`}>
                <h3 className="text-sm font-bold text-[#27332c]">Predicted assessment decision</h3>
                <p className="mt-2 text-sm leading-6 text-[#68756d]">
                  {predictionRejected
                    ? "Changes were requested for this project. The user must create a new project with revised inputs; this project remains as a read-only record."
                    : "Review the read-only Predicted result. Verify it to let the user proceed with construction, or request changes with a clear remark."}
                </p>
                {predictionRejected && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPendingReviewConfirmation("reopen")}
                    className={`${secondaryButton} mt-4`}
                  >Undo changes request</button>
                )}
                <div className="mt-4 divide-y divide-[#e5e9e4] overflow-hidden rounded-xl border border-[#e0e6e0] bg-white">
                  {selected.score_review.items.map((item) => (
                    <article key={item.item_id} className="p-4" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 320px" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#789083]">{[item.criterion, item.subcriterion].filter(Boolean).join(" / ") || `Item ${item.item_id}`}</p>
                          <p className="mt-1 text-sm font-semibold leading-5 text-[#2c3730]">{item.description}</p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-[#eef2ee] px-2.5 py-1.5 text-sm font-bold text-[#344139]">{item.predicted_score}/{item.max_score}</span>
                      </div>
                      <GbiItemContext info={item.info} choices={item.predicted_choices} />
                    </article>
                  ))}
                </div>
              </section>
            )}

            {predictionApproved && <section id="review-items" className="mt-6 scroll-mt-20 overflow-hidden rounded-2xl border border-[#dfe5df]">
              <div className="flex flex-col gap-3 border-b border-[#e7ebe6] bg-[#f7f9f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div><h3 className="text-base font-bold text-[#27332c]">Actual assessment review</h3><p className="mt-1 text-sm leading-6 text-[#738078]">Review the applicant&apos;s evidence, then award only the Actual marks that the evidence sufficiently supports. Predicted remains read-only.</p></div>
                <span className="inline-flex w-fit items-center rounded-full border border-[#d8e5db] bg-white px-3 py-1.5 text-sm font-semibold text-[#3e6b52]">Actual draft total&nbsp; {draftTotal}</span>
              </div>
              <AdminReviewOverview
                summary={reviewSummary}
                actualScore={draftTotal}
                maximumScore={maximumTotal}
                certificationLevel={selected.score_review.calculated_certification_level}
                certificateIssued={certificateIssued}
                certificationReady={certificationReady}
                certificationDoesNotQualify={certificationDoesNotQualify}
                readinessReasons={readinessReasons}
                filter={reviewItemFilter}
                onFilterChange={setReviewItemFilter}
                onProceedToDecision={() => scrollToReviewSection("decision", "review-decision")}
              />
              <div className="divide-y divide-[#edf0eb]">
                {visibleActualItems.map((insight) => {
                  const item = insight.item;
                  const requirementGuidance = getGbiRequirementGuidance(item);
                  const requirementIsLong = isLongRequirement(requirementGuidance);
                  const purpose = extractGbiPurpose(item.info);
                  const showPurpose = isDistinctPurpose(requirementGuidance, purpose);
                  return (
                  <article key={item.item_id} className="p-5 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#789083]">{[item.criterion, item.subcriterion].filter(Boolean).join(" / ") || `Item ${item.item_id}`}</p>
                        <p className="mt-1.5 text-sm font-semibold leading-5 text-[#2c3730]">{item.description}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-xl border border-[#cad8ce] bg-[#f6faf7] px-3 py-2 text-sm font-bold text-[#315b45]">Actual {insight.actualAwardedScore} / {item.max_score}</span>
                      </div>
                    </div>

                    <ItemReviewGuidance insight={insight} />

                    <div className="mt-3 grid items-start gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.75fr)_minmax(0,1.2fr)]">
                      <section className="rounded-2xl border border-[#dfe6df] bg-[#fafcf9] p-4 md:row-span-2 xl:row-span-1">
                        <div className="flex items-center justify-between gap-3 border-b border-[#e4e9e4] pb-3">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#52705e]">GBI requirement</p>
                          {requirementIsLong && <button type="button" onClick={() => setRequirementItem(item)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#d6e1d8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#52705e] transition hover:border-[#9fb5a5] hover:bg-[#f8fbf8]"><BookOpen size={13} />Open full requirement</button>}
                        </div>
                        <div className="mt-3">
                          <GbiRequirementContent guidance={requirementGuidance} compact preview={requirementIsLong} />
                        </div>
                        {showPurpose && <details className="group mt-3 border-t border-[#e4e9e4] pt-2.5">
                          <summary className="cursor-pointer list-none text-xs font-semibold text-[#657a6d] marker:hidden after:ml-1 after:content-['▸'] group-open:after:content-['▾']">Why this matters</summary>
                          <p className="mt-2 text-sm leading-5 text-[#5f6d64]">{purpose}</p>
                        </details>}
                      </section>

                      <section className="rounded-2xl border border-[#e2e6e1] bg-white p-4">
                        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[#657a6d]"><Paperclip size={13} /> Applicant evidence</p>
                        {!!item.evidence?.length ? <div className="mt-3 space-y-1.5">{item.evidence.map((file) => (
                          <div key={file.id} className="flex min-w-0 items-center gap-1.5">
                            <a href={`/be-api/media/${encodeURIComponent(file.filename)}`} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-[#dce7df] bg-[#f8faf8] px-2.5 py-2 text-sm text-[#3e6b52] transition hover:border-[#90aa98]">
                              <span className="min-w-0 truncate">{file.original_name}</span><span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold">Open <ExternalLink size={11} /></span>
                            </a>
                            <button type="button" disabled={removingEvidenceId === file.id} onClick={() => setPendingEvidenceRemoval({ itemId: item.item_id, file })} aria-label={`Remove ${file.original_name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-white text-red-500 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-wait disabled:opacity-50">
                              {removingEvidenceId === file.id ? <LoaderCircle size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        ))}</div> : <p className="mt-3 text-sm leading-5 text-[#7d8981]">No evidence submitted.</p>}
                      </section>

                      <section className="rounded-2xl border border-[#d8e5dc] bg-[#f6faf7] p-4">
                        <div className="border-b border-[#dfe9e2] pb-3">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#52705e]">Actual assessment</p>
                          <p className="mt-0.5 text-xs text-[#7f9085]">Admin / Facilitator determination</p>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-[#617168]">Checked options receive their Actual marks.</p>
                        {item.actual_choices.length > 0 ? <div className="mt-3 space-y-2">{item.actual_choices.map((choice) => (
                          <label key={choice.choice_key} className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm leading-5 transition ${awardedActualDraft[choice.choice_key] ? "border-[#cfe0d3] bg-white text-[#405449]" : "border-transparent bg-[#eef3ef] text-[#869189]"}`}>
                            <input
                              type="checkbox"
                              disabled={busy}
                              checked={awardedActualDraft[choice.choice_key] ?? false}
                              aria-label={`Award Actual mark for ${choice.label}`}
                              onChange={(event) => {
                                setAwardedActualDraft((current) => ({ ...current, [choice.choice_key]: event.target.checked }));
                                actualSelectionsDirtyRef.current = true;
                                setActualSelectionsDirty(true);
                              }}
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#afc1b3] accent-[#3e6b52] disabled:opacity-50"
                            />
                            <span className="flex-1">{choice.label}</span>
                            <span className="shrink-0 rounded-lg bg-[#e6efe8] px-2 py-0.5 text-xs font-semibold text-[#456a53]">{choice.score} {choice.score === 1 ? "mark" : "marks"}</span>
                          </label>
                          ))}</div> : <p className="mt-3 text-sm text-[#9aa29d]">No Actual selection</p>}
                      </section>
                    </div>

                    <section className="mt-3 rounded-xl border border-[#e2e6e1] bg-[#fafbf9] px-3.5 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#657a6d]">Predicted assessment</p><p className="mt-0.5 text-xs text-[#8a958e]">Applicant response · Read-only</p></div>
                        <span className="rounded-md bg-[#eef1ee] px-2 py-1 text-xs font-semibold text-[#68756d]">Applicant selected {item.predicted_choices.filter((choice) => choice.selected).length} / {item.predicted_choices.length}</span>
                      </div>
                      <PredictedSelectionSummary choices={item.predicted_choices} showHeading={false} compact />
                    </section>

                    <label className="mt-3 block rounded-xl border border-[#d8e5dc] bg-[#f6faf7] p-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#52705e]">Reviewer remark <span className="font-normal normal-case tracking-normal text-[#8a958e]">(optional)</span></span>
                      {insight.actualAwardedScore === 0 && <span className="mt-1 block text-xs leading-5 text-[#7a877f]">Add a remark if the applicant needs clarification or should provide additional evidence.</span>}
                      <textarea
                        value={itemRemarksDraft[item.item_id] || ""}
                        maxLength={2000}
                        disabled={busy}
                        onChange={(event) => {
                          setItemRemarksDraft((current) => ({ ...current, [item.item_id]: event.target.value }));
                          actualSelectionsDirtyRef.current = true;
                          setActualSelectionsDirty(true);
                        }}
                        placeholder="Explain what additional or clearer evidence is required…"
                        className="mt-2 min-h-18 w-full resize-y rounded-xl border border-[#d7e2da] bg-white px-3 py-2.5 text-sm leading-6 text-[#405449] outline-none transition placeholder:text-[#9ba59f] focus:border-[#7fa18b] disabled:opacity-60"
                      />
                      <span className="mt-1 block text-right text-xs text-[#98a19b]">{(itemRemarksDraft[item.item_id] || "").length}/2000</span>
                    </label>

                  </article>
                  );
                })}
                {selected.score_review.items.length === 0 && <p className="p-8 text-center text-sm text-[#77827b]">No assessment items are configured for this project type.</p>}
                {selected.score_review.items.length > 0 && visibleActualItems.length === 0 && <div className="p-8 text-center"><CheckCircle2 size={24} className="mx-auto text-[#4f8061]" /><p className="mt-2 text-sm font-semibold text-[#405449]">{emptyFilterMessage}</p><button type="button" onClick={() => setReviewItemFilter("all")} className="mt-3 text-sm font-semibold text-[#3e6b52] hover:underline">Show all items</button></div>}
              </div>
              {selected.score_review.items.length > 0 && <div className="flex justify-end border-t border-[#e7ebe6] bg-[#fbfcfa] p-4"><button disabled={busy} onClick={saveActualSelections} className={`${primaryButton} gap-2`}><Save size={15} /> Save reviewer decisions</button></div>}
            </section>}

            {selected.recommendation && <div className="mt-5 rounded-2xl border border-[#dce5dd] bg-[#f3f8f3] p-5"><p className="text-sm font-bold text-[#315b45]">{selected.recommendation.title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5f6e64]">{selected.recommendation.content}</p></div>}

            {!!selected.assessment.attachments?.length && (
              <div id="supporting-documents" className="mt-5"><p className="mb-2 text-sm font-semibold text-[#59675e]">Supporting documents and evidence</p><div className="space-y-2">{selected.assessment.attachments.map((file) => <a key={file.id} href={`/be-api/media/${encodeURIComponent(file.filename)}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-[#e1e5de] px-4 py-3 text-sm text-[#3e6b52] hover:border-[#3e6b52]"><span className="truncate">{file.original_name}</span><span className="ml-3 text-xs uppercase text-[#849089]">{file.kind}</span></a>)}</div></div>
            )}

            {mode === "admin" && (
              <div id="facilitator-access" className="mt-6 scroll-mt-20">
                <label className="mb-2 block text-sm font-semibold text-[#59675e]">Facilitator access</label>
                {activeAssignments.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {activeAssignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#dce6de] bg-[#f5f9f5] px-4 py-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="shrink-0 text-[#3e6b52]" />
                            <p className="truncate text-sm font-semibold text-[#2d3a32]">{assignment.facilitator?.first_name} {assignment.facilitator?.last_name}</p>
                          </div>
                          <p className="mt-1 truncate pl-[22px] text-sm text-[#748078]">{assignment.facilitator?.email}</p>
                        </div>
                        <button type="button" disabled={busy} onClick={() => setPendingRevoke(assignment)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"><UserMinus size={14} />Revoke</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <select className={inputClass} value={facilitatorId} disabled={busy || availableFacilitators.length === 0} onChange={(event) => setFacilitatorId(event.target.value)}>
                    <option value="">{activeAssignments.length === 1 ? "Select a replacement facilitator" : activeAssignments.length > 1 ? "Select another eligible facilitator" : "Select an eligible facilitator"}</option>
                    {availableFacilitators.map((facilitator) => <option key={facilitator.id} value={facilitator.id}>{facilitator.first_name} {facilitator.last_name} · {facilitator.email}</option>)}
                  </select>
                  <button disabled={!facilitatorId || busy} onClick={assign} className={`${primaryButton} gap-2 whitespace-nowrap`}><UserPlus size={16} />{activeAssignments.length === 1 ? "Change" : "Appoint"}</button>
                </div>
                {activeAssignments.length > 0 && <p className="mt-2 text-sm text-[#7d8981]">Changing or revoking a facilitator immediately removes their access to this project.</p>}
              </div>
            )}

            {!!selected.assessment.reviews?.length && (
              <div id="review-history" className="mt-6 scroll-mt-20 rounded-2xl border border-[#e1e5de] p-5"><p className="text-sm font-semibold text-[#59675e]">Verification and certification history</p><div className="mt-3 space-y-3">{selected.assessment.reviews.map((entry) => <div key={entry.id} className="flex items-start justify-between gap-4 border-b border-[#edf0eb] pb-3 text-sm last:border-0 last:pb-0"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge value={entry.action} />{entry.approved_actual_total !== null && entry.approved_actual_total !== undefined && <span className="font-semibold text-[#3e6b52]">Actual total: {entry.approved_actual_total}</span>}{entry.certification_level && <span className="text-[#68756d]">{entry.certification_level}</span>}</div><p className="mt-1 text-[#68756d]">{entry.remarks || "No remarks"}</p></div><span className="shrink-0 text-right text-xs text-[#8a948e]">{entry.reviewer?.first_name} {entry.reviewer?.last_name}<br />{new Date(entry.created_at.replace(" ", "T")).toLocaleString()}</span></div>)}</div></div>
            )}

            {!predictionRejected && <div id="review-decision" className="mt-6 scroll-mt-20">
              <label className="mb-2 block text-sm font-semibold text-[#59675e]">
                {predictionApproved ? "Certification remarks" : <>Change request feedback <span className="font-normal text-[#8a6420]">(required)</span></>}
              </label>
              {!predictionApproved && <div className="mb-3 rounded-xl border border-[#e6dfc8] bg-[#fffaf0] px-4 py-3 text-sm leading-6 text-[#655b42]">
                <p className="font-semibold text-[#554a30]">Give the applicant a clear path to approval:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  <li>Identify the exact item or evidence that requires clarification.</li>
                  <li>Explain why the current submission does not meet the requirement.</li>
                  <li>State what must be revised or submitted next.</li>
                </ul>
              </div>}
              <textarea
                maxLength={5000}
                className={`${inputClass} min-h-28 resize-y ${remarksRequired ? "border-red-400 focus:border-red-500" : ""}`}
                value={remarks}
                onChange={(event) => {
                  setRemarks(event.target.value);
                  const nextValue = event.target.value.trim();
                  const nextWordCount = nextValue.split(/\s+/).filter(Boolean).length;
                  if (nextValue.length >= CHANGE_REQUEST_MIN_CHARACTERS && nextWordCount >= CHANGE_REQUEST_MIN_WORDS) setRemarksRequired(false);
                }}
                placeholder={predictionApproved ? "Add certification observations…" : "Example: The roof U-value evidence does not show the lightweight assembly calculation. Please upload the revised energy model and calculation sheet showing compliance with the stated limit."}
              />
              {!predictionApproved && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                {remarksRequired ? <p role="alert" className="font-semibold text-red-600">Please provide actionable feedback of at least {CHANGE_REQUEST_MIN_CHARACTERS} characters and {CHANGE_REQUEST_MIN_WORDS} words.</p> : <p className="text-[#748078]">Specific, respectful feedback helps the applicant correct the submission faster.</p>}
                <span className={remarks.trim().length >= CHANGE_REQUEST_MIN_CHARACTERS ? "font-semibold text-[#3e6b52]" : "text-[#8a948e]"}>{remarks.trim().length}/{CHANGE_REQUEST_MIN_CHARACTERS} minimum characters</span>
              </div>}
              {predictionApproved && actualSelectionsDirty && <p className="mt-2 text-sm text-[#9a6a32]">Save the Actual selection changes before certification.</p>}
              {predictionApproved && everyItemReviewed && !actualSelectionsDirty && !certificationQualified && <p className="mt-2 text-sm text-[#9a6a32]">The Actual total does not currently qualify for a configured certification level.</p>}
              <div className="mt-4 flex flex-col gap-3 border-t border-[#edf0eb] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <button disabled={busy} onClick={closeReview} className={`${secondaryButton} gap-2`}><X size={15} />Close</button>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {!predictionApproved && !predictionRejected && <>
                    <button disabled={busy} onClick={() => review("reject")} className={secondaryButton}>Request changes</button>
                    <button disabled={busy} onClick={() => review("verify")} className={primaryButton}>Verify prediction</button>
                  </>}
                  {predictionApproved && selected.certificate?.status !== "issued" && <button disabled={busy || !everyItemReviewed || actualSelectionsDirty || !certificationQualified} onClick={() => setPendingReviewConfirmation("certify")} className={primaryButton}>Certify and issue certificate</button>}
                </div>
              </div>
            </div>}
            </div>
          </div>

          {(pendingRevoke || confirmDiscard) && (
            <div className="fixed inset-0 z-70 flex items-center justify-center bg-[#17201b]/35 p-4 backdrop-blur-[2px]" role="presentation">
              <div role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" className="w-full max-w-sm rounded-3xl border border-white/70 bg-white p-6 shadow-[0_24px_70px_rgba(23,32,27,0.24)]">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${pendingRevoke ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                  {pendingRevoke ? <UserMinus size={20} /> : <X size={20} />}
                </span>
                <h3 id="confirmation-title" className="mt-4 text-lg font-bold text-[#243129]">{pendingRevoke ? "Revoke facilitator access?" : "Discard unsaved changes?"}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6d796f]">
                  {pendingRevoke
                    ? `${pendingRevoke.facilitator?.first_name || "This facilitator"} ${pendingRevoke.facilitator?.last_name || ""} will immediately lose access to this project.`
                    : "Your unsaved Actual selection changes will be lost when this assessment is closed."}
                </p>
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" disabled={busy} onClick={() => { setPendingRevoke(null); setConfirmDiscard(false); }} className={secondaryButton}>Cancel</button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={pendingRevoke ? revokeAssignment : discardAndClose}
                    className={pendingRevoke ? "inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50" : primaryButton}
                  >
                    {busy && pendingRevoke ? "Revoking…" : pendingRevoke ? "Revoke access" : "Discard changes"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {pendingReviewConfirmation && (
            <div className="fixed inset-0 z-80 flex items-center justify-center bg-[#17201b]/45 p-4 backdrop-blur-[2px]" role="presentation">
              <div role="alertdialog" aria-modal="true" aria-labelledby="review-confirmation-title" className="w-full max-w-md rounded-2xl border border-[#dce5dd] bg-white p-6 shadow-[0_24px_70px_rgba(23,32,27,0.28)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#e7f1e9] text-[#315b45]">
                  <BadgeCheck size={21} />
                </span>
                <h3 id="review-confirmation-title" className="mt-4 text-lg font-bold text-[#243129]">
                  {pendingReviewConfirmation === "certify" ? "Issue project certificate?" : "Reopen Predicted review?"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#6d796f]">
                  {pendingReviewConfirmation === "certify"
                    ? `This will certify ${selected.assessment.name} as ${selected.score_review.calculated_certification_level} and generate its downloadable certificate.`
                    : "This will undo the changes request and return the project to Predicted assessment review."}
                </p>
                {pendingReviewConfirmation === "certify" && (
                  <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-[#f4f7f3] p-4 text-sm">
                    <div><p className="text-xs font-semibold uppercase text-[#7c8880]">Final rating</p><p className="mt-1 font-bold text-[#315b45]">{selected.score_review.calculated_certification_level}</p></div>
                    <div><p className="text-xs font-semibold uppercase text-[#7c8880]">Approved score</p><p className="mt-1 font-bold text-[#243129]">{selected.score_review.actual_total}</p></div>
                  </div>
                )}
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" disabled={busy} onClick={() => setPendingReviewConfirmation(null)} className={secondaryButton}>Cancel</button>
                  <button type="button" disabled={busy} onClick={() => review(pendingReviewConfirmation)} className={primaryButton}>
                    {busy ? "Processing..." : pendingReviewConfirmation === "certify" ? "Issue certificate" : "Reopen review"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {confirmCertificateRevocation && (
            <div className="fixed inset-0 z-80 flex items-center justify-center bg-[#17201b]/45 p-4 backdrop-blur-[2px]" role="presentation">
              <div role="alertdialog" aria-modal="true" aria-labelledby="certificate-revocation-title" className="w-full max-w-md rounded-2xl border border-[#ead5d1] bg-white p-6 shadow-[0_24px_70px_rgba(23,32,27,0.28)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f8e9e6] text-[#a3453b]"><ShieldX size={21} /></span>
                <h3 id="certificate-revocation-title" className="mt-4 text-lg font-bold text-[#243129]">Revoke this certificate?</h3>
                <p className="mt-2 text-sm leading-6 text-[#6d796f]">The certificate stays in the audit history, but PDF download is disabled and public verification shows it as revoked.</p>
                <label className="mt-5 block text-sm font-semibold text-[#59675e]" htmlFor="certificate-revocation-reason">Reason for revocation</label>
                <textarea
                  id="certificate-revocation-reason"
                  maxLength={2000}
                  value={certificateRevocationReason}
                  onChange={(event) => setCertificateRevocationReason(event.target.value)}
                  className={`${inputClass} mt-2 min-h-24 resize-y`}
                  placeholder="Explain why the issued certificate is no longer valid"
                  autoFocus
                />
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" disabled={busy} onClick={() => { setConfirmCertificateRevocation(false); setCertificateRevocationReason(""); }} className={secondaryButton}>Cancel</button>
                  <button type="button" disabled={busy || !certificateRevocationReason.trim()} onClick={revokeCertificate} className="inline-flex items-center justify-center rounded-lg bg-[#a3453b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#87382f] disabled:cursor-not-allowed disabled:opacity-50">
                    {busy ? "Revoking..." : "Revoke certificate"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {requirementItem && <GbiRequirementDialog item={requirementItem} onClose={() => setRequirementItem(null)} />}
          {pendingEvidenceRemoval && <EvidenceRemovalDialog fileName={pendingEvidenceRemoval.file.original_name} busy={removingEvidenceId === pendingEvidenceRemoval.file.id} onCancel={() => setPendingEvidenceRemoval(null)} onConfirm={() => removeEvidence(pendingEvidenceRemoval.itemId, pendingEvidenceRemoval.file)} />}
        </div>
      )}
    </>
  );
}

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl bg-[#f4f6f2] p-4"><p className="text-sm text-[#7c8880]">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}

type AdminReviewSummaryModel = {
  insights: ReviewItemInsight[];
  actualItemsAwarded: number;
  notAwardedItems: number;
  evidenceSubmittedItems: number;
  evidenceNotSubmittedItems: number;
  reviewerRemarks: number;
};

function buildReviewSummary(
  items: ScoreReviewItem[],
  awardedDraft: Record<string, boolean>,
  remarksDraft: Record<number, string>,
): AdminReviewSummaryModel {
  const insights = items.map((item): ReviewItemInsight => {
    const predictedClaimed = item.predicted_choices.some((choice) => choice.selected);
    const evidenceSubmitted = Boolean(item.evidence?.length);
    const decisionDirty = item.actual_choices.some((choice) => Boolean(awardedDraft[choice.choice_key]) !== Boolean(choice.accepted))
      || (remarksDraft[item.item_id] || "").trim() !== (item.remarks || "").trim();
    const actualAwardedScore = calculateActualAwardedMarks(item.actual_choices, awardedDraft, item.max_score);
    const actualAwarded = actualAwardedScore > 0;
    const hasRemark = Boolean((remarksDraft[item.item_id] || "").trim());
    const resultCategory = getReviewResultCategory({
      actualAwardedMarks: actualAwardedScore,
    });

    return {
      item,
      predictedClaimed,
      evidenceSubmitted,
      actualAwarded,
      actualAwardedScore,
      hasRemark,
      decisionDirty,
      resultCategory,
    };
  });

  return {
    insights,
    actualItemsAwarded: insights.filter((insight) => insight.resultCategory === "awarded").length,
    notAwardedItems: insights.filter((insight) => insight.resultCategory === "not-awarded").length,
    evidenceSubmittedItems: insights.filter((insight) => insight.evidenceSubmitted).length,
    evidenceNotSubmittedItems: insights.filter((insight) => !insight.evidenceSubmitted).length,
    reviewerRemarks: insights.filter((insight) => insight.hasRemark).length,
  };
}

function AdminReviewOverview({
  summary,
  actualScore,
  maximumScore,
  certificationLevel,
  certificateIssued,
  certificationReady,
  certificationDoesNotQualify,
  readinessReasons,
  filter,
  onFilterChange,
  onProceedToDecision,
}: {
  summary: AdminReviewSummaryModel;
  actualScore: number;
  maximumScore: number;
  certificationLevel?: string | null;
  certificateIssued: boolean;
  certificationReady: boolean;
  certificationDoesNotQualify: boolean;
  readinessReasons: string[];
  filter: ReviewItemFilter;
  onFilterChange: (filter: ReviewItemFilter) => void;
  onProceedToDecision: () => void;
}) {
  const stats: Array<{ label: string; value: string | number; filter?: ReviewItemFilter }> = [
    { label: "Awarded Actual items", value: summary.actualItemsAwarded, filter: "awarded" },
    { label: "Not awarded items", value: summary.notAwardedItems, filter: "not_awarded" },
    { label: "Evidence submitted", value: summary.evidenceSubmittedItems },
    { label: "Evidence not submitted", value: summary.evidenceNotSubmittedItems },
    { label: "Reviewer remarks", value: summary.reviewerRemarks },
    { label: "Actual score", value: `${actualScore} / ${maximumScore}` },
  ];

  return (
    <div className="border-b border-[#e4e9e4] bg-white p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64766b]">Admin review summary</p>
            <div className="flex flex-wrap rounded-lg bg-[#f0f4f0] p-1 text-xs font-semibold">
              <button type="button" onClick={() => onFilterChange("all")} className={`rounded-md px-2.5 py-1.5 ${filter === "all" ? "bg-white text-[#315b45] shadow-sm" : "text-[#718078]"}`}>All items ({summary.insights.length})</button>
              <button type="button" onClick={() => onFilterChange("awarded")} className={`rounded-md px-2.5 py-1.5 ${filter === "awarded" ? "bg-white text-[#315b45] shadow-sm" : "text-[#718078]"}`}>Awarded Actual ({summary.actualItemsAwarded})</button>
              <button type="button" onClick={() => onFilterChange("not_awarded")} className={`rounded-md px-2.5 py-1.5 ${filter === "not_awarded" ? "bg-white text-[#53645a] shadow-sm" : "text-[#718078]"}`}>Not awarded ({summary.notAwardedItems})</button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 xl:grid-cols-4">
            {stats.map((stat) => stat.filter ? (
              <button key={stat.label} type="button" onClick={() => onFilterChange(stat.filter!)} className={`rounded-lg px-3 py-2 text-left transition hover:bg-[#eef4ef] ${filter === stat.filter ? "bg-[#edf4ee] ring-1 ring-[#cfded2]" : "bg-[#f7f9f6]"}`}>
                <span className="block text-xs leading-4 text-[#6f7d74]">{stat.label}</span>
                <span className="mt-0.5 block text-sm font-bold text-[#2f3d34]">{stat.value}</span>
              </button>
            ) : (
              <div key={stat.label} className="rounded-lg bg-[#f7f9f6] px-3 py-2">
                <span className="block text-xs leading-4 text-[#7a8780]">{stat.label}</span>
                <span className="mt-0.5 block text-sm font-bold text-[#2f3d34]">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-xl border p-4 ${certificateIssued || certificationReady ? "border-[#cfe0d3] bg-[#f3f8f4]" : "border-[#eadfca] bg-[#fffaf0]"}`}>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64766b]">Certification status</p>
          <p className={`mt-2 flex items-center gap-2 text-sm font-bold ${certificateIssued || certificationReady ? "text-[#356247]" : "text-[#8a6420]"}`}>
            {certificateIssued || certificationReady ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}
            {certificateIssued ? "Certification issued" : certificationReady ? "Ready for certification" : certificationDoesNotQualify ? "Does not currently qualify for certification" : "Not ready for certification"}
          </p>
          {certificateIssued ? <p className="mt-2 text-sm leading-5 text-[#5f6e64]">This assessment has already been certified.</p> : certificationReady ? <div className="mt-2 text-sm leading-5 text-[#5f6e64]"><p>The saved Actual score qualifies under the existing certification rules.</p><p className="mt-1 font-semibold text-[#405449]">Actual score: {actualScore} / {maximumScore}{certificationLevel ? ` · ${certificationLevel}` : ""}</p></div> : <ul className="mt-2 space-y-1 text-sm leading-5 text-[#6d624a]">{readinessReasons.map((reason) => <li key={reason} className="flex items-start gap-1.5"><span aria-hidden="true">•</span><span>{reason}</span></li>)}</ul>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onProceedToDecision} className="rounded-lg border border-[#cfdcd2] bg-white px-3 py-2 text-xs font-semibold text-[#3e6b52] transition hover:bg-[#f4f8f4]">Proceed to Decision</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemReviewGuidance({ insight }: { insight: ReviewItemInsight }) {
  const guidance = insight.decisionDirty
    ? "Actual selections or the reviewer remark have unsaved changes."
    : insight.evidenceSubmitted
      ? "Review the submitted evidence against the GBI requirement before awarding Actual marks."
      : insight.actualAwardedScore > 0
        ? "No evidence submitted. Review the available project information before saving these Actual marks."
        : "No evidence submitted. No Actual mark has been awarded; add a reviewer remark if additional evidence should be requested.";

  return (
    <div className="mt-3 rounded-xl border border-[#e2e7e2] bg-[#fbfcfa] px-3.5 py-3">
      <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
        <ReviewSignal label={`Predicted: ${insight.item.predicted_score}/${insight.item.max_score}`} />
        <ReviewSignal label={insight.evidenceSubmitted ? "Evidence: Submitted" : "Evidence: Not submitted"} warning={!insight.evidenceSubmitted && insight.predictedClaimed} />
        <ReviewSignal label={`Actual: ${insight.actualAwardedScore}/${insight.item.max_score}`} positive={insight.actualAwarded} />
        {insight.hasRemark && <ReviewSignal label="Reviewer remark present" />}
      </div>
      {guidance && <p className="mt-2 border-t border-[#e5e9e5] pt-2 text-sm leading-5 text-[#5f6c64]">{guidance}</p>}
    </div>
  );
}

function ReviewSignal({ label, positive = false, warning = false }: { label: string; positive?: boolean; warning?: boolean }) {
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${warning ? "bg-[#fff2dc] text-[#865f25]" : positive ? "bg-[#e8f2ea] text-[#356247]" : "bg-[#eef1ee] text-[#68756d]"}`}>{positive ? <CheckCircle2 size={12} /> : warning ? <CircleAlert size={12} /> : null}{label}</span>;
}

function getGbiRequirementGuidance(item: ScoreReviewItem) {
  const lines = (item.info || "").replaceAll("\\n", "\n").trim().split("\n");
  const firstLineLabel = lines[0]?.replaceAll("**", "").trim().toLowerCase();
  if (firstLineLabel === item.description.trim().toLowerCase()) lines.shift();
  return lines.join("\n").trim();
}

function isLongRequirement(guidance: string) {
  return guidance.length > 700 || guidance.split("\n").filter((line) => line.trim()).length > 10;
}

function GbiRequirementContent({ guidance, compact = false, preview = false }: { guidance: string; compact?: boolean; preview?: boolean }) {
  if (!guidance) return <p className={`text-sm text-[#7d8981] ${compact ? "leading-5" : "rounded-xl bg-[#f5f7f4] px-4 py-5"}`}>No detailed GBI requirement has been recorded for this item.</p>;

  return (
    <div className={`text-sm text-[#59675e] ${compact ? "leading-6" : "leading-7"} ${preview ? "max-h-64 overflow-hidden [mask-image:linear-gradient(to_bottom,black_82%,transparent)]" : ""}`}>
      <ReactMarkdown components={{
        p: ({ children }) => <p className={compact ? "mb-2 last:mb-0" : "mb-3 last:mb-0"}>{children}</p>,
        ul: ({ children }) => <ul className={`${compact ? "space-y-1.5" : "space-y-2.5"} pl-5 [list-style-type:disc]`}>{children}</ul>,
        ol: ({ children }) => <ol className={`${compact ? "space-y-1.5" : "space-y-2.5"} pl-5 [list-style-type:decimal]`}>{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-[#304238]">{children}</strong>,
      }}>{guidance}</ReactMarkdown>
    </div>
  );
}

function GbiRequirementDialog({ item, onClose }: { item: ScoreReviewItem; onClose: () => void }) {
  const guidance = getGbiRequirementGuidance(item);

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center bg-[#17201b]/45 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="gbi-requirement-title">
      <button type="button" aria-label="Close GBI requirement" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="relative flex max-h-[82dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_24px_70px_rgba(23,32,27,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#e4eae4] bg-[#f7faf7] px-6 py-5">
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6d8776]">GBI requirement</p><h3 id="gbi-requirement-title" className="mt-2 text-2xl font-bold text-[#243129]">{item.description}</h3><p className="mt-1.5 text-xs uppercase tracking-[0.08em] text-[#819087]">{[item.criterion, item.subcriterion].filter(Boolean).join(" / ") || `Item ${item.item_id}`}</p></div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full bg-white p-2 text-[#65736a] shadow-sm transition hover:bg-[#edf2ed]"><X size={17} /></button>
        </div>
        <div className="min-h-0 overflow-y-auto px-6 py-5">
          <GbiRequirementContent guidance={guidance} />
        </div>
        <div className="flex justify-end border-t border-[#e4eae4] bg-[#fafbf9] px-6 py-4"><button type="button" onClick={onClose} className={secondaryButton}>Close</button></div>
      </div>
    </div>
  );
}

function extractGbiPurpose(info?: string | null) {
  const guidanceBullets = info
    ?.replaceAll("\\n", "\n")
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).replaceAll("**", "")) ?? [];

  return guidanceBullets.find((line) => !/^(landed|low-rise|high-rise|buildings?\s)/i.test(line)) || null;
}

type PredictedChoice = ScoreReviewItem["predicted_choices"][number];

function formatChoiceList(choices: PredictedChoice[]) {
  const labels = choices.map((choice) => choice.label.trim()).filter(Boolean);
  if (labels.length <= 1) return labels[0] || "the selected measure";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

function PredictedSelectionSummary({
  choices,
  showHeading = true,
  compact = false,
}: {
  choices: PredictedChoice[];
  showHeading?: boolean;
  compact?: boolean;
}) {
  const selectedChoices = choices.filter((choice) => choice.selected);
  const optionLabel = choices.length === 1 ? "option" : "options";
  const meaning = selectedChoices.length > 0
    ? `The applicant's Predicted assessment states that the project plans to include ${formatChoiceList(selectedChoices)}. Review these stated measures against the GBI requirements before verification.`
    : "The applicant has not selected any of the available measures for this item in the Predicted assessment. Review the project information against the GBI requirements before verification.";

  if (compact) {
    return (
      <div className="mt-2">
        {selectedChoices.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Options selected by the applicant in the Predicted assessment">
            {selectedChoices.map((choice) => (
              <li key={choice.choice_key} className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1.5 text-xs font-semibold leading-4 text-[#355744] shadow-[inset_0_0_0_1px_#dce7df]">
                <CheckCircle2 size={12} className="shrink-0 text-[#4f8061]" aria-hidden="true" />
                <span>{choice.label}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-[#7f8c84]">No options were selected by the applicant.</p>}
      </div>
    );
  }

  return (
    <div className={showHeading ? "rounded-xl border border-[#dbe6dd] bg-[#f3f8f4] p-3.5" : "mt-3"}>
      {showHeading && <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#52705e]">Predicted assessment — applicant selected</p>}
      <p className={`${showHeading ? "mt-1.5" : ""} text-xs font-semibold text-[#68776e]`}>Selected {selectedChoices.length} of {choices.length} {optionLabel}</p>

      {selectedChoices.length > 0 ? (
        <ul className="mt-2 space-y-1.5" aria-label="Options selected by the applicant in the Predicted assessment">
          {selectedChoices.map((choice) => (
            <li key={choice.choice_key} className="flex items-start gap-2 rounded-lg bg-white px-2.5 py-2 text-sm font-semibold leading-5 text-[#355744] shadow-[inset_0_0_0_1px_#dce7df]">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#4f8061]" aria-hidden="true" />
              <span>{choice.label}</span>
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-sm text-[#7f8c84]">No options were selected by the applicant.</p>}

      <div className="mt-3 border-t border-[#dce6dd] pt-2.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#718078]">What this means</p>
        <p className="mt-1 text-sm leading-5 text-[#5b6960]">{meaning}</p>
      </div>
    </div>
  );
}

function GbiItemContext({
  info,
  choices,
  showApplicantResponse = true,
}: {
  info?: string | null;
  choices: Array<{ choice_key: string; label: string; score: number; selected: boolean }>;
  showApplicantResponse?: boolean;
}) {
  const guidance = info?.replaceAll("\\n", "\n").trim();
  const purpose = extractGbiPurpose(info);
  const showPurpose = isDistinctPurpose(guidance, purpose);

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[#e0e7e1] bg-[#fafcf9]">
      <div className="space-y-3 px-3.5 py-3">
        {showPurpose && <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#657a6d]">GBI purpose</p>
          <p className="mt-1.5 text-sm leading-6 text-[#4f5e54]">{purpose}</p>
        </div>}

        {showApplicantResponse && <PredictedSelectionSummary choices={choices} />}
      </div>

      {guidance && <details className="group border-t border-[#e4e9e4] bg-white px-3.5 py-2.5">
        <summary className="cursor-pointer list-none text-sm font-semibold text-[#52705e] marker:hidden after:ml-1.5 after:content-['+'] group-open:after:content-['−']">View GBI requirements</summary>
        <div className="mt-2.5 border-l-2 border-[#dce6dd] pl-3.5 text-sm leading-6 text-[#657169]">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc space-y-0.5 pl-4">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal space-y-0.5 pl-4">{children}</ol>,
              strong: ({ children }) => <strong className="font-semibold text-[#35463b]">{children}</strong>,
            }}
          >
            {guidance}
          </ReactMarkdown>
        </div>
      </details>}
    </div>
  );
}
