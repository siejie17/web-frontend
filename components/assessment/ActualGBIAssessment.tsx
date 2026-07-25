"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Leaf,
  Info,
  FileText,
  X,
  Plus,
  Trash2,
  Check,
  Sparkles,
  ChevronRight,
  Lock,
  History,
} from "lucide-react";
import CustomDropdown from "../form/CustomDropdown";

type ID = string | number;

const T = {
  ink: "#14171C",
  canvas: "#FAFAF8",
  predicted: "#5B5BD6",
  actual: "#2F6F4E",
  mismatch: "#F97316",
  custom: "#A6741C",
  customNew: "#0F766E",
};

const mono = "font-mono tabular-nums";

interface OptionType {
  id: ID;
  description: string;
  marks: number;
  sub_description?: string;
}

interface OptionGroup {
  id: ID;
  label: string;
  options: OptionType[];
}

interface SelectionType {
  id: ID;
  description: string;
  marks: number;
}

interface SelectionGroup {
  id: ID;
  label: string;
  exclusive?: boolean;
  selections: SelectionType[];
}

interface SubitemType {
  id: ID;
  description: string;
}

interface ItemType {
  id: ID;
  description: string;
  marks?: number;
  is_compulsory?: number;
  info?: string;
  esg?: string;
  suggestions?: string;
  subitems_exist?: boolean;
  subitems?: SubitemType[];
  option_groups?: OptionGroup[];
  selection_groups?: SelectionGroup[];
}

interface SubcriterionType {
  name: string;
  items?: ItemType[];
}

interface CriterionType {
  name: string;
  total_marks?: number;
  items?: ItemType[];
  subcriteria?: SubcriterionType[];
}

interface CustomItem {
  id: string;
  description: string;
  isCustom: boolean;
}

interface AuditAnswers {
  items: Record<string, boolean>;
  options: Record<string, boolean>;
  subitems: Record<string, boolean>;
  customEntries: Record<string, boolean>;
}

interface AuditMetaEntry {
  itemId?: string;
  optionGroupId?: string;
  optionId?: string;
  selectionGroupId?: string;
  subitemId?: string;
  customValue?: string | null;
  customIndex?: number | null;
  customItemId?: string;
  userAnswerId?: number | null;
}

interface AuditMeta {
  items: Record<string, AuditMetaEntry>;
  options: Record<string, AuditMetaEntry>;
  subitems: Record<string, AuditMetaEntry>;
  customEntries: Record<string, AuditMetaEntry>;
  selections: Record<string, AuditMetaEntry>;
}

interface ActualGBIAssessmentProps {
  greenElements?: (CriterionType | string)[];
  selectedProject?: any;
  setSelectedProject?: Dispatch<SetStateAction<any>>;
  marksData?: {
    predicted: number;
    actual: number;
    total: number;
    predictedPct: number;
    actualPct: number;
  };
  setMarksData?: Dispatch<SetStateAction<any>>;
  showCostUpdatedToast?: boolean;
  onAuditSubmitRef?: React.MutableRefObject<
    (() => Promise<boolean>) | null
  > | null;
  hideSubmitButton?: boolean;
  certifiedScaleRange?: Record<string, [number, number]>;
  certificationMultipliers?: Record<string, number>;
  onApplyMultiplier?: (
    payload: any,
    options?: { suppressToast?: boolean },
  ) => void;
  onAuditUnsavedChange?: (hasChanges: boolean) => void;
  displayOnly?: boolean;
  activeTierIndex?: number;
  [key: string]: any;
}

/* ── Helper components ── */

