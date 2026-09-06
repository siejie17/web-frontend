"use client";

import { Award, Building2, Coins, TrendingUp } from "lucide-react";

import type { AnalyticsMetrics } from "@/types/analytics";
import { certifiedPercentage, formatCurrencyMYR, roundScore } from "@/lib/analytics";

interface KpiCardProps {
  icon: React.ReactNode;
  title: string;
  value: React.ReactNode;
  supporting: string;
}

function KpiCard({ icon, title, value, supporting }: KpiCardProps) {
  return (
    <div className="rounded-xl2 border border-[#E4E1D8] bg-white p-4 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2EC] text-[#3E6B52] sm:h-10 sm:w-10">
        {icon}
      </div>
      <div className="text-[13px] text-[#5B655F] sm:text-[13.5px]">{title}</div>
      <div
        className="mt-1 truncate text-[22px] font-bold text-[#1E2621] sm:text-[26px]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </div>
      <div className="mt-1 text-[12px] text-[#8A938C] sm:text-[12.5px]">{supporting}</div>
    </div>
  );
}

function KpiCardSkeleton() {
  return (
    <div className="rounded-xl2 border border-[#E4E1D8] bg-white p-4 sm:p-5">
      <span className="mb-3 block h-9 w-9 animate-pulse rounded-xl bg-[#EEF2EC] sm:h-10 sm:w-10" />
      <span className="block h-3 w-24 animate-pulse rounded-full bg-[#E7E4DA]" />
      <span className="mt-2 block h-6 w-20 animate-pulse rounded-full bg-[#D6D1C6]" />
      <span className="mt-2 block h-2.5 w-28 animate-pulse rounded-full bg-[#E7E4DA]" />
    </div>
  );
}

export function KpiGrid({ metrics, loading }: { metrics: AnalyticsMetrics | null; loading?: boolean }) {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const percentCertified = certifiedPercentage(metrics.certified_projects, metrics.total_projects);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      <KpiCard
        icon={<Building2 size={18} />}
        title="Total projects"
        value={metrics.total_projects}
        supporting="Across all assessments"
      />
      <KpiCard
        icon={<Coins size={18} />}
        title="Potential cost savings"
        value={formatCurrencyMYR(metrics.potential_cost_savings)}
        supporting="Across all projects"
      />
      <KpiCard
        icon={<TrendingUp size={18} />}
        title="Average predicted GBI score"
        value={roundScore(metrics.average_predicted_gbi_score)}
        supporting="Across all projects (excl. non-certification projects)"
      />
      <KpiCard
        icon={<Award size={18} />}
        title="Certified projects"
        value={`${metrics.certified_projects} of ${metrics.total_projects}`}
        supporting={`${percentCertified}% of total projects`}
      />
    </div>
  );
}
