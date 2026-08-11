"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  ClipboardCheck,
  Check,
  ChevronRight,
  DollarSign,
  Inbox,
  AlertTriangle,
  X,
  Eye,
  Plus,
} from "lucide-react";
import CostBreakdownHierarchy from "@/components/project/CostBreakdownHierarchy";
import type {
  CostBreakdown,
  CostNode,
} from "@/components/project/CostBreakdownTree";
import { formatMoney } from "@/components/project/CostBreakdownTree";
import GreenElementsScreen from "@/components/assessment/GreenElementsScreen";
import { BackButton } from "@/components/ui/BackButton";
import { useAuth } from "@/contexts/AuthContext";

type ID = string | number;

interface GreenCriterionOption {
  id: ID;
  description: string;
  marks: number;
}

interface GreenCriterionOptionGroup {
  id: ID;
  label: string;
  options?: GreenCriterionOption[];
}

interface GreenCriterionSelection {
  id: ID;
  description: string;
  marks: number;
}

interface GreenCriterionSelectionGroup {
  id: ID;
  label: string;
  selections?: GreenCriterionSelection[];
}

interface GreenCriterionSubitem {
  id: ID;
  description: string;
}

interface GreenCriterionItem {
  id: string | number;
  is_compulsory?: number;
  subitems_exist?: boolean;
  subitems?: GreenCriterionSubitem[];
  option_groups?: GreenCriterionOptionGroup[];
  selection_groups?: GreenCriterionSelectionGroup[];
}

interface GreenCriterionSub {
  name: string;
  items?: GreenCriterionItem[];
}

interface GreenCriterion {
  name: string;
  items?: GreenCriterionItem[];
  subcriteria?: GreenCriterionSub[];
}

interface SelectionType {
  id: ID;
  description: string;
  marks: number;
}

const TABS = [
  { key: "cost", label: "Cost Breakdown", icon: Wallet },
  { key: "gbi", label: "GBI Assessment", icon: ClipboardCheck },
] as const;

