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
    <section className="mx-auto max-w-260 px-10 pb-10 pt-16">
      <p
        className="mb-3.5 text-[12px] uppercase tracking-[0.08em] text-[#7C8880]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {today}
      </p>
      <h1
        className="max-w-155 text-[40px] font-bold leading-[1.15] tracking-[-0.02em]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Good {getTimePeriod()}, {firstName}.
      </h1>
      <p className="mb-11 mt-3 max-w-130 text-[16px] leading-relaxed text-[#5B655F]">
        Let&apos;s find out what your next project can become.
      </p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1.15fr_1fr]">
        <ActionCard
          primary
          icon={<Plus size={20} />}
          title="Create new assessment"
          description="Start a feasibility and performance review for a new site or building."
          href="/assessments/new"
        />
        <ActionCard
          icon={<History size={20} />}
          title="View history"
          description="Revisit past assessments, drafts, and certified reports."
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
      className={`group relative overflow-hidden rounded-xl2 p-7 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] ${primary
          ? "bg-[#3E6B52] text-[#F6F6F2] shadow-[0_16px_36px_rgba(62,107,82,0.28)]"
          : "border border-[#E4E1D8] bg-white text-[#1E2621] shadow-[0_8px_24px_rgba(30,38,33,0.05)]"
        }`}
    >
      {primary && <BlueprintGrid />}
      <div
        className={`relative mb-5 flex h-10 w-10 items-center justify-center rounded-xl ${primary ? "bg-white/15 text-[#F6F6F2]" : "bg-[#EEF2EC] text-[#3E6B52]"
          }`}
      >
        {icon}
      </div>
      <div
        className="relative mb-2 text-[18px] font-semibold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </div>
      <p
        className={`relative max-w-[320px] text-[13.5px] leading-relaxed ${primary ? "text-white/80" : "text-[#5B655F]"
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
    <div className="mx-auto max-w-260 border-t border-[#E4E1D8] px-10 pt-7">
      <div className="mb-3.5 text-[13px] font-semibold">Recent projects</div>

      {loading ? (
        <ul>
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className={`flex items-center justify-between py-3 ${i < 2 ? "border-b border-[#EFEDE6]" : ""
                }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E4E1D8]" />
                <span className="h-3 w-36 animate-pulse rounded-full bg-[#EFEDE6]" />
              </div>
              <span className="h-3 w-14 animate-pulse rounded-full bg-[#EFEDE6]" />
            </li>
          ))}
        </ul>
      ) : activity.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[#E4E1D8] py-10 text-center">
          <span className="text-[13px] text-[#8A938C]">No recent activity yet</span>
          <span className="text-[12.5px] text-[#B7BEB8]">
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
      className={`flex items-center justify-between py-3 ${last ? "" : "border-b border-[#EFEDE6]"
        }`}
    >
      <Link
        href={`/projects/${item.id}`}
        className="group flex w-full items-center justify-between gap-4 rounded-lg px-2 py-1 text-left transition-colors hover:bg-[#F6F6F2] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
          <span className="truncate text-[13.5px] font-medium">{item.name}</span>
          <span className="shrink-0 text-[13px] text-[#8A938C]">
            - {item.building_type}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className="text-[12px] text-[#8A938C]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {formatRelativeTime(item.created_at)}
          </span>
          <ArrowUpRight
            className="h-3.5 w-3.5 text-[#8A938C] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </div>
      </Link>
    </li>
  );
}
