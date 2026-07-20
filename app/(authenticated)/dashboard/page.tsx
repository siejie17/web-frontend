"use client";

/**
 * ProFormaX - Authenticated Home
 * ---------------------------------------------------------------
 * Next.js App Router page (app/page.tsx or app/home/page.tsx)
 *
 * Setup notes:
 * 1. Fonts are wired via `next/font/google` below - no extra <link> tags needed.
 * 2. Tailwind: add the CSS variables from `:root` (see bottom of file comment)
 *    to your globals.css, or swap the arbitrary-value classes (bg-[#...])
 *    for your own theme tokens in tailwind.config.ts.
 * 3. Icons: `lucide-react` (npm i lucide-react).
 * 4. Replace the mock user/session/activity data with your real data
 *    fetching (server component + props, SWR, React Query, etc).
 *
 * Responsive notes (this pass):
 * - Breakpoints used: default (mobile, <640px), sm (>=640px), md (>=768px), lg (>=1024px).
 * - Horizontal page padding scales px-4 -> px-6 -> px-10 so content never
 *   touches the screen edge on phones.
 * - Hero heading/body copy scale down on small screens and drop their
 *   fixed max-width so long names don't force overflow/scroll on narrow
 *   viewports.
 * - The two action cards stack full-width on mobile/tablet and only move
 *   to the asymmetric two-column layout at md+, where there's actually
 *   room for it.
 * - Activity rows truncate gracefully and hide the least essential meta
 *   (the building-type tag) below sm so the timestamp + arrow never wrap
 *   or get squeezed on small phones.
 * ---------------------------------------------------------------
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, History, Plus, Sparkles, X } from "lucide-react";

import { formatRelativeTime, getTimePeriod } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

/* ---------------- Types ---------------- */

export interface Project {
  id: number;
  name: string;
  year: string;

  location: string;
  category: string;
  classification: string;
  building_type: string;
  structure: string;

  size: string;
  budget: string;
  adjusted_cost: string;

  rating: number;
  target_certification: string;

  certifications: Certifications;

  created_at: string;
}

export interface Certifications {
  certifiedScaleRange: CertifiedScaleRange;
  certificationMultipliers: CertificationMultipliers;
}

export interface CertifiedScaleRange {
  [key: string]: unknown;
}

export interface CertificationMultipliers {
  [key: string]: unknown;
}

/* ---------------- Page ---------------- */

export default function DashboardPage() {
  const { user } = useAuth();

  const [userTop3Projects, setUserTop3Projects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    const fetchUserProjects = async (userId: string | undefined) => {
      if (!userId) return;

      try {
        setLoadingProjects(true);

        const res = await fetch(`/api/users/${userId}/projects`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          console.error("Failed to fetch user projects:", res.status);
          return;
        }

        const data = await res.json().catch(() => null);

        setUserTop3Projects(data?.projectsData?.slice(0, 3) || []);
      } catch (error) {
        console.error("Error fetching user projects:", error);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchUserProjects(user?.id);
  }, [user]);

  return (
    <>
      <Hero firstName={user?.first_name} />
      <PortfolioSnapshot activity={userTop3Projects} loading={loadingProjects} />
    </>
  );
}

/* ---------------- Hero ---------------- */

function Hero({ firstName }: { firstName: string | undefined }) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="mx-auto max-w-260 px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-12 md:px-10 md:pt-16">
      <p
        className="mb-3 text-[11px] uppercase tracking-[0.08em] text-[#7C8880] sm:mb-3.5 sm:text-[12px]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {today}
      </p>
      <h1
        className="max-w-full text-[28px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[34px] sm:leading-[1.18] md:max-w-155 md:text-[40px] md:leading-[1.15]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Good {getTimePeriod()}, {firstName}.
      </h1>
      <p className="mb-8 mt-3 max-w-full text-[14.5px] leading-relaxed text-[#5B655F] sm:text-[15px] md:mb-11 md:max-w-130 md:text-[16px]">
        Let&apos;s find out what your next project can become.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
        <ActionCard
          primary
          icon={<Plus size={20} />}
          title="Create new assessment"
          description="Create a new predicted GBI assessment for a building."
          href="/assessments/new"
        />
        <ActionCard
          icon={<History size={20} />}
          title="View history"
          description="Review completed assessments and perform actual GBI evaluations."
          href="/assessments/history"
        />
      </div>
    </section>
  );
}

