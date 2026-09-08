"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

import { getCertificationLevel } from "@/lib/analytics";

type GbiRecommendation = {
  title: string;
  description: string;
};

type CacheEntry = {
  recommendations: GbiRecommendation[];
  fetchedAt: number;
};

const CACHE_KEY = "proformax.gbi.recommendations";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function readCachedRecommendations(
  storage: Pick<Storage, "getItem">,
): GbiRecommendation[] | null {
  try {
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEntry;
    if (
      typeof parsed?.fetchedAt !== "number" ||
      !Array.isArray(parsed?.recommendations)
    ) {
      return null;
    }

    const age = Date.now() - parsed.fetchedAt;
    if (age < 0 || age > CACHE_TTL_MS) return null;

    return parsed.recommendations;
  } catch {
    return null;
  }
}

function writeCachedRecommendations(
  storage: Pick<Storage, "setItem">,
  recommendations: GbiRecommendation[],
): void {
  try {
    const entry: CacheEntry = {
      recommendations,
      fetchedAt: Date.now(),
    };
    storage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage failures; the cache is best-effort.
  }
}

function RecommendationTickerSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-xl2 border border-[#E4E1D8] bg-white p-4 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-5 w-5 animate-pulse rounded-full bg-[#EEF2EC]" />
        <span className="h-4 w-48 animate-pulse rounded-full bg-[#E7E4DA]" />
      </div>

      <div className="flex-1 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl bg-[#F1F7EC] p-4">
            <span className="block h-3 w-3/4 animate-pulse rounded-full bg-[#E7E4DA]" />
            <span className="mt-2 block h-2.5 w-full animate-pulse rounded-full bg-[#D6D1C6]" />
            <span className="mt-1.5 block h-2.5 w-5/6 animate-pulse rounded-full bg-[#D6D1C6]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({
  recommendation,
}: {
  recommendation: GbiRecommendation;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-[13.5px] font-semibold text-[#1E2621]">
        {recommendation.title}
      </h3>

      <p className="text-[13px] leading-relaxed text-[#5B655F]">
        {recommendation.description}
      </p>
    </div>
  );
}

export function RecommendationTicker({
  averageScore,
}: {
  averageScore: number;
}) {
  const [recommendations, setRecommendations] = useState<GbiRecommendation[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);
  const hasAttemptedRef = useRef(false);

  const level = getCertificationLevel(averageScore);

  const fetchRecommendations = useCallback(async () => {
    try {
      const res = await fetch("/be-api/ai/gbi-recommendations", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

      const data = (await res.json()) as {
        recommendations?: GbiRecommendation[];
      };
      const items = Array.isArray(data?.recommendations)
        ? data.recommendations
        : [];

      if (items.length > 0) {
        setRecommendations(items);
        writeCachedRecommendations(sessionStorage, items);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;

    const cached = readCachedRecommendations(sessionStorage);
    if (cached && cached.length > 0) {
      setRecommendations(cached);
      setLoading(false);
      return;
    }

    void fetchRecommendations();
  }, [fetchRecommendations]);

  useEffect(() => {
    if (recommendations.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % recommendations.length);
      setFadeKey((prev) => prev + 1);
    }, 6000);

    return () => clearInterval(interval);
  }, [recommendations]);

  if (loading) return <RecommendationTickerSkeleton />;

  if (error || recommendations.length === 0) {
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

        <p className="flex-1 text-[13px] text-[#5B655F]">
          No recommendations available right now. Please try again later.
        </p>
      </div>
    );
  }

  const current = recommendations[Math.min(currentIndex, recommendations.length - 1)];

  return (
    <div className="flex h-full flex-col rounded-xl2 border border-[#E4E1D8] bg-white p-4 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={16} className="shrink-0 text-[#C08A3E]" />

        <div className="text-[15px] font-semibold text-[#1E2621] sm:text-[16px]">
          AI certification insights
        </div>

        <span className="rounded-full bg-[#F3F5F1] px-2 py-0.5 text-[11px] font-semibold text-[#6D796F]">
          {level.label}
        </span>
      </div>

      <div
        key={fadeKey}
        className="flex flex-1 flex-col rounded-2xl bg-[#F1F7EC] px-4 py-3"
        style={
          recommendations.length > 1
            ? { animation: "fadeIn 0.4s ease-in-out" }
            : undefined
        }
      >
        <RecommendationCard recommendation={current} />
      </div>

      {recommendations.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {recommendations.map((_r, i) => (
            <button
              key={i}
              aria-label={`Show recommendation ${i + 1}`}
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