function PointsBadge({ points, active }: { points: number; active: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide transition-colors duration-150 ${
        active
          ? "bg-[#3E6B52]/[0.1] text-[#3E6B52]"
          : "bg-[#1C1F1D]/[0.05] text-[#1C1F1D]/35"
      }`}
    >
      {points} pts
    </span>
  );
}

function AddCustomItemRow({
  itemId,
  value,
  onChange,
  onSubmit,
}: {
  itemId: ID;
  value?: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
}) {
  const canSubmit = !!value?.trim();

  return (
    <div
      className="mt-3 flex items-center gap-2.5 rounded-[16px] border border-dashed bg-white px-4 py-3.5 transition-all duration-150 focus-within:border-solid focus-within:shadow-[0_1px_3px_rgba(28,31,29,0.05)]"
      style={{ borderColor: `${T.custom}40` }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-150"
        style={{ background: `${T.custom}14` }}
      >
        <Plus size={14} style={{ color: T.custom }} />
      </span>
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSubmit) onSubmit();
        }}
        placeholder="Add a custom item…"
        className="w-full flex-1 bg-transparent text-[13.5px] text-[#1E2621] placeholder:text-[#1E2621]/35 focus:outline-none"
      />
      <button
        type="button"
        disabled={!canSubmit}
        onClick={onSubmit}
        className="shrink-0 rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold transition-all duration-150 active:scale-95 disabled:cursor-default disabled:active:scale-100"
        style={{
          color: canSubmit ? "#FFFFFF" : `${T.custom}80`,
          background: canSubmit ? T.custom : `${T.custom}14`,
        }}
      >
        Add
      </button>
    </div>
  );
}

function InfoGuideModal({
  isVisible,
  info,
  title,
  label,
  onClose,
}: {
  isVisible: boolean;
  info: string;
  title: string;
  label: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#1E2621]/40 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <div className="flex items-center justify-between border-b border-[#1E2621]/8 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#3E6B52]">
                  {label}
                </p>
                <h3 className="font-display text-base font-semibold text-[#1E2621]">
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#1E2621]/40 transition-colors hover:bg-[#1E2621]/5"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4 text-[13.5px] leading-6 text-[#1E2621]/75 whitespace-pre-line">
              {info}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SkeletonLoader({ type }: { type: "criteriaCards" }) {
  return (
    <div className="flex-1 bg-[#F6F6F2] px-6 py-4">
      <div className="mb-5 h-4 w-40 animate-pulse rounded bg-[#1E2621]/10" />
      <div
        className="mb-6 h-13 animate-pulse rounded-2xl bg-white/80"
        style={{ height: 52 }}
      />
      <div className="mb-6 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-19 animate-pulse rounded-2xl bg-white/70" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-18.5 animate-pulse rounded-xl bg-white/70"
          />
        ))}
      </div>
    </div>
  );
}

const createEmptyAuditState = (): AuditAnswers => ({
  items: {},
  options: {},
  subitems: {},
  customEntries: {},
});

const createEmptyAuditMeta = (): AuditMeta => ({
  items: {},
  options: {},
  subitems: {},
  customEntries: {},
  selections: {},
});

/* ── Certification palette ── */

function getCertificationPalette(level: string) {
  const palette: Record<
    string,
    {
      backgroundColor: string;
      borderColor: string;
      labelColor: string;
      valueColor: string;
      badgeBackgroundColor: string;
      badgeTextColor: string;
    }
  > = {
    Platinum: {
      backgroundColor: "#0F172A",
      borderColor: "#334155",
      labelColor: "#E2E8F0",
      valueColor: "#FFFFFF",
      badgeBackgroundColor: "#E2E8F0",
      badgeTextColor: "#0F172A",
    },
    Gold: {
      backgroundColor: "#D97706",
      borderColor: "#F59E0B",
      labelColor: "#FEF3C7",
      valueColor: "#FFFFFF",
      badgeBackgroundColor: "#FEF3C7",
      badgeTextColor: "#92400E",
    },
    Silver: {
      backgroundColor: "#94A3B8",
      borderColor: "#CBD5E1",
      labelColor: "#F8FAFC",
      valueColor: "#FFFFFF",
      badgeBackgroundColor: "#F8FAFC",
      badgeTextColor: "#475569",
    },
    Certified: {
      backgroundColor: "#059669",
      borderColor: "#34D399",
      labelColor: "#D1FAE5",
      valueColor: "#FFFFFF",
      badgeBackgroundColor: "#D1FAE5",
      badgeTextColor: "#065F46",
    },
    "Not Certified": {
      backgroundColor: "#DC2626",
      borderColor: "#F87171",
      labelColor: "#FEE2E2",
      valueColor: "#FFFFFF",
      badgeBackgroundColor: "#FEE2E2",
      badgeTextColor: "#991B1B",
    },
  };
  return palette[level] || palette["Not Certified"];
}

/* ════════════════════════════════════════════════════════════════════════════
   Main component — Actual GBI Assessment (audit comparison)
   Ported from the React Native GreenElementsDisplayScreen
   ════════════════════════════════════════════════════════════════════════════ */

function hasNestedValues(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.some(hasNestedValues);
  if (typeof value === "object")
    return Object.values(value).some(hasNestedValues);
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

const ActualGBIAssessment = ({
  greenElements,
  selectedProject,
  setSelectedProject,
  marksData: _marksData,
  setMarksData,
  showCostUpdatedToast,
  onAuditSubmitRef = null,
  hideSubmitButton = false,
  ...otherProps
}: ActualGBIAssessmentProps) => {
  const certifiedScaleRange = useMemo(
    () => (otherProps?.certifiedScaleRange as Record<string, [number, number]>) || {},
    [otherProps?.certifiedScaleRange],
  );
  const certificationMultipliers =
    (otherProps?.certificationMultipliers as Record<string, number>) || {};
  const isRefreshingProject =
    (otherProps?.isRefreshingProject as boolean) || false;
  const activeActualCostBreakdown =
    (otherProps?.actualCostBreakdown as any) ||
    selectedProject?.cost_breakdown ||
    null;
  const onAuditUnsavedChange = useMemo(
    () => (otherProps?.onAuditUnsavedChange as (h: boolean) => void) || (() => {}),
    [otherProps?.onAuditUnsavedChange],
  );
  const safeGreenElements = useMemo(
    () => (Array.isArray(greenElements) ? greenElements : []),
    [greenElements],
  );
  const auditSubmitRef = onAuditSubmitRef;

  const [criteria, setCriteria] = useState<CriterionType[]>([]);
  const [selectedDropdowns, setSelectedDropdowns] = useState<
    Record<string, SelectionType | null>
  >({});
  const [selectedCriterion, setSelectedCriterion] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [isInfoGuideVisible, setIsInfoGuideVisible] = useState(false);
  const [infoGuideText, setInfoGuideText] = useState("");
  const [infoGuideTitle, setInfoGuideTitle] = useState("Information");
  const [infoGuideLabel, setInfoGuideLabel] = useState("Guide");
  const [baselineAnswers, setBaselineAnswers] = useState<AuditAnswers>(
    createEmptyAuditState(),
  );
  const [baselineAnswerMeta, setBaselineAnswerMeta] = useState<AuditMeta>(
    createEmptyAuditMeta(),
  );
  const [actualAnswers, setActualAnswers] = useState<AuditAnswers>(
    createEmptyAuditState(),
  );
  const [baselineSelectionAnswers, setBaselineSelectionAnswers] = useState<
    Record<string, ID | null>
  >({});
  const [actualSelectionAnswers, setActualSelectionAnswers] = useState<
    Record<string, ID | null>
  >({});
  const [activeExclusiveGroup, setActiveExclusiveGroup] = useState<ID | null>(
    null,
  );
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [customItems, setCustomItems] = useState<Record<string, CustomItem[]>>(
    {},
  );

  const lastAppliedMultiplierRef = useRef<any>(null);
  const lastAuditInitializationSignatureRef = useRef<string | null>(null);
  const verticalScrollRef = useRef<HTMLDivElement>(null);

  const handleInfoGuideOpen = (
    text: string,
    title = "Information",
    label = "Guide",
  ) => {
    setInfoGuideText(text);
    setInfoGuideTitle(title);
    setInfoGuideLabel(label);
    setIsInfoGuideVisible(true);
  };

  const selectedCriterionData = useMemo(() => {
    if (criteria && selectedCriterion) {
      return criteria.find((criterion) => criterion.name === selectedCriterion);
    }
    return null;
  }, [criteria, selectedCriterion]);

  const handleSectionPress = useCallback((criterion: CriterionType) => {
    setSelectedCriterion(criterion.name);
    verticalScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    setLoading(true);

    if (safeGreenElements.length > 0) {
      const newSections = safeGreenElements
        .map((item: any) => {
          let name: string | undefined;
          if (typeof item === "string") {
            name = item;
          } else if (item && item.name) {
            name = item.name;
          } else {
            name = String(item);
          }
          return name ? { ...item } : null;
        })
        .filter(Boolean) as CriterionType[];

      setSelectedCriterion(newSections[0]?.name || null);
      setCriteria(newSections);
    } else {
      setCriteria([]);
    }

    setLoading(false);
  }, [safeGreenElements]);

  const checkedItemsPayload = useMemo(() => {
    return selectedProject?.checked_items &&
      typeof selectedProject.checked_items === "object" &&
      !Array.isArray(selectedProject.checked_items)
      ? selectedProject.checked_items
      : null;
  }, [selectedProject]);

  const actualCheckedItemsPayload = useMemo(() => {
    return selectedProject?.actual_checked_items &&
      typeof selectedProject.actual_checked_items === "object" &&
      !Array.isArray(selectedProject.actual_checked_items)
      ? selectedProject.actual_checked_items
      : null;
  }, [selectedProject]);

  const answerIdsPayload = useMemo(() => {
    return (
      checkedItemsPayload?.answerIds ?? selectedProject?.answer_ids ?? null
    );
  }, [checkedItemsPayload, selectedProject]);

  const actualAnswerIdsPayload = useMemo(() => {
    return selectedProject?.actual_answers_id ?? null;
  }, [selectedProject]);

  const auditInitializationSignature = useMemo(
    () =>
      JSON.stringify({
        criteria: (criteria || []).map((criterion) => criterion?.name || ""),
        checked_items: selectedProject?.checked_items ?? null,
        checked_options: selectedProject?.checked_options ?? null,
        checked_subitems: selectedProject?.checked_subitems ?? null,
        custom_inputs: selectedProject?.custom_inputs ?? null,
        selected_items:
          selectedProject?.selected_items ??
          selectedProject?.selectedItems ??
          null,
        actual_checked_items: selectedProject?.actual_checked_items ?? null,
        actual_checked_options: selectedProject?.actual_checked_options ?? null,
        actual_checked_subitems:
          selectedProject?.actual_checked_subitems ?? null,
        actual_custom_inputs: selectedProject?.actual_custom_inputs ?? null,
        actual_selected_items:
          selectedProject?.actual_selected_items ??
          selectedProject?.actualSelectedItems ??
          null,
        answer_ids: selectedProject?.answer_ids ?? null,
        actual_answers_id: selectedProject?.actual_answers_id ?? null,
        checked_items_payload: checkedItemsPayload ?? null,
        actual_checked_items_payload: actualCheckedItemsPayload ?? null,
      }),
    [
      actualCheckedItemsPayload,
      checkedItemsPayload,
      criteria,
      selectedProject?.actual_answers_id,
      selectedProject?.actual_checked_items,
      selectedProject?.actual_checked_options,
      selectedProject?.actual_checked_subitems,
      selectedProject?.actual_custom_inputs,
      selectedProject?.actual_selected_items,
      selectedProject?.actualSelectedItems,
      selectedProject?.answer_ids,
      selectedProject?.checked_items,
      selectedProject?.checked_options,
      selectedProject?.checked_subitems,
      selectedProject?.custom_inputs,
      selectedProject?.selected_items,
      selectedProject?.selectedItems,
    ],
  );

  const toNumericId = useCallback((value: any): ID | null => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }, []);

  const normalizeIdArray = useCallback(
    (value: any): ID[] => {
      if (Array.isArray(value)) {
        return value.map(toNumericId).filter((item) => item !== null) as ID[];
      }
      if (value && typeof value === "object") {
        return Object.keys(value)
          .filter((key) => value[key])
          .map(toNumericId)
          .filter((item) => item !== null) as ID[];
      }
      return [];
    },
    [toNumericId],
  );

  const getCheckedOptionIds = useCallback(
    (groupId: ID): ID[] => {
      const currentValue =
        checkedItemsPayload?.checkedOptions?.[groupId] ??
        selectedProject?.checked_options?.[groupId] ??
        [];
      return normalizeIdArray(currentValue);
    },
    [checkedItemsPayload, normalizeIdArray, selectedProject],
  );

  const getSelectedSelectionId = useCallback(
    (groupId: ID): ID | null => {
      return toNumericId(
        checkedItemsPayload?.selections?.[groupId] ??
          selectedProject?.selected_items?.[groupId] ??
          selectedProject?.selectedItems?.[groupId] ??
          null,
      );
    },
    [checkedItemsPayload, selectedProject, toNumericId],
  );

  const getCheckedSubitemsList = useCallback(
    (itemId: ID): ID[] => {
      return normalizeIdArray(
        checkedItemsPayload?.checkedSubitems?.[itemId] ??
          selectedProject?.checked_subitems?.[itemId] ??
          [],
      );
    },
    [checkedItemsPayload, normalizeIdArray, selectedProject],
  );

  const getCustomInputsList = useCallback(
    (itemId: ID): string[] => {
      const currentValue =
        checkedItemsPayload?.customItems?.[itemId] ??
        selectedProject?.custom_inputs?.[itemId] ??
        [];
      return Array.isArray(currentValue) ? currentValue : [];
    },
    [checkedItemsPayload, selectedProject],
  );

  const getCheckedItemIds = useCallback((): ID[] => {
    if (Array.isArray(selectedProject?.checked_items)) {
      return normalizeIdArray(selectedProject.checked_items);
    }
    if (Array.isArray(checkedItemsPayload?.checkedItems)) {
      return normalizeIdArray(checkedItemsPayload.checkedItems);
    }
    return [];
  }, [checkedItemsPayload, normalizeIdArray, selectedProject]);

  const getActualCheckedOptionIds = useCallback(
    (groupId: ID): ID[] => {
      const currentValue =
        actualCheckedItemsPayload?.checkedOptions?.[groupId] ??
        selectedProject?.actual_checked_options?.[groupId] ??
        [];
      return normalizeIdArray(currentValue);
    },
    [actualCheckedItemsPayload, normalizeIdArray, selectedProject],
  );

  const getActualSelectedSelectionId = useCallback(
    (groupId: ID): ID | null => {
      return toNumericId(
        actualCheckedItemsPayload?.selections?.[groupId] ??
          selectedProject?.actual_selected_items?.[groupId] ??
          selectedProject?.actualSelectedItems?.[groupId] ??
          null,
      );
    },
    [actualCheckedItemsPayload, selectedProject, toNumericId],
  );

  const getActualCheckedSubitemsList = useCallback(
    (itemId: ID): ID[] => {
      return normalizeIdArray(
        actualCheckedItemsPayload?.checkedSubitems?.[itemId] ??
          selectedProject?.actual_checked_subitems?.[itemId] ??
          [],
      );
    },
    [actualCheckedItemsPayload, normalizeIdArray, selectedProject],
  );

  const getActualCustomInputsList = useCallback(
    (itemId: ID): string[] => {
      const currentValue =
        actualCheckedItemsPayload?.customItems?.[itemId] ??
        selectedProject?.actual_custom_inputs?.[itemId] ??
        [];
      return Array.isArray(currentValue) ? currentValue : [];
    },
    [actualCheckedItemsPayload, selectedProject],
  );

  const getCustomEntryAuditKey = useCallback(
    (
      itemId: ID,
      customValue: string | null,
      fallbackIndex: number | null = null,
    ): string => {
      const normalizedCustomValue =
        customValue === null || customValue === undefined
          ? ""
          : String(customValue).trim();
      if (normalizedCustomValue) {
        return `${itemId}:value:${normalizedCustomValue}`;
      }
      return `${itemId}:index:${fallbackIndex ?? ""}`;
    },
    [],
  );

  const getActualCheckedItemIds = useCallback((): ID[] => {
    if (Array.isArray(selectedProject?.actual_checked_items)) {
      return normalizeIdArray(selectedProject.actual_checked_items);
    }
    if (Array.isArray(actualCheckedItemsPayload?.checkedItems)) {
      return normalizeIdArray(actualCheckedItemsPayload.checkedItems);
    }
    return [];
  }, [actualCheckedItemsPayload, normalizeIdArray, selectedProject]);

  const hasPersistedActualAudit = useMemo(() => {
    const actualSources = [
      actualCheckedItemsPayload?.checkedItems ??
        selectedProject?.actual_checked_items ??
        null,
      actualCheckedItemsPayload?.checkedOptions ??
        selectedProject?.actual_checked_options ??
        null,
      actualCheckedItemsPayload?.checkedSubitems ??
        selectedProject?.actual_checked_subitems ??
        null,
      actualCheckedItemsPayload?.customItems ??
        selectedProject?.actual_custom_inputs ??
        null,
      actualCheckedItemsPayload?.selections ??
        selectedProject?.actual_selected_items ??
        selectedProject?.actualSelectedItems ??
        null,
      actualAnswerIdsPayload ?? null,
    ];
    return actualSources.some(hasNestedValues);
  }, [
    actualAnswerIdsPayload,
    actualCheckedItemsPayload,
    hasNestedValues,
    selectedProject,
  ]);

  const getActualItemAnswerId = useCallback(
    (itemId: ID): number | null => {
      return actualAnswerIdsPayload?.items?.[itemId] ?? null;
    },
    [actualAnswerIdsPayload],
  );

  const getItemAnswerId = useCallback(
    (itemId: ID): number | null => {
      return answerIdsPayload?.items?.[itemId] ?? null;
    },
    [answerIdsPayload],
  );

  const getActualOptionAnswerId = useCallback(
    (groupId: ID, optionId: ID): number | null => {
      return actualAnswerIdsPayload?.options?.[groupId]?.[optionId] ?? null;
    },
    [actualAnswerIdsPayload],
  );

  const getOptionAnswerId = useCallback(
    (groupId: ID, optionId: ID): number | null => {
      return answerIdsPayload?.options?.[groupId]?.[optionId] ?? null;
    },
    [answerIdsPayload],
  );

  const getActualSelectionAnswerId = useCallback(
    (groupId: ID): number | null => {
      return actualAnswerIdsPayload?.selections?.[groupId] ?? null;
    },
    [actualAnswerIdsPayload],
  );

  const getSelectionAnswerId = useCallback(
    (groupId: ID): number | null => {
      return answerIdsPayload?.selections?.[groupId] ?? null;
    },
    [answerIdsPayload],
  );

  const getActualSubitemAnswerId = useCallback(
    (itemId: ID, subitemId: ID): number | null => {
      return actualAnswerIdsPayload?.subitems?.[itemId]?.[subitemId] ?? null;
    },
    [actualAnswerIdsPayload],
  );

  const getSubitemAnswerId = useCallback(
    (itemId: ID, subitemId: ID): number | null => {
      return answerIdsPayload?.subitems?.[itemId]?.[subitemId] ?? null;
    },
    [answerIdsPayload],
  );

  const getCustomEntryAnswerId = useCallback(
    (
      itemId: ID,
      customValue: string | null,
      customIndex: number | null = null,
    ): number | null => {
      const customEntries = answerIdsPayload?.customEntries?.[itemId];
      if (!customEntries) return null;
      const normalizedCustomValue =
        customValue === null || customValue === undefined
          ? null
          : String(customValue).trim();
      if (
        normalizedCustomValue !== null &&
        Object.prototype.hasOwnProperty.call(
          customEntries,
          normalizedCustomValue,
        )
      ) {
        return customEntries[normalizedCustomValue] ?? null;
      }
      if (
        customIndex !== null &&
        customIndex !== undefined &&
        Object.prototype.hasOwnProperty.call(customEntries, customIndex)
      ) {
        return customEntries[customIndex] ?? null;
      }
      return null;
    },
    [answerIdsPayload],
  );

  const getActualCustomEntryAnswerId = useCallback(
    (
      itemId: ID,
      customValue: string | null,
      customIndex: number | null = null,
    ): number | null => {
      const customEntries = actualAnswerIdsPayload?.customEntries?.[itemId];
      if (!customEntries) return null;
      const normalizedCustomValue =
        customValue === null || customValue === undefined
          ? null
          : String(customValue).trim();
      if (
        normalizedCustomValue !== null &&
        Object.prototype.hasOwnProperty.call(
          customEntries,
          normalizedCustomValue,
        )
      ) {
        return customEntries[normalizedCustomValue] ?? null;
      }
      if (
        customIndex !== null &&
        customIndex !== undefined &&
        Object.prototype.hasOwnProperty.call(customEntries, customIndex)
      ) {
        return customEntries[customIndex] ?? null;
      }
      return null;
    },
    [actualAnswerIdsPayload],
  );

  // Initialize audit state from persisted data
  useEffect(() => {
    if (!criteria.length || !selectedProject) {
      lastAuditInitializationSignatureRef.current = null;
      setBaselineAnswers(createEmptyAuditState());
      setBaselineAnswerMeta(createEmptyAuditMeta());
      setActualAnswers(createEmptyAuditState());
      setBaselineSelectionAnswers({});
      setActualSelectionAnswers({});
      setSelectedDropdowns({});
      return;
    }

    if (
      lastAuditInitializationSignatureRef.current ===
      auditInitializationSignature
    ) {
      return;
    }

    const nextBaseline = createEmptyAuditState();
    const nextActual = createEmptyAuditState();
    const nextBaselineMeta = createEmptyAuditMeta();
    const nextBaselineSelections: Record<string, ID | null> = {};
    const nextActualSelections: Record<string, ID | null> = {};
    const nextSelectedDropdowns: Record<string, SelectionType | null> = {};
    let nextActiveExclusiveGroup: ID | null = null;
    const actualItemIdSet = new Set(
      getActualCheckedItemIds().map((id) => String(id)),
    );

    criteria.forEach((criterion) => {
      const allItems = [
        ...(criterion.items || []),
        ...(criterion.subcriteria?.flatMap(
          (subcriterion) => subcriterion.items || [],
        ) || []),
      ];

      allItems.forEach((item) => {
        const optionGroups = Array.isArray(item.option_groups)
          ? item.option_groups
          : [];
        const selectionGroups = Array.isArray(item.selection_groups)
          ? item.selection_groups
          : [];
        const subitems = Array.isArray(item.subitems) ? item.subitems : [];
        const hasOptions = optionGroups.some(
          (group) => Array.isArray(group?.options) && group.options.length > 0,
        );
        const hasSelections = selectionGroups.some(
          (group) =>
            Array.isArray(group?.selections) && group.selections.length > 0,
        );
        const hasSubitems = item.subitems_exist && subitems.length > 0;

        if (!hasOptions && !hasSelections && !hasSubitems) {
          const isFixedActualChecked = actualItemIdSet.has(String(item.id));
          nextBaseline.items[item.id] = isFixedActualChecked;
          nextActual.items[item.id] = isFixedActualChecked;
          nextBaselineMeta.items[item.id] = {
            itemId: String(item.id),
            userAnswerId: isFixedActualChecked
              ? getActualItemAnswerId(item.id)
              : null,
          };
        }

        optionGroups.forEach((group) => {
          const fixedActualOptionIdSet = new Set(
            getActualCheckedOptionIds(group.id).map((id) => String(id)),
          );
          (group.options || []).forEach((option) => {
            const optionKey = `${group.id}:${option.id}`;
            const isFixedActualChecked = fixedActualOptionIdSet.has(
              String(option.id),
            );
            nextBaseline.options[optionKey] = isFixedActualChecked;
            nextActual.options[optionKey] = isFixedActualChecked;
            nextBaselineMeta.options[optionKey] = {
              optionGroupId: String(group.id),
              optionId: String(option.id),
              userAnswerId: isFixedActualChecked
                ? getActualOptionAnswerId(group.id, option.id)
                : null,
            };
          });
        });

        selectionGroups.forEach((group) => {
          const fixedActualSelectionId =
            getActualSelectedSelectionId(group.id) ?? null;
          nextBaselineSelections[group.id] = fixedActualSelectionId;
          nextActualSelections[group.id] = fixedActualSelectionId;
          nextSelectedDropdowns[group.id] =
            fixedActualSelectionId !== null
              ? (group.selections || []).find(
                  (s) => String(s.id) === String(fixedActualSelectionId),
                ) || null
              : null;
          nextBaselineMeta.selections[group.id] = {
            selectionGroupId: String(group.id),
            userAnswerId:
              fixedActualSelectionId !== null
                ? getActualSelectionAnswerId(group.id)
                : null,
          };
          if (group.exclusive && fixedActualSelectionId !== null) {
            nextActiveExclusiveGroup = group.id;
          }
        });

        if (hasSubitems) {
          const fixedActualSubitemIdSet = new Set(
            getActualCheckedSubitemsList(item.id).map((id) => String(id)),
          );
          subitems.forEach((subitem) => {
            const subitemKey = `${item.id}:${subitem.id}`;
            const isFixedActualChecked = fixedActualSubitemIdSet.has(
              String(subitem.id),
            );
            nextBaseline.subitems[subitemKey] = isFixedActualChecked;
            nextActual.subitems[subitemKey] = isFixedActualChecked;
            nextBaselineMeta.subitems[subitemKey] = {
              itemId: String(item.id),
              subitemId: String(subitem.id),
              userAnswerId: isFixedActualChecked
                ? getActualSubitemAnswerId(item.id, subitem.id)
                : null,
            };
          });

          const fixedActualCustomInputsList = getActualCustomInputsList(
            item.id,
          );
          fixedActualCustomInputsList.forEach((customValue, index) => {
            const customKey = getCustomEntryAuditKey(
              item.id,
              customValue,
              index,
            );
            nextBaseline.customEntries[customKey] = true;
            nextBaselineMeta.customEntries[customKey] = {
              itemId: String(item.id),
              customIndex: index,
              customValue,
              userAnswerId: getActualCustomEntryAnswerId(
                item.id,
                customValue,
                index,
              ),
            };
            nextActual.customEntries[customKey] = true;
          });
        }
      });
    });

    setBaselineAnswers(nextBaseline);
    setBaselineAnswerMeta(nextBaselineMeta);
    setActualAnswers(nextActual);
    setBaselineSelectionAnswers(nextBaselineSelections);
    setActualSelectionAnswers(nextActualSelections);
    setSelectedDropdowns(nextSelectedDropdowns);
    setActiveExclusiveGroup(nextActiveExclusiveGroup);
    lastAuditInitializationSignatureRef.current = auditInitializationSignature;
  }, [
    auditInitializationSignature,
    criteria,
    getActualCheckedItemIds,
    getActualCheckedOptionIds,
    getActualCheckedSubitemsList,
    getActualCustomInputsList,
    getActualCustomEntryAnswerId,
    getActualItemAnswerId,
    getActualOptionAnswerId,
    getActualSelectedSelectionId,
    getActualSelectionAnswerId,
    getActualSubitemAnswerId,
    getCustomEntryAuditKey,
    selectedProject,
  ]);

  const buildSupplementalInfo = useCallback((item: ItemType) => {
    const sections: string[] = [];
    if (item.esg) {
      sections.push(`## ESG Sarawak\n\n${item.esg}`);
    }
    if (item.suggestions) {
      sections.push(`## Materials & Suggestions\n\n${item.suggestions}`);
    }
    return sections.join("\n\n");
  }, []);

  const toggleActualAnswer = useCallback(
    (category: keyof AuditAnswers, key: string) => {
      setActualAnswers((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          [key]: !prev[category]?.[key],
        },
      }));

      if (category === "customEntries") {
        setBaselineAnswerMeta((prev) => {
          if (prev.customEntries[key]) return prev;
          const parts = key.split(":");
          const itemId = parts[0];
          const keyType = parts[1];
          let customValue: string | null = null;
          let customIndex: number | null = null;
          if (keyType === "value" && parts.length > 2) {
            customValue = parts.slice(2).join(":");
          } else if (keyType === "index") {
            customIndex = parts[2] ? Number(parts[2]) : null;
          }
          return {
            ...prev,
            customEntries: {
              ...prev.customEntries,
              [key]: { itemId, customValue, customIndex, userAnswerId: null },
            },
          };
        });
      }
    },
    [],
  );

  const handleCustomInputChange = useCallback((itemId: ID, text: string) => {
    setCustomInputs((prev) => ({ ...prev, [itemId]: text }));
  }, []);

  const addCustomItem = useCallback((itemId: ID, text: string) => {
    if (!text || !text.trim()) return;

    const customItemId = `custom_${itemId}_${Date.now()}`;
    const newCustomItem: CustomItem = {
      id: customItemId,
      description: text.trim(),
      isCustom: true,
    };

    setCustomItems((prevCustomItems) => ({
      ...prevCustomItems,
      [itemId]: [...(prevCustomItems[itemId] || []), newCustomItem],
    }));

    const customAuditKey = `${itemId}:value:${text.trim()}`;
    setActualAnswers((prev) => ({
      ...prev,
      customEntries: {
        ...prev.customEntries,
        [customAuditKey]: true,
      },
    }));

    setBaselineAnswerMeta((prev) => ({
      ...prev,
      customEntries: {
        ...prev.customEntries,
        [customAuditKey]: {
          itemId: String(itemId),
          customValue: text.trim(),
          customIndex: null,
          customItemId,
          userAnswerId: null,
        },
      },
    }));

    setCustomInputs((prev) => ({ ...prev, [itemId]: "" }));
  }, []);

  const deleteCustomItem = useCallback(
    (itemId: ID, customItemId: string) => {
      const customValue = Object.values(
        baselineAnswerMeta.customEntries || {},
      ).find((entry) => entry?.customItemId === customItemId)?.customValue;

      setCustomItems((prevCustomItems) => ({
        ...prevCustomItems,
        [itemId]:
          prevCustomItems[itemId]?.filter((item) => item.id !== customItemId) ||
          [],
      }));

      if (customValue) {
        const customAuditKey = `${itemId}:value:${customValue}`;
        setActualAnswers((prev) => {
          const updatedAnswers = { ...prev };
          delete updatedAnswers.customEntries?.[customAuditKey];
          return updatedAnswers;
        });
        setBaselineAnswerMeta((prev) => ({
          ...prev,
          customEntries: Object.entries(prev.customEntries || {})
            .filter(([key]) => key !== customAuditKey)
            .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {}),
        }));
      }
    },
    [baselineAnswerMeta],
  );

  const normalizeSelectionValue = useCallback(
    (groupId: ID, value: ID | null): ID | null => {
      if (value === null || value === undefined || value === "") return null;
      const matchedSelection = (criteria || [])
        .flatMap((criterion) => [
          ...(criterion.items || []),
          ...(criterion.subcriteria?.flatMap(
            (subcriterion) => subcriterion.items || [],
          ) || []),
        ])
        .flatMap((item) => item.selection_groups || [])
        .find((group) => String(group?.id) === String(groupId))
        ?.selections?.find(
          (selection) => String(selection?.id) === String(value),
        );

      const description =
        typeof matchedSelection?.description === "string"
          ? matchedSelection.description.trim().toLowerCase()
          : "";

      if (description === "none / not applicable") {
        return null;
      }
      return value;
    },
    [criteria],
  );

  const auditChanges = useMemo(() => {
    const changes: any[] = [];
    const checkboxCategories: (keyof AuditAnswers)[] = [
      "items",
      "options",
      "subitems",
      "customEntries",
    ];

    checkboxCategories.forEach((category) => {
      const baselineCategory = baselineAnswers[category] || {};
      const actualCategory = actualAnswers[category] || {};
      const metaCategory = baselineAnswerMeta[category] || {};
      const keys = new Set([
        ...Object.keys(baselineCategory),
        ...Object.keys(actualCategory),
      ]);

      keys.forEach((key) => {
        const before = !!baselineCategory[key];
        const after = !!actualCategory[key];
        const meta = metaCategory[key] || {};

        if (before === after) return;

        if (category === "items") {
          changes.push({
            action: after ? "add" : "delete",
            answerType: "item",
            userAnswerId: meta.userAnswerId ?? null,
            itemId: meta.itemId ?? key,
          });
          return;
        }
        if (category === "options") {
          changes.push({
            action: after ? "add" : "delete",
            answerType: "option",
            userAnswerId: meta.userAnswerId ?? null,
            optionGroupId: meta.optionGroupId ?? key.split(":")[0],
            optionId: meta.optionId ?? key.split(":")[1],
          });
          return;
        }
        if (category === "subitems") {
          changes.push({
            action: after ? "add" : "delete",
            answerType: "subitem",
            userAnswerId: meta.userAnswerId ?? null,
            itemId: meta.itemId ?? key.split(":")[0],
            subitemId: meta.subitemId ?? key.split(":")[1],
          });
          return;
        }
        changes.push({
          action: after ? "add" : "delete",
          answerType: "custom",
          userAnswerId:
            meta.userAnswerId ??
            getActualCustomEntryAnswerId(
              meta.itemId ?? key.split(":")[0],
              meta.customValue ?? null,
              meta.customIndex ?? Number(key.split(":")[1]),
            ) ??
            null,
          itemId: meta.itemId ?? key.split(":")[0],
          customValue: meta.customValue ?? null,
        });
      });
    });

    const selectionKeys = new Set([
      ...Object.keys(baselineSelectionAnswers),
      ...Object.keys(actualSelectionAnswers),
    ]);

    selectionKeys.forEach((groupId) => {
      const before = normalizeSelectionValue(
        groupId as ID,
        baselineSelectionAnswers[groupId] ?? null,
      );
      const after = normalizeSelectionValue(
        groupId as ID,
        actualSelectionAnswers[groupId] ?? null,
      );
      const meta = baselineAnswerMeta.selections[groupId] || {};

      if (String(before ?? "") === String(after ?? "")) return;

      if (before !== null && after !== null) {
        changes.push({
          action: "edit",
          answerType: "selection",
          userAnswerId: meta.userAnswerId ?? null,
          selectionGroupId: meta.selectionGroupId ?? groupId,
          baselineValue: before,
          actualValue: after,
          previousSelectionId: before,
          newSelectionId: after,
        });
        return;
      }
      if (before === null && after !== null) {
        changes.push({
          action: "add",
          answerType: "selection",
          userAnswerId: null,
          selectionGroupId: meta.selectionGroupId ?? groupId,
          baselineValue: before,
          actualValue: after,
          selectionId: after,
        });
        return;
      }
      if (before !== null && after === null) {
        changes.push({
          action: "delete",
          answerType: "selection",
          userAnswerId: meta.userAnswerId ?? null,
          selectionGroupId: meta.selectionGroupId ?? groupId,
          baselineValue: before,
          actualValue: after,
          selectionId: before,
        });
      }
    });

    return changes;
  }, [
    actualAnswers,
    actualSelectionAnswers,
    baselineAnswerMeta,
    baselineAnswers,
    baselineSelectionAnswers,
    getActualCustomEntryAnswerId,
    normalizeSelectionValue,
  ]);

  const hasAuditChanges = auditChanges.length > 0;

  useEffect(() => {
    onAuditUnsavedChange(hasAuditChanges);
  }, [hasAuditChanges, onAuditUnsavedChange]);

  useEffect(() => {
    return () => {
      onAuditUnsavedChange(false);
    };
  }, [onAuditUnsavedChange]);

  const commitCurrentAuditStateAsBaseline = useCallback(() => {
    setBaselineAnswers(JSON.parse(JSON.stringify(actualAnswers)));
    setBaselineSelectionAnswers(
      JSON.parse(JSON.stringify(actualSelectionAnswers)),
    );
    onAuditUnsavedChange(false);
  }, [actualAnswers, actualSelectionAnswers, onAuditUnsavedChange]);

  const buildCommittedActualCustomInputs = useCallback(() => {
    const nextActualCustomInputs: Record<string, string[]> = {};

    criteria.forEach((criterion) => {
      const allItems = [
        ...(criterion.items || []),
        ...(criterion.subcriteria?.flatMap(
          (subcriterion) => subcriterion.items || [],
        ) || []),
      ];

      allItems.forEach((item) => {
        const subitems = Array.isArray(item.subitems) ? item.subitems : [];
        const hasSubitems = item.subitems_exist && subitems.length > 0;
        if (!hasSubitems) return;

        const committedValues: string[] = [];
        const seenValues = new Set<string>();
        const appendValue = (value: string | null | undefined) => {
          const normalizedValue =
            value === null || value === undefined ? "" : String(value).trim();
          if (!normalizedValue || seenValues.has(normalizedValue)) return;
          seenValues.add(normalizedValue);
          committedValues.push(normalizedValue);
        };

        getCustomInputsList(item.id).forEach((customValue, index) => {
          const customAuditKey = getCustomEntryAuditKey(
            item.id,
            customValue,
            index,
          );
          if (actualAnswers.customEntries?.[customAuditKey]) {
            appendValue(customValue);
          }
        });

        getActualCustomInputsList(item.id).forEach((customValue, index) => {
          const customAuditKey = getCustomEntryAuditKey(
            item.id,
            customValue,
            index,
          );
          if (actualAnswers.customEntries?.[customAuditKey]) {
            appendValue(customValue);
          }
        });

        (customItems[item.id] || []).forEach((customItem) => {
          appendValue(customItem?.description);
        });

        if (committedValues.length > 0) {
          nextActualCustomInputs[item.id] = committedValues;
        }
      });
    });

    return nextActualCustomInputs;
  }, [
    actualAnswers.customEntries,
    criteria,
    customItems,
    getActualCustomInputsList,
    getCustomEntryAuditKey,
    getCustomInputsList,
  ]);

  const handleSubmitAuditChanges = useCallback(async (): Promise<boolean> => {
    if (auditChanges.length === 0) return true;

    try {
      const response = await fetch(
        `/api/projects/${selectedProject.id}/save-actual-changes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actualChanges: auditChanges }),
        },
      );

      if (!response.ok) return false;

      const nextActualCustomInputs = buildCommittedActualCustomInputs();

      setCustomItems({});
      setSelectedProject?.((prevProject: any) => {
        if (!prevProject) return prevProject;
        const nextProject = JSON.parse(JSON.stringify(prevProject));
        nextProject.actual_custom_inputs = nextActualCustomInputs;
        if (
          nextProject.actual_checked_items &&
          typeof nextProject.actual_checked_items === "object" &&
          !Array.isArray(nextProject.actual_checked_items)
        ) {
          nextProject.actual_checked_items.customItems = nextActualCustomInputs;
        }
        return nextProject;
      });

      commitCurrentAuditStateAsBaseline();
      return true;
    } catch {
      return false;
    }
  }, [
    auditChanges,
    selectedProject,
    buildCommittedActualCustomInputs,
    commitCurrentAuditStateAsBaseline,
    setSelectedProject,
  ]);

  // Register submit handler with parent
  useEffect(() => {
    if (auditSubmitRef) {
      auditSubmitRef.current = handleSubmitAuditChanges;
    }
  }, [handleSubmitAuditChanges, auditSubmitRef]);

  const getAllCriterionItems = useCallback((criterionData: any): ItemType[] => {
    if (!criterionData) return [];
    const allItems: ItemType[] = [];
    if (criterionData.items && Array.isArray(criterionData.items)) {
      allItems.push(...criterionData.items);
    }
    if (criterionData.subcriteria && Array.isArray(criterionData.subcriteria)) {
      criterionData.subcriteria.forEach((subcriterion: SubcriterionType) => {
        if (subcriterion.items && Array.isArray(subcriterion.items)) {
          allItems.push(...subcriterion.items);
        }
      });
    }
    return allItems;
  }, []);

  const calculateCriterionMarks = useCallback(
    (
      criterionData: any,
      sources: {
        getItemIds: () => ID[];
        getOptionIds: (groupId: ID) => ID[];
        getSelectionId: (groupId: ID) => ID | null;
        getSubitemsList: (itemId: ID) => ID[];
        getCustomInputs: (itemId: ID) => string[];
      },
    ): number => {
      if (!criterionData) return 0;
      let totalMarks = 0;
      const allItems = getAllCriterionItems(criterionData);
      const {
        getItemIds,
        getOptionIds,
        getSelectionId,
        getSubitemsList,
        getCustomInputs,
      } = sources;

      allItems.forEach((item) => {
        const optionGroups = Array.isArray(item.option_groups)
          ? item.option_groups
          : [];
        const selectionGroups = Array.isArray(item.selection_groups)
          ? item.selection_groups
          : [];
        const subitems = Array.isArray(item.subitems) ? item.subitems : [];
        const hasSubitems = item.subitems_exist && subitems.length > 0;
        const hasSelections = selectionGroups.some(
          (group) =>
            Array.isArray(group?.selections) && group.selections.length > 0,
        );
        const hasOptions = optionGroups.some(
          (group) => Array.isArray(group?.options) && group.options.length > 0,
        );

        if (hasSubitems) {
          const checkedSubitemsList = getSubitemsList(item.id);
          const customInputsList = getCustomInputs(item.id);
          const totalCount =
            checkedSubitemsList.length + customInputsList.length;
          const maxMarks = item.marks || 6;
          totalMarks += Math.min(totalCount, maxMarks);
        } else if (hasSelections && !hasOptions) {
          totalMarks += selectionGroups.reduce((sum, group) => {
            const selectedSelectionId = getSelectionId(group.id);
            const selectedSelection = (group.selections || []).find(
              (selection) => selection.id === selectedSelectionId,
            );
            return sum + (selectedSelection?.marks || 0);
          }, 0);
        } else if (hasOptions && !hasSelections) {
          const optionMarks = optionGroups.reduce((sum, group) => {
            const selectedOptionIds = getOptionIds(group.id);
            return (
              sum +
              (group.options || []).reduce((groupSum, option) => {
                return (
                  groupSum +
                  (selectedOptionIds.includes(option.id)
                    ? option.marks || 0
                    : 0)
                );
              }, 0)
            );
          }, 0);
          totalMarks += optionMarks;
        } else if (hasSelections && hasOptions) {
          const selectionMarks = selectionGroups.reduce((sum, group) => {
            const selectedSelectionId = getSelectionId(group.id);
            const selectedSelection = (group.selections || []).find(
              (selection) => selection.id === selectedSelectionId,
            );
            return sum + (selectedSelection?.marks || 0);
          }, 0);
          const optionMarks = optionGroups.reduce((sum, group) => {
            const selectedOptionIds = getOptionIds(group.id);
            return (
              sum +
              (group.options || []).reduce((groupSum, option) => {
                return (
                  groupSum +
                  (selectedOptionIds.includes(option.id)
                    ? option.marks || 0
                    : 0)
                );
              }, 0)
            );
          }, 0);
          totalMarks += selectionMarks + optionMarks;
        } else {
          if (getItemIds().includes(item.id)) {
            totalMarks += item.marks || 0;
          }
        }
      });

      return totalMarks;
    },
    [getAllCriterionItems],
  );

  const calculateCumulativeMarks = useCallback(
    (criterionData: any): number => {
      if (!selectedProject || !criterionData) return 0;
      return calculateCriterionMarks(criterionData, {
        getItemIds: getCheckedItemIds,
        getOptionIds: getCheckedOptionIds,
        getSelectionId: getSelectedSelectionId,
        getSubitemsList: getCheckedSubitemsList,
        getCustomInputs: getCustomInputsList,
      });
    },
    [
      calculateCriterionMarks,
      getCheckedItemIds,
      getCheckedOptionIds,
      getCheckedSubitemsList,
      getCustomInputsList,
      getSelectedSelectionId,
      selectedProject,
    ],
  );

  const calculateActualCumulativeMarks = useCallback(
    (criterionData: any): number => {
      if (!criterionData) return 0;
      return calculateCriterionMarks(criterionData, {
        getItemIds: () =>
          Object.keys(actualAnswers.items || {})
            .filter((key) => actualAnswers.items[key])
            .map(Number),
        getOptionIds: (groupId: ID): ID[] => {
          return Object.keys(actualAnswers.options || {})
            .filter(
              (key) =>
                key.startsWith(`${groupId}:`) && actualAnswers.options[key],
            )
            .map((key) => Number(key.split(":")[1]));
        },
        getSelectionId: (groupId: ID): ID | null =>
          actualSelectionAnswers[groupId] ?? null,
        getSubitemsList: (itemId: ID): ID[] => {
          return Object.keys(actualAnswers.subitems || {})
            .filter(
              (key) =>
                key.startsWith(`${itemId}:`) && actualAnswers.subitems[key],
            )
            .map((key) => Number(key.split(":")[1]));
        },
        getCustomInputs: (itemId: ID): string[] => {
          const baselineInputs = getCustomInputsList(itemId);
          const filteredBaselineInputs = baselineInputs.filter(
            (customValue, index) =>
              actualAnswers.customEntries?.[
                getCustomEntryAuditKey(itemId, customValue, index)
              ],
          );
          const actualInputs = getActualCustomInputsList(itemId);
          const filteredActualInputs = actualInputs.filter(
            (customValue, index) =>
              actualAnswers.customEntries?.[
                getCustomEntryAuditKey(itemId, customValue, index)
              ],
          );
          const newCustomItems =
            customItems[itemId]?.map((item) => item.description) || [];
          return [
            ...filteredBaselineInputs,
            ...filteredActualInputs,
            ...newCustomItems,
          ];
        },
      });
    },
    [
      actualAnswers,
      actualSelectionAnswers,
      calculateCriterionMarks,
      customItems,
      getCustomInputsList,
      getActualCustomInputsList,
      getCustomEntryAuditKey,
    ],
  );

  const overallScoreSummary = useMemo(() => {
    const predicted = criteria.reduce(
      (sum, criterion) => sum + (calculateCumulativeMarks(criterion) || 0),
      0,
    );
    const actual = criteria.reduce(
      (sum, criterion) =>
        sum + (calculateActualCumulativeMarks(criterion) || 0),
      0,
    );
    const total = criteria.reduce(
      (sum, criterion) => sum + (criterion?.total_marks || 0),
      0,
    );
    const predictedPct =
      total > 0 ? Math.min(Math.round((predicted / total) * 100), 100) : 0;
    const actualPct =
      total > 0 ? Math.min(Math.round((actual / total) * 100), 100) : 0;

    return { predicted, actual, total, predictedPct, actualPct };
  }, [calculateActualCumulativeMarks, calculateCumulativeMarks, criteria]);

  // Update parent with marks data
  useEffect(() => {
    if (setMarksData && overallScoreSummary) {
      setMarksData({
        predicted: overallScoreSummary.predicted,
        actual: overallScoreSummary.actual,
        total: overallScoreSummary.total,
        predictedPct: overallScoreSummary.predictedPct,
        actualPct: overallScoreSummary.actualPct,
      });
    }
  }, [overallScoreSummary, setMarksData]);

  const calculateActualBaseTotal = useCallback((costBreakdown: any): number => {
    if (!costBreakdown || typeof costBreakdown !== "object") return 0;
    const getNodeActualTotal = (node: any): number => {
      if (!node) return 0;
      const description =
        typeof node.description === "string"
          ? node.description.trim().toLowerCase()
          : "";
      const isCertificationNode =
        node.isMultiplier ||
        node.is_certification ||
        description === "certification";
      if (isCertificationNode) return 0;
      if (node.actual_cost !== undefined) {
        return Number(node.actual_cost) || 0;
      }
      if (node.children && typeof node.children === "object") {
        return Object.values(node.children).reduce(
          (childSum: number, childNode: any) => {
            return childSum + getNodeActualTotal(childNode);
          },
          0,
        );
      }
      return 0;
    };
    return Object.values(costBreakdown).reduce((sum: number, node: any) => {
      return sum + getNodeActualTotal(node);
    }, 0);
  }, []);

  // Apply certification multiplier to actual costs
  useEffect(() => {
    if (otherProps?.displayOnly && !otherProps?.actualCostBreakdown) {
      return;
    }
    if (
      !selectedProject ||
      !overallScoreSummary ||
      overallScoreSummary.actual === 0
    ) {
      return;
    }

    const getCertLevel = (marks: number): string => {
      for (const [level, range] of Object.entries(certifiedScaleRange)) {
        if (marks >= range[0] && marks <= range[1]) {
          return level;
        }
      }
      return "Not Certified";
    };

    const actualCertLevel = getCertLevel(overallScoreSummary.actual);
    const multiplierPercent = certificationMultipliers[actualCertLevel] || 0;
    const baseTotal = calculateActualBaseTotal(activeActualCostBreakdown);
    const multiplierCost =
      multiplierPercent > 0 ? (baseTotal * multiplierPercent) / 100 : 0;

    const nextMultiplierPayload = {
      certLevel: actualCertLevel,
      multiplierPercent,
      multiplierCost,
      baseTotal,
    };

    const previousPayload = lastAppliedMultiplierRef.current;
    const hasMultiplierChanged =
      !previousPayload ||
      previousPayload.certLevel !== nextMultiplierPayload.certLevel ||
      Math.abs(
        (previousPayload.multiplierPercent || 0) -
          nextMultiplierPayload.multiplierPercent,
      ) > 0.0001 ||
      Math.abs(
        (previousPayload.multiplierCost || 0) -
          nextMultiplierPayload.multiplierCost,
      ) > 0.01 ||
      Math.abs(
        (previousPayload.baseTotal || 0) - nextMultiplierPayload.baseTotal,
      ) > 0.01;

    if (hasMultiplierChanged && otherProps?.onApplyMultiplier) {
      lastAppliedMultiplierRef.current = nextMultiplierPayload;
      otherProps.onApplyMultiplier(nextMultiplierPayload, {
        suppressToast: !previousPayload,
      });
    }
  }, [
    activeActualCostBreakdown,
    calculateActualBaseTotal,
    certificationMultipliers,
    certifiedScaleRange,
    otherProps?.actualCostBreakdown,
    otherProps?.displayOnly,
    otherProps?.onApplyMultiplier,
    overallScoreSummary.actual,
    selectedProject,
  ]);

  const getCertificationLevel = useCallback(
    (marks: number): string => {
      for (const [level, range] of Object.entries(certifiedScaleRange)) {
        if (marks >= range[0] && marks <= range[1]) {
          return level;
        }
      }
      return "Not Certified";
    },
    [certifiedScaleRange],
  );

  const predictedCertificationLevel = useMemo(
    () => getCertificationLevel(overallScoreSummary.predicted),
    [getCertificationLevel, overallScoreSummary.predicted],
  );
  const actualCertificationLevel = useMemo(
    () => getCertificationLevel(overallScoreSummary.actual),
    [getCertificationLevel, overallScoreSummary.actual],
  );
  const predictedCertificationPalette = useMemo(
    () => getCertificationPalette(predictedCertificationLevel),
    [predictedCertificationLevel],
  );
  const actualCertificationPalette = useMemo(
    () => getCertificationPalette(actualCertificationLevel),
    [actualCertificationLevel],
  );

  const renderSelectionItem = useCallback((item: SelectionType) => {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <span className="flex-1 text-[13.5px] font-medium leading-5 text-[#1C1F1D]/75">
          {item.description}
        </span>
        <span className="shrink-0 rounded-full bg-[#3E6B52]/8 px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide text-[#3E6B52]">
          {item.marks} pts
        </span>
      </div>
    );
  }, []);

  const renderSelectedLabel = useCallback((selectedItem: SelectionType) => {
    if (!selectedItem) {
      return (
        <span className="text-sm text-[#1C1F1D]/35">Select an option</span>
      );
    }
    return (
      <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
        <span className="flex-1 truncate text-sm font-semibold text-[#1C1F1D]">
          {selectedItem.description}
        </span>
        <span className="shrink-0 rounded-full bg-[#3E6B52]/[0.08] px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-[#3E6B52]">
          {selectedItem.marks} pts
        </span>
      </div>
    );
  }, []);

  const renderItem = useCallback(
    (item: ItemType) => {
      const optionGroups = Array.isArray(item.option_groups)
        ? item.option_groups
        : [];
      const selectionGroups = Array.isArray(item.selection_groups)
        ? item.selection_groups
        : [];
      const subitems = Array.isArray(item.subitems) ? item.subitems : [];
      const itemOptions = optionGroups.flatMap((g) =>
        Array.isArray(g?.options) ? g.options : [],
      );
      const hasOptions = itemOptions.length > 0;
      const hasSubitems = item.subitems_exist && subitems.length > 0;
      const itemSelections = selectionGroups.flatMap((g) =>
        Array.isArray(g?.selections) ? g.selections : [],
      );
      const hasSelections = itemSelections.length > 0;
      const hasCheckbox = !hasSubitems && !hasSelections && !hasOptions;
      const isUnchanged = item.is_compulsory === 1;

      let isItemChecked = false;
      let checkedSubitemsList: ID[] = [];
      let customInputsList: string[] = [];
      let actualInputsList: string[] = [];

      if (selectedProject) {
        if (hasSubitems) {
          checkedSubitemsList = getCheckedSubitemsList(item.id);
          customInputsList = getCustomInputsList(item.id);
          actualInputsList = getActualCustomInputsList(item.id);
        } else {
          isItemChecked = getCheckedItemIds().includes(item.id);
        }
      }

      const actualItemChecked = !!actualAnswers.items[item.id];
      const showPointsBadge = !!item.marks && hasCheckbox && !hasSelections;
      const showSelectionBadge = !hasSelections && hasOptions && hasCheckbox;

      const itemSelectionTotal =
        selectionGroups.reduce(
          (sum, g) =>
            sum +
            (g.selections?.find(
              (s) => String(s.id) === String(getSelectedSelectionId(g.id)),
            )?.marks || 0),
          0,
        ) +
        optionGroups.reduce((sum, g) => {
          return (
            sum +
            (g.options || []).reduce(
              (s, o) =>
                s + (getCheckedOptionIds(g.id).includes(o.id) ? o.marks : 0),
              0,
            )
          );
        }, 0);

      const itemMatches = hasCheckbox && isItemChecked === actualItemChecked;
      const subitemMismatchCount = subitems.filter(
        (s) => checkedSubitemsList.includes(s.id) !== !!actualAnswers.subitems[`${item.id}:${s.id}`]
      ).length;
      const totalSubitems = subitems.length;
      const allSubitemsMatch = subitemMismatchCount === 0;

      return (
        <div key={item.id} className="mb-4 px-0.5">
          <div
            className="group overflow-hidden rounded-[22px] bg-white transition-all duration-200 ease-out"
            style={{
              border: `1px solid ${itemMatches && hasCheckbox ? `${T.actual}29` : "#1C1F1D0F"}`,
              borderLeft: `3px solid ${
                hasCheckbox
                  ? itemMatches
                    ? T.actual
                    : T.mismatch
                  : "#1C1F1D14"
              }`,
              boxShadow:
                itemMatches && hasCheckbox
                  ? `0 1px 2px rgba(28,31,29,0.04), 0 8px 20px -10px ${T.actual}30`
                  : "0 1px 2px rgba(28,31,29,0.03)",
            }}
          >
            <div className="px-5 py-4.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span
                    className={`block text-[13.5px] leading-[20px] tracking-[-0.01em] ${
                      hasSubitems
                        ? "font-semibold text-[#1C1F1D]/90"
                        : "font-medium text-[#1C1F1D]/80"
                    }`}
                  >
                    {item.description}
                  </span>

                  {(hasCheckbox && !itemMatches) ||
                  (hasSubitems && !allSubitemsMatch) ? (
                    <div className="mt-1 flex items-center gap-1.5">
                      <AlertTriangle
                        className="h-3 w-3 shrink-0"
                        style={{ color: T.mismatch }}
                        strokeWidth={2.5}
                      />
                      <span
                        className="text-[10.5px] font-medium"
                        style={{ color: T.mismatch }}
                      >
                        {hasSubitems
                          ? `${subitemMismatchCount} of ${totalSubitems} sub-items differ from predicted`
                          : "Differs from predicted"}
                      </span>
                    </div>
                  ) : hasSubitems ? (
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className="text-[10.5px] font-medium"
                        style={{ color: T.actual }}
                      >
                        All sub-items match predicted
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {showPointsBadge ? (
                    <ScoreChip
                      value={item.marks!}
                      active={actualItemChecked}
                      onToggle={() =>
                        toggleActualAnswer("items", String(item.id))
                      }
                    />
                  ) : null}

                  {showSelectionBadge ? (
                    <ScoreChip
                      value={itemSelectionTotal || 0}
                      active={itemSelectionTotal !== 0}
                    />
                  ) : null}

                  {item.info && !hasOptions ? (
                    <IconGhostButton
                      onPress={() =>
                        handleInfoGuideOpen(
                          item.info as string,
                          "Information",
                          "Guide",
                        )
                      }
                      icon={Info}
                      color="#9CA3AF"
                    />
                  ) : null}

                  {item.suggestions || item.esg ? (
                    <IconGhostButton
                      onPress={() =>
                        handleInfoGuideOpen(
                          buildSupplementalInfo(item),
                          "ESG & Suggestions",
                          "Details",
                        )
                      }
                      icon={FileText}
                      color={T.custom}
                    />
                  ) : null}
                </div>
              </div>

              {hasCheckbox ? (
                <CompareCheckboxes
                  predicted={isItemChecked}
                  actual={actualItemChecked}
                  onToggle={() => toggleActualAnswer("items", String(item.id))}
                  locked={isUnchanged}
                  lockedMessage="Compulsory item — always counted toward the score and can't be unchecked."
                />
              ) : null}

              {hasOptions &&
                optionGroups.map((group, gi) => (
                  <div key={`${group.id}-${gi}`}>
                    <GroupHeading label={group.label} />
                    <div className="space-y-2.5">
                      {group.options?.map((option, oi) => {
                        const isChecked = getCheckedOptionIds(
                          group.id,
                        ).includes(option.id);
                        const optionAuditKey = `${group.id}:${option.id}`;
                        const actualOptionChecked =
                          !!actualAnswers.options[optionAuditKey];
                        return (
                          <div
                            key={oi}
                            className="rounded-[16px] px-3.5 py-3 transition-all duration-150"
                            style={{
                              background: actualOptionChecked
                                ? `${T.actual}0D`
                                : isChecked
                                  ? `${T.predicted}0D`
                                  : "#1C1F1D08",
                              boxShadow: actualOptionChecked
                                ? `inset 0 0 0 1px ${T.actual}29`
                                : isChecked
                                  ? `inset 0 0 0 1px ${T.predicted}29`
                                  : "inset 0 0 0 1px transparent",
                            }}
                          >
                            <div className="flex items-center">
                              <span
                                className={`flex-1 pr-2 text-[13px] leading-5 ${
                                  isChecked || actualOptionChecked
                                    ? "font-semibold"
                                    : "font-normal text-[#1C1F1D]/60"
                                }`}
                                style={
                                  actualOptionChecked
                                    ? { color: T.actual }
                                    : isChecked
                                      ? { color: T.predicted }
                                      : undefined
                                }
                              >
                                {option?.description}
                              </span>
                              <ScoreChip
                                value={option.marks}
                                active={actualOptionChecked}
                              />
                              {option.sub_description ? (
                                <IconGhostButton
                                  onPress={() =>
                                    handleInfoGuideOpen(
                                      option.sub_description as string,
                                    )
                                  }
                                  icon={Info}
                                  color="#9CA3AF"
                                />
                              ) : null}
                            </div>
                            <CompareCheckboxes
                              predicted={isChecked}
                              actual={actualOptionChecked}
                              onToggle={() =>
                                toggleActualAnswer("options", optionAuditKey)
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

              {(() => {
                const exclusiveGroups = selectionGroups.filter(
                  (g) => g.exclusive,
                );
                const normalGroups = selectionGroups.filter(
                  (g) => !g.exclusive,
                );

                return (
                  <>
                    {normalGroups.map((group, gi) => {
                      const predictedSelection = group.selections.find(
                        (sel) => sel.id === getSelectedSelectionId(group.id),
                      );
                      const actualSelectionId =
                        actualSelectionAnswers[group.id] ?? null;
                      const actualSelection = group.selections.find(
                        (sel) => sel.id === actualSelectionId,
                      );

                      return (
                        <div key={`${group.id}-${gi}`}>
                          <GroupHeading label={group.label} />
                          <label
                            htmlFor={`actual-select-${group.id}`}
                            className="inline-flex h-6 w-fit items-center rounded-full px-2.5 mx-0.5 my-2 text-[9.5px] font-bold uppercase tracking-[0.06em] whitespace-nowrap cursor-default"
                            style={{
                              color: T.predicted,
                              background: `${T.predicted}1A`,
                            }}
                          >
                            Predicted
                          </label>
                          <SelectionCompareBlock
                            predictedLabel={predictedSelection?.description}
                            predictedMarks={predictedSelection?.marks || 0}
                            actualMarks={actualSelection?.marks || 0}
                            actualScored={!!actualSelectionId}
                          />
                          <label
                            htmlFor={`actual-select-${group.id}`}
                            className="inline-flex h-6 w-fit items-center rounded-full px-2.5 mx-0.5 my-2 text-[9.5px] font-bold uppercase tracking-[0.06em] whitespace-nowrap cursor-default"
                            style={{
                              color: T.actual,
                              background: `${T.actual}1A`,
                            }}
                          >
                            Actual
                          </label>
                          <CustomDropdown
                            data={group.selections}
                            value={actualSelection || null}
                            labelField="description"
                            valueField="id"
                            placeholder="Select an option…"
                            renderItem={(i) => renderSelectionItem(i)}
                            renderSelectedLabel={(i) => renderSelectedLabel(i)}
                            onChange={(selected) => {
                              setSelectedDropdowns((prev) => ({
                                ...prev,
                                [group.id]: selected,
                              }));
                              setActualSelectionAnswers((prev) => ({
                                ...prev,
                                [group.id]: selected?.id ?? null,
                              }));
                            }}
                          />
                        </div>
                      );
                    })}

                    {exclusiveGroups.length > 0 && (
                      <div className="mt-4">
                        <div className="mb-2.5 flex items-center gap-2">
                          <Sparkles size={11} className="text-[#1C1F1D]/25" />
                          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#1C1F1D]/35">
                            Choose one group
                          </span>
                          <div className="h-px flex-1 bg-[#1C1F1D]/[0.06]" />
                        </div>

                        <div className="space-y-2">
                          {exclusiveGroups.map((group, gi) => {
                            const actualSelectionId =
                              actualSelectionAnswers[group.id] ?? null;
                            const actualSelection = group.selections.find(
                              (sel) => sel.id === actualSelectionId,
                            );
                            const isActive =
                              activeExclusiveGroup === group.id ||
                              actualSelectionId !== null;
                            const isDimmed =
                              !isActive && activeExclusiveGroup !== null;
                            const predictedSelection = group.selections.find(
                              (sel) =>
                                sel.id === getSelectedSelectionId(group.id),
                            );

                            const clearOtherExclusiveGroups = (
                              updated: Record<string, any>,
                            ) => {
                              selectionGroups.forEach((g) => {
                                if (g.exclusive && g.id !== group.id)
                                  updated[g.id] = null;
                              });
                              return updated;
                            };

                            return (
                              <div
                                key={`${group.id}-${gi}`}
                                className="rounded-[18px] border p-3.5 transition-all duration-200 ease-out"
                                style={{
                                  borderColor: isActive
                                    ? `${T.predicted}4D`
                                    : "#1C1F1D14",
                                  background: isActive
                                    ? `${T.predicted}0D`
                                    : "#1C1F1D05",
                                  opacity: isDimmed ? 0.65 : 1,
                                  boxShadow: isActive
                                    ? `0 2px 10px -4px ${T.predicted}30`
                                    : "none",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isActive) {
                                      setActiveExclusiveGroup(null);
                                      setSelectedDropdowns((prev) => ({
                                        ...prev,
                                        [group.id]: null,
                                      }));
                                      setActualSelectionAnswers((prev) => ({
                                        ...prev,
                                        [group.id]: null,
                                      }));
                                      return;
                                    }
                                    setActiveExclusiveGroup(group.id);
                                    setSelectedDropdowns((prev) =>
                                      clearOtherExclusiveGroups({ ...prev }),
                                    );
                                    setActualSelectionAnswers((prev) => {
                                      const updated = clearOtherExclusiveGroups(
                                        { ...prev },
                                      );
                                      updated[group.id] = null;
                                      return updated;
                                    });
                                  }}
                                  className="mb-2.5 flex w-full items-center text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B5BD6]/40 rounded-lg"
                                >
                                  <span
                                    className="mr-2.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[2px] transition-all duration-150"
                                    style={{
                                      borderColor: isActive
                                        ? T.predicted
                                        : "#1C1F1D33",
                                    }}
                                  >
                                    {isActive && (
                                      <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ background: T.predicted }}
                                      />
                                    )}
                                  </span>
                                  <span
                                    className="text-[13px] font-semibold tracking-[-0.01em]"
                                    style={{
                                      color: isActive
                                        ? T.predicted
                                        : "#1C1F1D80",
                                    }}
                                  >
                                    {group.label}
                                  </span>
                                </button>

                                <label
                                  htmlFor={`actual-select-${group.id}`}
                                  className="inline-flex h-6 w-fit items-center rounded-full px-2.5 mx-0.5 my-2 text-[9.5px] font-bold uppercase tracking-[0.06em] whitespace-nowrap cursor-default"
                                  style={{
                                    color: T.predicted,
                                    background: `${T.predicted}1A`,
                                  }}
                                >
                                  Predicted
                                </label>
                                <SelectionCompareBlock
                                  predictedLabel={
                                    predictedSelection?.description
                                  }
                                  predictedMarks={
                                    predictedSelection?.marks || 0
                                  }
                                  actualMarks={actualSelection?.marks || 0}
                                  actualScored={!!actualSelectionId}
                                />

                                <label
                                  htmlFor={`actual-select-${group.id}`}
                                  className="inline-flex h-6 w-fit items-center rounded-full px-2.5 mx-0.5 my-2 text-[9.5px] font-bold uppercase tracking-[0.06em] whitespace-nowrap cursor-default"
                                  style={{
                                    color: T.actual,
                                    background: `${T.actual}1A`,
                                  }}
                                >
                                  Actual
                                </label>
                                <CustomDropdown
                                  disable={!isActive}
                                  data={group.selections}
                                  value={
                                    selectedDropdowns[group.id] ||
                                    actualSelection ||
                                    null
                                  }
                                  labelField="description"
                                  valueField="id"
                                  placeholder="Select an option..."
                                  renderItem={(i) => renderSelectionItem(i)}
                                  renderSelectedLabel={(i) =>
                                    renderSelectedLabel(i)
                                  }
                                  onChange={(selected) => {
                                    const nextSelectionId =
                                      selected?.id ?? null;
                                    setSelectedDropdowns((prev) => {
                                      const updated = clearOtherExclusiveGroups(
                                        { ...prev },
                                      );
                                      updated[group.id] = selected;
                                      return updated;
                                    });
                                    setActualSelectionAnswers((prev) => {
                                      const updated = clearOtherExclusiveGroups(
                                        { ...prev },
                                      );
                                      updated[group.id] = nextSelectionId;
                                      return updated;
                                    });
                                    setActiveExclusiveGroup(group.id);
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {hasSubitems && (
            <div className="m-2 bg-white rounded-xl border-t border-[#1C1F1D]/[0.06] px-5 py-3.5">
              {(() => {
                const priorCustomInputs = Array.from(
                  new Set([
                    ...(customInputsList || []),
                    ...(actualInputsList || []),
                  ]),
                );

                return (
                  <>
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#1C1F1D]/50">
                      Sub-items
                    </span>

                    <div className="space-y-1.5">
                      {subitems.map((subitem) => {
                        const isSubitemChecked = checkedSubitemsList.includes(
                          subitem.id,
                        );
                        const subitemAuditKey = `${item.id}:${subitem.id}`;
                        const actualSubitemChecked =
                          !!actualAnswers.subitems[subitemAuditKey];
                        const differs =
                          isSubitemChecked !== actualSubitemChecked;

                        return (
                          <div
                            key={subitem.id}
                            className="rounded-[14px] border bg-white px-3.5 py-2.5"
                            style={{
                              borderColor: differs
                                ? `${T.mismatch}33`
                                : "#1C1F1D0F",
                            }}
                          >
                            <span className="block text-[13px] leading-5 text-[#1E2621]/80">
                              {subitem.description}
                            </span>
                            <CompareCheckboxes
                              predicted={isSubitemChecked}
                              actual={actualSubitemChecked}
                              onToggle={() =>
                                toggleActualAnswer("subitems", subitemAuditKey)
                              }
                            />
                          </div>
                        );
                      })}
                    </div>

                    {priorCustomInputs.length > 0 && (
                      <div className="mt-3">
                        <div className="mb-2 mx-1.5 flex items-center gap-1.5">
                          <History className="h-3 w-3 shrink-0 text-[#1C1F1D]/40" strokeWidth={2.5} />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#1C1F1D]/50">
                            Previously entered
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {priorCustomInputs.map((customInput, index) => {
                            const customAuditKey = getCustomEntryAuditKey(item.id, customInput, index);
                            const actualCustomChecked =
                              !!actualAnswers.customEntries[customAuditKey];

                            return (
                              <div
                                key={`custom-${item.id}-${index}`}
                                className="rounded-[14px] border border-[#1C1F1D]/[0.06] bg-white px-3.5 py-2.5"
                              >
                                <span className="block text-[13px] leading-5 text-[#1E2621]/80">
                                  {customInput}
                                </span>
                                <CompareCheckboxes
                                  predicted
                                  actual={actualCustomChecked}
                                  onToggle={() => toggleActualAnswer("customEntries", customAuditKey)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {customItems[item.id]?.length > 0 && (
                      <div className="mt-3">
                        <div className="mb-2 mx-1.5 flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 shrink-0 text-[#1C1F1D]/40" strokeWidth={2.5} />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#1C1F1D]/50">
                            Newly added
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {customItems[item.id]?.map((customItem) => (
                            <div
                              key={customItem.id}
                              className="rounded-[14px] border border-[#1C1F1D]/[0.06] bg-white px-3.5 py-2.5"
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex-1 text-[13px] leading-5 text-[#1E2621]/80">
                                  {customItem.description}
                                </span>
                                <span
                                  className="mr-1 rounded-md px-2 py-0.5 text-[10px] font-medium leading-[14px] tracking-wide"
                                  style={{ color: T.customNew, background: `${T.customNew}14` }}
                                >
                                  New
                                </span>
                                <button
                                  type="button"
                                  onClick={() => deleteCustomItem(item.id, customItem.id)}
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#1E2621]/30 transition-colors hover:bg-red-50 hover:text-red-500"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              <CompareCheckboxes
                                predicted={false}
                                actual={true}
                                locked
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-1.5">
                      <AddCustomItemRow
                        itemId={item.id}
                        value={customInputs[item.id]}
                        onChange={(text) =>
                          handleCustomInputChange(item.id, text)
                        }
                        onSubmit={() =>
                          addCustomItem(item.id, customInputs[item.id])
                        }
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      );
    },
    [
      actualAnswers,
      actualSelectionAnswers,
      activeExclusiveGroup,
      addCustomItem,
      buildSupplementalInfo,
      customItems,
      customInputs,
      deleteCustomItem,
      getActualCustomInputsList,
      getCheckedItemIds,
      getCheckedOptionIds,
      getCheckedSubitemsList,
      getCustomEntryAuditKey,
      getCustomInputsList,
      getSelectedSelectionId,
      handleCustomInputChange,
      renderSelectedLabel,
      selectedDropdowns,
      selectedProject,
      toggleActualAnswer,
      calculateActualCumulativeMarks,
    ],
  );

  const renderCriterionItems = useCallback(() => {
    if (!selectedCriterionData) return null;

    const hasSubcriteria =
      selectedCriterionData.subcriteria &&
      selectedCriterionData.subcriteria.length > 0;
    const hasCriterionItems =
      selectedCriterionData.items && selectedCriterionData.items.length > 0;

    return (
      <div className="px-4 sm:px-6">
        {!hasSubcriteria && hasCriterionItems ? (
          <div className="mb-6">
            {selectedCriterionData.items!.map((item) => renderItem(item))}
          </div>
        ) : null}

        {hasSubcriteria &&
          selectedCriterionData.subcriteria!.map((subcriterion, index) => {
            const hasItems =
              subcriterion.items && subcriterion.items.length > 0;

            if (!hasItems) return null;

            return (
              <div key={index} className="mb-6">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3E6B52]/[0.09]">
                    <Leaf
                      size={14}
                      className="text-[#3E6B52]"
                      strokeWidth={2.3}
                    />
                  </span>
                  <h3 className="font-display text-[16px] font-bold tracking-[-0.01em] text-[#1C1F1D]/88">
                    {subcriterion.name}
                  </h3>
                </div>
                {subcriterion.items!.map((item) => renderItem(item))}
              </div>
            );
          })}
      </div>
    );
  }, [selectedCriterionData, renderItem]);

  if (loading || isRefreshingProject) {
    return <SkeletonLoader type="criteriaCards" />;
  }

  return (
    <div className="flex h-full min-h-[600px] flex-1 flex-col ">
      {criteria.length === 0 && !loading ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
          <div className="relative mb-7 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-green-100" />
            <div className="absolute inset-2 rounded-full bg-green-100/60" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
              <Leaf size={40} className="text-emerald-500" />
            </div>
          </div>

          <h2 className="mb-3 text-center text-xl font-bold text-gray-900">
            No Green Elements Available
          </h2>
          <p className="mb-6 max-w-md text-center text-base leading-6 text-gray-600">
            It looks like there are no green building elements to display for
            this project.
          </p>

          <div className="w-full max-w-md rounded-xl bg-blue-50 p-4">
            <p className="mb-2 text-sm font-medium text-blue-800">
              Information:
            </p>
            <p className="text-sm leading-5 text-blue-700">
              Review the predicted answers, toggle the actual checkboxes, and
              submit the pending additions or deletions.
            </p>
          </div>
        </div>
      ) : criteria.length !== 0 && selectedProject ? (
        <>
          <div className="px-6 py-2">
            <div className="mb-1">
              <p className="mb-2 text-base font-bold text-slate-800">
                Assessment Criteria
              </p>
              <CustomDropdown
                data={criteria}
                value={selectedCriterionData || null}
                labelField="name"
                valueField="name"
                placeholder="Choose a criterion"
                onChange={(item) => {
                  handleSectionPress(item);
                  verticalScrollRef.current?.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
                renderItem={(item: CriterionType) => {
                  const earned = calculateCumulativeMarks(item) || 0;
                  const actualEarned =
                    calculateActualCumulativeMarks(item) || 0;
                  const total = item.total_marks || 0;
                  return (
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="flex-1 truncate text-[13px] font-semibold text-gray-800">
                        {item.name}
                      </span>
                      <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                        {actualEarned}/{total}
                      </span>
                      <span className="text-xs font-semibold text-center">
                        pts
                      </span>
                    </div>
                  );
                }}
                renderSelectedLabel={(item: CriterionType) => {
                  const earned = calculateCumulativeMarks(item) || 0;
                  const actualEarned =
                    calculateActualCumulativeMarks(item) || 0;
                  const total = item.total_marks || 0;
                  return (
                    <div className="flex flex-1 items-center gap-2 overflow-hidden">
                      <span className="flex-1 truncate text-sm font-semibold text-gray-800">
                        {item.name}
                      </span>
                    </div>
                  );
                }}
              />
            </div>

            {selectedCriterionData &&
              (() => {
                const earned =
                  calculateCumulativeMarks(selectedCriterionData) || 0;
                const actualEarned =
                  calculateActualCumulativeMarks(selectedCriterionData) || 0;
                const total = selectedCriterionData.total_marks || 1;
                const pct = Math.min(Math.round((earned / total) * 100), 100);
                const actualPct = Math.min(
                  Math.round((actualEarned / total) * 100),
                  100,
                );

                return (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        Score summary
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <span
                        className="h-[7px] w-[7px] shrink-0 rounded-full"
                        style={{ backgroundColor: "#B4B2A9" }}
                      />
                      <span className="w-[60px] text-xs text-slate-500">
                        Predicted
                      </span>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: "#B4B2A9",
                          }}
                        />
                      </div>
                      <span
                        className="text-base font-medium text-gray-800"
                        style={{ width: 64, textAlign: "right" }}
                      >
                        {earned} / {total}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-[7px] w-[7px] shrink-0 rounded-full"
                        style={{ backgroundColor: "#1D9E75" }}
                      />
                      <span className="w-[60px] text-xs text-slate-500">
                        Actual
                      </span>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-emerald-50">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${actualPct}%`,
                            backgroundColor: "#1D9E75",
                          }}
                        />
                      </div>
                      <span
                        className="text-base font-medium text-emerald-700"
                        style={{ width: 64, textAlign: "right" }}
                      >
                        {actualEarned} / {total}
                      </span>
                    </div>
                  </div>
                );
              })()}
          </div>

          <div className="flex-1 pt-2">
            <div
              ref={verticalScrollRef}
              className="h-full overflow-y-auto"
              style={{ paddingBottom: 8 }}
            >
              {renderCriterionItems()}
            </div>
          </div>

          <InfoGuideModal
            isVisible={isInfoGuideVisible}
            info={infoGuideText}
            title={infoGuideTitle}
            label={infoGuideLabel}
            onClose={() => setIsInfoGuideVisible(false)}
          />
        </>
      ) : null}
    </div>
  );
};

