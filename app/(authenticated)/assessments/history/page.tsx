"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  Ruler,
  Wallet,
  Calendar,
  Star,
  Award,
  Search,
  X,
} from "lucide-react";

/* ---------------- Types ---------------- */

type Project = {
  id: number;
  name: string;
  building_type: string;
  classification: string | null;
  structure: string;
  category: string;
  size: string;
  year: string;
  location: string;
  budget: string;
  adjusted_cost: string;
  rating: number;
  target_certification: string;
  created_at: string;
};

/* ---------------- Mock data ---------------- */

const MOCK_PROJECTS: Project[] = [
  { id: 40, name: "NRNC - Sample Project", building_type: "NRNC", classification: null, structure: "5 Storey and Above (R.C.) Building", category: "Light Duty Factories", size: "2000.00", year: "2028", location: "Kuching", budget: "5000000.00", adjusted_cost: "4875608.91", rating: 67, target_certification: "Not Certified", created_at: "2026-05-04 23:15:56" },
  { id: 39, name: "NRNC - Sample Project", building_type: "NRNC", classification: null, structure: "5 Storey and Above (R.C.) Building", category: "Light Duty Factories", size: "2000.00", year: "2027", location: "Kuching", budget: "5000000.00", adjusted_cost: "5026245.43", rating: 53, target_certification: "Not Certified", created_at: "2026-05-04 23:08:44" },
  { id: 38, name: "Example", building_type: "NREB", classification: null, structure: "Single Storey (R.C.) Building", category: "Mosques", size: "2000.00", year: "2027", location: "Miri", budget: "50000000.00", adjusted_cost: "3027437.35", rating: 72, target_certification: "Not Certified", created_at: "2026-04-19 13:32:29" },
  { id: 37, name: "NREB - Sample Project", building_type: "NREB", classification: null, structure: "5 Storey and Above (R.C.) Building", category: "Light Duty Factories", size: "2000.00", year: "2026", location: "Kuching", budget: "50000000.00", adjusted_cost: "5034395.03", rating: 51, target_certification: "Not Certified", created_at: "2026-04-04 21:59:48" },
  { id: 36, name: "Project 4", building_type: "NRNC", classification: null, structure: "5 Storey and Above (R.C.) Building", category: "Light Duty Factories", size: "2000.00", year: "2027", location: "Kuching", budget: "50000000.00", adjusted_cost: "5034395.03", rating: 57, target_certification: "Not Certified", created_at: "2026-03-28 14:33:12" },
  { id: 35, name: "Project 3", building_type: "RNC", classification: "Landed", structure: "2-4 Storey (R.C.) Building (Flat Roof)", category: "Bungalows", size: "2000.00", year: "2027", location: "Kuching", budget: "50000000.00", adjusted_cost: "5197780.00", rating: 1, target_certification: "Not Certified", created_at: "2026-03-28 11:31:30" },
  { id: 34, name: "Project 2", building_type: "RNC", classification: "Landed", structure: "Single Storey (R.C.) Building", category: "Terrace Houses", size: "2000.00", year: "2027", location: "Miri", budget: "50000000.00", adjusted_cost: "3250466.23", rating: 68, target_certification: "Not Certified", created_at: "2026-03-27 23:02:30" },
  { id: 32, name: "Project 1", building_type: "RNC", classification: "Landed", structure: "Single Storey (R.C.) Building", category: "Terrace Houses", size: "2000.00", year: "2027", location: "Miri", budget: "50000000.00", adjusted_cost: "2843572.06", rating: 76, target_certification: "Not Certified", created_at: "2026-03-27 13:47:37" },
];

const PER_PAGE = 5;

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
  if (rating >= 60) return { text: "text-[#2C4A3A]", bg: "bg-[#EEF2EC]", border: "border-[#CFE0D6]", chip: "bg-[#3E6B52] text-[#F6F6F2]" };
  if (rating >= 30) return { text: "text-[#7A5A20]", bg: "bg-[#FBF3E7]", border: "border-[#EBD8B8]", chip: "bg-[#C08A3E] text-[#F6F6F2]" };
  return { text: "text-[#8C3D33]", bg: "bg-[#FBEDEB]", border: "border-[#E7C1BA]", chip: "bg-[#B4483C] text-[#F6F6F2]" };
}

/** Every whitespace-separated token in the query must appear somewhere
 *  in the project's combined searchable text (AND semantics), so
 *  queries like "kuching bungalow" narrow correctly. */
function matchesQuery(project: Project, query: string) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((token) => project.name.toLowerCase().includes(token));
}

/* ---------------- Page ---------------- */

