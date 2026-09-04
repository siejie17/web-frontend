"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import { getCertificationLevel } from "@/lib/analytics";

type RecommendationItem = {
  id: number;
  certification_level: string;
  title: string;
  content: string;
  is_active: boolean;
};

function RecommendationTickerSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-xl2 border border-[#E4E1D8] bg-white p-4 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-5 w-5 animate-pulse rounded-full bg-[#EEF2EC]" />
        <span className="h-4 w-48 animate-pulse rounded-full bg-[#E7E4DA]" />
      </div>

      <div className="flex-1 space-y-2">
        <span className="block h-4 w-3/4 animate-pulse rounded-full bg-[#E7E4DA]" />
        <span className="block h-3 w-full animate-pulse rounded-full bg-[#D6D1C6]" />
        <span className="block h-3 w-5/6 animate-pulse rounded-full bg-[#D6D1C6]" />
      </div>
    </div>
  );
}

function RecommendationCard({
  recommendation,
}: {
  recommendation: RecommendationItem;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-[13.5px] font-semibold text-[#1E2621]">
        {recommendation.title}
      </h3>

      <p className="text-[13px] leading-relaxed text-[#5B655F]">
        {recommendation.content}
      </p>
    </div>
  );
}

export function RecommendationTicker({
  averageScore,
}: {
  averageScore: number;
}) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);

  const level = getCertificationLevel(averageScore);

  const fetchRecommendations = useCallback(async () => {
    try {
      const res = await fetch("/api/recommendations", {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      const items = Array.isArray(data?.recommendations)
        ? data.recommendations
        : [];

      setRecommendations(items);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRecommendations();
  }, [fetchRecommendations]);

  const filtered = useMemo(
    () =>
      recommendations.filter(
        (r) =>
          r.certification_level.toLowerCase() === level.label.toLowerCase(),
      ),
    [recommendations, level.label],
  );

  useEffect(() => {
    if (filtered.length === 0) return;

    setCurrentIndex(0);
    setFadeKey((prev) => prev + 1);
  }, [filtered]);

  useEffect(() => {
    if (filtered.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % filtered.length);
      setFadeKey((prev) => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [filtered]);

  if (loading) return <RecommendationTickerSkeleton />;

  if (error || filtered.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-xl2 border border-[#E4E1D8] bg-white p-4 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={16} className="shrink-0 text-[#C08A3E]" />

          <div className="text-[15px] font-semibold text-[#1E2621] sm:text-[16px]">
            Certification recommendations
          </div>
        </div>

        <p className="flex-1 text-[13px] text-[#5B655F]">
          No active recommendations available for {level.label} yet.
        </p>
      </div>
    );
  }

  const current = filtered[currentIndex];

  return (
    <div className="flex h-full flex-col rounded-xl2 border border-[#E4E1D8] bg-white p-4 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={16} className="shrink-0 text-[#C08A3E]" />

        <div className="text-[15px] font-semibold text-[#1E2621] sm:text-[16px]">
          Certification recommendations
        </div>

        <span className="rounded-full bg-[#F3F5F1] px-2 py-0.5 text-[11px] font-semibold text-[#6D796F]">
          {level.label}
        </span>
      </div>

      <div
        key={fadeKey}
        className="flex flex-1 rounded-2xl bg-[#F1F7EC] py-3 px-4"
        style={{
          animation: "fadeIn 0.4s ease-in-out",
        }}
      >
        <RecommendationCard recommendation={current} />
      </div>

      {filtered.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {filtered.map((_r, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentIndex(i);
                setFadeKey((prev) => prev + 1);
              }}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === currentIndex ? "bg-[#C08A3E]" : "bg-[#E7E4DA]"
              }`}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