function ScoreChip({
  value,
  active,
  onToggle,
  tone = "actual",
}: {
  value: number;
  active: boolean;
  onToggle?: () => void;
  tone?: "actual" | "predicted";
}) {
  const color = tone === "predicted" ? T.predicted : T.actual;
  const Comp: any = onToggle ? "button" : "div";
  return (
    <Comp
      type={onToggle ? "button" : undefined}
      onClick={onToggle}
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition-all duration-150",
        onToggle ? "active:scale-95" : "",
      ].join(" ")}
      style={{
        borderColor: active ? `${color}55` : "#1C1F1D14",
        background: active ? `${color}12` : "transparent",
      }}
    >
      <span
        className={`${mono} text-[11.5px] font-semibold`}
        style={{ color: active ? color : "#1C1F1D40" }}
      >
        {active ? `${value}` : "0"}
      </span>
      <span
        className="text-[9.5px] font-medium uppercase tracking-[0.06em]"
        style={{ color: active ? `${color}CC` : "#1C1F1D33" }}
      >
        pts
      </span>
    </Comp>
  );
}

// ── PremiumCheckbox: a single, refined checkbox — the check draws in on
// state change rather than snapping, and the tone communicates meaning
// (indigo = system's call, green = confirmed match, sienna = disagreement).
function PremiumCheckbox({
  label,
  checked,
  tone,
  onToggle,
  locked = false,
}: {
  label: string;
  checked: boolean;
  tone: "predicted" | "actual";
  onToggle?: () => void;
  locked?: boolean;
}) {
  const color = tone === "predicted" ? T.predicted : T.actual;
  const interactive = !!onToggle && !locked;
  const Comp: any = interactive ? "button" : "div";

  return (
    <Comp
      type={interactive ? "button" : undefined}
      onClick={interactive ? onToggle : undefined}
      disabled={locked || undefined}
      className={[
        "flex w-full items-center gap-2.5 rounded-[14px] border px-3 py-2.5 transition-all duration-150",
        interactive
          ? "active:scale-[0.98] hover:shadow-[0_1px_3px_rgba(28,31,29,0.06)]"
          : "",
      ].join(" ")}
      style={{
        borderColor: checked ? `${color}42` : "#1C1F1D14",
        background: checked ? `${color}0F` : "#1C1F1D05",
        cursor: locked ? "default" : interactive ? "pointer" : "default",
      }}
    >
      <span
        className="relative flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition-all duration-200 ease-out"
        style={{
          borderColor: checked ? color : "#1C1F1D2E",
          background: checked ? color : "#FFFFFF",
          boxShadow: checked
            ? `0 2px 6px -2px ${color}99`
            : "inset 0 1px 1px rgba(28,31,29,0.02)",
        }}
      >
        <Check
          size={12}
          strokeWidth={3.25}
          className="text-white transition-all duration-200 ease-out"
          style={{
            opacity: checked ? 1 : 0,
            transform: checked ? "scale(1)" : "scale(0.4)",
          }}
        />
      </span>
      <span
        className="text-[11.5px] font-semibold uppercase tracking-[0.055em]"
        style={{ color: checked ? color : "#1C1F1D52" }}
      >
        {label}
      </span>
    </Comp>
  );
}

