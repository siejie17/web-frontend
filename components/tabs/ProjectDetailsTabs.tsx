"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Layers,
  Tag,
  Ruler,
  Wallet,
  Calculator,
  Calendar,
  MapPin,
  FileText,
  ClipboardCheck,
  Inbox,
  Check,
  MessageSquare,
} from "lucide-react";

import { formatCurrency, formatSize } from "@/lib/utils";
import {
  type CostBreakdown,
  type CostNode,
} from "@/components/project/CostBreakdownTree";
import CostBreakdownHierarchy from "@/components/project/CostBreakdownHierarchy";
import ActualGBIAssessment from "@/components/assessment/ActualGBIAssessment";
import { ProjectChatTab } from "@/components/chat/ProjectChatTab";
import type { PdfProjectDetails } from "@/lib/pdf/costBreakdownPdf";

type Project = {
  id?: number;
  name?: string;
  building_type?: string | null;
  category?: string | null;
  classification?: string | null;
  size?: string | number | null;
  budget?: string | null;
  adjusted_cost?: string | number | null;
  year?: string | number | null;
  location?: string | null;
  structure?: string | null;
  rating?: number | null;
  target_certification?: string | null;
};

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }
  return String(value);
}

const ALL_TABS = [
  { key: "details", label: "Project Details", icon: FileText },
  { key: "cost", label: "Cost Breakdown", icon: Wallet },
  { key: "gbi", label: "GBI Assessment", icon: ClipboardCheck },
  { key: "chat", label: "Project Discussion", icon: MessageSquare },
] as const;

const TAB_HEADER_COPY: Record<
  Exclude<TabKey, "chat">,
  { title: string; subtitle: string }
> = {
  details: {
    title: "Project details",
    subtitle: "Overview, timing, and project metadata.",
  },
  cost: {
    title: "Cost breakdown",
    subtitle: "Compare predicted and actual spend.",
  },
  gbi: {
    title: "GBI assessment",
    subtitle: "Review the assessment results and audit items.",
  },
};

type TabKey = (typeof ALL_TABS)[number]["key"];

