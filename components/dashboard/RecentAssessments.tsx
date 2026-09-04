"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { RecentProject } from "@/types/analytics";
import { formatCurrencyMYR, getCertificationLevel } from "@/lib/analytics";
import { formatRelativeTime } from "@/lib/utils";

function RecentAssessmentsSkeleton() {
  return (
    <div className="rounded-xl2 border border-[#E4E1D8] bg-white p-4 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-6">
      <span className="block h-4 w-40 animate-pulse rounded-full bg-[#E7E4DA]" />
      <div className="mt-5 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-[#EEF2EC]" />
            <div className="flex-1 space-y-1.5">
              <span className="block h-3 w-32 animate-pulse rounded-full bg-[#D6D1C6]" />
              <span className="block h-2.5 w-20 animate-pulse rounded-full bg-[#E7E4DA]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CertificationBadge({ score }: { score: number }) {
  const level = getCertificationLevel(score);
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[#2A2E29]">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: level.color }} />
      {Math.round(score)} &middot; {level.label}
    </span>
  );
}

export function RecentAssessments({
  projects,
  loading,
}: {
  projects: RecentProject[];
  loading?: boolean;
}) {
  if (loading) return <RecentAssessmentsSkeleton />;

  return (
    <div className="rounded-xl2 border border-[#E4E1D8] bg-white p-4 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[15px] font-semibold text-[#1E2621] sm:text-[16px]">
          Recent assessments
        </div>
        <Link
          href="/assessments/history"
          className="flex items-center gap-0.5 text-[12.5px] font-medium text-[#3E6B52] hover:underline"
        >
          View all
          <ChevronRight size={14} />
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#E4E1D8] px-4 py-10 text-center">
          <span className="text-[13px] text-[#6B746D]">No assessments yet.</span>
          <span className="text-[12.5px] text-[#95A098]">
            Create your first building assessment to start building your portfolio.
          </span>
          <Link
            href="/assessments/new"
            className="mt-2 rounded-lg bg-[#3E6B52] px-4 py-2 text-[12.5px] font-semibold text-white"
          >
            + New assessment
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E4E1D8] text-[11.5px] uppercase tracking-wide text-[#8A938C]">
                  <th className="pb-2.5 pr-3 font-medium">Project</th>
                  <th className="pb-2.5 pr-3 font-medium">Type</th>
                  <th className="pb-2.5 pr-3 font-medium">Predicted</th>
                  <th className="pb-2.5 pr-3 font-medium">Savings</th>
                  <th className="pb-2.5 pr-3 font-medium">Updated</th>
                  <th className="pb-2.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-[#EDEBE2] last:border-0">
                    <td className="max-w-[180px] truncate py-3 pr-3 text-[13.5px] font-medium text-[#1E2621]">
                      {project.name}
                    </td>
                    <td className="py-3 pr-3 text-[13px] text-[#5B655F]">{project.type}</td>
                    <td className="py-3 pr-3">
                      <CertificationBadge score={project.predicted_score} />
                    </td>
                    <td className="py-3 pr-3 text-[13px] text-[#1E2621]">
                      {formatCurrencyMYR(project.savings)}
                    </td>
                    <td className="py-3 pr-3 text-[12.5px] text-[#8A938C]">
                      {formatRelativeTime(project.created_at)}
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/projects/${project.id}`}
                        className="inline-flex items-center rounded-lg border border-[#E4E1D8] px-3 py-1.5 text-[12.5px] font-medium text-[#1E2621] transition-colors hover:border-[#3E6B52] hover:text-[#3E6B52]"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <ul className="space-y-2.5 sm:hidden">
            {projects.map((project) => (
              <li key={project.id} className="rounded-xl border border-[#E4E1D8] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold text-[#1E2621]">
                      {project.name}
                    </div>
                    <div className="mt-0.5 text-[12px] text-[#8A938C]">{project.type}</div>
                  </div>
                  <Link
                    href={`/projects/${project.id}`}
                    className="shrink-0 rounded-lg border border-[#E4E1D8] px-3 py-1.5 text-[12px] font-medium text-[#1E2621]"
                  >
                    Open
                  </Link>
                </div>
                <div className="mt-3 flex items-center justify-between text-[12.5px]">
                  <CertificationBadge score={project.predicted_score} />
                  <span className="text-[#1E2621]">{formatCurrencyMYR(project.savings)}</span>
                </div>
                <div className="mt-1.5 text-[11.5px] text-[#8A938C]">
                  {formatRelativeTime(project.created_at)}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}