// ── CompareCheckboxes: predicted (read-only) beside actual (interactive) ──
function CompareCheckboxes({
  predicted,
  actual,
  onToggle,
  locked = false,
  lockedMessage,
}: {
  predicted: boolean;
  actual: boolean | null;
  onToggle?: () => void;
  locked?: boolean;
  lockedMessage?: string;
}) {
  const scored = actual !== null;
  const mismatched = scored && predicted !== actual;

  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <PremiumCheckbox
          label="Predicted"
          checked={predicted}
          tone="predicted"
        />
        <PremiumCheckbox
          label="Actual"
          checked={!!actual}
          tone="actual"
          onToggle={onToggle}
          locked={locked}
        />
      </div>

      {locked && lockedMessage ? (
        <div className="flex items-start gap-2 rounded-[12px] bg-[#1C1F1D]/[0.035] px-3 py-2">
          <Lock size={12} className="mt-[1px] shrink-0 text-[#1C1F1D]/40" />
          <span className="text-[11px] leading-[16px] text-[#1C1F1D]/60">
            {lockedMessage}
          </span>
        </div>
      ) : mismatched && !locked && predicted ? (
        <div className="flex items-center mt-3 mx-2 gap-1.5 px-0.5">
          <AlertTriangle
            className="h-3.5 w-3.5 shrink-0"
            style={{ color: T.mismatch }}
            strokeWidth={2.25}
          />
          <span
            className="text-[10.5px] font-medium"
            style={{ color: T.mismatch }}
          >
            Differs from predicted
          </span>
        </div>
      ) : null}
    </div>
  );
}

