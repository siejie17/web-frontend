"use client";

/**
 * Refactor notes (ProFormaX visual alignment pass)
 * -------------------------------------------------
 * This pass restyles the project-history timeline to match the ProFormaX
 * dashboard's visual system (white surfaces, dark-green primary, warm
 * neutral borders, restrained shadows, compact information density) while
 * keeping the page's own purpose intact: it is still a chronological
 * timeline of assessed projects, not a dashboard. No state, handlers, data
 * shapes, filtering, or pagination logic were changed — only markup and
 * class names.
 *
 * What changed visually:
 * - Dropped the decorative blueprint grid, graph-paper texture, dashed
 *   rotated certification badges, and corner-tick ornaments — the dashboard
 *   reference doesn't carry decoration that isn't functional.
 * - Card radius stepped down from rounded-3xl to rounded-xl/rounded-2xl to
 *   match the dashboard's card system; shadows use the same restrained
 *   0_8px_24px_rgba(30,38,33,0.06) treatment used across ProFormaX surfaces.
 * - Certification/status is now shown the way the dashboard's "Recent
 *   assessments" table shows it: a small colored dot plus label
 *   ("Silver", "Certified", "Not certified"), instead of a decorative
 *   dashed medal chip.
 * - The predicted/actual score gauge keeps its circular SVG (still the
 *   clearest way to show one project's score at a glance) but is now
 *   paired with that same dot+label status instead of the rotated badge.
 * - Cost variance strip simplified from diamond/dot markers with glow to
 *   plain flat ticks on a thin track, matching the dashboard's minimal
 *   line-chart language.
 * - Timeline rail is now a single flat muted line instead of a gradient
 *   "vine", with a plain dot node — consistent with the dashboard's
 *   restraint around decoration.
 * - Buttons, chips, inputs, and pagination controls now use the dashboard's
 *   compact heights, moderate radius, and subtle (non-lift) hover states.
 *
 * Responsiveness, empty state, tabs, search, and pagination behavior are
 * unchanged from the previous version; only their visual treatment moved
 * to match ProFormaX.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Layers3,
  MapPin,
  Minus,
  Ruler,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { Project } from "@/lib/server/project-access"; // Adjust this import path
import { getHistoryProjectStage } from "@/lib/historyProjectStage";
import { BackButton } from "@/components/ui/BackButton";
import { useChatUnread } from "@/contexts/ChatUnreadContext";

const T = {
  ink: "#1E2621",
  forest: "#3E6B52",
  forestDeep: "#2A4B3A",
  cream: "#FBFAF7",
  hairline: "#E4E1D8",
  hairlineSoft: "#EFEDE6",
  muted: "#5B655F",
  mutedSoft: "#8A938C",
  chip: "#F6F6F2",
  lightGreen: "#EEF2EC",
  clay: "#B14A3D",
  amber: "#B5842A",
};

const CARD_SHADOW = "0 1px 2px rgba(29,38,32,0.04), 0 1px 1px rgba(29,38,32,0.03)";

/* ---------------- Helpers ---------------- */

const formatCurrency = (v: any) =>
  "RM " + Number(v || 0).toLocaleString("en-MY", { maximumFractionDigits: 0 });

const formatSize = (v: any) => `${Number(v || 0).toLocaleString()} m²`;

const formatDateTime = (v: any) =>
  new Date(v).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function ratingTone(rating: number) {
  if (rating >= 60)
    return { text: T.forest, fill: T.forest, dot: T.forest };
  if (rating >= 30)
    return { text: T.amber, fill: T.amber, dot: T.amber };
  return { text: T.clay, fill: T.clay, dot: T.clay };
}

function getCertificationName(
  certifiedScaleRange: Record<string, [number, number]>,
  actualRating: number,
): string {
  return (
    Object.entries(certifiedScaleRange).find(
      ([_, [min, max]]) => actualRating >= min && actualRating <= max,
    )?.[0] ?? "Unknown"
  );
}

type Tier = "all" | "strong" | "moderate" | "weak";

/** Matches multiple search tokens against all key textual fields in a project */
function matchesQuery(project: Project, query: string) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const searchableText = [
    project.name,
    project.category,
    project.location,
    project.year,
    project.type_name,
    project.classification,
    project.target_certification,
    project.certificate?.certification_level,
    project.certificate?.certificate_number,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return tokens.every((token) => searchableText.includes(token));
}

