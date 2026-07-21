"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  ClipboardCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Inbox,
  AlertTriangle,
  X,
  Building2,
  MapPin,
  Layers,
  Ruler,
  Banknote,
  CalendarDays,
  Eye,
} from "lucide-react";
import CostBreakdownHierarchy from "@/components/project/CostBreakdownHierarchy";
import type { CostBreakdown, CostNode } from "@/components/project/CostBreakdownTree";
import GreenElementsScreen from "@/components/assessment/GreenElementsScreen";

type ID = string | number;

interface SelectionType {
  id: ID;
  description: string;
  marks: number;
}

const TABS = [
  { key: "cost", label: "Cost Breakdown", icon: Wallet },
  { key: "gbi", label: "GBI Assessment", icon: ClipboardCheck },
] as const;

function tabsForRating(scaleLabel: string | undefined): readonly (typeof TABS[number])[] {
  if (!scaleLabel) return TABS;
  const name = scaleLabel.split("(")[0].trim().toLowerCase();
  if (name.includes("not certified")) {
    return TABS.filter((t) => t.key !== "gbi");
  }
  return TABS;
}

type TabKey = (typeof TABS)[number]["key"];

/* ── GBI certification ladder ──
   Real Malaysian GBI scoring bands, used to give the target rating a
   position on a scale rather than just a floating label. */
const GBI_TIERS = [
  { key: "not_certified", label: "Not Certified", range: "0–49", color: "#B4483C" },
  { key: "certified", label: "Certified", range: "50–65", color: "#B8935B" },
  { key: "silver", label: "Silver", range: "66–75", color: "#9AA0A6" },
  { key: "gold", label: "Gold", range: "76–85", color: "#C9962E" },
  { key: "platinum", label: "Platinum", range: "86–100", color: "#3E6B52" },
] as const;

function getActiveTierIndex(scaleLabel: string | undefined): number {
  if (!scaleLabel) return -1;
  const name = scaleLabel.split("(")[0].trim().toLowerCase();
  const idx = GBI_TIERS.findIndex((t) => name.includes(t.label.toLowerCase()));
  return idx;
}

function addIds(node: Record<string, unknown>, nextId: { current: number }): CostNode {
  const id = nextId.current++;
  const children = node.children as Record<string, unknown> | undefined;
  return {
    id,
    description: (node.description as string) ?? "",
    cost: (node.cost as number) ?? 0,
    actual_cost: (node.actual_cost as number) ?? undefined,
    is_certification: (node.is_certification as number) ?? 0,
    children: children
      ? Object.fromEntries(
          Object.entries(children).map(([k, v]) => [k, addIds(v as Record<string, unknown>, nextId)]),
        )
      : undefined,
  };
}

function normalizeCostBreakdown(raw: unknown): CostBreakdown | null {
  if (!raw || typeof raw !== "object") return null;
  const counter = { current: 1 };
  const result: CostBreakdown = {};
  for (const [key, node] of Object.entries(raw as Record<string, unknown>)) {
    if (node && typeof node === "object") {
      result[key] = addIds(node as Record<string, unknown>, counter);
    }
  }
  return result;
}

function extractInnerData(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const inner = root.data;
  if (inner && typeof inner === "object") return inner as Record<string, unknown>;
  return null;
}

function asString(v: unknown): string {
  return typeof v === "string" && v.trim() ? v : "";
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && !Number.isNaN(v) ? v : undefined;
}