// ── small structural helpers ─────────────────────────────────────────────
function GroupHeading({
  label,
  tone = "predicted",
}: {
  label: string;
  tone?: "predicted" | "custom";
}) {
  const color = tone === "custom" ? T.custom : T.predicted;
  return (
    <div className="mb-2.5 mt-4 flex items-center gap-2">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.07em]"
        style={{ color: `${color}D9` }}
      >
        {label}
      </span>
      <div className="h-px flex-1 bg-[#1C1F1D]/[0.06]" />
    </div>
  );
}

function IconGhostButton({
  onPress,
  icon: IconCmp,
  color,
}: {
  onPress: () => void;
  icon: any;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#1C1F1D]/[0.06]"
    >
      <IconCmp size={14} style={{ color }} />
    </button>
  );
}

function SelectionCompareBlock({
  predictedLabel,
  predictedMarks,
  actualMarks,
  actualScored,
}: {
  predictedLabel?: string;
  predictedMarks: number;
  actualMarks: number;
  actualScored: boolean;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2 rounded-[14px] bg-[#1C1F1D]/[0.03] px-3 py-2">
      <span className="flex-1 truncate text-[12px] font-medium text-[#1C1F1D]/70">
        {predictedLabel || "None / not applicable"}
      </span>
      <ScoreChip
        value={predictedMarks}
        active={!!predictedMarks && predictedMarks !== 0}
      />
    </div>
  );
}

export default ActualGBIAssessment;