/** Builds a compact page-number list with ellipses, e.g. [1, "…", 4, 5, 6, "…", 20] */
function paginationRange(current: number, total: number): (number | "…")[] {
  const delta = 1;
  const range: (number | "…")[] = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  range.push(1);
  if (left > 2) range.push("…");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push("…");
  if (total > 1) range.push(total);

  return range;
}

/** Groups an already-ordered list into consecutive runs sharing the same year */
function groupByYear(items: Project[]) {
  const groups: { year: string; items: Project[] }[] = [];
  for (const project of items) {
    const year = project.year || "Undated";
    const last = groups[groups.length - 1];
    if (last && last.year === year) {
      last.items.push(project);
    } else {
      groups.push({ year, items: [project] });
    }
  }
  return groups;
}

const PER_PAGE = 5;

type Tab = "owned" | "shared";

interface ClientProps {
  initialProjects: Project[];
  initialSharedProjects?: Project[];
}

export default function ProjectHistoryClient({
  initialProjects,
  initialSharedProjects = [],
}: ClientProps) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("owned");
  const [projects] = useState<Project[]>(initialProjects);
  const [sharedProjects] = useState<Project[]>(initialSharedProjects);
  const { unreadByProject, refreshProjects } = useChatUnread();

  const activeProjects = tab === "owned" ? projects : sharedProjects;

  const searchFiltered = useMemo(
    () => activeProjects.filter((project) => matchesQuery(project, query)),
    [query, activeProjects],
  );

  const filteredProjects = useMemo(
    () => searchFiltered.filter((project) => project),
    [searchFiltered],
  );

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * PER_PAGE;
    return filteredProjects.slice(start, start + PER_PAGE);
  }, [filteredProjects, safePage]);

  const groups = useMemo(() => groupByYear(paged), [paged]);

  const hasFilters = Boolean(query);

  const goTo = (p: number) => setPage(Math.min(Math.max(p, 1), totalPages));

  const handleSearchChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const clearFilters = () => {
    setQuery("");
    setPage(1);
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setQuery("");
    setPage(1);
  };

  // Compute unread counts for all visible projects when the tab changes.
  useEffect(() => {
    const ids = activeProjects.map((p) => p.id).filter(Boolean);
    if (ids.length > 0) refreshProjects(ids);
  }, [activeProjects, refreshProjects]);

  return (
    <div className="mx-auto px-4 pb-10 pt-6 sm:px-6 md:px-10">
      {/* ---------------- Intro ---------------- */}
      <section
        className="relative mb-6 flex flex-col gap-4 rounded-2xl border bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        style={{ borderColor: T.hairline, boxShadow: CARD_SHADOW }}
      >
        <div>
          <h1
            className="text-[22px] font-bold leading-tight tracking-[-0.01em] sm:text-[26px]"
            style={{ fontFamily: "var(--font-display)", color: T.ink }}
          >
            Your assessments
          </h1>
          <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed sm:text-[13.5px]" style={{ color: T.muted }}>
            Every project you have assessed, in order, in one place.
          </p>
        </div>

        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ background: T.lightGreen }}
          aria-hidden="true"
        >
          <Layers3 size={20} style={{ color: T.forestDeep }} strokeWidth={1.75} />
        </div>
      </section>

      {/* ---------------- Tab switcher ---------------- */}
      <div
        role="tablist"
        aria-label="Project history views"
        className="mb-4 flex w-full flex-col divide-y divide-[#E4E1D8] rounded-xl border bg-white p-1 sm:flex-row sm:divide-y-0"
        style={{ borderColor: T.hairline }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "owned"}
          aria-controls="owned-projects"
          id="tab-owned"
          onClick={() => switchTab("owned")}
          className="flex min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md px-3.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-offset-2 sm:px-4 sm:py-1.5"
          style={
            tab === "owned"
              ? { background: T.forest, color: "#fff" }
              : { color: T.muted }
          }
        >
          My Projects
          <span className="ml-1.5 text-[11px] opacity-70">
            ({projects.length})
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === "shared"}
          aria-controls="shared-projects"
          id="tab-shared"
          onClick={() => switchTab("shared")}
          className="flex min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md px-3.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-offset-2 sm:px-4 sm:py-1.5"
          style={
            tab === "shared"
              ? { background: T.forest, color: "#fff" }
              : { color: T.muted }
          }
        >
          Shared
          <span className="ml-1.5 text-[11px] opacity-70">
            ({sharedProjects.length})
          </span>
        </button>
      </div>

      {/* ---------------- Search ---------------- */}
      <div className="mb-5 relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
          style={{ color: T.mutedSoft }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by project name..."
          aria-label="Search projects"
          className="w-full rounded-xl border bg-white py-2.5 pl-10 pr-10 text-[13.5px] transition-colors focus:outline-none focus:ring-2 sm:text-[14px]"
          style={{
            borderColor: T.hairline,
            color: T.ink,
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = T.forest)}
          onBlur={(e) => (e.currentTarget.style.borderColor = T.hairline)}
        />
        {query && (
          <button
            type="button"
            onClick={() => handleSearchChange("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-[#F6F6F2]"
            style={{ color: T.mutedSoft }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ---------------- Timeline ---------------- */}
      <AnimatePresence mode="wait">
        {filteredProjects.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <EmptyState
              tab={tab}
              hasFilters={hasFilters}
              onClear={clearFilters}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`${query}-${safePage}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {groups.map((group, gi) => (
              <div key={`${group.year}-${gi}`} className="mb-8 last:mb-0">
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className="shrink-0 rounded-md px-2.5 py-1 text-[12px] font-semibold"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: T.lightGreen,
                      color: T.forestDeep,
                    }}
                  >
                    {group.year}
                  </span>
                  <span className="h-px flex-1" style={{ background: T.hairline }} />
                  <span className="shrink-0 text-[11px]" style={{ color: T.mutedSoft }}>
                    {group.items.length} project
                    {group.items.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="relative space-y-3 pl-4 sm:pl-5">
                  {/* Flat timeline rail */}
                  <div
                    className="absolute left-0 top-2 bottom-2 w-px"
                    style={{ background: T.hairline }}
                  />

                  {group.items.map((project, pi) => (
                    <motion.div
                      key={project.id}
                      className="group relative"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: pi * 0.04 }}
                    >
                      <span
                        className="absolute -left-[19px] top-7 h-2 w-2 rounded-full border-2 sm:-left-[23px]"
                        style={{ borderColor: T.cream, background: T.forest }}
                      />
                      <ProjectCard
                        project={project}
                        unread={unreadByProject[project.id] ?? 0}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- Pagination ---------------- */}
      {filteredProjects.length > 0 && (
        <Pagination page={safePage} totalPages={totalPages} onChange={goTo} />
      )}
    </div>
  );
}

/* ---------------- Empty state ---------------- */
function EmptyState({
  tab,
  hasFilters,
  onClear,
}: {
  tab: Tab;
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-white px-5 py-12 text-center sm:px-6 sm:py-16"
      style={{ borderColor: T.hairline }}
    >
      <div
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-full"
        style={{ background: T.chip, color: T.mutedSoft }}
      >
        <Search size={18} />
      </div>
      <h3
        className="text-[15px] font-semibold sm:text-[16px]"
        style={{ fontFamily: "var(--font-display)", color: T.ink }}
      >
        {tab === "shared" ? "No shared projects" : "No projects found"}
      </h3>
      <p className="mt-1.5 max-w-sm text-[13px] sm:text-[13.5px]" style={{ color: T.muted }}>
        {hasFilters
          ? "Nothing matches that search. Try a different name, location, or year."
          : tab === "shared"
            ? "Projects shared with you through the project chat will appear here once another user adds you to their project."
            : "Assessed projects will show up here once you run your first assessment."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-md border bg-white px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[#F6F6F2]"
          style={{ borderColor: T.hairline, color: T.forest }}
        >
          Clear search
        </button>
      )}
    </div>
  );
}

/* ---------------- Cost variance strip ---------------- */
function CostVarianceStrip({
  budget,
  adjustedCost,
}: {
  budget?: string;
  adjustedCost?: string;
}) {
  const b = Number(budget) || 0;
  const a = Number(adjustedCost) || 0;
  if (!b && !a) return null;

  const diffPct = b > 0 ? ((a - b) / b) * 100 : 0;
  const status = diffPct <= -3 ? "under" : diffPct >= 3 ? "over" : "onbudget";

  const statusMeta = {
    under: {
      color: T.forest,
      bg: T.lightGreen,
      icon: TrendingDown,
      label: "under budget",
    },
    over: {
      color: T.clay,
      bg: "#FBEDEB",
      icon: TrendingUp,
      label: "over budget",
    },
    onbudget: {
      color: T.amber,
      bg: "#FBF3E7",
      icon: Minus,
      label: "on budget",
    },
  }[status];

  const trackMax = Math.max(b, a, 1) * 1.18;
  const clamp = (n: number) => Math.min(96, Math.max(4, n));
  const budgetPos = clamp((b / trackMax) * 100);
  const predPos = clamp((a / trackMax) * 100);
  const Icon = statusMeta.icon;

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.04em]"
          style={{ fontFamily: "var(--font-mono)", color: T.mutedSoft }}
        >
          Estimate vs. predicted
        </span>
        <span
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold"
          style={{ background: statusMeta.bg, color: statusMeta.color }}
        >
          <Icon size={11} strokeWidth={2.5} />
          {b > 0 ? `${diffPct > 0 ? "+" : ""}${diffPct.toFixed(1)}%` : "—"}
        </span>
      </div>

      <div className="relative h-4">
        {/* base track */}
        <div
          className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full"
          style={{ background: T.hairlineSoft }}
        />
        {/* connecting fill between the two markers */}
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full transition-all duration-500"
          style={{
            left: `${Math.min(budgetPos, predPos)}%`,
            width: `${Math.abs(predPos - budgetPos)}%`,
            background: statusMeta.color,
            opacity: 0.5,
          }}
        />
        {/* budget marker */}
        <div
          className="absolute top-1/2 h-2.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${budgetPos}%`, background: T.ink }}
          title={`Budgeted ${formatCurrency(b)}`}
        />
        {/* predicted marker */}
        <div
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white transition-all duration-500"
          style={{ left: `${predPos}%`, background: statusMeta.color }}
          title={`Predicted ${formatCurrency(a)}`}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11px] sm:text-[11.5px]">
        <span className="flex items-center gap-1" style={{ color: T.muted }}>
          <span className="inline-block h-1.5 w-1.5 rounded-sm" style={{ background: T.ink }} />
          Budgeted&nbsp;
          <span className="font-semibold" style={{ color: T.ink }}>
            {formatCurrency(b)}
          </span>
        </span>
        <span className="flex items-center gap-1" style={{ color: T.muted }}>
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: statusMeta.color }}
          />
          Predicted&nbsp;
          <span className="font-semibold" style={{ color: statusMeta.color }}>
            {formatCurrency(a)}
          </span>
        </span>
      </div>
    </div>
  );
}