function ActionCard({
  icon,
  title,
  description,
  primary,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  primary?: boolean;
  href: string;
}) {
  return (
    <a
      href={href}
      className={`group relative overflow-hidden rounded-xl2 p-5 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] sm:p-6 md:p-7 ${primary
          ? "bg-[#3E6B52] text-[#F6F6F2] shadow-[0_16px_36px_rgba(62,107,82,0.28)]"
          : "border border-[#E4E1D8] bg-white text-[#1E2621] shadow-[0_8px_24px_rgba(30,38,33,0.05)]"
        }`}
    >
      {primary && <BlueprintGrid />}
      <div
        className={`relative mb-4 flex h-9 w-9 items-center justify-center rounded-xl sm:mb-5 sm:h-10 sm:w-10 ${primary ? "bg-white/15 text-[#F6F6F2]" : "bg-[#EEF2EC] text-[#3E6B52]"
          }`}
      >
        {icon}
      </div>
      <div
        className="relative mb-2 text-[16.5px] font-semibold sm:text-[18px]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </div>
      <p
        className={`relative max-w-full text-[13px] leading-relaxed sm:max-w-[320px] sm:text-[13.5px] ${primary ? "text-white/80" : "text-[#5B655F]"
          }`}
      >
        {description}
      </p>
    </a>
  );
}

/** Subtle architectural grid etched into the primary CTA - the page's one signature motif,
 * a nod to the building blueprints ProFormaX helps evaluate. */
function BlueprintGrid() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="pfx-grid"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M24 0H0V24"
            fill="none"
            stroke="#F6F6F2"
            strokeWidth={0.75}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#pfx-grid)" />
    </svg>
  );
}

/* ---------------- Portfolio Snapshot ---------------- */

function PortfolioSnapshot({
  activity,
  loading,
}: {
  activity: Project[];
  loading?: boolean;
}) {
  return (
    <div className="mx-auto max-w-260 px-4 pb-6 sm:px-6 sm:pb-7 md:px-10">
      <div className="rounded-2xl border border-[#E4E1D8]/80 bg-white/70 p-4 shadow-sm backdrop-blur-md sm:p-6">
        <div className="mb-3 text-[13px] font-semibold text-[#2A2E29] sm:mb-3.5">
          Recent projects
        </div>

        {loading ? (
          <ul>
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className={`flex items-center justify-between py-3 ${
                  i < 2 ? "border-b border-[#EFEDE6]" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C5C0B3]" />
                  <span className="h-3 w-28 animate-pulse rounded-full bg-[#D6D1C6] sm:w-36" />
                </div>
                <span className="h-3 w-10 animate-pulse rounded-full bg-[#D6D1C6] sm:w-14" />
              </li>
            ))}
          </ul>
        ) : activity.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#E4E1D8] bg-white/50 px-4 py-8 text-center sm:py-10">
            <span className="text-[13px] text-[#6B746D]">No recent activity yet</span>
            <span className="text-[12.5px] text-[#95A098]">
              New assessments will show up here.
            </span>
          </div>
        ) : (
          <ul>
            {activity.map((item, i) => (
              <ActivityRow
                key={item.id}
                item={item}
                last={i === activity.length - 1}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ item, last }: { item: Project; last?: boolean }) {
  const dotColor =
    item.building_type === "RNC"
      ? "bg-[#3E6B52]"
      : item.building_type === "NRNC"
        ? "bg-[#8A938C]"
        : "bg-[#C08A3E]";
  return (
    <li
      className={`flex items-center justify-between py-3 ${
        last ? "" : "border-b border-[#EFEDE6]"
      }`}
    >
      <Link
        href={`/projects/${item.id}`}
        className="group flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-[#3E6B52]/[0.06] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] sm:gap-4 sm:px-2"
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
          <span className="truncate text-[13px] font-medium text-[#2A2E29] sm:text-[13.5px]">
            {item.name}
          </span>
          <span className="hidden shrink-0 text-[13px] text-[#6B746D] sm:inline">
            - {item.building_type}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span
            className="text-[11px] text-[#6B746D] sm:text-[12px]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {formatRelativeTime(item.created_at)}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-[#6B746D] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </Link>
    </li>
  );
}
