"use client";

import { Award, BookOpen, ExternalLink, RefreshCw, Search, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import UserPageTabs from "@/components/user/UserPageTabs";
import { BackButton } from "@/components/ui/BackButton";

type ReferenceItem = {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  file_url?: string | null;
};

type RecommendationItem = {
  id: number;
  certification_level: string;
  title: string;
  content: string;
  is_active: boolean;
};

type RecommendationSection = {
  id: number;
  certification_level: string;
  title: string;
};

type RecommendationPayload = {
  sections: RecommendationSection[];
  recommendations: RecommendationItem[];
};

type KnowledgePageProps = {
  type: "recommendations" | "references";
};

const CERTIFICATION_TIERS = [
  { level: "Platinum", range: "86–100 points", accent: "bg-[#29483A]", soft: "bg-[#EDF3EF]", text: "text-[#29483A]" },
  { level: "Gold", range: "76–85 points", accent: "bg-[#C08A3E]", soft: "bg-[#FBF4E8]", text: "text-[#946521]" },
  { level: "Silver", range: "66–75 points", accent: "bg-[#84929A]", soft: "bg-[#F0F3F4]", text: "text-[#5F6D75]" },
  { level: "Certified", range: "50–65 points", accent: "bg-[#548066]", soft: "bg-[#EEF5F0]", text: "text-[#3E6B52]" },
  { level: "Not Certified", range: "Below 50 points", accent: "bg-[#A9685B]", soft: "bg-[#FAF0ED]", text: "text-[#8D5146]" },
] as const;

export default function KnowledgePage({ type }: KnowledgePageProps) {
  const isReferences = type === "references";
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [sections, setSections] = useState<RecommendationSection[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/be-api/content/${type}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || `Unable to load ${type}.`);
      }

      if (isReferences) {
        setReferences(Array.isArray(data) ? data : []);
      } else {
        const payload = data as RecommendationPayload;
        setSections(Array.isArray(payload?.sections) ? payload.sections : []);
        setRecommendations(
          Array.isArray(payload?.recommendations)
            ? payload.recommendations.filter((item) => item.is_active)
            : [],
        );
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Unable to load ${type}.`);
    } finally {
      setLoading(false);
    }
  }, [isReferences, type]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredReferences = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return references;

    return references.filter((item) =>
      [item.title, item.description, item.category].some((value) =>
        value?.toLowerCase().includes(term),
      ),
    );
  }, [query, references]);

  const sectionTitle = (level: string) =>
    sections.find(
      (section) => section.certification_level.toLowerCase() === level.toLowerCase(),
    )?.title || `${level} guidance`;

  return (
    <div className="py-4">
      <div className="mx-auto max-w-5xl space-y-7 px-4 py-2">
        <BackButton text="Dashboard" redirect="/dashboard" />
        <UserPageTabs />

        <header className="overflow-hidden rounded-3xl border border-[#D6E1D9] bg-[#173B2A] px-6 py-7 text-white shadow-[0_16px_38px_rgba(23,59,42,0.13)] sm:px-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#DCECE0] ring-1 ring-white/15">
              {isReferences ? <BookOpen size={22} /> : <Sparkles size={22} />}
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                User resources
              </p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                {isReferences ? "Reference library" : "Recommendations"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
                {isReferences
                  ? "Browse standards, manuals, guidance documents, and supporting resources curated by ProFormaX administrators."
                  : "Explore practical guidance for every possible certification outcome."}
              </p>
            </div>
          </div>
        </header>

        {isReferences && !loading && !error && references.length > 0 && (
          <label className="relative block">
            <span className="sr-only">Search references</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#879189]" size={17} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search references by title, category, or description"
              className="w-full rounded-2xl border border-[#DFE4DD] bg-white py-3.5 pl-11 pr-4 text-sm text-[#27332C] shadow-sm outline-none transition focus:border-[#7EA08B] focus:ring-3 focus:ring-[#3E6B52]/10"
            />
          </label>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-52 animate-pulse rounded-3xl border border-[#E1E5DE] bg-white/70" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-[#E7C9C3] bg-[#FFF8F6] p-8 text-center">
            <p className="text-sm font-medium text-[#934E43]">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#3E6B52] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <RefreshCw size={15} /> Try again
            </button>
          </div>
        ) : isReferences ? (
          <ReferenceGrid items={filteredReferences} hasQuery={Boolean(query.trim())} />
        ) : (
          <div className="space-y-5">
            {CERTIFICATION_TIERS.map((tier) => {
              const items = recommendations.filter(
                (item) => item.certification_level.toLowerCase() === tier.level.toLowerCase(),
              );

              return (
                <section key={tier.level} className="overflow-hidden rounded-3xl border border-[#DFE4DD] bg-white shadow-[0_8px_26px_rgba(30,38,33,0.05)]">
                  <div className={`h-1.5 ${tier.accent}`} />
                  <div className="p-6 sm:p-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3.5">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tier.soft} ${tier.text}`}>
                          <Award size={20} />
                        </span>
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${tier.text}`}>
                            {tier.level} · {tier.range}
                          </p>
                          <h2 className="mt-1 text-lg font-bold text-[#27332C]">{sectionTitle(tier.level)}</h2>
                        </div>
                      </div>
                      <span className="w-fit rounded-full bg-[#F3F5F1] px-3 py-1 text-[11px] font-semibold text-[#6D796F]">
                        {items.length} {items.length === 1 ? "recommendation" : "recommendations"}
                      </span>
                    </div>

                    {items.length > 0 ? (
                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {items.map((item) => (
                          <article key={item.id} className="rounded-2xl border border-[#E7EAE5] bg-[#FAFBF9] p-5">
                            <h3 className="text-sm font-bold text-[#2B3830]">{item.title}</h3>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#68756D]">{item.content}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-5 rounded-2xl border border-dashed border-[#D7DDD6] bg-[#FAFBF9] p-5 text-sm text-[#7D8780]">
                        No active recommendations are available for this level yet.
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ReferenceGrid({ items, hasQuery }: { items: ReferenceItem[]; hasQuery: boolean }) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#CED7CF] bg-white p-10 text-center text-sm text-[#77827B]">
        {hasQuery ? "No references match your search." : "No references are available yet."}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <article key={item.id} className="flex flex-col rounded-3xl border border-[#E1E5DE] bg-white p-6 shadow-[0_8px_24px_rgba(30,38,33,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF1EB] text-[#3E6B52]">
              <BookOpen size={19} />
            </span>
            <span className="rounded-full bg-[#F3F5F1] px-3 py-1 text-[10px] font-semibold text-[#6D796F]">
              {item.category || "General"}
            </span>
          </div>
          <h2 className="mt-5 text-base font-bold text-[#27332C]">{item.title}</h2>
          <p className="mt-2 flex-1 whitespace-pre-wrap text-sm leading-6 text-[#68756D]">
            {item.description || "No description provided."}
          </p>
          {item.file_url && (
            <a
              href={item.file_url}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#EDF3EE] px-4 py-3 text-sm font-semibold text-[#315B45] transition hover:bg-[#DCE9DF]"
            >
              Open reference <ExternalLink size={15} />
            </a>
          )}
        </article>
      ))}
    </div>
  );
}
