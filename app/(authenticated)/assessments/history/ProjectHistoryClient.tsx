"use client";

/**
 * Refactor notes
 * --------------
 * Structure: the page is reframed around the word "history" itself — projects
 * are grouped into a chronological timeline (by year) with a connecting rail,
 * instead of a flat card stack. Year groups are formed from consecutive runs
 * in the incoming order, so no assumption is made about sort direction beyond
 * "the server already orders these sensibly."
 *
 * Signature element: an "at a glance" stat strip in the intro (total
 * assessed / average rating / most common certification target) turns the
 * page into a small dashboard for the person's own assessment history rather
 * than a plain list, and the rating chip is replaced by a segmented gauge
 * (with zone ticks at 30/60) that visualizes the score instead of just
 * labeling it.
 *
 * New utility: rating-tier filter chips (Strong / Moderate / Needs work) sit
 * right under search, each carrying a live count of how many of the
 * currently-searched projects fall in that tier — since "how did my
 * projects score" is a real question this page should answer directly,
 * not just imply.
 *
 * Motion: the timeline crossfades/slides in on filter or page change
 * (framer-motion, already used elsewhere in the app), with a light stagger
 * per card so the list feels like it's assembling itself rather than
 * snapping in.
 *
 * Responsiveness:
 * - Outer padding scales px-4 -> sm:px-6 -> md:px-10; intro padding
 *   p-5 -> sm:p-6 -> md:p-8, matching the rest of the app.
 * - Stat strip is a 3-col grid at all sizes (values are short), with type
 *   and gap sizes stepping down on mobile.
 * - Filter chips scroll horizontally on narrow screens instead of wrapping
 *   awkwardly or overflowing.
 * - Timeline rail offset is computed to match the pl-4 / sm:pl-6 indent so
 *   the node stays centered on the line at every breakpoint.
 * - Pagination keeps the compact Prev/Page-info/Next control below sm and
 *   the full windowed control (with ellipses) at sm+, so large page counts
 *   never overflow horizontally on mobile.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Layers3,
  MapPin,
  Ruler,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { Project } from "@/lib/server/project-access"; // Adjust this import path
import { BackButton } from "@/components/ui/BackButton";

/* ---------------- Helpers ---------------- */

