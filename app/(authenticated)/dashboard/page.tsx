"use client";

/**
 * ProFormaX - Authenticated Dashboard
 * ---------------------------------------------------------------
 * Next.js App Router page (app/page.tsx or app/home/page.tsx)
 *
 * Data source of truth: GET /be-api/analytics
 * This single endpoint drives the KPI cards, the portfolio performance
 * chart, the certification overview, and the recent assessments list.
 *
 * Notes:
 * - useAuth(), routing to /assessments/new, /assessments/history and
 *   /projects/${id} are preserved from the previous implementation.
 * - The old per-user /be-api/users/${userId}/projects call has been
 *   removed as a recent-projects source now that /be-api/analytics
 *   already provides recent_projects.
 * - The type filter select mirrors `filters.type` from the API
 *   response. It is wired up to refetch with a `type` query param,
 *   since that is the natural query-param convention for this endpoint;
 *   if the backend does not yet support it, the request will simply
 *   return the unfiltered result and the dashboard still behaves
 *   correctly.
 * ---------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/contexts/AuthContext";
import type { AnalyticsResponse } from "@/types/analytics";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { PortfolioPerformance } from "@/components/dashboard/PortfolioPerformance";
import { CertificationOverview } from "@/components/dashboard/CertificationOverview";
import { RecentAssessments } from "@/components/dashboard/RecentAssessments";
import { RecommendationTicker } from "@/components/dashboard/RecommendationTicker";
import { DashboardError } from "@/components/dashboard/DashboardError";

export default function DashboardPage() {
  const { user } = useAuth();

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const hasLoadedRef = useRef(false);

  const fetchAnalytics = useCallback(
    async (selectedTypeValue: string | null) => {
      const isInitialLoad = !hasLoadedRef.current;

      if (isInitialLoad) {
        setLoading(true);
      }

      setError(false);

      try {
        const query = selectedTypeValue
          ? `?type=${encodeURIComponent(selectedTypeValue)}`
          : "";

        const res = await fetch(`/be-api/analytics${query}`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(`Analytics request failed: ${res.status}`);
        }

        const data: AnalyticsResponse = await res.json();

        setAnalytics(data);
        hasLoadedRef.current = true;
      } catch (err) {
        console.error("Error fetching analytics:", err);

        // Only show the full error screen if the initial request failed.
        if (!hasLoadedRef.current) {
          setError(true);
        }
      } finally {
        if (isInitialLoad) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    fetchAnalytics(selectedType);
  }, [fetchAnalytics, selectedType]);

  const isEmpty = !loading && !error && analytics?.metrics.total_projects === 0;

  // Best-effort type list for the filter dropdown, derived from the
  // projects currently returned by the API. The backend does not expose
  // a dedicated list-of-types endpoint, so this reflects only what
  // has been seen so far rather than a guaranteed complete set.
  const types = Array.from(
    new Set((analytics?.types ?? []).map((p) => p.name).filter(Boolean)),
  );

  return (
    <div className="mx-auto px-4 pb-10 pt-8 sm:px-6 sm:pt-10 md:px-10 md:pt-8">
      <DashboardHeader firstName={user?.first_name} />

      {error ? (
        <DashboardError onRetry={() => fetchAnalytics(selectedType)} />
      ) : (
        <>
          <KpiGrid metrics={analytics?.metrics ?? null} loading={loading} />

          {isEmpty ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-[#E4E1D8] bg-white px-6 py-16 text-center sm:mt-8">
              <div className="text-[15px] font-semibold text-[#1E2621]">
                No assessments yet.
              </div>
              <p className="max-w-sm text-[13px] text-[#5B655F]">
                Create your first building assessment to start building your
                portfolio.
              </p>
              <Link
                href="/assessments/new"
                className="mt-2 rounded-xl bg-[#3E6B52] px-5 py-2.5 text-[13.5px] font-semibold text-white"
              >
                + New assessment
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-5 lg:grid-cols-[1fr_480px]">
                <PortfolioPerformance
                  costTrend={analytics?.cost_trend ?? []}
                  loading={loading}
                  types={types}
                  type={selectedType}
                  onTypeChange={setSelectedType}
                />
                <CertificationOverview
                  averageScore={
                    analytics?.metrics.average_predicted_gbi_score ?? 0
                  }
                  loading={loading}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 sm:gap-5 min-[1161px]:grid-cols-[1fr_480px]">
                <RecentAssessments
                  projects={analytics?.recent_projects ?? []}
                  loading={loading}
                />
                <RecommendationTicker averageScore={analytics?.metrics.average_predicted_gbi_score ?? 0} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
