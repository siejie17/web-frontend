'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Dispatch,
  SetStateAction,
  ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Leaf,
  Info,
  FileText,
  X,
  Plus,
  Trash2,
  Check,
  Sparkles,
} from 'lucide-react';
import CustomDropdown from '../form/CustomDropdown';

/* ────────────────────────────────────────────────────────────────────────
   Types
   These mirror the loosely-typed JSON tree that historically drove the
   React Native screen (criteria → subcriteria/items → subitems/options/
   selections). Left intentionally permissive (`any`) for nested shapes
   since the source data is CMS/API-driven and out of scope for this pass.
   ──────────────────────────────────────────────────────────────────────── */

type ID = string | number;

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

interface GreenElementsScreenProps {
  greenElements?: (CriterionType | string)[];
  setGreenElements?: Dispatch<SetStateAction<any>>;
  criteriaTotalMarks?: number;
  setCriteriaTotalMarks?: Dispatch<SetStateAction<number>>;
  criteriaMarks: Record<string, number>;
  setCriteriaMarks: Dispatch<SetStateAction<Record<string, number>>>;
  selectedDropdowns: Record<string, SelectionType | null>;
  setSelectedDropdowns: Dispatch<SetStateAction<Record<string, SelectionType | null>>>;
  selectionMarks: Record<string, number>;
  setSelectionMarks: Dispatch<SetStateAction<Record<string, number>>>;
  checkedItems: Record<string, boolean>;
  setCheckedItems: Dispatch<SetStateAction<Record<string, boolean>>>;
  checkedOptions: Record<string, Record<string, boolean>>;
  setCheckedOptions: Dispatch<SetStateAction<Record<string, Record<string, boolean>>>>;
  checkedSubitems: Record<string, Record<string, boolean>>;
  setCheckedSubitems: Dispatch<SetStateAction<Record<string, Record<string, boolean>>>>;
  customItems: Record<string, CustomItem[]>;
  setCustomItems: Dispatch<SetStateAction<Record<string, CustomItem[]>>>;
  showCostUpdatedToast: boolean;
  setShowCostUpdatedToast: Dispatch<SetStateAction<boolean>>;
  isRefreshingProject?: boolean;
  [key: string]: any;
}

/* ────────────────────────────────────────────────────────────────────────
   Small presentational primitives
   These were separate imported files in the React Native version
   (PointsBadge, GroupLabel, IconButton, SubitemRow, CustomItemRow,
   AddCustomItemRow, InfoGuideModal, SkeletonLoader, UpdatedToastMessage).
   They carry no business logic — they're re-created here, in the same
   file, purely so the component compiles standalone in Next.js.
   ──────────────────────────────────────────────────────────────────────── */