/* ---------------- Certification status colours ---------------- */

function certBadgeStyle(cert: string | null | undefined) {
  switch (cert) {
    case "Platinum":
      return { dot: T.forestDeep, text: T.forestDeep, bg: T.lightGreen };
    case "Gold":
      return { dot: "#B5842A", text: "#7A5A20", bg: "#FBF3E7" };
    case "Silver":
      return { dot: T.mutedSoft, text: T.muted, bg: T.chip };
    case "Certified":
      return { dot: "#B5842A", text: "#7A5A20", bg: "#FBF3E7" };
    default:
      return { dot: T.clay, text: "#8C3D33", bg: "#FBEDEB" };
  }
}

/** Small dot + label status chip, matching the dashboard's assessment table */
function CertStatus({
  certification,
}: {
  certification: string | null | undefined;
}) {
  const style = certBadgeStyle(certification);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold"
      style={{ background: style.bg, color: style.text }}
    >
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: style.dot }}
      />
      {certification ?? "Not certified"}
    </span>
  );
}

/* ---------------- Score gauge (circular) ---------------- */
function ScoreGauge({
  rating,
  label,
  certification,
}: {
  rating: number;
  label: string;
  certification?: string;
}) {
  const tone = ratingTone(rating);
  const pct = Math.max(0, Math.min(100, rating));
  const r = 19;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div
      className="flex items-center gap-2.5 rounded-xl border px-3 py-2"
      style={{ borderColor: T.hairline, background: "#fff" }}
    >
      <svg width="46" height="46" viewBox="0 0 46 46" className="shrink-0 -rotate-90">
        <circle cx="23" cy="23" r={r} fill="none" stroke={T.hairlineSoft} strokeWidth="4" />
        <circle
          cx="23"
          cy="23"
          r={r}
          fill="none"
          stroke={tone.fill}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
        <text
          x="23"
          y="23"
          textAnchor="middle"
          dominantBaseline="central"
          transform="rotate(90 23 23)"
          fontSize="13"
          fontWeight="700"
          fill={T.ink}
          fontFamily="var(--font-mono)"
        >
          {rating}
        </text>
      </svg>
      <div className="flex flex-col gap-1 leading-tight">
        <span
          className="text-[9.5px] font-semibold uppercase tracking-[0.05em]"
          style={{ fontFamily: "var(--font-mono)", color: T.mutedSoft }}
        >
          {label}
        </span>
        <CertStatus certification={certification} />
      </div>
    </div>
  );
}

