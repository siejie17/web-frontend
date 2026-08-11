"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Info, FileText, Trash2 } from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AssessmentItem as ItemT, OptionGroup, SelectionGroup } from "@/types/project";
import { cn } from "@/lib/utils";

/* ---------- shared bits ---------- */

function PointsBadge({ points, active }: { points: number; active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-8.5 items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold",
        active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
      )}
    >
      {points} pts
    </span>
  );
}

function ActualMarksIndicator({
  points,
  active,
  showLabel = true,
}: {
  points: number;
  active?: boolean;
  showLabel?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {showLabel && (
        <span className={cn("text-[10px] font-semibold uppercase", active ? "text-emerald-600" : "text-slate-400")}>
          Actual
        </span>
      )}
      <PointsBadge points={points} active={active} />
    </div>
  );
}

/** Mirrors renderCheckboxComparisonRow: predicted is always read-only,
 *  actual is togglable unless isUnchanged (item.is_compulsory === 1). */
function CheckboxComparisonRow({
  predictedChecked,
  actualChecked,
  onToggle,
  isUnchanged = false,
}: {
  predictedChecked: boolean;
  actualChecked: boolean;
  onToggle: () => void;
  isUnchanged?: boolean;
}) {
  const actualActive = isUnchanged || actualChecked;

  return (
    <div className="mt-3 flex gap-2">
      <div className="flex flex-1 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <div className="flex items-center gap-2">
          {predictedChecked ? (
            <Check className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
          ) : (
            <X className="h-4 w-4 text-red-600" strokeWidth={2.5} />
          )}
          <span className="text-[11px] font-semibold text-slate-500">PREDICTED</span>
        </div>
        <span className={cn("text-xs font-semibold", predictedChecked ? "text-emerald-600" : "text-red-600")}>
          {predictedChecked ? "Checked" : "Unchecked"}
        </span>
      </div>

      <button
        type="button"
        onClick={isUnchanged ? undefined : onToggle}
        disabled={isUnchanged}
        aria-pressed={actualActive}
        className={cn(
          "flex flex-1 items-center justify-between rounded-xl border px-3 py-2.5 transition-colors",
          actualActive ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50",
          isUnchanged ? "cursor-default" : "cursor-pointer"
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded border-2",
              actualActive ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"
            )}
          >
            {actualActive && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </span>
          <span className="text-[11px] font-semibold text-slate-500">ACTUAL</span>
        </div>
        <span className={cn("text-xs font-semibold", actualActive ? "text-emerald-600" : "text-slate-400")}>
          {actualActive ? "Checked" : "Unchecked"}
        </span>
      </button>
    </div>
  );
}

/* ---------- predicted/actual selection dropdown ---------- */

function SelectionDropdown({
  group,
  value,
  disabled,
  onChange,
}: {
  group: SelectionGroup;
  value: number | null;
  disabled?: boolean;
  onChange: (id: number | null) => void;
}) {
  return (
    <Select.Root
      value={value != null ? String(value) : undefined}
      onValueChange={(v) => onChange(v ? Number(v) : null)}
      disabled={disabled}
    >
      <Select.Trigger
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-lg border px-3 text-[13px]",
          disabled ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-900"
        )}
      >
        <Select.Value placeholder="Select an option..." />
        <Select.Icon>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <Select.Viewport>
            {group.selections.map((sel) => (
              <Select.Item
                key={sel.id}
                value={String(sel.id)}
                className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm outline-none data-highlighted:bg-slate-100"
              >
                <Select.ItemText>
                  <span className="text-gray-700 font-medium">{sel.description}</span>
                </Select.ItemText>
                <span className="ml-2 rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                  {sel.marks} pts
                </span>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

/* ---------- main item card ---------- */

export interface AssessmentItemCardProps {
  item: ItemT;
  isPredictedChecked: boolean;
  isPredictedOptionChecked: (groupId: number, optionId: number) => boolean;
  predictedSelectionId: (groupId: number) => number | null;
  actualAnswers: {
    items: Record<string, boolean>;
    options: Record<string, boolean>;
    subitems: Record<string, boolean>;
    customEntries: Record<string, boolean>;
  };
  actualSelectionAnswers: Record<string, number | null>;
  activeExclusiveGroup: number | null;
  predictedSubitemIds: number[];
  predictedCustomInputs: string[];
  actualOnlyCustomInputs: string[];
  customItems: { id: string; description: string }[];
  customInputValue: string;
  onToggleItem: (key: string) => void;
  onToggleOption: (groupId: number, optionId: number) => void;
  onSelectionChange: (groupId: number, selectionId: number | null, exclusive: boolean) => void;
  onToggleSubitem: (itemId: number, subitemId: number) => void;
  onToggleCustomEntry: (auditKey: string) => void;
  onCustomInputChange: (value: string) => void;
  onAddCustomItem: () => void;
  onDeleteCustomItem: (customItemId: string) => void;
  onOpenInfo: (text: string, title?: string, label?: string) => void;
  actualItemMarks: number;
  customEntryAuditKey: (itemId: number, value: string, index: number) => string;
}

export default function AssessmentItemCard({
  item,
  isPredictedChecked,
  isPredictedOptionChecked,
  predictedSelectionId,
  actualAnswers,
  actualSelectionAnswers,
  activeExclusiveGroup,
  predictedSubitemIds,
  predictedCustomInputs,
  actualOnlyCustomInputs,
  customItems,
  customInputValue,
  onToggleItem,
  onToggleOption,
  onSelectionChange,
  onToggleSubitem,
  onToggleCustomEntry,
  onCustomInputChange,
  onAddCustomItem,
  onDeleteCustomItem,
  onOpenInfo,
  actualItemMarks,
  customEntryAuditKey,
}: AssessmentItemCardProps) {
  const optionGroups: OptionGroup[] = item.optionGroups ?? [];
  const selectionGroups: SelectionGroup[] = item.selectionGroups ?? [];
  const subitems = item.subitems ?? [];

  const hasOptions = optionGroups.some((g) => g.options?.length);
  const hasSelections = selectionGroups.some((g) => g.selections?.length);
  const hasSubitems = !!item.subitemsExist && subitems.length > 0;

  const showPointsBadge = !!item.marks && !hasOptions && !hasSubitems && !hasSelections;
  const isUnchanged = item.isCompulsory === true;

  const actualItemChecked = !!actualAnswers.items[item.id];

  const exclusiveGroups = selectionGroups.filter((g) => g.exclusive);
  const normalGroups = selectionGroups.filter((g) => !g.exclusive);

  return (
    <div className="mb-2">
      <div
        className={cn(
          "overflow-hidden rounded-xl border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
          !hasOptions && !hasSubitems && !hasSelections
            ? "border-l-2 border-l-emerald-400 border-gray-100"
            : "border-gray-100"
        )}
      >
        <div className="px-4 py-3.5">
          {/* Header row */}
          <div className="flex items-center">
            <p
              className={cn(
                "flex-1 pr-3 text-[13.5px] leading-5",
                hasSubitems ? "font-semibold text-gray-800" : isPredictedChecked ? "font-normal text-gray-500" : "font-medium text-gray-700"
              )}
            >
              {item.description}
            </p>

            <div className="flex shrink-0 items-center gap-2">
              {showPointsBadge && <ActualMarksIndicator points={item.marks} active={actualItemChecked} showLabel={false} />}

              {hasOptions &&
                optionGroups.map((group) => {
                  const actualOptionGroupMarks = (group.options || []).reduce((sum, option) => {
                    const key = `${group.id}:${option.id}`;
                    return sum + (actualAnswers.options[key] ? option.marks || 0 : 0);
                  }, 0);
                  return (
                    <ActualMarksIndicator
                      key={`actual-og-${group.id}`}
                      points={actualOptionGroupMarks}
                      active={actualOptionGroupMarks !== 0}
                    />
                  );
                })}

              {item.info && !hasOptions && (
                <button
                  type="button"
                  onClick={() => onOpenInfo(item.info!, "Information", "Guide")}
                  className="rounded-full bg-gray-200 p-1.5 text-gray-400 hover:bg-gray-100"
                  aria-label="Item information"
                >
                  <Info className="h-4 w-4" />
                </button>
              )}

              {(item.suggestions || item.esg) && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenInfo(
                      [item.esg && `## ESG Sarawak\n\n${item.esg}`, item.suggestions && `## Materials & Suggestions\n\n${item.suggestions}`]
                        .filter(Boolean)
                        .join("\n\n"),
                      "ESG & Suggestions",
                      "Details"
                    )
                  }
                  className="rounded-full bg-amber-50 p-1.5 text-amber-500 hover:bg-amber-100"
                  aria-label="ESG and suggestions"
                >
                  <FileText className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Plain checkbox item */}
          {!hasOptions && !hasSubitems && !hasSelections && (
            <CheckboxComparisonRow
              predictedChecked={isPredictedChecked}
              actualChecked={actualItemChecked}
              onToggle={() => onToggleItem(String(item.id))}
              isUnchanged={isUnchanged}
            />
          )}

          {/* Option groups */}
          {hasOptions &&
            optionGroups.map((group) => (
              <div key={group.id} className="mt-4">
                <div className="flex flex-col gap-2">
                  {(group.options || []).map((option) => {
                    const isChecked = isPredictedOptionChecked(group.id, option.id);
                    const optionKey = `${group.id}:${option.id}`;
                    const actualOptionChecked = !!actualAnswers.options[optionKey];

                    return (
                      <div key={option.id} className="rounded-lg bg-gray-50 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <p className={cn("flex-1 text-[13px] leading-5 text-gray-600", isChecked && "font-medium")}>
                            {option.description}
                          </p>
                          <span className="text-xs font-semibold text-gray-500">{option.marks} pts</span>
                          {option.subDescription && (
                            <button
                              type="button"
                              onClick={() => onOpenInfo(option.subDescription!)}
                              className="rounded-full bg-gray-200 p-1 text-gray-400 hover:bg-gray-100"
                              aria-label="Option information"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <CheckboxComparisonRow
                          predictedChecked={isChecked}
                          actualChecked={actualOptionChecked}
                          onToggle={() => onToggleOption(group.id, option.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

          {/* Normal (non-exclusive) selection groups */}
          {normalGroups.map((group) => {
            const predictedId = predictedSelectionId(group.id);
            const predictedSelection = group.selections.find((s) => s.id === predictedId);
            const actualSelectionIdVal = actualSelectionAnswers[group.id] ?? null;
            const actualSelection = group.selections.find((s) => s.id === actualSelectionIdVal);

            return (
              <div key={group.id} className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>

                <div className="mb-2 flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-400">PREDICTED :</span>
                  <div className="flex flex-1 items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1.5">
                    <span className="flex-1 truncate text-xs font-medium text-indigo-600">
                      {predictedSelection?.description || "None / Not Applicable"}
                    </span>
                    <span className="text-[11px] font-semibold text-indigo-400">{predictedSelection?.marks || 0} pts</span>
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">ACTUAL :</span>
                  <ActualMarksIndicator
                    points={actualSelection?.marks || 0}
                    active={!!actualSelectionIdVal && (actualSelection?.marks || 0) !== 0}
                    showLabel={false}
                  />
                </div>

                <SelectionDropdown
                  group={group}
                  value={actualSelectionIdVal}
                  onChange={(id) => onSelectionChange(group.id, id, false)}
                />
              </div>
            );
          })}

          {/* Exclusive selection groups: only one active at a time */}
          {exclusiveGroups.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-1.5">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-medium text-slate-400">SELECT ONE GROUP ONLY</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {exclusiveGroups.map((group) => {
                const actualSelectionIdVal = actualSelectionAnswers[group.id] ?? null;
                const actualSelection = group.selections.find((s) => s.id === actualSelectionIdVal);
                const isActive = activeExclusiveGroup === group.id || actualSelectionIdVal !== null;
                const predictedId = predictedSelectionId(group.id);
                const predictedSelection = group.selections.find((s) => s.id === predictedId);

                return (
                  <div
                    key={group.id}
                    className={cn(
                      "mb-2.5 rounded-[10px] border-[1.5px] p-2.5 transition-opacity",
                      isActive ? "border-indigo-300 bg-violet-50" : "border-slate-200 bg-slate-50",
                      !isActive && activeExclusiveGroup !== null && "opacity-45"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectionChange(group.id, isActive ? null : actualSelectionIdVal, true)}
                      className="mb-2 flex items-center gap-2"
                    >
                      <span
                        className={cn(
                          "flex h-4.5 w-4.5 items-center justify-center rounded-full border-2",
                          isActive ? "border-indigo-400" : "border-slate-300"
                        )}
                      >
                        {isActive && <span className="h-2 w-2 rounded-full bg-indigo-400" />}
                      </span>
                      <span className={cn("text-[13px] font-semibold", isActive ? "text-indigo-600" : "text-slate-500")}>
                        {group.label}
                      </span>
                    </button>

                    <div className="mb-2 flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-400">PREDICTED :</span>
                      <div className="flex flex-1 items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1.5">
                        <span className="flex-1 truncate text-xs font-medium text-indigo-600">
                          {predictedSelection?.description || "No selected"}
                        </span>
                        <span className="text-[11px] font-semibold text-indigo-400">{predictedSelection?.marks || 0} pts</span>
                      </div>
                    </div>

                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">ACTUAL :</span>
                      <ActualMarksIndicator
                        points={actualSelection?.marks || 0}
                        active={!!actualSelectionIdVal && (actualSelection?.marks || 0) !== 0}
                        showLabel={false}
                      />
                    </div>

                    <SelectionDropdown
                      group={group}
                      value={actualSelectionIdVal}
                      disabled={!isActive}
                      onChange={(id) => onSelectionChange(group.id, id, true)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Subitems */}
      {hasSubitems && (
        <div className="ml-3 mt-2 space-y-2">
          {subitems.map((subitem) => {
            const isSubitemChecked = predictedSubitemIds.includes(subitem.id);
            const subitemAuditKey = `${item.id}:${subitem.id}`;
            const actualSubitemChecked = !!actualAnswers.subitems[subitemAuditKey];

            return (
              <div
                key={subitem.id}
                className={cn(
                  "mb-2 rounded-xl border-2 px-4 py-3",
                  isSubitemChecked ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-white"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={cn("flex-1 text-sm leading-5 text-gray-700", isSubitemChecked && "font-semibold")}>
                    {subitem.description}
                  </p>
                  <div className="shrink-0 pt-0.5">
                    <ActualMarksIndicator points={actualSubitemChecked ? 1 : 0} active={actualSubitemChecked} />
                  </div>
                </div>
                <CheckboxComparisonRow
                  predictedChecked={isSubitemChecked}
                  actualChecked={actualSubitemChecked}
                  onToggle={() => onToggleSubitem(item.id, subitem.id)}
                />
              </div>
            );
          })}

          {/* Custom entries: predicted-provided, actual-only, and newly-added */}
          {(predictedCustomInputs.length > 0 || actualOnlyCustomInputs.length > 0 || customItems.length > 0) && (
            <div className="mt-2">
              <p className="mb-2 px-2 text-xs font-semibold text-gray-500">CUSTOM ENTRIES</p>

              {predictedCustomInputs.map((value, index) => {
                const auditKey = customEntryAuditKey(item.id, value, index);
                const checked = !!actualAnswers.customEntries[auditKey];
                return (
                  <div key={`predicted-custom-${index}`} className="mb-2 rounded-xl border-2 border-blue-300 bg-blue-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex-1 text-sm font-medium leading-5 text-gray-700">{value}</p>
                      <ActualMarksIndicator points={checked ? 1 : 0} active={checked} />
                    </div>
                    <CheckboxComparisonRow
                      predictedChecked
                      actualChecked={checked}
                      onToggle={() => onToggleCustomEntry(auditKey)}
                    />
                  </div>
                );
              })}

              {actualOnlyCustomInputs.map((value, index) => {
                const auditKey = customEntryAuditKey(item.id, value, index);
                const checked = !!actualAnswers.customEntries[auditKey];
                return (
                  <div key={`actual-custom-${index}`} className="mb-2 rounded-xl border-2 border-blue-300 bg-blue-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex-1 text-sm font-medium leading-5 text-gray-700">{value}</p>
                      <ActualMarksIndicator points={checked ? 1 : 0} active={checked} />
                    </div>
                    <CheckboxComparisonRow
                      predictedChecked={false}
                      actualChecked={checked}
                      onToggle={() => onToggleCustomEntry(auditKey)}
                    />
                  </div>
                );
              })}

              <AnimatePresence initial={false}>
                {customItems.map((customItem) => (
                  <motion.div
                    key={customItem.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-2 overflow-hidden rounded-xl border-2 border-purple-300 bg-purple-50 px-4 py-3"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <p className="flex-1 text-sm font-medium leading-5 text-gray-700">{customItem.description}</p>
                      <button
                        type="button"
                        onClick={() => onDeleteCustomItem(customItem.id)}
                        className="ml-2 text-red-600 hover:text-red-700"
                        aria-label="Delete custom item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Fixed row: predicted always unchecked, actual always checked, per RN source */}
                    <div className="mt-3 flex gap-2">
                      <div className="flex flex-1 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <X className="h-4 w-4 text-red-600" strokeWidth={2.5} />
                          <span className="text-[11px] font-semibold text-slate-500">PREDICTED</span>
                        </div>
                        <span className="text-xs font-semibold text-red-600">Unchecked</span>
                      </div>
                      <div className="flex flex-1 items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
                          <span className="text-[11px] font-semibold text-slate-500">ACTUAL</span>
                        </div>
                        <span className="text-xs font-semibold text-emerald-600">Checked</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Add custom item input */}
          <div className="flex gap-2">
            <input
              value={customInputValue || ""}
              onChange={(e) => onCustomInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAddCustomItem();
              }}
              placeholder="Add a custom entry..."
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            <button
              type="button"
              onClick={onAddCustomItem}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
