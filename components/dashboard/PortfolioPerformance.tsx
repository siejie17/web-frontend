"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { CostTrend } from "@/types/analytics";
import { formatCurrencyMYR, formatMonthLabel } from "@/lib/analytics";

function CompactCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1000)}K`;
  return `${value}`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const budgeted = payload.find((p) => p.dataKey === "budgeted_cost")?.value ?? 0;
  const projected = payload.find((p) => p.dataKey === "projected_actual_cost")?.value ?? 0;

  return (
    <div className="rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 shadow-[0_8px_20px_rgba(30,38,33,0.1)]">
      <div className="mb-1.5 text-[12px] font-semibold text-[#1E2621]">{label}</div>
      <div className="flex items-center gap-1.5 text-[12px] text-[#5B655F]">
        <span className="h-2 w-2 rounded-full bg-[#1E453A]" />
        Predicted: {formatCurrencyMYR(budgeted)}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#5B655F]">
        <span className="h-2 w-2 rounded-full bg-[#8FBE9F]" />
        Projected: {formatCurrencyMYR(projected)}
      </div>
    </div>
  );
}

function PortfolioPerformanceSkeleton() {
  return (
    <div className="rounded-xl2 border border-[#E4E1D8] bg-white p-4 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-6">
      <span className="block h-4 w-40 animate-pulse rounded-full bg-[#E7E4DA]" />
      <span className="mt-2 block h-3 w-56 animate-pulse rounded-full bg-[#EDEBE2]" />
      <div className="mt-6 h-64 w-full animate-pulse rounded-xl bg-[#F1EFE7] sm:h-80" />
    </div>
  );
}

function TypeFilterDropdown({
  types,
  type,
  onTypeChange,
}: {
  types: string[];
  type?: string | null;
  onTypeChange: (type: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const options = ["", ...types];
  const selectedIndex = Math.max(options.indexOf(type ?? ""), 0);
  const label = type || "All types";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      onTypeChange(options[activeIndex] || null);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="group relative flex items-center gap-2 rounded-full border border-[#E4E1D8] bg-[#FAF9F5] py-1.5 pl-3 pr-2.5 shadow-[0_2px_6px_rgba(30,38,33,0.04)] transition-colors hover:border-[#C9D6CC] data-[open=true]:border-[#3E6B52] data-[open=true]:bg-white"
      data-open={open}
    >
      <SlidersHorizontal size={13} className="shrink-0 text-[#8FA093]" />
      <span className="text-[11.5px] font-medium text-[#6D796F]">Filter</span>
      <span className="h-3.5 w-px bg-[#E4E1D8]" />

      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className="flex w-60 cursor-pointer items-center justify-between gap-1.5 rounded-full bg-transparent py-0.5 pl-1 text-[12.5px] font-semibold text-[#1E2621] outline-none"
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-[#8FA093] transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className="absolute right-0 top-[calc(100%+6px)] z-20 max-h-80 w-80 overflow-auto rounded-xl border border-[#E4E1D8] bg-white p-1 shadow-[0_12px_28px_rgba(30,38,33,0.14)]"
        >
          {options.map((opt, i) => {
            const isSelected = i === selectedIndex;
            const isActive = i === activeIndex;
            return (
              <li key={opt || "__all__"} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => {
                    onTypeChange(opt || null);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors ${
                    isActive ? "bg-[#F1F7EC]" : "bg-transparent"
                  } ${isSelected ? "font-semibold text-[#1E453A]" : "font-medium text-[#3A423C]"}`}
                >
                  <span>{opt || "All types"}</span>
                  {isSelected && <Check size={13} className="shrink-0 text-[#1E453A]" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function PortfolioPerformance({
  costTrend,
  loading,
  types,
  type,
  onTypeChange,
}: {
  costTrend: CostTrend[];
  loading?: boolean;
  /** Distinct project types observed in the current data, for the filter dropdown. */
  types?: string[];
  type?: string | null;
  onTypeChange?: (type: string | null) => void;
}) {
  if (loading) return <PortfolioPerformanceSkeleton />;

  const data = costTrend.map((point) => ({
    ...point,
    monthLabel: formatMonthLabel(point.month),
  }));

  const hasData = data.length > 0;

  return (
    <div className="rounded-xl2 border border-[#E4E1D8] bg-white p-4 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-6">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-semibold text-[#1E2621] sm:text-[16px]">
            Portfolio performance
          </div>
          <p className="text-[12.5px] text-[#8A938C] sm:text-[13px]">
            Cumulative predicted vs. projected cost (RM)
          </p>
        </div>

        {types && types.length > 0 && onTypeChange && (
          <TypeFilterDropdown types={types} type={type} onTypeChange={onTypeChange} />
        )}
      </div>
      <div className="mb-5" />

      {!hasData ? (
        <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-[#E4E1D8] text-[13px] text-[#8A938C] sm:h-72">
          Not enough data to show a trend yet.
        </div>
      ) : (
        <div className="h-48 w-full sm:h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="budgetedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E453A" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#1E453A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="projectedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8FBE9F" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#8FBE9F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#EDEBE2" />
              <XAxis
                dataKey="monthLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#8A938C", fontSize: 12 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#8A938C", fontSize: 12 }}
                tickFormatter={CompactCurrency}
                width={44}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="budgeted_cost"
                name="Predicted cost"
                stroke="#1E453A"
                strokeWidth={2}
                fill="url(#budgetedFill)"
                dot={{ r: 3, fill: "#1E453A", strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
              <Area
                type="monotone"
                dataKey="projected_actual_cost"
                name="Projected actual cost"
                stroke="#8FBE9F"
                strokeWidth={2}
                fill="url(#projectedFill)"
                dot={{ r: 3, fill: "#8FBE9F", strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-[#5B655F]">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-[#1E453A]" />
          Predicted cost
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-[#8FBE9F]" />
          Projected actual cost
        </span>
      </div>
    </div>
  );
}