interface Certificate {
  status: "issued" | "pending" | string;
  certification_level: string;
  approved_actual_score: number;
  maximum_score: number;
}

interface Project {
  id: string | number;
  type_name: string;
  classification?: string;
  name: string;
  category: string;
  structure: string;
  location: string;
  size?: number | string;
  year: number | string;
  budget?: number;
  adjusted_cost?: number;
  rating?: number;
  actual_rating?: number;
  target_certification?: string;
  certificate?: Certificate;
  changed_cert?: number;
  created_at: string;
}

interface ProjectCardProps {
  project: Project;
  unread?: number;
  onOpen?: () => void;
}

interface CostBarProps {
  budget?: number;
  actual?: number;
}

interface ScoreCompareProps {
  predicted: number;
  actual?: number;
  certification?: string;
}

const formatMoney = (n: number) =>
  `RM ${Math.round(n).toLocaleString("en-MY")}`;

function CostBar({ budget, actual }: CostBarProps) {
  if (!budget || actual == null) return null;
  const pct = ((actual - budget) / budget) * 100;
  const over = pct > 0;
  const fill = Math.min(Math.max((actual / budget) * 100, 4), 130);

  return (
    <div className="flex-1 min-w-[140px]">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: T.mutedSoft }}>
          Cost
        </span>
        <span
          className="flex items-center gap-0.5 text-[11.5px] font-bold"
          style={{ color: over ? T.clay : T.forest }}
        >
          {over ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(pct).toFixed(1)}%
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full" style={{ background: T.hairlineSoft }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${Math.min(fill, 100)}%`, background: over ? T.clay : T.forest }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px]" style={{ color: T.muted }}>
        <span>{formatMoney(budget)} budget</span>
        <span className="font-medium" style={{ color: T.ink }}>
          {formatMoney(actual)}
        </span>
      </div>
    </div>
  );
}