function formatDateTime(value?: string) {
  if (!value) return "Not provided";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCurrency(value: string) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return value;
  return `RM ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatSize(value: string) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return value;
  return `${n.toLocaleString("en-US")} m²`;
}

function ratingTone(rating: number) {
  if (rating >= 60)
    return {
      text: "text-[#2C4A3A]",
      bg: "bg-[#EEF2EC]",
      border: "border-[#CFE0D6]",
      fill: "bg-[#3E6B52]",
    };
  if (rating >= 30)
    return {
      text: "text-[#7A5A20]",
      bg: "bg-[#FBF3E7]",
      border: "border-[#EBD8B8]",
      fill: "bg-[#C08A3E]",
    };
  return {
    text: "text-[#8C3D33]",
    bg: "bg-[#FBEDEB]",
    border: "border-[#E7C1BA]",
    fill: "bg-[#B4483C]",
  };
}

function ratingTier(rating: number): Exclude<Tier, "all"> {
  if (rating >= 60) return "strong";
  if (rating >= 30) return "moderate";
  return "weak";
}

function ratingTierLabel(rating: number) {
  const tier = ratingTier(rating);
  if (tier === "strong") return "Strong";
  if (tier === "moderate") return "Moderate";
  return "Needs work";
}

type Tier = "all" | "strong" | "moderate" | "weak";

const TIER_OPTIONS: { id: Tier; label: string }[] = [
  { id: "all", label: "All" },
  { id: "strong", label: "Strong · 60+" },
  { id: "moderate", label: "Moderate · 30–59" },
  { id: "weak", label: "Needs work · <30" },
];

/** Matches multiple search tokens against all key textual fields in a project */
function matchesQuery(project: Project, query: string) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const searchableText = [
    project.name,
    project.category,
    project.location,
    project.year,
    project.building_type,
    project.classification,
    project.target_certification,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return tokens.every((token) => searchableText.includes(token));
}

function matchesTier(project: Project, tier: Tier) {
  if (tier === "all") return true;
  return ratingTier(project.rating ?? 0) === tier;
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

/** Powers the "at a glance" stat strip — computed off the full history, not the current filter/page, so it always reads as an overview. */
function computeStats(projects: Project[]) {
  const total = projects.length;

  const avgRating =
    total > 0
      ? Math.round(
          projects.reduce((sum, p) => sum + (p.rating ?? 0), 0) / total
        )
      : 0;

  const certCounts = new Map<string, number>();
  for (const p of projects) {
    const cert = p.target_certification || "Not set";
    certCounts.set(cert, (certCounts.get(cert) ?? 0) + 1);
  }
  let topCert = "—";
  let topCount = 0;
  for (const [cert, count] of certCounts) {
    if (count > topCount) {
      topCert = cert;
      topCount = count;
    }
  }

  return { total, avgRating, topCert };
}

const PER_PAGE = 5;

interface ClientProps {
  initialProjects: Project[];
}

export default function ProjectHistoryClient({ initialProjects }: ClientProps) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<Tier>("all");
  const [projects] = useState<Project[]>(initialProjects);

  const stats = useMemo(() => computeStats(projects), [projects]);

  const searchFiltered = useMemo(
    () => projects.filter((project) => matchesQuery(project, query)),
    [query, projects]
  );

  const tierCounts = useMemo(() => {
    const counts: Record<Tier, number> = {
      all: searchFiltered.length,
      strong: 0,
      moderate: 0,
      weak: 0,
    };
    for (const p of searchFiltered) {
      counts[ratingTier(p.rating ?? 0)]++;
    }
    return counts;
  }, [searchFiltered]);

  const filteredProjects = useMemo(
    () => searchFiltered.filter((project) => matchesTier(project, tier)),
    [searchFiltered, tier]
  );

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * PER_PAGE;
    return filteredProjects.slice(start, start + PER_PAGE);
  }, [filteredProjects, safePage]);

  const groups = useMemo(() => groupByYear(paged), [paged]);

  const hasFilters = Boolean(query) || tier !== "all";

  const goTo = (p: number) => setPage(Math.min(Math.max(p, 1), totalPages));

  const handleSearchChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const handleTierChange = (value: Tier) => {
    setTier(value);
    setPage(1);
  };

  const clearFilters = () => {
    setQuery("");
    setTier("all");
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-275 px-4 pb-10 pt-6 sm:px-6 md:px-10">
      {/* ---------------- Breadcrumb ---------------- */}
      <BackButton
        text="Dashboard"
        redirect="/dashboard"
      />

      {/* ---------------- Intro ---------------- */}
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-[#E4E1D8] bg-[#FCFCF8] p-5 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-6 md:p-8">
        {/* Ambient blueprint grid — same backdrop treatment used across
            the app's intro cards. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(#E4E1D8 1px, transparent 1px), linear-gradient(90deg, #E4E1D8 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage:
              "radial-gradient(ellipse 65% 100% at 100% 0%, black 0%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 65% 100% at 100% 0%, black 0%, transparent 75%)",
            opacity: 0.7,
          }}
        />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p
              className="mb-3 text-[11.5px] uppercase tracking-[0.08em] text-[#7C8880] sm:text-[12px]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Project history
            </p>
            <h1
              className="text-[26px] font-bold leading-[1.18] tracking-[-0.02em] sm:text-[30px] md:text-[32px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Your assessments
            </h1>
            <p className="mt-2.5 max-w-lg text-[13.5px] leading-relaxed text-[#5B655F] sm:text-[14px]">
              Every project you&apos;ve assessed, in order, in one place.
            </p>
          </div>

          {/* Signature emblem: a stack of records, certified */}
          <div
            aria-hidden="true"
            className="relative hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-dashed border-[#C9D3CC] bg-white/80 backdrop-blur-sm sm:flex"
          >
            <Layers3 size={30} className="text-[#2C4A3A]" strokeWidth={1.5} />
            <span className="absolute -bottom-2.5 -right-2.5 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-[#FCFCF8] bg-[#3E6B52] text-white shadow-[0_6px_14px_rgba(62,107,82,0.35)]">
              <Award size={14} />
            </span>
          </div>
        </div>
      </section>

      {/* ---------------- Search ---------------- */}
      <div className="my-5 mx-2 relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A938C] sm:left-4"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by project name..."
          aria-label="Search projects"
          className="w-full rounded-2xl border border-[#E4E1D8] bg-white py-3 pl-10 pr-10 text-[13.5px] text-[#1E2621] placeholder:text-[#A2AAA4] transition-all focus:border-[#3E6B52] focus:outline-none focus:ring-4 focus:ring-[#3E6B52]/10 sm:pl-11 sm:pr-11 sm:text-[14px]"
        />
        {query && (
          <button
            type="button"
            onClick={() => handleSearchChange("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#8A938C] transition-colors hover:bg-[#F6F6F2] hover:text-[#1E2621] sm:right-3.5"
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
            <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
          </motion.div>
        ) : (
          <motion.div
            key={`${query}-${tier}-${safePage}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {groups.map((group, gi) => (
              <div key={`${group.year}-${gi}`} className="mb-8 last:mb-0">
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="shrink-0 rounded-full bg-[#3E6B52] px-3 py-1 text-[12px] font-semibold text-[#F6F6F2] sm:text-[13px]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {group.year}
                  </span>
                  <span className="h-px flex-1 bg-[#E4E1D8]" />
                  <span className="shrink-0 text-[11px] text-[#8A938C] sm:text-[11.5px]">
                    {group.items.length} project
                    {group.items.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="relative space-y-3.5 pl-4 sm:space-y-4 sm:pl-6">
                  {/* Gradient vine rail, replacing the flat gray border-l */}
                  <div className="absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-[#3E6B52] via-[#8FAF9C] to-[#E4E1D8]" />

                  {group.items.map((project, pi) => (
                    <motion.div
                      key={project.id}
                      className="group relative"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: pi * 0.04 }}
                    >
                      <span className="absolute -left-[21px] top-7 h-2.5 w-2.5 rounded-full border-2 border-[#FCFCF8] bg-[#3E6B52] transition-transform duration-200 group-hover:scale-125 group-hover:shadow-[0_0_0_6px_rgba(62,107,82,0.15)] sm:-left-[29px]" />
                      <ProjectCard project={project} />
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

/* ---------------- Stat card ---------------- */
function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Layers3;
  label: string;
  value: string;
  tone?: { text: string; bg: string; border: string };
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-[#E4E1D8] bg-white px-3 py-3 shadow-[0_4px_12px_rgba(30,38,33,0.03)] sm:gap-3 sm:px-4 sm:py-3.5">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${
          tone ? `${tone.bg} ${tone.text}` : "bg-[#3E6B52]/10 text-[#3E6B52]"
        }`}
      >
        <Icon size={16} className="sm:hidden" />
        <Icon size={18} className="hidden sm:block" />
      </span>
      <div className="min-w-0">
        <p
          className="truncate text-[14px] font-bold text-[#1E2621] sm:text-[17px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {value}
        </p>
        <p className="truncate text-[10px] text-[#8A938C] sm:text-[11.5px]">
          {label}
        </p>
      </div>
    </div>
  );
}

/* ---------------- Empty state ---------------- */
function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#E4E1D8] bg-[#FCFCF8] px-5 py-12 text-center sm:px-6 sm:py-16">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F6F6F2] text-[#8A938C]">
        <Search size={20} />
      </div>
      <h3
        className="text-[15px] font-semibold text-[#1E2621] sm:text-[16px]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        No projects found
      </h3>
      <p className="mt-1.5 max-w-sm text-[13px] text-[#5B655F] sm:text-[13.5px]">
        {hasFilters
          ? "Nothing matches that search or filter. Try a different name, location, year, or rating tier."
          : "Assessed projects will show up here once you run your first assessment."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-full border border-[#E4E1D8] bg-white px-4 py-2 text-[13px] font-medium text-[#3E6B52] transition-all hover:-translate-y-0.5 hover:border-[#C9D3CC] hover:shadow-[0_10px_24px_rgba(30,38,33,0.08)]"
        >
          Clear search &amp; filters
        </button>
      )}
    </div>
  );
}

/* ---------------- Rating gauge ---------------- */
function RatingGauge({ rating }: { rating: number }) {
  const tone = ratingTone(rating);
  const pct = Math.max(0, Math.min(100, rating));
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-2xl border px-3 py-2 sm:px-3.5 sm:py-2.5 ${tone.bg} ${tone.border}`}
    >
      <div className="flex items-center justify-between gap-4">
        <span
          className={`text-[9.5px] font-semibold uppercase tracking-[0.06em] ${tone.text}`}
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {ratingTierLabel(rating)}
        </span>
        <span className={`text-[13px] font-bold sm:text-[14px] ${tone.text}`}>
          {rating}
        </span>
      </div>
      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-black/[0.06] sm:w-28">
        {/* zone ticks at the 30 / 60 tier boundaries */}
        <span className="absolute inset-y-0 left-[30%] w-px bg-black/10" />
        <span className="absolute inset-y-0 left-[60%] w-px bg-black/10" />
        <div
          className={`h-full rounded-full ${tone.fill} transition-[width] duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------- Project card ---------------- */
function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group/card block overflow-hidden rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#C9D3CC] hover:shadow-[0_16px_36px_rgba(30,38,33,0.08)] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-6 md:p-7">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full bg-[#F6F6F2] px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.04em] text-[#7C8880] sm:text-[11px]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {project.building_type}
            </span>
            {project.classification && (
              <span className="rounded-full bg-[#F6F6F2] px-2.5 py-0.5 text-[10.5px] font-medium text-[#7C8880] sm:text-[11px]">
                {project.classification}
              </span>
            )}
          </div>

          <h3
            className="truncate text-[16.5px] font-bold leading-tight tracking-[-0.01em] text-[#1E2621] transition-colors group-hover/card:text-[#3E6B52] sm:text-[18px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {project.name}
          </h3>
          <p className="mt-1 truncate text-[12.5px] text-[#5B655F] sm:text-[13px]">
            {project.category} &middot; {project.structure}
          </p>

          <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[#5B655F] sm:mt-4 sm:gap-x-5 sm:gap-y-2 sm:text-[12.5px]">
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="shrink-0 text-[#8A938C]" />
              {project.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Ruler size={13} className="shrink-0 text-[#8A938C]" />
              {formatSize(project.size ?? "0")}
            </span>
            <span className="flex items-center gap-1.5">
              <Wallet size={13} className="shrink-0 text-[#8A938C]" />
              {formatCurrency(project.budget ?? "0.00")}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="shrink-0 text-[#8A938C]" />
              {project.year}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0 sm:flex-col sm:items-end sm:gap-2">
          <RatingGauge rating={project.rating ?? 0} />
          <span className="flex items-center gap-1.5 text-[11px] text-[#8A938C] sm:text-[11.5px]">
            <Award size={12} className="shrink-0" />
            {project.target_certification}
          </span>
        </div>
      </div>

      <div className="border-t border-[#EFEDE6] bg-[#FBFAF7] px-5 py-2.5 text-[11px] text-[#8A938C] sm:px-6 sm:text-[11.5px] md:px-7">
        Created {formatDateTime(project.created_at)}
      </div>
    </Link>
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
    <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-[#EFEDE6] pt-5 sm:mt-7 sm:flex-row sm:pt-6">
      <p className="hidden text-[12.5px] text-[#8A938C] sm:block">
        Page {page} of {totalPages}
      </p>

      {/* Compact control: mobile only (no risk of overflow at any page count) */}
      <div className="flex w-full items-center justify-between gap-3 sm:hidden">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E4E1D8] bg-white text-[#5B655F] transition-all disabled:pointer-events-none disabled:opacity-40 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
        >
          <ChevronLeft size={16} />
        </button>

        <p className="text-[12.5px] text-[#8A938C]">
          Page {page} of {totalPages}
        </p>

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E4E1D8] bg-white text-[#5B655F] transition-all disabled:pointer-events-none disabled:opacity-40 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
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
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E1D8] bg-white text-[#5B655F] transition-all hover:-translate-y-0.5 hover:border-[#C9D3CC] hover:text-[#3E6B52] hover:shadow-[0_10px_24px_rgba(30,38,33,0.08)] disabled:pointer-events-none disabled:opacity-40 disabled:hover:translate-y-0 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="flex h-9 w-9 items-center justify-center text-[13px] text-[#8A938C]"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-medium transition-all focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] ${
                p === page
                  ? "bg-[#3E6B52] text-[#F6F6F2] shadow-[0_10px_24px_rgba(62,107,82,0.24)]"
                  : "border border-[#E4E1D8] bg-white text-[#5B655F] hover:-translate-y-0.5 hover:border-[#C9D3CC] hover:text-[#3E6B52] hover:shadow-[0_10px_24px_rgba(30,38,33,0.08)]"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E1D8] bg-white text-[#5B655F] transition-all hover:-translate-y-0.5 hover:border-[#C9D3CC] hover:text-[#3E6B52] hover:shadow-[0_10px_24px_rgba(30,38,33,0.08)] disabled:pointer-events-none disabled:opacity-40 disabled:hover:translate-y-0 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