export default function AssessmentResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("cost");
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);
  const popStateRef = useRef<((e: PopStateEvent) => void) | null>(null);

  useEffect(() => {
    const results = localStorage.getItem("assessment_result");
    if (!results) {
      router.replace("/assessments/new");
      return;
    }
    try {
      setData(JSON.parse(results));
    } catch {
      router.replace("/assessments/new");
    }
    setLoading(false);
  }, [router]);

  const inner = useMemo(() => extractInnerData(data), [data]);

  const costBreakdown = useMemo(() => {
    const cost = inner?.cost as Record<string, unknown> | undefined;
    if (!cost) return null;
    const raw = cost.cost_breakdown ?? cost.costbreakdown;
    return normalizeCostBreakdown(raw);
  }, [inner]);

  const totalCost = useMemo(() => {
    const cost = inner?.cost as Record<string, unknown> | undefined;
    if (!cost) return undefined;
    const tc = cost.total_cost ?? cost.totalCost;
    return typeof tc === "number" ? tc : undefined;
  }, [inner]);

  const projectName = useMemo(() => {
    if (!inner) return "";
    const v = inner.projectName ?? inner.project_name;
    return typeof v === "string" ? v : "";
  }, [inner]);

  const greenElements = useMemo(() => {
    const ge = inner?.green_elements;
    return Array.isArray(ge) ? ge : [];
  }, [inner]);

  /* ── Project details, for the hero ── */
  const originalFormData = inner?.original_form_data as Record<string, unknown> | undefined;

  const projectDetails = useMemo(() => {
    if (!inner) return null;
    const fd = originalFormData;
    return {
      projectName: asString(fd?.projectName ?? inner.project_name),
      buildingType: asString(fd?.buildingType),
      category: asString(fd?.category),
      structure: asString(fd?.structure),
      state: asString(fd?.state),
      year: asString(fd?.year),
      buildingSize: asNumber(fd?.buildingSize),
      projectBudget: asNumber(fd?.projectBudget ?? inner.project_budget),
      certifiedRatingScale: asString(fd?.certifiedRatingScale ?? inner.certified_rating_scale),
    };
  }, [inner, originalFormData]);

  const activeTierIndex = useMemo(
    () => getActiveTierIndex(projectDetails?.certifiedRatingScale),
    [projectDetails],
  );

  const isNotCert = activeTierIndex === 0;

  const tabs = useMemo(
    () => tabsForRating(projectDetails?.certifiedRatingScale),
    [projectDetails],
  );

  // If the GBI tab was removed (Not Certified), switch back to "cost"
  useEffect(() => {
    if (isNotCert && activeTab === "gbi") {
      setActiveTab("cost");
    }
  }, [isNotCert, activeTab]);

  const handleConfirmLeave = useCallback(() => {
    setShowLeaveModal(false);
    // Remove the popstate guard before navigating so the back action doesn't trigger another popstate
    if (popStateRef.current) {
      window.removeEventListener("popstate", popStateRef.current);
      popStateRef.current = null;
    }
    pendingAction.current?.();
    pendingAction.current = null;
  }, []);

  const handleCancelLeave = useCallback(() => {
    setShowLeaveModal(false);
    pendingAction.current = null;
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const handlePopState = () => {
      // Re-push current URL so the page doesn't navigate away
      window.history.pushState(null, "", window.location.href);
      pendingAction.current = () => router.back();
      setShowLeaveModal(true);
    };
    popStateRef.current = handlePopState;
    // Add a buffer entry so the first back popstate is intercepted on the same URL
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  const handleBack = useCallback(() => {
    pendingAction.current = () => router.push("/assessments/new");
    setShowLeaveModal(true);
  }, [router]);

  /* ── GreenElementsScreen state ── */
  const [criteriaMarks, setCriteriaMarks] = useState<Record<string, number>>({});
  const [selectedDropdowns, setSelectedDropdowns] = useState<Record<string, SelectionType | null>>({});
  const [selectionMarks, setSelectionMarks] = useState<Record<string, number>>({});
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [checkedOptions, setCheckedOptions] = useState<Record<string, Record<string, boolean>>>({});
  const [checkedSubitems, setCheckedSubitems] = useState<Record<string, Record<string, boolean>>>({});
  const [customItems, setCustomItems] = useState<Record<string, { id: string; description: string; isCustom: boolean }[]>>({});
  const [showCostUpdatedToast, setShowCostUpdatedToast] = useState(false);

  if (loading) return null;

  return (
    <>
        <div className="relative mx-auto max-w-275 pb-4 pt-6">
          {/* Floating back button — pinned to the left edge of the viewport,
              vertically aligned with the title, breaking out of max-w-275.
              Falls back to an inline button when there isn't room outside
              the content column. */}
          <button
            type="button"
            onClick={handleBack}
            className="fixed left-8 top-5 z-30 hidden items-center gap-1.5 rounded-full border border-[#E4E1D8] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#1E2621] shadow-[0_4px_12px_rgba(30,38,33,0.05)] transition-colors duration-200 hover:bg-[#FBFAF7] xl:inline-flex"
          >
            <ChevronLeft size={16} />
            Back
          </button>

          <div className="mb-6">
            <button
              type="button"
              onClick={handleBack}
              className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#E4E1D8] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#1E2621] shadow-[0_4px_12px_rgba(30,38,33,0.05)] transition-colors duration-200 hover:bg-[#FBFAF7] xl:hidden"
            >
              <ChevronLeft size={16} />
              Back
            </button>
            <h1
              className="text-[24px] font-semibold leading-tight text-[#1E2621] sm:text-[28px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Assessment Result
            </h1>
            <p className="mt-1 text-[13.5px] text-[#5B655F]">
              Predicted cost breakdown and GBI assessment for this project.
            </p>
          </div>

      {projectDetails && (
        <ProjectHero details={projectDetails} activeTierIndex={activeTierIndex} />
      )}

      {/* Not Certified banner */}
      {isNotCert && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#E4DFC0] bg-[#FFF9E6] px-5 py-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C08A3E] text-white">
            <AlertTriangle size={15} />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-[#8A6420]">
              GBI Assessment not available
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#71603F]">
              You selected <span className="font-medium">Not Certified</span> {" "} as your target rating. To unlock the
              Green Building Index assessment and showcase your project&apos;s green credentials, update your
              target rating to at least <span className="font-medium text-[#B8935B]">Certified</span>. Consider
              adding green elements to your project — every point counts toward a more sustainable and
              valuable build.
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] ${
                isActive
                  ? "bg-[#3E6B52] text-[#F6F6F2] shadow-[0_10px_24px_rgba(62,107,82,0.24)]"
                  : "border border-[#E4E1D8] bg-white text-[#5B655F] hover:-translate-y-0.5 hover:border-[#C9D3CC] hover:text-[#3E6B52] hover:shadow-[0_10px_24px_rgba(30,38,33,0.08)]"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.05)]">
        <div>
          {activeTab === "cost" &&
            (costBreakdown ? (
              <div className="px-4 py-6 sm:px-7 sm:py-8 md:px-9 md:py-9">
                <CostBreakdownHierarchy
                  value={costBreakdown}
                  projectBudget={projectDetails?.projectBudget ?? null}
                  onChange={() => {}}
                  predictedCost={totalCost}
                  mode="assessment"
                />
              </div>
            ) : (
              <EmptyTabState label="Cost breakdown" />
            ))}
          {activeTab === "gbi" &&
            (greenElements.length > 0 ? (
              <GreenElementsScreen
                greenElements={greenElements}
                criteriaMarks={criteriaMarks}
                setCriteriaMarks={setCriteriaMarks}
                selectedDropdowns={selectedDropdowns}
                setSelectedDropdowns={setSelectedDropdowns}
                selectionMarks={selectionMarks}
                setSelectionMarks={setSelectionMarks}
                checkedItems={checkedItems}
                setCheckedItems={setCheckedItems}
                checkedOptions={checkedOptions}
                setCheckedOptions={setCheckedOptions}
                checkedSubitems={checkedSubitems}
                setCheckedSubitems={setCheckedSubitems}
                customItems={customItems}
                setCustomItems={setCustomItems}
                showCostUpdatedToast={showCostUpdatedToast}
                setShowCostUpdatedToast={setShowCostUpdatedToast}
              />
            ) : (
              <EmptyTabState label="GBI assessment" />
            ))}
        </div>
        </div>

        {/* Bottom action bar */}
        <div className="flex justify-end py-6">
          <button
            type="button"
            className="rounded-full bg-[#3E6B52] px-6 py-3 text-[14px] font-semibold text-[#F6F6F2] shadow-[0_12px_28px_rgba(62,107,82,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(62,107,82,0.30)] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] sm:px-8"
          >
            Submit Assessment
          </button>
        </div>
    </div>

    {/* Leave confirmation modal */}
    {showLeaveModal && (
      <ConfirmLeaveModal
        onConfirm={handleConfirmLeave}
        onCancel={handleCancelLeave}
      />
    )}
  </>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Project details hero
   ──────────────────────────────────────────────────────────────────────── */

interface ProjectDetails {
  buildingType: string;
  category: string;
  structure: string;
  state: string;
  year: string;
  buildingSize?: number;
  projectBudget?: number;
  certifiedRatingScale: string;
  projectName?: string;
}

function formatMYR(value: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSqft(value: number): string {
  return `${new Intl.NumberFormat("en-MY").format(value)} sq ft`;
}

function ProjectHero({
  details,
  activeTierIndex,
}: {
  details: ProjectDetails;
  activeTierIndex: number;
}) {
  const [showDetails, setShowDetails] = useState(false);

  const activeTier = activeTierIndex >= 0 ? GBI_TIERS[activeTierIndex] : null;

  return (
    <>
    <div className="mb-6 overflow-hidden rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.05)]">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr]">
        {/* Left: identity */}
        <div className="border-b border-[#E4E1D8] px-5 py-7 sm:px-7 sm:py-8 md:border-b-0 md:border-r md:px-9 md:py-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3E6B52]">
            Project Overview
          </p>
          <h2
            className="mt-2 text-[22px] font-semibold leading-tight text-[#1E2621] sm:text-[26px] lg:text-[30px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {details.projectName || details.buildingType || "Untitled Project"}
          </h2>
          {details.projectName && details.buildingType && (
            <p className="mt-1 text-[13.5px] font-medium text-[#5B655F]">
              {details.buildingType}
            </p>
          )}

          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#E4E1D8] bg-[#FBFAF7] px-4 py-2 text-[12.5px] font-medium text-[#5B655F] transition-colors hover:border-[#C9D3CC] hover:text-[#3E6B52] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
          >
            <Eye size={14} />
            View project details
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Right: certification target */}
        <div className="flex flex-col justify-center px-5 py-7 sm:px-7 sm:py-8 md:px-9 md:py-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A938C]">
            Target Rating
          </p>
          <p
            className="mt-2 text-[20px] font-semibold leading-tight sm:text-[22px]"
            style={{
              fontFamily: "var(--font-display)",
              color: activeTier ? activeTier.color : "#1E2621",
            }}
          >
            {details.certifiedRatingScale || "Not set"}
          </p>

          {/* Tier ladder — encodes the real GBI scoring bands */}
          <div className="mt-5">
            <div className="flex h-2 overflow-hidden rounded-full bg-[#F0EFE9]">
              {GBI_TIERS.map((tier, i) => (
                <div
                  key={tier.key}
                  className="h-full flex-1 transition-opacity"
                  style={{
                    backgroundColor: tier.color,
                    opacity: activeTierIndex === -1 || i === activeTierIndex ? 1 : 0.22,
                    marginLeft: i === 0 ? 0 : 2,
                  }}
                />
              ))}
            </div>
            {/* Labels: full ladder from sm upward; on the narrowest screens
                just show the active tier so text never wraps/crowds. */}
            <div className="mt-2 hidden justify-between sm:flex">
              {GBI_TIERS.map((tier, i) => (
                <span
                  key={tier.key}
                  className="text-center text-[9.5px] font-medium uppercase leading-tight tracking-wide"
                  style={{
                    width: `${100 / GBI_TIERS.length}%`,
                    color: i === activeTierIndex ? tier.color : "#B7BEB8",
                  }}
                >
                  {tier.label}
                </span>
              ))}
            </div>
            <div className="mt-2 flex justify-between sm:hidden">
              <span className="text-[9.5px] font-medium uppercase tracking-wide text-[#B7BEB8]">
                Not Certified
              </span>
              <span
                className="text-[9.5px] font-semibold uppercase tracking-wide"
                style={{ color: activeTier ? activeTier.color : "#B7BEB8" }}
              >
                {activeTier ? activeTier.label : ""}
              </span>
              <span className="text-[9.5px] font-medium uppercase tracking-wide text-[#B7BEB8]">
                Platinum
              </span>
            </div>
          </div>

          {activeTier && (
            <p className="mt-4 text-[12.5px] leading-relaxed text-[#5B655F]">
              Scores <span className="font-semibold text-[#1E2621]">{activeTier.range}</span> points
              fall in the {activeTier.label} band.
            </p>
          )}
        </div>
      </div>
    </div>

    {showDetails && (
      <ProjectDetailsModal
        details={details}
        onClose={() => setShowDetails(false)}
      />
    )}
  </>
  );
}

function ProjectDetailsModal({
  details,
  onClose,
}: {
  details: ProjectDetails;
  onClose: () => void;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Project Name", value: details.projectName || "\u2014" },
    { label: "Building Type", value: details.buildingType },
    { label: "Category", value: details.category },
    { label: "Structure", value: details.structure },
    { label: "State", value: details.state },
    { label: "Year", value: details.year },
    { label: "Target Rating Scale", value: details.certifiedRatingScale || "\u2014" },
    { label: "Building Size", value: typeof details.buildingSize === "number" ? formatSqft(details.buildingSize) : "\u2014" },
    { label: "Project Budget", value: typeof details.projectBudget === "number" ? formatMYR(details.projectBudget) : "\u2014" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E2621]/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_24px_48px_rgba(30,38,33,0.16)]">
        <div className="flex items-center justify-between border-b border-[#EFEDE6] px-6 py-4">
          <span
            className="text-[12px] uppercase tracking-[0.08em] text-[#7C8880]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Project Details
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#8A938C] transition-colors hover:bg-[#F6F6F2] hover:text-[#1E2621]"
          >
            <X size={15} />
          </button>
        </div>
        <div className="divide-y divide-[#EFEDE6] px-6 py-4">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 py-3">
              <span className="shrink-0 text-[12.5px] font-medium text-[#5B655F]">
                {row.label}
              </span>
              <span className="text-right text-[13px] font-semibold text-[#1E2621]">
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-[#EFEDE6] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-[#E4E1D8] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#5B655F] transition-colors hover:bg-[#F6F6F2] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmLeaveModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E2621]/40 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-modal-title"
        aria-describedby="leave-modal-desc"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-[#E4E1D8] bg-white p-6 shadow-[0_24px_48px_rgba(30,38,33,0.16)] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FBEDEB] text-[#B4483C]">
            <AlertTriangle size={20} />
          </span>
          <div>
            <h2
              id="leave-modal-title"
              className="text-[16px] font-semibold text-[#1E2621]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Leave this page?
            </h2>
            <p
              id="leave-modal-desc"
              className="mt-1 text-[13px] leading-relaxed text-[#5B655F]"
            >
              All prediction results will be gone if you leave.
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-[#E4E1D8] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#5B655F] transition-colors hover:bg-[#F6F6F2] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="flex-1 rounded-full bg-[#B4483C] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(180,72,60,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(180,72,60,0.30)] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#B4483C]"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

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