function tabsForRating(
  scaleLabel: string | undefined,
): readonly (typeof TABS)[number][] {
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
  {
    key: "not_certified",
    label: "Not Certified",
    range: "0–49",
    color: "#B4483C",
  },
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

function addIds(
  node: Record<string, unknown>,
  nextId: { current: number },
): CostNode {
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
          Object.entries(children).map(([k, v]) => [
            k,
            addIds(v as Record<string, unknown>, nextId),
          ]),
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
  if (inner && typeof inner === "object")
    return inner as Record<string, unknown>;
  return null;
}

function asString(v: unknown): string {
  return typeof v === "string" && v.trim() ? v : "";
}

/* ── Certification helpers ── */

function sumNonCertLeaves(tree: CostBreakdown): number {
  let total = 0;
  const walk = (node: CostNode) => {
    if (node.children) {
      Object.values(node.children).forEach(walk);
    } else if (node.is_certification !== 1) {
      total += node.cost ?? 0;
    }
  };
  Object.values(tree).forEach(walk);
  return total;
}

function findMaxTreeId(tree: CostBreakdown): number {
  let max = 0;
  const walk = (nodes: Record<string, CostNode>) => {
    for (const node of Object.values(nodes)) {
      if (node.id > max) max = node.id;
      if (node.children) walk(node.children);
    }
  };
  walk(tree);
  return max;
}

function nextTopKey(tree: CostBreakdown): string {
  const existing = new Set(Object.keys(tree));
  for (let i = 0; i < 26; i++) {
    const key = String.fromCharCode(65 + i);
    if (!existing.has(key)) return key;
  }
  return "ZZ";
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && !Number.isNaN(v) ? v : undefined;
}

export default function AssessmentResultsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("cost");
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);
  const popStateRef = useRef<((e: PopStateEvent) => void) | null>(null);

  const [noResults, setNoResults] = useState(false);
  const [criteriaMarks, setCriteriaMarks] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    const results = sessionStorage.getItem("assessment_result") ?? sessionStorage.getItem("assessment_result");
    if (!results) {
      setNoResults(true);
      setLoading(false);
      return;
    }
    try {
      const parsed = JSON.parse(results);
      const inner = extractInnerData(parsed);
      const ge = inner?.green_elements;
      if (Array.isArray(ge) && ge.length > 0) {
        const marks: Record<string, number> = {};
        for (const criterion of ge) {
          const name = criterion.name;
          if (!name) continue;
          let total = 0;
          for (const item of criterion.items || []) {
            if (item.is_compulsory === 1)
              total += (item.marks as number) || 0;
          }
          for (const sub of criterion.subcriteria || []) {
            for (const item of sub.items || []) {
              if (item.is_compulsory === 1)
                total += (item.marks as number) || 0;
            }
          }
          marks[name] = total;
        }
        setCriteriaMarks(marks);
      }
      setData(parsed);
    } catch {
      setNoResults(true);
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

  /* ── Certifications data from assessment_result ── */
  const certificationsData = useMemo(() => {
    const raw = inner?.certifications as Record<string, unknown> | undefined;
    if (!raw) return null;
    return raw as {
      certifiedScaleRange: Record<string, [number, number]>;
      certificationMultipliers: Record<string, number>;
    };
  }, [inner]);

  const greenElements = useMemo(() => {
    const ge = inner?.green_elements;
    return Array.isArray(ge) ? ge : [];
  }, [inner]);

  /* ── Project details, for the hero ── */
  const originalFormData = inner?.original_form_data as
    Record<string, unknown> | undefined;

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
      certifiedRatingScale: asString(
        fd?.certifiedRatingScale ?? inner.certified_rating_scale,
      ),
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
    sessionStorage.removeItem("assessment_result");
    pendingAction.current = () => router.push("/assessments/new");
    setShowLeaveModal(true);
  }, [router]);

  /* ── GreenElementsScreen state ── */
  const [selectedDropdowns, setSelectedDropdowns] = useState<
    Record<string, SelectionType | null>
  >({});
  const [selectionMarks, setSelectionMarks] = useState<Record<string, number>>(
    {},
  );
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [checkedOptions, setCheckedOptions] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [checkedSubitems, setCheckedSubitems] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [customItems, setCustomItems] = useState<
    Record<string, { id: string; description: string; isCustom: boolean }[]>
  >({});
  const [showCostUpdatedToast, setShowCostUpdatedToast] = useState(false);
  const [showMarksWarning, setShowMarksWarning] = useState(false);
  const [marksWarning, setMarksWarning] = useState({ target: "", min: 0, current: 0 });
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [confirmStep, setConfirmStep] = useState<"warning" | "confirm">("confirm");
  const [submitting, setSubmitting] = useState(false);

  /* ── Total marks from GreenElementsScreen ── */
  const totalMarks = useMemo(
    () => Object.values(criteriaMarks).reduce((sum, m) => sum + m, 0),
    [criteriaMarks],
  );

  /* ── Determine certification level ── */
  const certificationLevel = useMemo<string | null>(() => {
    const range = certificationsData?.certifiedScaleRange;
    if (!range) return null;
    for (const [level, [min, max]] of Object.entries(range)) {
      if (totalMarks >= min && totalMarks <= max) return level;
    }
    return null;
  }, [certificationsData, totalMarks]);

  const currentCostBreakdownRef = useRef<CostBreakdown | null>(null);

  /* ── Track the base total (sum of non-certification leaves) from CostBreakdownHierarchy ── */
  const [baseTotal, setBaseTotal] = useState<number>(0);

  // Sync baseTotal from the original cost breakdown once it's available
  useEffect(() => {
    if (costBreakdown) {
      setBaseTotal(sumNonCertLeaves(costBreakdown));
    }
  }, [costBreakdown]);

  const handleCostBreakdownChange = useCallback((next: CostBreakdown) => {
    currentCostBreakdownRef.current = next;
    const newBase = sumNonCertLeaves(next);
    setBaseTotal((prev) => (Math.abs(prev - newBase) > 0.001 ? newBase : prev));
  }, []);

  /* ── Compute certification cost and build modified tree ── */
  const costBreakdownWithCert = useMemo<CostBreakdown | null>(() => {
    if (!costBreakdown) return null;

    const isCertified =
      certificationLevel && certificationLevel !== "Not Certified";
    const multiplier = isCertified
      ? certificationsData?.certificationMultipliers?.[certificationLevel!]
      : undefined;

    if (isCertified && multiplier) {
      const resolvedCertCost =
        Math.round(((baseTotal * multiplier) / 100) * 100) / 100;
      const result = structuredClone(costBreakdown);

      // Find an existing certification node by is_certification flag
      let existingKey: string | null = null;
      for (const [key, node] of Object.entries(result)) {
        if (node.is_certification === 1) {
          existingKey = key;
          break;
        }
      }

      if (existingKey) {
        result[existingKey].cost = resolvedCertCost;
        result[existingKey].certificationLabel = certificationLevel!;
      } else {
        const key = nextTopKey(result);
        result[key] = {
          id: findMaxTreeId(result) + 1,
          description: "Certification",
          cost: resolvedCertCost,
          is_certification: 1,
          certificationLabel: certificationLevel!,
        };
      }

      return result;
    }

    // Not certified → remove any existing certification node
    const result = structuredClone(costBreakdown);
    const toRemove: string[] = [];
    for (const [key, node] of Object.entries(result)) {
      if (node.is_certification === 1) toRemove.push(key);
    }
    for (const key of toRemove) delete result[key];
    return result;
  }, [costBreakdown, certificationLevel, certificationsData, baseTotal]);

  const handleSubmitAssessment = useCallback(async () => {
    if (!user?.id) return;

    const currentTree = currentCostBreakdownRef.current ?? costBreakdownWithCert ?? {};

    function sumLeaves(n: CostNode): number {
      if (n.children) {
        return Object.values(n.children).reduce((s, c) => s + sumLeaves(c), 0);
      }
      return n.cost ?? 0;
    }
    function mapNode(n: CostNode): Record<string, unknown> {
      const leafSum = sumLeaves(n);
      return {
        description: n.description,
        cost: Math.round((n.children ? leafSum : n.cost) * 100) / 100,
        isMultiplier: n.is_certification === 1,
        children: n.children
          ? Object.fromEntries(
              Object.entries(n.children).map(([k, v]) => [k, mapNode(v)]),
            )
          : undefined,
      };
    }
    const costBreakdownPayload = Object.fromEntries(
      Object.entries(currentTree).map(([k, v]) => [k, mapNode(v)]),
    );
    const totalCostNum = Math.round((() => {
      let sum = 0;
      for (const n of Object.values(currentTree)) {
        if (n.is_certification === 1) {
          sum += n.cost;
        } else {
          sum += sumLeaves(n);
        }
      }
      return sum;
    })() * 100) / 100;

    const checkedItemsPayload = Object.entries(checkedItems)
      .filter(([, v]) => v)
      .map(([k]) => k);

    const checkedOptionsPayload: Record<string, (string | number)[]> = {};
    for (const [groupId, options] of Object.entries(checkedOptions)) {
      const active = Object.entries(options)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (active.length > 0) checkedOptionsPayload[groupId] = active;
    }

    const checkedSubitemsPayload: Record<string, (string | number)[]> = {};
    for (const [itemId, subitems] of Object.entries(checkedSubitems)) {
      const active = Object.entries(subitems)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (active.length > 0) checkedSubitemsPayload[itemId] = active;
    }

    const customItemsPayload: Record<string, { description: string }[]> = {};
    for (const [itemId, items] of Object.entries(customItems)) {
      if (items.length > 0) {
        customItemsPayload[itemId] = items.map((c) => ({
          description: c.description,
        }));
      }
    }

    const selectionsPayload: Record<string, string | number> = {};
    for (const [groupId, sel] of Object.entries(selectedDropdowns)) {
      if (sel) selectionsPayload[groupId] = sel.id;
    }

    function collectCompulsoryItems(
      elements: GreenCriterion[],
    ): {
      items: (string | number)[];
      subitems: Record<string, (string | number)[]>;
      options: Record<string, (string | number)[]>;
      selections: Record<string, (string | number)[]>;
    } {
      const result: ReturnType<typeof collectCompulsoryItems> = {
        items: [],
        subitems: {},
        options: {},
        selections: {},
      };
      if (isNotCert) return result;

      function walkItem(item: GreenCriterionItem) {
        if (item.is_compulsory !== 1) return;
        result.items.push(item.id);

        if (item.subitems_exist && item.subitems?.length) {
          result.subitems[String(item.id)] = item.subitems.map((s) => s.id);
        }

        for (const group of item.option_groups ?? []) {
          if (group.options?.length) {
            result.options[String(group.id)] = group.options.map((o) => o.id);
          }
        }

        for (const group of item.selection_groups ?? []) {
          if (group.selections?.length) {
            result.selections[String(group.id)] = group.selections.map((s) => s.id);
          }
        }
      }

      for (const c of elements) {
        for (const item of c.items ?? []) walkItem(item);
        for (const sub of c.subcriteria ?? []) {
          for (const item of sub.items ?? []) walkItem(item);
        }
      }
      return result;
    }
    const compulsoryItems = collectCompulsoryItems(greenElements);
    for (const id of compulsoryItems.items) {
      const stringId = String(id);
      if (!checkedItemsPayload.includes(stringId)) {
        checkedItemsPayload.push(stringId);
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        user_id: user.id,
        rating: totalMarks,
        form_data: inner?.mapped_form_data,
        costs: {
          total_cost: totalCostNum,
          cost_breakdown: costBreakdownPayload,
        },
        checked_items: {
          checkedItems: checkedItemsPayload,
          checkedOptions: checkedOptionsPayload,
          checkedSubitems: checkedSubitemsPayload,
          customItems: customItemsPayload,
          selections: selectionsPayload,
        },
        compulsory_items: compulsoryItems,
      };

      const res = await fetch("/be-api/assessment/submit-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json().catch(() => null);

      if (res.ok && result?.success) {
        sessionStorage.removeItem("assessment_result");
        router.push("/assessments/history");
      } else {
        alert(result?.message ?? "Failed to submit assessment.");
      }
    } catch {
      alert("An error occurred while submitting the assessment.");
    } finally {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  }, [
    costBreakdownWithCert, checkedItems, checkedOptions, checkedSubitems,
    customItems, selectedDropdowns, greenElements, isNotCert, totalMarks, inner,
    user, router,
  ]);

  /* ── Toast on certification level change ── */
  const prevLevelRef = useRef<string | null>(null);
  const [certToast, setCertToast] = useState<{ message: string } | null>(null);
  const isInitialCertRef = useRef(true);

  useEffect(() => {
    if (isInitialCertRef.current) {
      isInitialCertRef.current = false;
      prevLevelRef.current = certificationLevel;
      return;
    }
    const prev = prevLevelRef.current;
    prevLevelRef.current = certificationLevel;

    if (prev === certificationLevel) return;

    if (prev === null) return;

    let message: string;
    if (certificationLevel && certificationLevel !== "Not Certified") {
      if (prev === "Not Certified") {
        message = `Certification set to ${certificationLevel}`;
      } else {
        message = `Certification changed to ${certificationLevel}`;
      }
    } else {
      message = `Certification removed`;
    }

    setCertToast({ message });
    const timer = setTimeout(() => setCertToast(null), 3500);
    return () => clearTimeout(timer);
  }, [certificationLevel]);

  if (loading) return null;

  if (noResults) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-[#3E6B52]/10" />
          <span className="absolute inset-2 rounded-full bg-[#3E6B52]/10" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#F6F6F2] text-[#3E6B52] ring-1 ring-[#E4E7E2]">
            <Inbox size={20} strokeWidth={1.75} />
          </span>
        </div>

        <div className="max-w-70">
          <h2 className="text-[16px] font-semibold text-[#1E2621]">
            No active assessment results
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#5B655F]">
            Start a new assessment to see results appear here.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/assessments/new")}
          className="group flex items-center gap-1.5 rounded-full bg-[#3E6B52] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#345A45] hover:shadow-md active:translate-y-0"
        >
          <Plus size={15} className="transition-transform group-hover:rotate-90" />
          New Assessment
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="relative mx-auto max-w-275 pb-4 pt-6">
        <BackButton action={handleBack} />

        <div className="mb-6">
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
          <ProjectHero
            details={projectDetails}
            activeTierIndex={activeTierIndex}
            activeTab={activeTab}
            costGlimpse={{ totalCost }}
            gbiGlimpse={{ totalMarks, certificationLevel }}
          />
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
                    value={costBreakdownWithCert}
                    projectBudget={projectDetails?.projectBudget ?? null}
                    onChangeAction={handleCostBreakdownChange}
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
                  certifiedScaleRange={certificationsData?.certifiedScaleRange}
                  totalMarks={totalMarks}
                  activeTierIndex={activeTierIndex}
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
            onClick={() => {
              if (!isNotCert) {
                const targetTier = GBI_TIERS[activeTierIndex];
                const targetRange = targetTier
                  ? certificationsData?.certifiedScaleRange?.[targetTier.label]
                  : undefined;
                const targetMin = targetRange ? targetRange[0] : undefined;
                if (targetMin !== undefined && totalMarks < targetMin) {
                  setMarksWarning({
                    target: targetTier.label,
                    min: targetMin,
                    current: totalMarks,
                  });
                  setShowMarksWarning(true);
                  return;
                }
              }
              const budget = projectDetails?.projectBudget;
              const cost = totalCost;
              if (
                typeof budget === "number" &&
                typeof cost === "number" &&
                cost > budget
              ) {
                setConfirmStep("warning");
                setShowSubmitConfirm(true);
                return;
              }
              setConfirmStep("confirm");
              setShowSubmitConfirm(true);
            }}
            className="rounded-full bg-[#3E6B52] px-6 py-3 text-[14px] font-semibold text-[#F6F6F2] shadow-[0_12px_28px_rgba(62,107,82,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(62,107,82,0.30)] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] sm:px-8"
          >
            Submit Assessment
          </button>
        </div>
      </div>

      {/* Certification toast */}
      {certToast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-[#1E2621] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#C08A3E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
            </svg>
            {certToast.message}
          </div>
        </div>
      )}

      {/* Leave confirmation modal */}
      {showLeaveModal && (
        <ConfirmLeaveModal
          onConfirm={handleConfirmLeave}
          onCancel={handleCancelLeave}
        />
      )}

      {/* Marks warning modal */}
      {showMarksWarning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E2621]/40 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowMarksWarning(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-[#E4E1D8] bg-white p-6 shadow-[0_24px_48px_rgba(30,38,33,0.16)] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200"
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3E2] text-[#C08A3E]">
                <AlertTriangle size={20} />
              </span>
              <div>
                <h2
                  className="text-[16px] font-semibold text-[#1E2621]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Marks not achieved
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5B655F]">
                  You need at least {marksWarning.min} &nbsp;marks to reach &quot;
                  {marksWarning.target}&quot;, but you currently have{" "}
                  {marksWarning.current} marks.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowMarksWarning(false);
                setActiveTab("gbi");
              }}
              autoFocus
              className="w-full rounded-full bg-[#B4483C] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(180,72,60,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(180,72,60,0.30)] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#B4483C]"
            >
              Go to GBI Assessment
            </button>
          </div>
        </div>
      )}

      {/* Submit confirmation modal */}
      {showSubmitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E2621]/40 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowSubmitConfirm(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-[#E4E1D8] bg-white p-6 shadow-[0_24px_48px_rgba(30,38,33,0.16)] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200"
          >
            {confirmStep === "warning" ? (
              <>
                <div className="mb-5 flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3E2] text-[#C08A3E] ring-4 ring-[#FEF3E2]/50">
                    <AlertTriangle size={20} strokeWidth={2.25} />
                  </span>
                  <div className="pt-0.5">
                    <h2
                      className="text-[16px] font-semibold text-[#1E2621]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Budget Exceeded
                    </h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#5B655F]">
                      The predicted cost exceeds your project budget. Do you want to proceed with an over-budget status?
                    </p>
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setShowSubmitConfirm(false)}
                    autoFocus
                    className="flex-1 rounded-full border border-[#E4E1D8] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#5B655F] transition-colors hover:bg-[#F6F6F2] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmStep("confirm")}
                    className="flex-1 rounded-full bg-[#C08A3E] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(192,138,62,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(192,138,62,0.30)] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#C08A3E]"
                  >
                    Proceed
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDF3EF] text-[#3E6B52]">
                    <Check size={20} />
                  </span>
                  <div>
                    <h2
                      className="text-[16px] font-semibold text-[#1E2621]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Submit Assessment
                    </h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#5B655F]">
                      Are you sure you want to submit this assessment?
                    </p>
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        projectDetails?.projectBudget != null &&
                        totalCost != null &&
                        totalCost > projectDetails.projectBudget
                      ) {
                        setConfirmStep("warning");
                      } else {
                        setShowSubmitConfirm(false);
                      }
                    }}
                    className="flex-1 rounded-full border border-[#E4E1D8] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#5B655F] transition-colors hover:bg-[#F6F6F2] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
                  >
                    {projectDetails?.projectBudget != null &&
                    totalCost != null &&
                    totalCost > projectDetails.projectBudget
                      ? "Back"
                      : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmitAssessment()}
                    disabled={submitting}
                    autoFocus
                    className="flex-1 rounded-full bg-[#3E6B52] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(62,107,82,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(62,107,82,0.30)] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {submitting ? "Submitting…" : "Submit"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
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
  activeTab,
  costGlimpse,
  gbiGlimpse,
}: {
  details: ProjectDetails;
  activeTierIndex: number;
  activeTab: "cost" | "gbi";
  costGlimpse?: { totalCost: number | undefined };
  gbiGlimpse?: { totalMarks: number; certificationLevel: string | null };
}) {
  const [showDetails, setShowDetails] = useState(false);

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
              {details.projectName ||
                details.buildingType ||
                "Untitled Project"}
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

          {/* Right: dynamic glimpse based on active tab */}
          {(() => {
            const certLabel = gbiGlimpse?.certificationLevel;
            const targetCertLabel = details?.certifiedRatingScale?.split(" (")[0];
            const isNotCert = !targetCertLabel || targetCertLabel === "Not Certified";

            if (isNotCert) {
              return (
                <div className="flex flex-col justify-center p-5 sm:px-7 sm:py-8 md:px-9 md:py-9">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A938C]">
                    Note:
                  </p>

                  <div className="mt-3 flex items-start gap-3 rounded-2xl border border-[#E4DFC0] bg-[#FFF9E6] px-4 py-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C08A3E] text-white">
                      <AlertTriangle size={15} />
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-[#8A6420]">
                        GBI Assessment not available
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-[#71603F]">
                        You selected <span className="font-medium">Not Certified</span>{" "}
                        as your target rating. To unlock the Green Building Index
                        assessment and showcase your project&apos;s green credentials,
                        update your target rating to at least{" "}
                        <span className="font-medium text-[#B8935B]">Certified</span>.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            return (activeTab === "cost" && !isNotCert) ? (
              /* GBI glimpse (shown while viewing cost tab) */
              <div className="flex flex-col justify-center px-5 py-7 sm:px-7 sm:py-8 md:px-9 md:py-9">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A938C]">
                  GBI Assessment
                </p>
                {((): React.ReactNode => {
                  const tier = GBI_TIERS.find(
                    (t) =>
                      t.label === certLabel ||
                      t.key.replace("_", " ") === certLabel?.toLowerCase(),
                  );
                  const tierIndex = tier
                    ? GBI_TIERS.findIndex((t) => t.key === tier.key)
                    : -1;

                  return (
                    <>
                      <p
                        className="mt-2 text-[20px] font-semibold leading-tight sm:text-[22px]"
                        style={{
                          fontFamily: "var(--font-display)",
                          color: tier?.color ?? "#1E2621",
                        }}
                      >
                        {gbiGlimpse?.totalMarks ?? "\u2014"} / 100 pts
                      </p>

                      {/* Tier ladder */}
                      <div className="mt-5">
                        <div className="flex h-2 overflow-hidden rounded-full bg-[#F0EFE9]">
                          {GBI_TIERS.map((t, i) => (
                            <div
                              key={t.key}
                              className="h-full flex-1 transition-opacity"
                              style={{
                                backgroundColor: t.color,
                                opacity:
                                  tierIndex === -1 || i === tierIndex ? 1 : 0.22,
                                marginLeft: i === 0 ? 0 : 2,
                              }}
                            />
                          ))}
                        </div>
                        <div className="mt-2 hidden justify-between sm:flex">
                          {GBI_TIERS.map((t, i) => (
                            <span
                              key={t.key}
                              className="text-center text-[9.5px] font-medium uppercase leading-tight tracking-wide"
                              style={{
                                width: `${100 / GBI_TIERS.length}%`,
                                color: i === tierIndex ? t.color : "#B7BEB8",
                              }}
                            >
                              {t.label}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 flex justify-between sm:hidden">
                          <span className="text-[9.5px] font-medium uppercase tracking-wide text-[#B7BEB8]">
                            Not Certified
                          </span>
                          <span
                            className="text-[9.5px] font-semibold uppercase tracking-wide"
                            style={{ color: tier?.color ?? "#B7BEB8" }}
                          >
                            {tier?.label ?? ""}
                          </span>
                          <span className="text-[9.5px] font-medium uppercase tracking-wide text-[#B7BEB8]">
                            Platinum
                          </span>
                        </div>
                      </div>

                      {tier && gbiGlimpse?.totalMarks !== undefined && (
                        <p className="mt-4 text-[12.5px] leading-relaxed text-[#5B655F]">
                          Currently scored{" "}
                          <span className="font-semibold text-[#1E2621]">
                            {gbiGlimpse.totalMarks}
                          </span>{" "}
                          points
                          {certLabel && (
                            <>
                              {" \u2014 "}
                              <span
                                className="font-semibold"
                                style={{ color: tier.color }}
                              >
                                {certLabel}
                              </span>
                            </>
                          )}
                        </p>
                      )}
                    </>
                    );
                  })()}
              </div>
            ) : (
              /* Cost glimpse (shown while viewing gbi tab) */
              <div className="flex flex-col justify-center px-5 py-7 sm:px-7 sm:py-8 md:px-9 md:py-9">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A938C]">
                  Cost Summary
                </p>
                <p
                  className="mt-2 text-[20px] font-semibold leading-tight sm:text-[22px]"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "#2C4A3A",
                  }}
                >
                  {costGlimpse?.totalCost !== undefined
                    ? formatMoney(costGlimpse.totalCost)
                    : "\u2014"}
                </p>

              <div className="mt-5 flex items-center gap-2 rounded-lg border border-dashed border-[#E4E1D8] px-3.5 py-2">
                <DollarSign size={14} className="text-[#5B655F]" />
                <span
                  className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#5B655F]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Predicted total cost
                </span>
              </div>

              <p className="mt-4 text-[12.5px] leading-relaxed text-[#5B655F]">
                Refine individual element costs in the cost breakdown tab.
              </p>
            </div>
          );
        })()}
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
    {
      label: "Target Rating Scale",
      value: details.certifiedRatingScale || "\u2014",
    },
    {
      label: "Building Size",
      value:
        typeof details.buildingSize === "number"
          ? formatSqft(details.buildingSize)
          : "\u2014",
    },
    {
      label: "Project Budget",
      value:
        typeof details.projectBudget === "number"
          ? formatMYR(details.projectBudget)
          : "\u2014",
    },
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
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 py-3"
            >
              <span className="shrink-0 text-[12.5px] font-medium text-[#5B655F]">
                {row.label}
              </span>
              <span className="text-right text-[13px] font-semibold text-[#1E2621]">
                {row.value}
              </span>
            </div>
          ))}
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