export default function ProjectDetailTabs({
  selectedProject,
  activeTab,
  onTabChange,
  onActualRatingChange,
  onUnsavedChange,
  submitRef,
  readOnly = false,
  isProjectOwner = false,
  onChatUnreadChange,
  onActualCostChange,
}: {
  selectedProject: any | null;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onActualRatingChange?: (rating: number) => void;
  onUnsavedChange?: (dirty: boolean) => void;
  submitRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  readOnly?: boolean;
  isProjectOwner?: boolean;
  onChatUnreadChange?: (unread: number) => void;
  onActualCostChange?: (total: number) => void;
}) {
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [costBreakdownData, setCostBreakdownData] =
    useState<CostBreakdown | null>(null);
  const [marksData, setMarksData] = useState<any>(null);

  const pdfProjectDetails = useMemo<PdfProjectDetails | undefined>(() => {
    if (!projectData) return undefined;
    return {
      id: projectData.id,
      name: projectData.name,
      buildingType: projectData.building_type,
      category: projectData.category,
      classification: projectData.classification,
      size: projectData.size,
      budget: projectData.budget,
      adjustedCost: projectData.adjusted_cost,
      year: projectData.year,
      location: projectData.location,
      structure: projectData.structure,
      rating: projectData.rating,
      targetCertification: projectData.target_certification,
    };
  }, [projectData]);

  const [changedNodes, setChangedNodes] = useState<Record<number, number>>({});
  const [changedPct, setChangedPct] = useState<Record<number, { pct: number; direction: "up" | "down" }>>({});
  const [hasCostChanges, setHasCostChanges] = useState(false);
  const [hasStructuralChanges, setHasStructuralChanges] = useState(false);
  const [pendingAdditions, setPendingAdditions] = useState<{ id: number; parentId: number; description: string; actualCost: number }[]>([]);
  const [pendingDeletions, setPendingDeletions] = useState<number[]>([]);
  const [hasAuditChanges, setHasAuditChanges] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitToast, setSubmitToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const auditSubmitRef = useRef<(() => Promise<boolean>) | null>(null);
  const [gbiExporting, setGbiExporting] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [chatMemberCount, setChatMemberCount] = useState(0);

  useEffect(() => {
    if (selectedProject) {
      const projectDetails = {
        id: selectedProject.projectData.id,
        name: selectedProject.projectData.name,
        building_type: selectedProject.projectData.building_type_name,
        category: selectedProject.projectData.category,
        classification: selectedProject.projectData.classification,
        size: selectedProject.projectData.size,
        budget: selectedProject.projectData.budget,
        adjusted_cost: selectedProject.projectData.adjusted_cost,
        year: selectedProject.projectData.year,
        location: selectedProject.projectData.location,
        structure: selectedProject.projectData.structure,
        rating: selectedProject.projectData.rating,
        target_certification: selectedProject.projectData.target_certification,
      };

      setProjectData(projectDetails);
      setCostBreakdownData(selectedProject.projectData.cost_breakdown);
    }
  }, [selectedProject]);

  const hideGbi = projectData?.target_certification === "Not Certified";

  const visibleTabs = useMemo(
    () => (hideGbi ? ALL_TABS.filter((t) => t.key !== "gbi") : ALL_TABS),
    [hideGbi],
  );

  const handleSubmit = useCallback(async () => {
    const projectId = projectData?.id;
    if (!projectId) return;
    setSubmitting(true);
    setSubmitToast(null);

    const promises: Promise<boolean>[] = [];

    const hasAdditions = pendingAdditions.length > 0;
    const hasDeletions = pendingDeletions.length > 0;
    const hasValueChanges = Object.keys(changedNodes).length > 0;

    if (hasValueChanges || hasAdditions || hasDeletions) {
      const newIds = new Set(pendingAdditions.map((a) => a.id));
      const existingChanges: Record<number, number> = {};
      for (const [id, val] of Object.entries(changedNodes)) {
        if (!newIds.has(Number(id))) existingChanges[Number(id)] = val;
      }
      const newNodesPayload = pendingAdditions.map((a) => ({
        parentId: a.parentId,
        description: a.description,
        cost: 0,
        actualCost: a.actualCost,
      }));

      const existingPct: Record<number, { pct: number; direction: "up" | "down" }> = {};
      for (const [id, val] of Object.entries(changedPct)) {
        if (!newIds.has(Number(id))) existingPct[Number(id)] = val;
      }

      console.log("Submit cost changes", {
        changedNodes: existingChanges,
        changedPct: existingPct,
        newNodes: newNodesPayload,
        deletedNodeIds: pendingDeletions,
      });

      promises.push(
        fetch(`/be-api/projects/${projectId}/actual-cost`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            changedNodes: existingChanges,
            newNodes: newNodesPayload,
            deletedNodeIds: pendingDeletions,
            changedPct: existingPct,
          }),
        }).then((r) => r.ok),
      );
    }

    if (hasAuditChanges && auditSubmitRef.current) {
      promises.push(auditSubmitRef.current());
    }

    if (promises.length === 0) {
      setSubmitting(false);
      return;
    }

    const results = await Promise.all(promises);
    const allOk = results.every(Boolean);

    setSubmitToast({
      message: allOk
        ? "Changes saved successfully."
        : "Some changes failed to save.",
      type: allOk ? "success" : "error",
    });

    if (allOk) {
      setChangedNodes({});
      setChangedPct({});
      setHasCostChanges(false);
      setHasStructuralChanges(false);
      setPendingAdditions([]);
      setPendingDeletions([]);
      setHasAuditChanges(false);
      fetch(`/be-api/projects/${projectId}`)
        .then((r) => r.json())
        .then((fresh) => {
          if (fresh?.projectData) {
            setCostBreakdownData(fresh.projectData.cost_breakdown);
            setProjectData({
              id: fresh.projectData.id,
              name: fresh.projectData.project_name,
              building_type: fresh.projectData.building_type_name,
              category: fresh.projectData.category,
              classification: fresh.projectData.classification,
              size: fresh.projectData.size,
              budget: fresh.projectData.budget,
              adjusted_cost: fresh.projectData.adjusted_cost,
              year: fresh.projectData.year,
              location: fresh.projectData.location,
              structure: fresh.projectData.structure,
              rating: fresh.projectData.rating,
              target_certification: fresh.projectData.target_certification,
            });
          }
        })
        .catch(() => {})
        .finally(() => setSaveCount((c) => c + 1));
    }

    setTimeout(() => setSubmitToast(null), 3000);
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectData?.id, hasCostChanges, changedNodes, pendingAdditions, pendingDeletions, hasAuditChanges]);

  const handleExportGbiPdf = useCallback(async () => {
    if (gbiExporting || !selectedProject) return;
    setGbiExporting(true);
    try {
      const { generateGbiAssessmentPdf } = await import(
        "@/lib/pdf/gbiAssessmentPdf"
      );
      await generateGbiAssessmentPdf({
        project: pdfProjectDetails ?? {},
        criteria: selectedProject.green_elements ?? [],
        answers: selectedProject.projectData ?? {},
      });
    } catch {
      setSubmitToast({
        message: "Failed to generate the PDF. Please try again.",
        type: "error",
      });
      setTimeout(() => setSubmitToast(null), 3000);
    } finally {
      setGbiExporting(false);
    }
  }, [gbiExporting, selectedProject, pdfProjectDetails]);

  useEffect(() => {
    if (hideGbi && activeTab === "gbi") {
      onTabChange("details");
    }
  }, [hideGbi, activeTab, onTabChange]);

  const dirty = hasCostChanges || hasStructuralChanges || hasAuditChanges || pendingAdditions.length > 0 || pendingDeletions.length > 0;

  useEffect(() => {
    if (marksData?.actual != null) {
      onActualRatingChange?.(marksData.actual);
    }
  }, [marksData?.actual, onActualRatingChange]);

  useEffect(() => {
    onUnsavedChange?.(dirty);
  }, [dirty, onUnsavedChange]);

  // Recalculate certification cost when cost edits or marks data changes
  useEffect(() => {
    if (!costBreakdownData || !marksData) return;

    const certifiedScaleRange = selectedProject?.certifications
      ?.certifiedScaleRange as Record<string, [number, number]> | undefined;
    const certificationMultipliers = selectedProject?.certifications
      ?.certificationMultipliers as Record<string, number> | undefined;
    if (!certifiedScaleRange || !certificationMultipliers) return;

    const lookupLevel = (marks: number): string => {
      for (const [level, range] of Object.entries(certifiedScaleRange)) {
        if (marks >= range[0] && marks <= range[1]) {
          return level;
        }
      }
      return "Not Certified";
    };

    const baseTotal = (() => {
      let total = 0;
      const walk = (nodes: Record<string, CostNode>) => {
        for (const node of Object.values(nodes)) {
          const desc =
            typeof node.description === "string"
              ? node.description.trim().toLowerCase()
              : "";
          if (node.is_certification === 1 || desc === "certification") continue;
          if (node.children) {
            walk(node.children);
          } else {
            total +=
              changedNodes[node.id] ?? node.actual_cost ?? node.cost ?? 0;
          }
        }
      };
      walk(costBreakdownData);
      for (const a of pendingAdditions) {
        total += changedNodes[a.id] ?? a.actualCost;
      }
      return total;
    })();

    setCostBreakdownData((prev) => {
      if (!prev) return prev;
      const clone = structuredClone(prev);
      let changed = false;
      for (const node of Object.values(clone)) {
        if (node.is_certification !== 1) continue;
        // Predicted label follows predicted marks (never overwritten by actual).
        if (marksData.predicted != null) {
          const predictedLevel = lookupLevel(marksData.predicted);
          if (node.certificationLabel !== predictedLevel) {
            node.certificationLabel = predictedLevel;
            changed = true;
          }
        }
        // Actual label + actual cost follow actual marks.
        if (marksData.actual != null) {
          const actualLevel = lookupLevel(marksData.actual);
          const multiplierPercent = certificationMultipliers[actualLevel] || 0;
          const multiplierCost =
            multiplierPercent > 0
              ? Math.round(((baseTotal * multiplierPercent) / 100) * 100) / 100
              : 0;
          if (
            node.actual_cost !== multiplierCost ||
            node.actualCertificationLabel !== actualLevel
          ) {
            node.actual_cost = multiplierCost;
            node.actualCertificationLabel = actualLevel;
            changed = true;
          }
        }
        break;
      }
      return changed ? clone : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedNodes, pendingAdditions, marksData, selectedProject]);

  const handleApplyMultiplier = useCallback(
    (payload: any, options?: { suppressToast?: boolean }) => {
      setCostBreakdownData((prev) => {
        if (!prev) return prev;
        const result = structuredClone(prev);
        const certLevel = payload.certLevel;
        const multiplierCost = payload.multiplierCost ?? 0;

        let certKey: string | null = null;
        for (const [key, node] of Object.entries(result)) {
          if (node.is_certification === 1) {
            certKey = key;
            break;
          }
        }

        if (certKey) {
          result[certKey].actual_cost = multiplierCost;
          result[certKey].actualCertificationLabel =
            certLevel ?? "Not Certified";
        }

        return result;
      });

      if (!options?.suppressToast) {
        const level = payload.certLevel;
        const cost =
          payload.multiplierCost != null
            ? `RM ${Number(payload.multiplierCost).toFixed(2).toLocaleString()}`
            : "RM 0";
        setSubmitToast({
          message:
            level && level !== "Not Certified"
              ? `Certification cost updated: ${level} (${cost})`
              : `Certification cost removed (Not Certified)`,
          type: "success",
        });
        setTimeout(() => setSubmitToast(null), 3000);
      }
    },
    [],
  );

  const handleChangedNodesUpdate = (
    nodes: Record<number, number>,
    dirty: boolean,
    structural?: boolean,
    pct?: Record<number, { pct: number; direction: "up" | "down" }>,
  ) => {
    setChangedNodes(nodes);
    setChangedPct(pct ?? {});
    setHasCostChanges(dirty);
    if (structural !== undefined) setHasStructuralChanges(structural);
  };

  const handleStructuralChange = (
    additions: Array<{ id: number; parentId: number; description: string; actualCost: number }>,
    deletions: number[],
  ) => {
    setPendingAdditions(additions);
    setPendingDeletions(deletions);
  };

  // CostBreakdownHierarchy manages structural changes via localTree internally;
  // the certification effect already reads changedNodes, so no onChangeAction is needed.

  useEffect(() => {
    if (submitRef) {
      submitRef.current = handleSubmit;
    }
  }, [submitRef, handleSubmit]);

  return (
    <div>
      {/* ---------------- Tab bar (outside the card) ---------------- */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] ${
                isActive
                  ? "bg-[#3E6B52] text-[#F6F6F2] shadow-[0_10px_24px_rgba(62,107,82,0.24)]"
                  : "border border-[#E4E1D8] bg-white text-[#5B655F] hover:-translate-y-0.5 hover:border-[#C9D3CC] hover:text-[#3E6B52] hover:shadow-[0_10px_24px_rgba(30,38,33,0.08)]"
              }`}
            >
              <Icon size={14} />
              {tab.label}
              {tab.key === "chat" && chatUnread > 0 && !isActive && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C08A3E] px-1 text-[10px] font-bold text-white">
                  {chatUnread > 9 ? "9+" : chatUnread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ---------------- Card ---------------- */}
      <div className="overflow-hidden mb-6 rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.05)]">
        <div className="border-b border-[#EFEDE6] bg-[#FBFAF7] px-7 py-4 sm:px-9">
          {activeTab === "chat" ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p
                  className="text-[15px] font-semibold text-[#1E2621]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Team discussion
                </p>
                <p className="mt-0.5 text-[12px] text-[#7C8880]">
                  {chatMemberCount} member{chatMemberCount === 1 ? "" : "s"} in
                  this project
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p
                className="text-[15px] font-semibold text-[#1E2621]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {TAB_HEADER_COPY[activeTab].title}
              </p>
              <p className="mt-0.5 text-[12px] text-[#7C8880]">
                {TAB_HEADER_COPY[activeTab].subtitle}
              </p>
            </div>
          )}
        </div>

        <div
          className={
            activeTab === "chat"
              ? "px-6 pb-6 pt-2 sm:px-8"
              : "px-7 py-8 sm:px-9 sm:py-9"
          }
        >
          {activeTab === "details" && (
            <>
              <DetailSection
                title="The basics"
                description="What kind of building this is."
              >
                <DetailField
                  icon={<Building2 size={15} />}
                  label="Building type"
                  value={formatValue(projectData?.building_type)}
                />
                <DetailField
                  icon={<Layers size={15} />}
                  label="Category"
                  value={formatValue(projectData?.category)}
                />
                {projectData?.classification && (
                  <DetailField
                    icon={<Tag size={15} />}
                    label="Classification"
                    value={formatValue(projectData?.classification)}
                  />
                )}
              </DetailSection>

              <DetailSection
                title="Scale & timing"
                description="Size, cost, and when it was assessed."
              >
                <DetailField
                  icon={<Ruler size={15} />}
                  label="Size"
                  value={formatSize(String(projectData?.size ?? ""))}
                />
                <DetailField
                  icon={<Wallet size={15} />}
                  label="Budget"
                  value={formatCurrency(String(projectData?.budget ?? ""))}
                />
                <DetailField
                  icon={<Calculator size={15} />}
                  label="Adjusted cost"
                  value={formatCurrency(
                    String(projectData?.adjusted_cost ?? ""),
                  )}
                />
                <DetailField
                  icon={<Calendar size={15} />}
                  label="Year"
                  value={formatValue(projectData?.year)}
                />
              </DetailSection>

              <DetailSection
                title="Location & structure"
                description="Where the site sits and how it's built."
                noBorder
              >
                <DetailField
                  icon={<MapPin size={15} />}
                  label="Location"
                  value={formatValue(projectData?.location)}
                />
                <DetailField
                  icon={<Building2 size={15} />}
                  label="Structure"
                  value={formatValue(projectData?.structure)}
                />
              </DetailSection>
            </>
          )}

          <div className={activeTab === "cost" ? "" : "hidden"}>
            {costBreakdownData ? (
              <CostBreakdownHierarchy
                projectId={projectData?.id}
                predictedCost={
                  projectData?.adjusted_cost != null
                    ? Number(projectData.adjusted_cost)
                    : undefined
                }
                projectBudget={
                  projectData?.budget
                    ? parseFloat(projectData.budget)
                    : undefined
                }
                value={costBreakdownData}
                onChangedNodesUpdateAction={handleChangedNodesUpdate}
                onStructuralChangeAction={handleStructuralChange}
                onTotalActualChange={onActualCostChange}
                mode="comparison"
                hideSubmitBar
                resetKey={saveCount}
                projectDetails={pdfProjectDetails}
                readOnly={readOnly}
              />
            ) : (
              <EmptyTabState label="Cost breakdown" />
            )}
          </div>

          <div className={activeTab === "gbi" ? "" : "hidden"}>
            {selectedProject ? (
              <ActualGBIAssessment
                selectedProject={selectedProject.projectData}
                greenElements={selectedProject.green_elements}
                certifiedScaleRange={
                  selectedProject.certifications?.certifiedScaleRange
                }
                certificationMultipliers={
                  selectedProject.certifications?.certificationMultipliers
                }
                hideSubmitButton
                displayOnly={readOnly}
                onAuditSubmitRef={auditSubmitRef}
                onAuditUnsavedChange={setHasAuditChanges}
                setMarksData={setMarksData}
                onApplyMultiplier={handleApplyMultiplier}
                actualCostBreakdown={costBreakdownData}
                handleExportGbiPdf={handleExportGbiPdf}
                gbiExporting={gbiExporting}
              />
            ) : null}
          </div>

          <div className={activeTab === "chat" ? "" : "hidden"}>
            <ProjectChatTab
              realProjectId={selectedProject?.projectData?.id}
              active={activeTab === "chat"}
              isProjectOwner={isProjectOwner}
              onUnreadChange={setChatUnread}
              onMembersChange={setChatMemberCount}
            />
          </div>
        </div>
      </div>

      {/* Submit button is rendered in ProjectPageWrapper */}

      {/* Submit toast */}
      <AnimatePresence>
        {submitToast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
          >
            <div className="flex items-center gap-2.5 rounded-full bg-[#1E2621] px-5 py-3 text-[13px] font-medium text-white shadow-lg">
              <Check size={14} className="text-[#C08A3E]" />
              {submitToast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Empty state ---------------- */

function EmptyTabState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F6F6F2] text-[#8A938C]">
        <Inbox size={18} />
      </span>
      <p className="text-[13.5px] text-[#8A938C]">
        {label} isn&apos;t available yet.
      </p>
    </div>
  );
}

/* ---------------- Section wrapper (mirrors FormSection) ---------------- */

function DetailSection({
  title,
  description,
  children,
  noBorder,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div className={`mb-8 pb-8 ${noBorder ? "" : "border-b border-[#EFEDE6]"}`}>
      <div className="mb-4">
        <h2
          className="text-[15px] font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#8A938C]">
            {description}
          </p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/* ---------------- Field ---------------- */

function DetailField({
  icon,
  label,
  value,
  prefix,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
}) {
  const isEmpty = value === "Not provided";

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#EFEDE6] bg-[#FDFDFC] p-4">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F6F6F2] text-[#7C8880]">
        {icon}
      </span>
      <div className="min-w-0">
        <div
          className="text-[11px] uppercase tracking-[0.08em] text-[#8A938C]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {label}
        </div>
        <div
          className={`mt-1 truncate text-[14px] font-medium ${
            isEmpty ? "text-[#B7BEB8]" : "text-[#1E2621]"
          }`}
        >
          {prefix && <span className="mr-1">{prefix}</span>}
          {value}
          {suffix && <span className="ml-1">{suffix}</span>}
        </div>
      </div>
    </div>
  );
}