function PointsBadge({ points, active }: { points: number; active: boolean }) {
   return (
     <span
       className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide transition-colors duration-150 ${
         active ? 'bg-[#3E6B52]/[0.1] text-[#3E6B52]' : 'bg-[#1C1F1D]/[0.05] text-[#1C1F1D]/35'
       }`}
     >
       {points} pts
    </span>
    );
}

function GroupLabel({ label, accentColor }: { label: string; accentColor: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#1C1F1D]/40">{label}</span>
    </div>
  );
}

function IconButton({ onPress, icon, color, bg, activeBg }: any) {
   const IconCmp = icon === 'info' ? Info : FileText; // swap for your icon set
   return (
     <button
       type="button"
       onClick={onPress}
        className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg} ${activeBg} transition-all duration-150 active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
     >
       <IconCmp size={14} color={color} />
     </button>
  );
}

function SubitemRow({
  subitem,
  isChecked,
  onToggle,
}: {
  subitem: SubitemType;
  isChecked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        'group mb-1.5 flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all duration-150',
        isChecked
          ? 'border-[#3E6B52]/20 bg-[#3E6B52]/6'
          : 'border-transparent bg-[#1E2621]/3 hover:bg-[#1E2621]/5',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150',
          isChecked ? 'border-[#3E6B52] bg-[#3E6B52]' : 'border-[#1E2621]/20 bg-white',
        ].join(' ')}
      >
        {isChecked && <Check size={11} strokeWidth={3} className="text-white" />}
      </span>
      <span
        className={`text-[13px] leading-5 ${isChecked ? 'text-[#3E6B52]' : 'text-[#1E2621]/70'}`}
      >
        {subitem.description}
      </span>
    </button>
  );
}

function CustomItemRow({
  customItem,
  onDelete,
}: {
  customItem: CustomItem;
  onDelete: () => void;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-3 rounded-lg border border-[#C08A3E]/25 bg-[#C08A3E]/[0.06] px-3 py-2">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] bg-[#C08A3E]">
        <Check size={11} strokeWidth={3} className="text-white" />
      </span>
      <span className="flex-1 text-[13px] leading-5 text-[#1E2621]/80">
        {customItem.description}
      </span>
      <button
        type="button"
        onClick={onDelete}
        className="flex h-6 w-6 items-center justify-center rounded-md text-[#1E2621]/30 transition-colors hover:bg-red-50 hover:text-red-500"
      >
        <Trash2 size={13} />
      </button>
    </div>
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
  return (
    <div className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-[#1E2621]/15 bg-white px-3 py-2 focus-within:border-[#3E6B52]/40">
      <Plus size={14} className="shrink-0 text-[#1E2621]/30" />
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
        placeholder="Add a custom item…"
        className="w-full flex-1 bg-transparent text-[13px] text-[#1E2621] placeholder:text-[#1E2621]/30 focus:outline-none"
      />
      <button
        type="button"
        onClick={onSubmit}
        className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-[#3E6B52] transition-colors hover:bg-[#3E6B52]/10"
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
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div className="flex items-center justify-between border-b border-[#1E2621]/8 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#3E6B52]">
                  {label}
                </p>
                <h3 className="font-display text-base font-semibold text-[#1E2621]">{title}</h3>
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

function UpdatedToastMessage({ visible, toastMessage }: { visible: boolean; toastMessage: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex items-center gap-2 rounded-full bg-[#1E2621] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
            <Sparkles size={14} className="text-[#C08A3E]" />
            {toastMessage}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SkeletonLoader({ type }: { type: 'criteriaCards' }) {
  return (
    <div className="flex-1 bg-[#F6F6F2] px-6 py-4">
      <div className="mb-5 h-4 w-40 animate-pulse rounded bg-[#1E2621]/10" />
      <div className="mb-6 h-13 animate-pulse rounded-2xl bg-white/80" style={{ height: 52 }} />
      <div className="mb-6 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-19 animate-pulse rounded-2xl bg-white/70" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-18.5 animate-pulse rounded-xl bg-white/70" />
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Main component
   All state, callbacks, effects, and business rules below are preserved
   1:1 from the original React Native implementation. Only the rendering
   layer (JSX/markup + styling) has been modernized.
   ──────────────────────────────────────────────────────────────────────── */

const GreenElementsScreen = ({
  greenElements,
  setGreenElements = () => {},
  criteriaTotalMarks,
  setCriteriaTotalMarks = () => {},
  criteriaMarks,
  setCriteriaMarks,
  selectedDropdowns,
  setSelectedDropdowns,
  selectionMarks,
  setSelectionMarks,
  checkedItems,
  setCheckedItems,
  checkedOptions,
  setCheckedOptions,
  checkedSubitems,
  setCheckedSubitems,
  customItems,
  setCustomItems,
  showCostUpdatedToast,
  setShowCostUpdatedToast,
  ...otherProps
}: GreenElementsScreenProps) => {
  const isRefreshingProject = otherProps?.isRefreshingProject || false;
  const [criteria, setCriteria] = useState<CriterionType[]>([]);
  const [selectedCriterion, setSelectedCriterion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [optionMarksTotals, setOptionMarksTotals] = useState<Record<string, number>>({});
  const [activeExclusiveGroups, setActiveExclusiveGroups] = useState<Record<string, ID | null>>({});

  const verticalScrollRef = useRef<HTMLDivElement>(null);

  const [isInfoGuideVisible, setIsInfoGuideVisible] = useState(false);
  const [infoGuideText, setInfoGuideText] = useState('');
  const [infoGuideTitle, setInfoGuideTitle] = useState('Information');
  const [infoGuideLabel, setInfoGuideLabel] = useState('Guide');

  const handleInfoGuideOpen = (text: string, title = 'Information', label = 'Guide') => {
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

    // Reset vertical scroll to top
    verticalScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCheckboxToggle = useCallback(
    (itemId: ID, parentId: ID | null = null, itemData?: string) => {
      if (itemData == 'subitems') {
        const wasChecked = checkedSubitems[parentId as any]?.[itemId as any] || false;

        // Find the criterion this item belongs to
        let targetCriterion: string | null = null;
        let maximumPoints: number | null = null;
        let parentItem: ItemType | null = null;

        for (const criterion of criteria) {
          if (criterion.items) {
            for (const item of criterion.items) {
              if (item.subitems && item.subitems.find((sub) => sub.id === itemId)) {
                targetCriterion = criterion.name;
                maximumPoints = item.marks || null;
                parentItem = item;
                break;
              }
            }
            if (targetCriterion) break;
          }

          if (criterion.subcriteria) {
            for (const subcriterion of criterion.subcriteria) {
              if (subcriterion.items) {
                for (const item of subcriterion.items) {
                  if (item.subitems && item.subitems.find((sub) => sub.id === itemId)) {
                    targetCriterion = criterion.name;
                    maximumPoints = item.marks || null;
                    parentItem = item;
                    break;
                  }
                }
              }
            }
          }

          if (targetCriterion) break;
        }

        if (targetCriterion && parentItem) {
          const allSubitemIds: ID[] = [];

          if (parentItem.subitems) {
            allSubitemIds.push(...parentItem.subitems.map((sub) => sub.id));
          }
          if (customItems[parentItem.id as any]) {
            allSubitemIds.push(...customItems[parentItem.id as any].map((custom) => custom.id));
          }

          const newCheckedState: Record<string, Record<string, boolean>> = {
            ...checkedSubitems,
            [parentId as any]: {
              ...checkedSubitems[parentId as any],
              [itemId as any]: !wasChecked,
            },
          };

          const totalCheckedSubitems = allSubitemIds.filter((id) => {
            if ((parentId as any) in newCheckedState && (id as any) in newCheckedState[parentId as any]) {
              return newCheckedState[parentId as any][id as any];
            }

            if ((parentId as any) in checkedSubitems && (id as any) in checkedSubitems[parentId as any]) {
              return checkedSubitems[parentId as any][id as any];
            }

            if (customItems[parentId as any]?.find((custom) => custom.id === id)) {
              return true;
            }

            return checkedItems[id as any];
          }).length;

          const previousCheckedSubitems = allSubitemIds.filter((id) => {
            if ((parentId as any) in checkedSubitems && (id as any) in checkedSubitems[parentId as any]) {
              return checkedSubitems[parentId as any][id as any];
            }

            if (customItems[parentId as any]?.find((custom) => custom.id === id)) {
              return true;
            }

            return checkedItems[id as any];
          }).length;

          const maxMarks = maximumPoints || 6;
          const marksDifference =
            Math.min(totalCheckedSubitems, maxMarks) - Math.min(previousCheckedSubitems, maxMarks);

          setCheckedSubitems((prev) => ({
            ...prev,
            [parentId as any]: {
              ...prev[parentId as any],
              [itemId as any]: !wasChecked,
            },
          }));

          if (marksDifference !== 0) {
            setCriteriaMarks((prevMarks) => ({
              ...prevMarks,
              [targetCriterion]: Math.max(0, (prevMarks[targetCriterion] || 0) + marksDifference),
            }));
          }
        } else {
          setCheckedSubitems((prev) => ({
            ...prev,
            [parentId as any]: {
              ...prev[parentId as any],
              [itemId as any]: !wasChecked,
            },
          }));
        }
      } else {
        const wasChecked = checkedItems[itemId as any] || false;

        let targetCriterion: string | null = null;
        let parentItem: ItemType | null = null;
        let isSubitem = false;

        for (const criterion of criteria) {
          if (criterion.items) {
            for (const item of criterion.items) {
              if (item.subitems && item.subitems.find((sub) => sub.id === itemId)) {
                targetCriterion = criterion.name;
                parentItem = item;
                isSubitem = true;
                break;
              }

              if (item.id === itemId) {
                targetCriterion = criterion.name;
                parentItem = item;
                break;
              }
            }

            if (targetCriterion) break;
          }

          if (criterion.subcriteria) {
            for (const subcriterion of criterion.subcriteria) {
              if (subcriterion.items) {
                const foundItem = subcriterion.items.find((item) => item.id === itemId);
                if (foundItem) {
                  targetCriterion = criterion.name;
                  parentItem = foundItem;
                  break;
                }

                for (const item of subcriterion.items) {
                  if (item.subitems && item.subitems.find((sub) => sub.id === itemId)) {
                    targetCriterion = criterion.name;
                    parentItem = item;
                    isSubitem = true;
                    break;
                  }
                }
              }
            }
          }

          if (targetCriterion) break;
        }

        if (!targetCriterion) {
          for (const criterion of criteria) {
            const allItems = [
              ...(criterion.items || []),
              ...(criterion.subcriteria?.flatMap((sub) => sub.items || []) || []),
            ];

            for (const item of allItems) {
              if (customItems[item.id as any]?.find((custom) => custom.id === itemId)) {
                targetCriterion = criterion.name;
                parentItem = item;
                isSubitem = true;
                break;
              }
            }
            if (targetCriterion) break;
          }
        }

        if (targetCriterion) {
          const finalParentItem = parentItem as ItemType;

          if (isSubitem) {
            const allSubitemIds: ID[] = [];

            if (finalParentItem.subitems) {
              allSubitemIds.push(...finalParentItem.subitems.map((sub) => sub.id));
            }

            if (customItems[finalParentItem.id as any]) {
              allSubitemIds.push(...customItems[finalParentItem.id as any].map((custom) => custom.id));
            }

            const pId = finalParentItem.id;

            const totalChecked = allSubitemIds.filter((id) => {
              if (customItems[pId as any]?.find((custom) => custom.id === id)) {
                return true;
              }

              return checkedSubitems[pId as any]?.[id as any] || false;
            }).length;

            const maxMarks = finalParentItem.marks || 6;
            const subitemMarks = Math.min(totalChecked, maxMarks);

            const previousTotal = allSubitemIds.filter((id) => {
              if (customItems[pId as any]?.find((custom) => custom.id === id)) {
                return true;
              }

              return checkedSubitems[pId as any]?.[id as any] || false;
            }).length;

            const previousSubitemMarks = Math.min(previousTotal, maxMarks);
            const marksDifference = subitemMarks - previousSubitemMarks;

            setCheckedItems((prev) => ({
              ...prev,
              [itemId as any]: !wasChecked,
            }));

            if (marksDifference !== 0) {
              setCriteriaMarks((prevMarks) => ({
                ...prevMarks,
                [targetCriterion]: Math.max(0, (prevMarks[targetCriterion] || 0) + marksDifference),
              }));
            }
          } else {
            const marks = finalParentItem.marks || 0;
            const marksDifference = wasChecked ? -marks : marks;

            setCheckedItems((prev) => ({
              ...prev,
              [itemId as any]: !wasChecked,
            }));

            if (marksDifference !== 0) {
              setCriteriaMarks((prevMarks) => ({
                ...prevMarks,
                [targetCriterion]: Math.max(0, (prevMarks[targetCriterion] || 0) + marksDifference),
              }));
            }
          }
        } else {
          setCheckedItems((prev) => ({
            ...prev,
            [itemId as any]: !wasChecked,
          }));
        }
      }
    },
    [checkedItems, setCheckedItems, checkedSubitems, setCheckedSubitems, criteria, customItems, setCriteriaMarks],
  );

  const handleOptionToggle = useCallback(
    (itemId: ID, optionIndex: ID, option: OptionType, criterionId: string | null) => {
      setCheckedOptions((prev) => {
        const itemOptions = prev[itemId as any] || {};
        const isChecked = !itemOptions[optionIndex as any];

        return {
          ...prev,
          [itemId as any]: { ...itemOptions, [optionIndex as any]: isChecked },
        };
      });

      // Update marks after state change is batched
      const currentOptions = checkedOptions[itemId as any] || {};
      const wasChecked = currentOptions[optionIndex as any];
      const marksDelta = (option.marks || 0) * (wasChecked ? -1 : 1);

      setCriteriaMarks((prevMarks) => ({
        ...prevMarks,
        [criterionId as any]: Math.max(0, (prevMarks[criterionId as any] || 0) + marksDelta),
      }));

      setOptionMarksTotals((prevTotals) => ({
        ...prevTotals,
        [itemId as any]: Math.max(0, (prevTotals[itemId as any] || 0) + marksDelta),
      }));
    },
    [checkedOptions],
  );

  const handleCustomInputChange = useCallback((itemId: ID, text: string) => {
    setCustomInputs((prev) => ({
      ...prev,
      [itemId as any]: text,
    }));
  }, []);

  const addCustomItem = useCallback(
    (itemId: ID, text: string) => {
      if (!text || !text.trim()) return;

      // Find the parent item to check if it has subitems_exist
      let parentItem: ItemType | undefined;
      for (const criterion of criteria) {
        const allItems = [
          ...(criterion.items || []),
          ...(criterion.subcriteria?.flatMap((sub) => sub.items || []) || []),
        ];
        parentItem = allItems.find((item) => item.id === itemId);
        if (parentItem) break;
      }

      const customItemId = `custom_${itemId}_${Date.now()}`;
      const newCustomItem: CustomItem = {
        id: customItemId,
        description: text.trim(),
        isCustom: true,
      };

      // Calculate marks before updating state
      if (parentItem && parentItem.subitems_exist && selectedCriterion) {
        const finalParentItem = parentItem;
        const prevCustomItemsArr = customItems[itemId as any] || [];
        const updatedCustomItemsArr = [...prevCustomItemsArr, newCustomItem];

        const allSubitemIds: ID[] = [];
        if (finalParentItem.subitems) {
          allSubitemIds.push(...finalParentItem.subitems.map((sub) => sub.id));
        }
        allSubitemIds.push(...updatedCustomItemsArr.map((custom) => custom.id));

        const previouslyCheckedForThisParent =
          (finalParentItem.subitems || []).filter(
            (sub) => checkedSubitems[itemId as any]?.[sub.id as any] || false,
          ).length + prevCustomItemsArr.length;

        const totalCheckedForThisParent = allSubitemIds.filter((id) => {
          if (finalParentItem.subitems?.find((sub) => sub.id === id)) {
            return checkedSubitems[itemId as any]?.[id as any] || false;
          }
          return true;
        }).length;

        const maxMarks = finalParentItem.marks || 6;
        const previousMarks = Math.min(previouslyCheckedForThisParent, maxMarks);
        const newMarks = Math.min(totalCheckedForThisParent, maxMarks);
        const marksDifference = newMarks - previousMarks;

        setCustomItems((prev) => ({
          ...prev,
          [itemId as any]: [...(prev[itemId as any] || []), newCustomItem],
        }));

        if (marksDifference !== 0) {
          setCriteriaMarks((prevMarks) => ({
            ...prevMarks,
            [selectedCriterion]: Math.max(0, (prevMarks[selectedCriterion] || 0) + marksDifference),
          }));
        }
      } else {
        setCustomItems((prev) => ({
          ...prev,
          [itemId as any]: [...(prev[itemId as any] || []), newCustomItem],
        }));
      }

      // Clear the input field
      setCustomInputs((prev) => ({
        ...prev,
        [itemId as any]: '',
      }));
    },
    [selectedCriterion, criteria, checkedSubitems, customItems, setCustomItems, setCriteriaMarks],
  );

  const deleteCustomItem = useCallback(
    (itemId: ID, customItemId: string) => {
      const targetCriterion = selectedCriterion;

      const updatedCustomItems: Record<string, CustomItem[]> = {
        ...customItems,
        [itemId as any]: customItems[itemId as any]?.filter((item) => item.id !== customItemId) || [],
      };

      setCustomItems(updatedCustomItems);

      // Update marks if this custom item was checked
      if (targetCriterion) {
        setCriteriaMarks((prevMarks) => {
          // Find the parent item
          let parentItem: ItemType | undefined;
          for (const criterion of criteria) {
            const allItems = [
              ...(criterion.items || []),
              ...(criterion.subcriteria?.flatMap((sub) => sub.items || []) || []),
            ];
            parentItem = allItems.find((item) => item.id === itemId);
            if (parentItem) break;
          }

          if (parentItem) {
            // Get all subitem IDs for this parent item (excluding the deleted one)
            const allSubitemIds: ID[] = [];
            if (parentItem.subitems) {
              allSubitemIds.push(...parentItem.subitems.map((sub) => sub.id));
            }
            // Include remaining custom items (after deletion)
            const remainingCustomItems = updatedCustomItems[itemId as any];
            allSubitemIds.push(...remainingCustomItems.map((custom) => custom.id));

            // Count total checked subitems after deletion
            const totalCheckedAfter = allSubitemIds.filter((id) => {
              // If it's a regular subitem that's checked
              if (parentItem!.subitems?.find((sub) => sub.id === id)) {
                return checkedSubitems[itemId as any]?.[id as any] || false;
              }
              // Custom items are auto-checked, so always return true
              return true;
            }).length;

            // Calculate new marks for this parent item (subitems only)
            const maxMarks = parentItem.marks || 6;
            const newSubitemMarks = Math.min(totalCheckedAfter, maxMarks);

            // Now rebuild full criterion total properly
            let newCriterionTotal = 0;

            // Loop through every item in the criterion
            const criterionObj = criteria.find((c) => c.name === targetCriterion);
            if (criterionObj) {
              const allItems = [
                ...(criterionObj.items || []),
                ...(criterionObj.subcriteria?.flatMap((sub) => sub.items || []) || []),
              ];

              for (const item of allItems) {
                // If this is the parent item whose subitems changed
                if (item.id === parentItem.id) {
                  newCriterionTotal += newSubitemMarks;
                } else if (item.subitems_exist) {
                  // For other subitem-type items
                  const ids = [
                    ...(item.subitems?.map((s) => s.id) || []),
                    ...(customItems[item.id as any]?.map((c) => c.id) || []),
                  ];

                  const count = ids.filter((id) => {
                    if (checkedSubitems[item.id as any]?.[id as any]) return true;
                    if (checkedItems[id as any]) return true;
                    return false;
                  }).length;

                  newCriterionTotal += Math.min(count, item.marks || 6);
                } else {
                  // Normal items
                  if (checkedItems[item.id as any]) {
                    newCriterionTotal += item.marks || 0;
                  }
                }
              }
            }

            return {
              ...prevMarks,
              [targetCriterion]: newCriterionTotal,
            };
          }

          return prevMarks;
        });
      }
    },
    [selectedCriterion, criteria, checkedItems, checkedSubitems, customItems],
  );

  // Update criteriaTotalMarks whenever criteriaMarks changes
  useEffect(() => {
    if (setCriteriaTotalMarks && typeof setCriteriaTotalMarks === 'function') {
      const newTotal = Object.values(criteriaMarks).reduce((sum, marks) => sum + marks, 0);
      setCriteriaTotalMarks(newTotal);
    }
  }, [criteriaMarks, setCriteriaTotalMarks, selectedCriterion, criteria]);

  useEffect(() => {
    setLoading(true);

    if (greenElements && Array.isArray(greenElements) && greenElements.length > 0) {
      const newSections = greenElements
        .map((item: any) => {
          let name;

          if (typeof item === 'string') {
            name = item;
          } else if (item && item.name) {
            name = item.name;
          } else {
            name = String(item);
          }

          return name ? { ...item } : null;
        })
        .filter(Boolean) as CriterionType[];

      const initialCheckedState: Record<string, boolean> = {};
      const initialCheckedSubitems: Record<string, Record<string, boolean>> = {};
      const initialCheckedOptions: Record<string, Record<string, boolean>> = {};

      newSections.forEach((criterion) => {
        const targetCriterion = criterion.name;

        setCriteriaMarks((prevMarks) => ({
          ...prevMarks,
          [targetCriterion]: 0,
        }));

        // Handle items at criterion level
        if (criterion.items && Array.isArray(criterion.items)) {
          criterion.items.forEach((item) => {
            // Only add regular items to checkedItems
            initialCheckedState[item.id as any] = item.is_compulsory === 1 ? true : false;

            item.is_compulsory &&
              setCriteriaMarks((prevMarks) => {
                const currentMarks = prevMarks[targetCriterion] || 0;

                return {
                  ...prevMarks,
                  [targetCriterion]: Math.max(0, currentMarks + (item.marks as number)),
                };
              });

            const groupedOptions =
              item.option_groups?.flatMap((group) => (Array.isArray(group?.options) ? group.options : [])) || [];

            if (groupedOptions.length > 0) {
              initialCheckedOptions[item.id as any] = {};
              groupedOptions.forEach((option) => {
                initialCheckedOptions[item.id as any][option.id as any] = false;
              });
            }

            // Initialize subitems separately in checkedSubitems
            if (item.subitems && Array.isArray(item.subitems) && item.subitems.length > 0) {
              initialCheckedSubitems[item.id as any] = {};
              item.subitems.forEach((subitem) => {
                initialCheckedSubitems[item.id as any][subitem.id as any] = false;
              });
            }
          });
        }

        // Handle items in subcriteria
        if (criterion.subcriteria && Array.isArray(criterion.subcriteria)) {
          criterion.subcriteria.forEach((sub) => {
            if (sub.items && Array.isArray(sub.items)) {
              sub.items.forEach((item) => {
                // Only add regular items to checkedItems
                initialCheckedState[item.id as any] = item.is_compulsory === 1 ? true : false;

                item.is_compulsory &&
                  setCriteriaMarks((prevMarks) => {
                    const currentMarks = prevMarks[targetCriterion] || 0;

                    return {
                      ...prevMarks,
                      [targetCriterion]: Math.max(0, currentMarks + (item.marks as number)),
                    };
                  });

                const groupedOptions =
                  item.option_groups?.flatMap((group) => (Array.isArray(group?.options) ? group.options : [])) || [];

                if (groupedOptions.length > 0) {
                  initialCheckedOptions[item.id as any] = {};
                  groupedOptions.forEach((option) => {
                    initialCheckedOptions[item.id as any][option.id as any] = false;
                  });
                }

                // Initialize subitems separately in checkedSubitems
                if (item.subitems && Array.isArray(item.subitems) && item.subitems.length > 0) {
                  initialCheckedSubitems[item.id as any] = {};
                  item.subitems.forEach((subitem) => {
                    initialCheckedSubitems[item.id as any][subitem.id as any] = false;
                  });
                }
              });
            }
          });
        }
      });

      const firstCriterionName = newSections[0]?.name || (typeof newSections[0] === 'string' ? newSections[0] : null);

      setSelectedCriterion(firstCriterionName as any);
      setCriteria(newSections);
      setCheckedItems(initialCheckedState);
      setCheckedOptions(initialCheckedOptions);
      setCheckedSubitems(initialCheckedSubitems);
      setSelectedDropdowns({});
      setSelectionMarks({});
      setActiveExclusiveGroups({});
    } else {
      setCriteria([]);
      setCheckedItems({});
      setCheckedSubitems({});
      setSelectedDropdowns({});
      setSelectionMarks({});
      setActiveExclusiveGroups({});
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greenElements]);

  // Helper function to find the criterion an item belongs to
  const findItemCriterion = useCallback(
    (itemId: ID) => {
      for (const criterion of criteria) {
        // Check direct items
        if (criterion.items) {
          if (criterion.items.find((item) => item.id === itemId)) {
            return criterion.name;
          }
        }
        // Check subcriteria items
        if (criterion.subcriteria) {
          for (const subcriterion of criterion.subcriteria) {
            if (subcriterion.items && subcriterion.items.find((item) => item.id === itemId)) {
              return criterion.name;
            }
          }
        }
      }
      return null;
    },
    [criteria],
  );

  const buildSupplementalInfo = useCallback((item: ItemType) => {
    const sections: string[] = [];

    if (item.esg) {
      sections.push(`## ESG Sarawak\n\n${item.esg}`);
    }

    if (item.suggestions) {
      sections.push(`## Materials & Suggestions\n\n${item.suggestions}`);
    }

    return sections.join('\n\n');
  }, []);

  // Custom render function for dropdown items with marks
  const renderSelectionItem = useCallback((item: SelectionType) => {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="flex-1 text-[13.5px] font-medium leading-5 text-[#1C1F1D]/75">{item.description}</span>
        <span className="shrink-0 rounded-full bg-[#3E6B52]/8 px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide text-[#3E6B52]">
          {item.marks} pts
        </span>
      </div>
    );
  }, []);

  // Custom render function for selected label
  const renderSelectedLabel = useCallback((selectedItem: SelectionType) => {
    if (!selectedItem) {
      return <span className="text-sm text-[#1C1F1D]/35">Select an option…</span>;
    }
    return (
      <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
        <span className="flex-1 truncate text-sm font-semibold text-[#1C1F1D]">{selectedItem.description}</span>
        <span className="shrink-0 rounded-full bg-[#3E6B52]/[0.08] px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-[#3E6B52]">
          {selectedItem.marks} pts
        </span>
      </div>
    );
  }, []);

  const renderItem = useCallback(
    (item: ItemType) => {
      const optionGroups = Array.isArray(item.option_groups) ? item.option_groups : [];
      const selectionGroups = Array.isArray(item.selection_groups) ? item.selection_groups : [];
      const subitems = Array.isArray(item.subitems) ? item.subitems : [];
      const itemOptions = optionGroups.flatMap((g) => (Array.isArray(g?.options) ? g.options : []));
      const hasOptions = itemOptions.length > 0;
      const hasSubitems = !!item.subitems_exist && subitems.length > 0;
      const itemSelections = selectionGroups.flatMap((g) => (Array.isArray(g?.selections) ? g.selections : []));
      const hasSelections = itemSelections.length > 0;
      const hasCheckbox = !hasSubitems && !hasSelections && !hasOptions;
      const isUnchanged = item.is_compulsory === 1;
      const isChecked = checkedItems[item.id as any] || false;

      const itemSelectionTotal =
        selectionGroups.reduce((sum, g) => sum + (selectionMarks[g.id as any] || 0), 0) +
        optionGroups.reduce((sum, g) => {
          return sum + g.options.reduce((s, o) => s + (checkedOptions[g.id as any]?.[o.id as any] ? o.marks : 0), 0);
        }, 0);

      const showPointsBadge = !!item.marks && hasCheckbox && !hasSelections && !hasOptions;
      const showSelectionBadge = hasSelections || hasOptions;

      return (
        <div key={item.id} className="mb-3 px-0.5">
          {/* ── Main Card ── */}
          <div
            className={[
              'group overflow-hidden rounded-[20px] bg-white transition-all duration-200 ease-out',
              isChecked && hasCheckbox
                ? 'border border-[#3E6B52]/[0.16] border-l-[3px] border-l-[#3E6B52] shadow-[0_1px_2px_rgba(28,31,29,0.04),0_6px_16px_-8px_rgba(62,107,82,0.18)]'
                : 'border border-[#1C1F1D]/[0.06] shadow-[0_1px_2px_rgba(28,31,29,0.03)] hover:border-[#1C1F1D]/[0.09] hover:shadow-[0_1px_2px_rgba(28,31,29,0.04),0_12px_28px_-14px_rgba(28,31,29,0.14)]',
            ].join(' ')}
          >
            <div className="px-5 py-4.5">
              <div className="flex items-center">
                {/* Checkbox — only for simple items */}
                {hasCheckbox ? (
                  <button
                    type="button"
                    onClick={isUnchanged ? undefined : () => handleCheckboxToggle(item.id)}
                    disabled={isUnchanged}
                    aria-checked={isChecked}
                    role="checkbox"
                    className={`mr-3.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] border transition-all duration-150 ease-out active:scale-90 ${
                      isChecked
                        ? 'border-[#3E6B52] bg-[#3E6B52] shadow-[0_1px_3px_rgba(62,107,82,0.35)]'
                        : 'border-[#1C1F1D]/18 bg-white'
                    } ${
                      isUnchanged
                        ? 'cursor-not-allowed opacity-60'
                        : 'cursor-pointer hover:scale-[1.06] hover:border-[#3E6B52]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]/40'
                    }`}
                  >
                    {isChecked && <Check size={12} strokeWidth={3} className="text-white" />}
                  </button>
                ) : null}

                {/* Description */}
                <button
                  type="button"
                  className="mr-3 flex-1 rounded-lg text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]/30"
                  onClick={isUnchanged ? undefined : () => hasCheckbox && handleCheckboxToggle(item.id)}
                >
                  <span
                    className={`text-[13.5px] leading-[20px] tracking-[-0.01em] ${
                      hasSubitems
                        ? 'font-semibold text-[#1C1F1D]/90'
                        : isChecked
                          ? 'font-normal text-[#1C1F1D]/40'
                          : 'font-medium text-[#1C1F1D]/78'
                    }`}
                  >
                    {item.description}
                  </span>
                </button>

                {/* Right-side badges & icon actions */}
                <div className="flex items-center gap-2">
                  {showPointsBadge ? (
                    <button
                      type="button"
                      onClick={isUnchanged ? undefined : () => handleCheckboxToggle(item.id)}
                      className="transition-transform duration-150 active:scale-95"
                    >
                      <PointsBadge points={item.marks as number} active={isChecked} />
                    </button>
                  ) : null}

                  {showSelectionBadge ? (
                    <PointsBadge points={itemSelectionTotal || 0} active={itemSelectionTotal !== 0} />
                  ) : null}

                  {item.info && !hasOptions ? (
                    <IconButton
                      onPress={() => handleInfoGuideOpen(item.info as string, 'Information', 'Guide')}
                      icon="info"
                      color="#9CA3AF"
                      bg="bg-[#1C1F1D]/[0.04]"
                      activeBg="hover:bg-[#1C1F1D]/[0.08]"
                    />
                  ) : null}

                  {item.suggestions || item.esg ? (
                    <IconButton
                      onPress={() => handleInfoGuideOpen(buildSupplementalInfo(item), 'ESG & Suggestions', 'Details')}
                      icon="doc"
                      color="#B7791F"
                      bg="bg-[#B7791F]/[0.08]"
                      activeBg="hover:bg-[#B7791F]/[0.14]"
                    />
                  ) : null}
                </div>
              </div>

              {/* Option Groups */}
              {optionGroups.map((group, gi) => (
                <div key={`${group.id}-${gi}`} className="mt-4">
                  <GroupLabel label={group.label} accentColor="#6366F1" />
                  <div className="space-y-1.5">
                    {group.options?.map((option, oi) => {
                      const isOptChecked = checkedOptions[group.id as any]?.[option.id as any] || false;
                      const criterionId = findItemCriterion(item.id);
                      return (
                        <button
                          type="button"
                          key={oi}
                          className={`flex w-full items-center rounded-[14px] px-3.5 py-2.5 text-left transition-all duration-150 ease-out ${
                            isOptChecked
                              ? 'bg-[#3E6B52]/[0.08] ring-1 ring-inset ring-[#3E6B52]/15'
                              : 'bg-[#1C1F1D]/[0.025] hover:bg-[#1C1F1D]/[0.05]'
                          }`}
                          onClick={() => handleOptionToggle(group.id, option.id, option, criterionId)}
                        >
                          <span
                            className={`mr-2.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150 ${
                              isOptChecked ? 'border-[#3E6B52] bg-[#3E6B52]' : 'border-[#1C1F1D]/20 bg-white'
                            }`}
                          >
                            {isOptChecked && <Check size={10} strokeWidth={3} className="text-white" />}
                          </span>
                          <span
                            className={`flex-1 pr-1 text-[13px] leading-5 ${
                              isOptChecked ? 'font-semibold text-[#3E6B52]' : 'font-normal text-[#1C1F1D]/65'
                            }`}
                          >
                            {option?.description}
                          </span>
                          <span
                            className={`mr-2 font-mono text-[11px] font-semibold tracking-wide ${
                              isOptChecked ? 'text-[#3E6B52]' : 'text-[#1C1F1D]/25'
                            }`}
                          >
                            {option.marks} pts
                          </span>
                          {option.sub_description ? (
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInfoGuideOpen(option.sub_description as string);
                              }}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-[#1C1F1D]/[0.06]"
                            >
                              <Info size={14} />
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Selection Dropdown Groups */}
              {(() => {
                const exclusiveGroups = selectionGroups.filter((g) => g.exclusive);
                const normalGroups = selectionGroups.filter((g) => !g.exclusive);

                return (
                  <>
                    {/* ── Normal groups (existing behaviour) ── */}
                    {normalGroups.map((group, gi) => (
                      <div key={`${group.id}-${gi}`} className="mt-4">
                        <GroupLabel label={group.label} accentColor="#6366F1" />
                        <CustomDropdown
                          data={group.selections}
                          value={selectedDropdowns[group.id as any] || group.selections[0] || null}
                          labelField="description"
                          valueField="id"
                          placeholder="Select an option…"
                          renderItem={(i) => renderSelectionItem(i)}
                          renderSelectedLabel={(i) => renderSelectedLabel(i)}
                          onChange={(selected) => {
                            const targetCriterion = findItemCriterion(item.id);
                            if (!targetCriterion) return;
                            const previousMark = selectionMarks[group.id as any] || 0;
                            const newMark = selected?.marks || 0;
                            const diff = newMark - previousMark;
                            setSelectedDropdowns((prev) => ({ ...prev, [group.id as any]: selected }));
                            setSelectionMarks((prev) => ({ ...prev, [group.id as any]: newMark }));
                            setCriteriaMarks((p) => ({
                              ...p,
                              [targetCriterion]: Math.max(0, (p[targetCriterion] || 0) + diff),
                            }));
                          }}
                        />
                      </div>
                    ))}

                    {/* ── Exclusive groups: only one can be active ── */}
                    {exclusiveGroups.length > 0 && (
                      <div className="mt-4">
                        {/* Section divider */}
                        <div className="mb-2.5 flex items-center gap-2">
                          <div className="h-px flex-1 bg-[#1C1F1D]/[0.08]" />
                          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#1C1F1D]/32">
                            Choose one group
                          </span>
                          <div className="h-px flex-1 bg-[#1C1F1D]/[0.08]" />
                        </div>

                        <div className="space-y-2">
                          {exclusiveGroups.map((group, gi) => {
                            const activeGroupId = activeExclusiveGroups[item.id as any] ?? null;
                            const isActive = activeGroupId === group.id;
                            const isDimmed = !isActive && activeGroupId !== null;

                            return (
                              <div
                                key={`${group.id}-${gi}`}
                                className={`rounded-[16px] border p-3 transition-all duration-200 ease-out ${
                                  isActive
                                    ? 'border-[#6366F1]/30 bg-[#6366F1]/[0.05] shadow-[0_2px_10px_-4px_rgba(99,102,241,0.18)]'
                                    : isDimmed
                                      ? 'border-[#1C1F1D]/[0.06] bg-[#1C1F1D]/[0.015] opacity-70'
                                      : 'border-[#1C1F1D]/[0.08] bg-[#1C1F1D]/[0.015]'
                                }`}
                              >
                                {/* Radio row + label */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetCriterion = findItemCriterion(item.id);
                                    if (!targetCriterion) return;

                                    if (isActive) {
                                      // Deselect this group — remove its marks
                                      const oldMarks = selectionMarks[group.id as any] || 0;
                                      setCriteriaMarks((p) => ({
                                        ...p,
                                        [targetCriterion]: Math.max(0, (p[targetCriterion] || 0) - oldMarks),
                                      }));
                                      setSelectionMarks((prev) => ({ ...prev, [group.id as any]: 0 }));
                                      setSelectedDropdowns((prev) => ({ ...prev, [group.id as any]: null }));
                                      setActiveExclusiveGroups((prev) => ({ ...prev, [item.id as any]: null }));
                                    } else {
                                      // Switching to this group — clear previously active exclusive group's marks
                                      if (activeGroupId !== null) {
                                        const oldMarks = selectionMarks[activeGroupId as any] || 0;
                                        setCriteriaMarks((p) => ({
                                          ...p,
                                          [targetCriterion]: Math.max(0, (p[targetCriterion] || 0) - oldMarks),
                                        }));
                                        setSelectionMarks((prev) => ({ ...prev, [activeGroupId as any]: 0 }));
                                        setSelectedDropdowns((prev) => ({ ...prev, [activeGroupId as any]: null }));
                                      }
                                      setActiveExclusiveGroups((prev) => ({ ...prev, [item.id as any]: group.id }));
                                    }
                                  }}
                                  className="mb-2 flex w-full items-center text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]/40 rounded-lg"
                                >
                                  {/* Radio indicator */}
                                  <span
                                    className={`mr-2.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[2px] transition-all duration-150 ${
                                      isActive ? 'border-[#6366F1]' : 'border-[#1C1F1D]/20'
                                    }`}
                                  >
                                    {isActive && (
                                      <span className="h-2 w-2 rounded-full bg-[#6366F1] transition-transform duration-150" />
                                    )}
                                  </span>
                                  <span
                                    className={`text-[13px] font-semibold tracking-[-0.01em] ${
                                      isActive ? 'text-[#4F46E5]' : 'text-[#1C1F1D]/50'
                                    }`}
                                  >
                                    {group.label}
                                  </span>
                                </button>

                                {/* Dropdown — disabled until this group is activated */}
                                <CustomDropdown
                                  disable={!isActive}
                                  data={group.selections}
                                  value={selectedDropdowns[group.id as any] || null}
                                  labelField="description"
                                  valueField="id"
                                  placeholder="Select an option…"
                                  renderItem={(i) => renderSelectionItem(i)}
                                  renderSelectedLabel={(i) => renderSelectedLabel(i)}
                                  onChange={(selected) => {
                                    const targetCriterion = findItemCriterion(item.id);
                                    if (!targetCriterion) return;
                                    const previousMark = selectionMarks[group.id as any] || 0;
                                    const newMark = selected?.marks || 0;
                                    let removedMarks = 0;
                                    selectionGroups.forEach((g) => {
                                      if (g.exclusive && g.id !== group.id) {
                                        removedMarks += selectionMarks[g.id as any] || 0;
                                      }
                                    });
                                    const diff = newMark - previousMark - removedMarks;
                                    setSelectedDropdowns((prev) => {
                                      const updated = { ...prev };
                                      selectionGroups.forEach((g) => {
                                        if (g.exclusive && g.id !== group.id) {
                                          updated[g.id as any] = null;
                                        }
                                      });
                                      updated[group.id as any] = selected;
                                      return updated;
                                    });
                                    setSelectionMarks((prev) => {
                                      const updatedMarks = { ...prev };
                                      selectionGroups.forEach((g) => {
                                        if (g.exclusive && g.id !== group.id) {
                                          updatedMarks[g.id as any] = 0;
                                        }
                                      });
                                      updatedMarks[group.id as any] = newMark;
                                      return updatedMarks;
                                    });
                                    setCriteriaMarks((p) => ({
                                      ...p,
                                      [targetCriterion]: Math.max(0, (p[targetCriterion] || 0) + diff),
                                    }));
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

          {/* ── Subitems ── */}
          {hasSubitems ? (
            <div className="mx-0.5 mt-2 rounded-[16px] border border-[#1C1F1D]/[0.05] bg-[#1C1F1D]/[0.012] p-2.5">
              {subitems.map((subitem) => (
                <SubitemRow
                  key={subitem.id}
                  subitem={subitem}
                  isChecked={checkedSubitems[item.id as any]?.[subitem.id as any] || false}
                  onToggle={() => handleCheckboxToggle(subitem.id, item.id, 'subitems')}
                />
              ))}

              {customItems[item.id as any]?.map((customItem) => (
                <CustomItemRow
                  key={customItem.id}
                  customItem={customItem}
                  onDelete={() => deleteCustomItem(item.id, customItem.id)}
                />
              ))}

              <AddCustomItemRow
                itemId={item.id}
                value={customInputs[item.id as any]}
                onChange={(text) => handleCustomInputChange(item.id, text)}
                onSubmit={() => addCustomItem(item.id, customInputs[item.id as any])}
              />
            </div>
          ) : null}
        </div>
      );
    },
    [
      activeExclusiveGroups,
      checkedItems,
      checkedSubitems,
      checkedOptions,
      handleCheckboxToggle,
      customItems,
      customInputs,
      handleCustomInputChange,
      addCustomItem,
      deleteCustomItem,
      selectionMarks,
      selectedDropdowns,
      findItemCriterion,
      renderSelectedLabel,
      renderSelectionItem,
      buildSupplementalInfo,
    ],
  );

  const renderCriterionItems = useCallback(() => {
    if (!selectedCriterionData) return null;

    const hasSubcriteria = selectedCriterionData.subcriteria && selectedCriterionData.subcriteria.length > 0;
    const hasCriterionItems = selectedCriterionData.items && selectedCriterionData.items.length > 0;

    return (
      <div className="px-5 sm:px-8">
        {/* Render items directly if no subcriteria */}
        {!hasSubcriteria && hasCriterionItems ? (
          <div className="mb-6">{selectedCriterionData.items!.map((item) => renderItem(item))}</div>
        ) : null}

        {/* Render subcriteria with their items */}
        {hasSubcriteria &&
          selectedCriterionData.subcriteria!.map((subcriterion, index) => {
            const hasItems = subcriterion.items && subcriterion.items.length > 0;

            if (!hasItems) return null;

            return (
              <div key={index} className="mb-6">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3E6B52]/[0.09]">
                    <Leaf size={14} className="text-[#3E6B52]" strokeWidth={2.3} />
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
  <div className="flex h-full min-h-[600px] flex-1 flex-col bg-white">
      {criteria.length === 0 && !loading ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
          {/* Empty State Icon */}
          <div className="relative mb-7 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#3E6B52]/[0.07]" />
            <div className="absolute inset-2 rounded-full bg-[#3E6B52]/[0.06]" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(28,31,29,0.06)] ring-1 ring-[#3E6B52]/10">
              <Leaf size={26} strokeWidth={1.8} className="text-[#3E6B52]" />
            </div>
          </div>

          <h2 className="mb-2.5 text-center font-display text-xl font-bold tracking-[-0.01em] text-[#1C1F1D]">
            No Green Elements Available
          </h2>
          <p className="mb-7 max-w-md text-center text-[15px] leading-6 text-[#1C1F1D]/55">
            It looks like there are no green building elements to assess for this project configuration.
          </p>

          {/* Action suggestions */}
          <div className="w-full max-w-md rounded-[20px] border border-[#3E6B52]/12 bg-white p-5 shadow-[0_1px_2px_rgba(28,31,29,0.03),0_8px_24px_-12px_rgba(28,31,29,0.08)]">
            <p className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.06em] text-[#3E6B52]">Suggestions</p>
            <ul className="space-y-1.5 text-[14px] leading-5 text-[#1C1F1D]/65">
              <li>Check your project settings</li>
              <li>Verify building type selection</li>
              <li>Contact support if this seems incorrect</li>
            </ul>
          </div>
        </div>
      ) : criteria.length !== 0 ? (
        <>
          <div className="sticky top-0 z-20 border-b border-[#1C1F1D]/[0.05] bg-white px-8 py-5 backdrop-blur-md sm:px-8">
            {/* Section Header */}
            <div className="mb-1">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-display text-[15px] font-bold tracking-[-0.01em] text-[#1C1F1D]">
                  Assessment Criteria
                </p>
                {criteriaTotalMarks !== undefined && (
                  <span className="hidden rounded-full bg-[#1C1F1D]/[0.05] px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide text-[#1C1F1D]/45 sm:inline">
                    {criteriaTotalMarks} pts total
                  </span>
                )}
              </div>

              <CustomDropdown
                data={criteria}
                value={selectedCriterionData || null}
                labelField="name"
                valueField="name"
                placeholder="Choose a criterion"
                className="shadow-[0_1px_2px_rgba(28,31,29,0.03)]"
                onChange={(item) => {
                  handleSectionPress(item);
                }}
                renderItem={(item) => {
                  const earned = criteriaMarks[item.name] || 0;
                  const total = item.total_marks || 0;

                  return (
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="flex-1 truncate text-sm font-semibold text-[#1C1F1D]/85">{item.name}</span>
                      <span className="shrink-0 rounded-full bg-[#1C1F1D]/[0.05] px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide text-[#1C1F1D]/55">
                        {earned}/{total} pts
                      </span>
                    </div>
                  );
                }}
                renderSelectedLabel={(item) => {
                  const earned = criteriaMarks[item.name] || 0;
                  const total = item.total_marks || 0;

                  return (
                    <div className="flex flex-1 items-center gap-2 overflow-hidden">
                      <span className="flex-1 truncate text-sm font-semibold text-[#1C1F1D]">{item.name}</span>
                      <span className="shrink-0 font-mono text-xs font-medium text-[#1C1F1D]/35">
                        {earned}/{total}
                      </span>
                    </div>
                  );
                }}
              />

              {/* ── Score Cluster (shown after a criterion is selected) ── */}
              {selectedCriterionData &&
                (() => {
                  const earned = criteriaMarks[selectedCriterionData.name] || 0;
                  const total = selectedCriterionData.total_marks || 1;
                  const pct = Math.min(Math.round((earned / total) * 100), 100);
                  const isComplete = pct >= 100;

                  return (
                    <div className="mt-4 flex items-stretch gap-2.5 rounded-[24px] border border-[#1C1F1D]/[0.06] bg-white p-2.5 shadow-[0_1px_2px_rgba(28,31,29,0.03),0_10px_28px_-16px_rgba(28,31,29,0.12)]">
                      {/* Scored box */}
                      <div className="flex flex-1 flex-col items-center justify-center rounded-[18px] bg-[#3E6B52]/[0.05] py-3.5">
                        <span className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#3E6B52]/60">
                          Scored
                        </span>
                        <span className="font-mono text-[27px] font-bold leading-8 tracking-tight text-[#3E6B52]">
                          {earned}
                        </span>
                      </div>

                      {/* Divider slash */}
                      <div className="flex w-4 items-center justify-center">
                        <span className="text-lg font-light text-[#1C1F1D]/18">/</span>
                      </div>

                      {/* Total box */}
                      <div className="flex flex-1 flex-col items-center justify-center rounded-[18px] bg-[#1C1F1D]/[0.03] py-3.5">
                        <span className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#1C1F1D]/38">
                          Total
                        </span>
                        <span className="font-mono text-[27px] font-bold leading-8 tracking-tight text-[#1C1F1D]/85">
                          {total}
                        </span>
                      </div>

                      {/* Progress box */}
                      <div
                        className="flex flex-col justify-center gap-2 rounded-[18px] bg-[#1C1F1D]/[0.03] px-4 py-3.5"
                        style={{ flex: 2 }}
                      >
                        <div className="flex items-baseline justify-between">
                          <span className="text-[16px] font-bold tracking-[-0.01em] text-[#1C1F1D]">{pct}%</span>
                          {isComplete && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3E6B52]">
                              <Check size={11} className="text-white" strokeWidth={3.5} />
                            </span>
                          )}
                        </div>
                        <div className="h-[6px] overflow-hidden rounded-full bg-[#1C1F1D]/[0.07]">
                          <motion.div
                            className={`h-full rounded-full ${
                              isComplete ? 'bg-[#3E6B52]' : 'bg-gradient-to-r from-[#3E6B52]/70 to-[#3E6B52]'
                            }`}
                            initial={false}
                            animate={{ width: `${pct}%` }}
                            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div ref={verticalScrollRef} className="h-full overflow-y-auto pb-6 pt-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCriterion}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  {renderCriterionItems()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <InfoGuideModal
            isVisible={isInfoGuideVisible}
            info={infoGuideText}
            title={infoGuideTitle}
            label={infoGuideLabel}
            onClose={() => setIsInfoGuideVisible(false)}
          />

          <UpdatedToastMessage
            visible={showCostUpdatedToast}
            toastMessage="Cost updated with certification multiplier"
          />
        </>
      ) : null}
    </div>
  );
};

export default GreenElementsScreen;