function ScoreCompare({ predicted, actual, certification }: ScoreCompareProps) {
  const hasActual = actual != null;
  return (
    <div className="flex-1 min-w-[140px]">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: T.mutedSoft }}>
          {certification || "Score"}
        </span>
        {hasActual && (
          <span className="text-[11px]" style={{ color: T.muted }}>
            predicted → actual
          </span>
        )}
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex items-baseline gap-1">
          <span
            className="text-[19px] font-bold leading-none"
            style={{ fontFamily: "var(--font-display)", color: hasActual ? T.mutedSoft : T.ink }}
          >
            {predicted ?? "—"}
          </span>
          {hasActual && (
            <>
              <span style={{ color: T.mutedSoft }}>→</span>
              <span
                className="text-[19px] font-bold leading-none"
                style={{ fontFamily: "var(--font-display)", color: T.forest }}
              >
                {actual}
              </span>
            </>
          )}
        </div>
        <div className="flex h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: T.hairlineSoft }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min((((hasActual ? actual : predicted) as number) / 110) * 100, 100)}%`,
              background: hasActual ? T.forest : T.mutedSoft,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Project card ---------------- */
function ProjectCard({ project, unread = 0, onOpen }: ProjectCardProps) {
  const isCertified = project.certificate?.status === "issued";
  const hasTarget = project.target_certification != "Not Certified" || (project.target_certification == "Not Certified" && project.changed_cert == 1);

  const stage = getHistoryProjectStage(project.certificate);
  const isCertified = stage === "Certified";

  return (
    <a
      href={`/projects/${project.id}`}
      onClick={onOpen}
      className="group block overflow-hidden rounded-2xl border bg-white transition-colors focus-visible:outline focus-visible:outline-offset-2"
      style={{ borderColor: T.hairline, boxShadow: CARD_SHADOW, outlineColor: T.forest }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#C9D3CC")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.hairline)}
    >
      <div className="p-5 sm:p-6">
        {/* Top: identity + unread, no floating badge */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className="rounded-md px-2 py-0.5 text-[10.5px] font-medium"
                style={{ background: T.chip, color: T.mutedSoft }}
              >
                {project.type_name}
              </span>
              {project.classification && (
                <span
                  className="rounded-md px-2 py-0.5 text-[10.5px] font-medium"
                  style={{ background: T.chip, color: T.mutedSoft }}
                >
                  {project.classification}
                </span>
              )}
            </div>
            <h3
              className="truncate text-[17px] font-bold leading-tight tracking-[-0.01em]"
              style={{ fontFamily: "var(--font-display)", color: T.ink }}
            >
              {project.name}
            </h3>
            <p className="mt-0.5 truncate text-[12.5px]" style={{ color: T.muted }}>
              {project.category} · {project.structure}
            </p>
          </div>

          {unread > 0 && (
            <span
              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold text-white"
              style={{ background: T.clay }}
              title={`${unread} new message${unread === 1 ? "" : "s"}`}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>

        {/* Meta: one line, includes created date so there's no separate footer bar */}
        <div className="mb-4 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12px]" style={{ color: T.muted }}>
          <span className="flex items-center gap-1">
            <MapPin size={12} style={{ color: T.mutedSoft }} />
            {project.location}
          </span>
          <span className="flex items-center gap-1">
            <Ruler size={12} style={{ color: T.mutedSoft }} />
            {formatSize(project.size ?? "0")}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={12} style={{ color: T.mutedSoft }} />
            {project.year}
          </span>
        </div>

        {/* Hero content: cost + score, side by side, one responsive path */}
        <div
          className="flex flex-wrap gap-x-6 gap-y-4 rounded-xl border p-4"
          style={{ borderColor: T.hairlineSoft, background: T.cream }}
        >
          <CostBar budget={project.budget} actual={project.adjusted_cost} />
          {hasTarget ? (
            <ScoreCompare
              predicted={project.rating ?? 0}
              actual={project.actual_rating}
              certification={project.target_certification}
            />
          ) : (
            <div className="flex flex-1 min-w-[140px] items-center gap-1.5 text-[12.5px]" style={{ color: T.mutedSoft }}>
              Not pursuing certification
            </div>
          )}
        </div>

        {/* Certificate: compact ribbon, only when actually issued */}
        {isCertified && project.certificate && (
          <div
            className="mt-3 flex items-center gap-2 rounded-lg border px-3 py-1.5"
            style={{ borderColor: "#B9CBBF", background: T.lightGreen, color: T.forestDeep }}
          >
            <Award size={14} />
            <span className="text-[12px] font-semibold">
              {project.certificate.certification_level} certified
            </span>
            <span className="text-[11px]" style={{ color: T.muted }}>
              · {project.certificate.approved_actual_score}/{project.certificate.maximum_score} pts
            </span>
          </div>
        )}
      </div>
    </a>
  );
}

/* ---------------- Pagination ---------------- */
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = paginationRange(page, totalPages);

  return (
    <div
      className="mt-6 flex flex-col items-center justify-between gap-4 border-t pt-5 sm:mt-7 sm:flex-row sm:pt-6"
      style={{ borderColor: T.hairlineSoft }}
    >
      <p className="hidden text-[12.5px] sm:block" style={{ color: T.mutedSoft }}>
        Page {page} of {totalPages}
      </p>

      {/* Compact control: mobile only (no risk of overflow at any page count) */}
      <div className="flex w-full items-center justify-between gap-3 sm:hidden">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-white transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline focus-visible:outline-offset-2"
          style={{ borderColor: T.hairline, color: T.muted }}
        >
          <ChevronLeft size={16} />
        </button>

        <p className="text-[12.5px]" style={{ color: T.mutedSoft }}>
          Page {page} of {totalPages}
        </p>

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-white transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline focus-visible:outline-offset-2"
          style={{ borderColor: T.hairline, color: T.muted }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Full windowed control: sm and up */}
      <div className="hidden items-center gap-1.5 sm:flex">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white transition-colors hover:bg-[#F6F6F2] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline focus-visible:outline-offset-2"
          style={{ borderColor: T.hairline, color: T.muted }}
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="flex h-9 w-9 items-center justify-center text-[13px]"
              style={{ color: T.mutedSoft }}
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-offset-2"
              style={
                p === page
                  ? { background: T.forest, color: "#fff" }
                  : { border: `1px solid ${T.hairline}`, background: "#fff", color: T.muted }
              }
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white transition-colors hover:bg-[#F6F6F2] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline focus-visible:outline-offset-2"
          style={{ borderColor: T.hairline, color: T.muted }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