export default function ProjectHistoryPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");

  const filteredProjects = useMemo(
    () => MOCK_PROJECTS.filter((project) => matchesQuery(project, query)),
    [query]
  );

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * PER_PAGE;
    return filteredProjects.slice(start, start + PER_PAGE);
  }, [filteredProjects, safePage]);

  const goTo = (p: number) => setPage(Math.min(Math.max(p, 1), totalPages));

  const handleSearchChange = (value: string) => {
    setQuery(value);
    setPage(1); // reset pagination whenever the search term changes
  };

  return (
    <div className="mx-auto max-w-200 pb-10 pt-6">
      {/* ---------------- Breadcrumb ---------------- */}
      <nav
        aria-label="Breadcrumb"
        className="mb-5 flex items-center gap-1.5 text-[12.5px] text-[#8A938C]"
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-1 rounded-sm transition-colors hover:text-[#3E6B52] hover:underline underline-offset-2 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
        >
          <ChevronLeft size={13} className="shrink-0" />
          Dashboard
        </Link>
        <ChevronRight size={13} className="shrink-0" />
        <span className="text-[#5B655F]">Project History</span>
      </nav>

      {/* ---------------- Intro ---------------- */}
      <section className="mb-6 rounded-3xl border border-[#E4E1D8] bg-[#FCFCF8] p-6 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-8">
        <p
          className="mb-3 text-[12px] uppercase tracking-[0.08em] text-[#7C8880]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Project history
        </p>
        <h1
          className="text-[30px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[32px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your assessments
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[#5B655F]">
          {MOCK_PROJECTS.length} project{MOCK_PROJECTS.length !== 1 ? "s" : ""} assessed so far.
        </p>

        {/* ---------------- Search ---------------- */}
        <div className="mt-5 relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8A938C]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name, category, location, year, certification…"
            aria-label="Search projects"
            className="w-full rounded-2xl border border-[#E4E1D8] bg-white py-3 pl-11 pr-11 text-[14px] text-[#1E2621] placeholder:text-[#A2AAA4] transition-all focus:border-[#3E6B52] focus:outline-none focus:ring-4 focus:ring-[#3E6B52]/10"
          />
          {query && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              aria-label="Clear search"
              className="absolute right-3.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#8A938C] transition-colors hover:bg-[#F6F6F2] hover:text-[#1E2621]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {query && (
          <p className="mt-2.5 text-[12.5px] text-[#8A938C]">
            {filteredProjects.length} result{filteredProjects.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>
        )}
      </section>

      {/* ---------------- Cards ---------------- */}
      {filteredProjects.length === 0 ? (
        <EmptyState query={query} onClear={() => handleSearchChange("")} />
      ) : (
        <div className="space-y-4">
          {paged.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* ---------------- Pagination ---------------- */}
      {filteredProjects.length > 0 && (
        <Pagination page={safePage} totalPages={totalPages} onChange={goTo} />
      )}
    </div>
  );
}

/* ---------------- Empty state ---------------- */

function EmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#E4E1D8] bg-[#FCFCF8] px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F6F6F2] text-[#8A938C]">
        <Search size={20} />
      </div>
      <h3
        className="text-[16px] font-semibold text-[#1E2621]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        No projects found
      </h3>
      <p className="mt-1.5 max-w-sm text-[13.5px] text-[#5B655F]">
        Nothing matches &ldquo;{query}&rdquo;. Try a different name, location, category, or year.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 rounded-full border border-[#E4E1D8] bg-white px-4 py-2 text-[13px] font-medium text-[#3E6B52] transition-all hover:-translate-y-0.5 hover:border-[#C9D3CC] hover:shadow-[0_10px_24px_rgba(30,38,33,0.08)]"
      >
        Clear search
      </button>
    </div>
  );
}

/* ---------------- Project card ---------------- */

function ProjectCard({ project }: { project: Project }) {
  const tone = ratingTone(project.rating);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block overflow-hidden rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#C9D3CC] hover:shadow-[0_16px_36px_rgba(30,38,33,0.08)] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
    >
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full bg-[#F6F6F2] px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[#7C8880]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {project.building_type}
            </span>
            {project.classification && (
              <span className="rounded-full bg-[#F6F6F2] px-2.5 py-0.5 text-[11px] font-medium text-[#7C8880]">
                {project.classification}
              </span>
            )}
          </div>

          <h3
            className="truncate text-[18px] font-bold leading-tight tracking-[-0.01em] text-[#1E2621] transition-colors group-hover:text-[#3E6B52]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {project.name}
          </h3>
          <p className="mt-1 truncate text-[13px] text-[#5B655F]">
            {project.category} &middot; {project.structure}
          </p>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-[#5B655F]">
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="text-[#8A938C]" />
              {project.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Ruler size={13} className="text-[#8A938C]" />
              {formatSize(project.size)}
            </span>
            <span className="flex items-center gap-1.5">
              <Wallet size={13} className="text-[#8A938C]" />
              {formatCurrency(project.budget)}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-[#8A938C]" />
              {project.year}
            </span>
          </div>
        </div>

        {/* Rating + certification */}
        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
          <div className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 ${tone.bg} ${tone.border}`}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full ${tone.chip}`}>
              <Star size={12} />
            </span>
            <span className={`text-[14px] font-semibold ${tone.text}`}>{project.rating}</span>
          </div>
          <span className="flex items-center gap-1.5 text-[11.5px] text-[#8A938C]">
            <Award size={12} />
            {project.target_certification}
          </span>
        </div>
      </div>

      <div className="border-t border-[#EFEDE6] bg-[#FBFAF7] px-6 py-2.5 text-[11.5px] text-[#8A938C] sm:px-7">
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

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="mt-7 flex flex-col items-center justify-between gap-4 border-t border-[#EFEDE6] pt-6 sm:flex-row">
      <p className="text-[12.5px] text-[#8A938C]">
        Page {page} of {totalPages}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E1D8] bg-white text-[#5B655F] transition-all hover:-translate-y-0.5 hover:border-[#C9D3CC] hover:text-[#3E6B52] hover:shadow-[0_10px_24px_rgba(30,38,33,0.08)] disabled:pointer-events-none disabled:opacity-40 disabled:hover:translate-y-0 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((p) => (
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
        ))}

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