"use client";

import { useState, useMemo } from "react";
import {
  Eye,
  ChevronRight,
  AlertTriangle,
  X,
  Clock,
  Building2,
  Layers,
  MapPin,
  Ruler,
  Wallet,
  Calendar,
  Tag,
  Leaf,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { formatCurrency, formatSize } from "@/lib/utils";
import { computeActualMarks } from "@/lib/assessment-utils";

/* ── GBI certification ladder ── */

const GBI_TIERS = [
  {
    key: "not_certified",
    label: "Not Certified",
    range: "0–49",
    color: "#B4483C",
  },
  { key: "certified", label: "Certified", range: "50–65", color: "#B8935B" },
  { key: "silver", label: "Silver", range: "66–75", color: "#9AA0A6" },
  { key: "gold", label: "Gold", range: "76–85", color: "#C9962E" },
  { key: "platinum", label: "Platinum", range: "86–100", color: "#3E6B52" },
] as const;

function getActiveTierIndex(targetCert: string | null | undefined): number {
  if (!targetCert) return -1;
  const label = targetCert.toLowerCase();
  return GBI_TIERS.findIndex((t) => t.label.toLowerCase() === label);
}

function getTierForScore(
  score: number,
): (typeof GBI_TIERS)[number] | undefined {
  return GBI_TIERS.find((t) => {
    const parts = t.range.split(/[–-]/);
    return score >= Number(parts[0]) && score <= Number(parts[1]);
  });
}

/* ── Helpers ── */

function formatDateTime(value?: string) {
  if (!value) return "Not provided";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/* ── Props ── */

interface ProjectHeaderProps {
  project: {
    name: string;
    created_at?: string;
    rating?: number | null;
    target_certification?: string | null;
    location?: string | null;
    building_type?: string | null;
    category?: string | null;
    structure?: string | null;
    size?: string | null;
    budget?: string | null;
    year?: string | null;
  };
  selectedProject: any;
  liveActualRating?: number | null;
}

/* ── Component ── */

export default function ProjectHeader({
  project,
  selectedProject,
  liveActualRating,
}: ProjectHeaderProps) {
  const [showModal, setShowModal] = useState(false);

  const rating = useMemo(() => {
    if (liveActualRating != null) return liveActualRating;
    const greenElements = selectedProject?.green_elements ?? [];
    const projectData = selectedProject?.projectData ?? selectedProject;
    if (!Array.isArray(greenElements) || greenElements.length === 0)
      return project.rating ?? 0;
    return computeActualMarks(greenElements, projectData);
  }, [liveActualRating, selectedProject, project.rating]);
  const targetCert = project.target_certification;
  const isNotCert = !targetCert || targetCert === "Not Certified";
  const tierIndex = getActiveTierIndex(targetCert);
  const tier = tierIndex >= 0 ? GBI_TIERS[tierIndex] : undefined;

  const predicted = project.rating ?? null;
  const diff = predicted != null ? rating - predicted : null;
  const DiffIcon = diff != null && diff < 0 ? TrendingDown : TrendingUp;

  return (
    <>
      <div className="mb-6 overflow-hidden rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.05)]">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr]">
          {/* Left: identity */}
          <div className="border-b border-[#E4E1D8] px-5 py-7 sm:px-7 sm:py-8 md:border-b-0 md:border-r md:px-9 md:py-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3E6B52]">
              Project Overview
            </p>
            <h2
              className="mt-2 text-[22px] font-semibold leading-tight text-[#1E2621] sm:text-[26px] lg:text-[30px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {project.name || "Untitled Project"}
            </h2>
            {project.building_type && (
              <p className="mt-1 text-[13.5px] font-medium text-[#5B655F]">
                {project.building_type}
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#E4E1D8] bg-[#FBFAF7] px-4 py-2 text-[12.5px] font-medium text-[#5B655F] transition-colors hover:border-[#C9D3CC] hover:text-[#3E6B52] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
            >
              <Eye size={14} />
              View project details
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Right: glimpse */}
          {isNotCert ? (
            <div className="flex flex-col justify-center p-5 sm:px-7 sm:py-8 md:px-9 md:py-9">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A938C]">
                Note:
              </p>
              <div className="mt-3 flex items-start gap-3 rounded-2xl border border-[#E4DFC0] bg-[#FFF9E6] px-4 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C08A3E] text-white">
                  <AlertTriangle size={15} />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-[#8A6420]">
                    GBI Assessment not available
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#71603F]">
                    This project targets{" "}
                    <span className="font-medium">Not Certified</span>. To
                    unlock the Green Building Index assessment, update the
                    target rating to at least{" "}
                    <span className="font-medium text-[#B8935B]">
                      Certified
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-5 sm:px-7 sm:py-6 md:px-9 md:py-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A938C]">
                <span className="inline-flex items-center gap-1.5">
                  <Leaf size={13} />
                  GBI Assessment
                </span>
              </p>

              {/* Two-column score comparison */}
              <div className="flex items-stretch">
                <div className="flex flex-1 flex-col justify-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A938C]">
                    Actual Score
                  </p>
                  <p
                    className="mt-1 text-[28px] font-semibold leading-none text-[#1E2621]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {rating}
                    <span className="text-[13px] font-medium text-[#8A938C]"> /100 pts</span>
                  </p>
                  {getTierForScore(rating) && (
                    <span
                      className="mt-2 inline-block w-fit rounded-full px-3 py-[3px] text-[10px] font-bold uppercase tracking-[0.06em]"
                      style={{
                        backgroundColor: `${getTierForScore(rating)!.color}1A`,
                        color: getTierForScore(rating)!.color,
                      }}
                    >
                      {getTierForScore(rating)!.label}
                    </span>
                  )}
                </div>

                <div className="mx-6 w-px self-stretch bg-[#E4E1D8]" />

                <div className="flex flex-1 flex-col justify-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A938C]">
                    Predicted Score
                  </p>
                  <div className="mt-1 flex items-center gap-3">
                    <p
                      className="text-[28px] font-semibold leading-none text-[#1E2621]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {predicted ?? "\u2014"}
                      <span className="text-[13px] font-medium text-[#8A938C]"> /100 pts</span>
                    </p>
                    {diff != null && (
                      <span
                        className="flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[10px] font-bold"
                        style={{
                          background: diff >= 0 ? "rgba(62,107,82,0.1)" : "rgba(180,72,60,0.1)",
                          color: diff >= 0 ? "#3E6B52" : "#B4483C",
                        }}
                      >
                        <DiffIcon size={11} strokeWidth={2.75} />
                        {diff > 0 ? "+" : ""}
                        {diff}
                      </span>
                    )}
                  </div>
                  {predicted != null && getTierForScore(predicted) && (
                    <span
                      className="mt-2 inline-block w-fit rounded-full px-3 py-[3px] text-[10px] font-bold uppercase tracking-[0.06em]"
                      style={{
                        backgroundColor: `${getTierForScore(predicted)!.color}1A`,
                        color: getTierForScore(predicted)!.color,
                      }}
                    >
                      {getTierForScore(predicted)!.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Gauge bar — both markers are now the same "|" shape, told apart by color only:
                  ink = Actual, forest = Predicted */}
              <div>
                <div className="relative mt-4">
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#EFEDE6]">
                    {GBI_TIERS.map((t) => {
                      const [min, max] = t.range.split(/[–-]/).map(Number);
                      const isTargetBand = tierIndex >= 0 && tier?.key === t.key;
                      return (
                        <div
                          key={t.key}
                          className="absolute top-0 h-full transition-all duration-500"
                          style={{
                            left: `${min}%`,
                            width: `${max - min}%`,
                            backgroundColor: t.color,
                            opacity: isTargetBand ? 1 : 0.18,
                            boxShadow: isTargetBand ? `0 0 8px ${t.color}99 inset` : "none",
                          }}
                        />
                      );
                    })}
                    {/* boundary ticks between bands */}
                    {GBI_TIERS.slice(1).map((t) => {
                      const [min] = t.range.split(/[–-]/).map(Number);
                      return (
                        <span
                          key={`tick-${t.key}`}
                          className="absolute top-0 h-full w-px bg-white/70"
                          style={{ left: `${min}%` }}
                        />
                      );
                    })}
                  </div>

                  {/* marker layer — sibling of the bar, not clipped by its overflow-hidden,
                      so ticks can stand taller than the bar itself */}
                  <div
                    className="absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1E2621] shadow-[0_0_0_1.5px_rgba(255,255,255,0.9)] transition-all duration-500"
                    style={{ left: `${Math.min(100, Math.max(0, rating))}%` }}
                    title={`Actual · ${rating}`}
                  />
                  {predicted != null && (
                    <div
                      className="absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3E6B52] shadow-[0_0_0_1.5px_rgba(255,255,255,0.9)] transition-all duration-500"
                      style={{ left: `${Math.min(100, Math.max(0, predicted))}%` }}
                      title={`Predicted · ${predicted}`}
                    />
                  )}
                </div>

                <div className="mt-2.5 flex items-center gap-4 text-[12px] text-[#5B655F]">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-[3px] rounded-full bg-[#1E2621]" />
                    Actual
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-[3px] rounded-full bg-[#3E6B52]" />
                    Predicted
                  </span>
                  {tier && (
                    <span className="ml-auto text-[#8A938C]">
                      Target band{" "}
                      <span className="font-semibold" style={{ color: tier.color }}>
                        {targetCert}
                      </span>{" "}
                      · {tier.range} pts
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Project Details Modal */}
      {showModal && (
        <ProjectDetailsModal
          project={project}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

/* ── Modal ── */

function ProjectDetailsModal({
  project,
  onClose,
}: {
  project: ProjectHeaderProps["project"];
  onClose: () => void;
}) {
  const rows: { label: string; value: string; icon: React.ReactNode }[] = [
    {
      label: "Building Type",
      value: project.building_type || "\u2014",
      icon: <Building2 size={14} />,
    },
    {
      label: "Category",
      value: project.category || "\u2014",
      icon: <Layers size={14} />,
    },
    { label: "Classification", value: "Not provided", icon: <Tag size={14} /> },
    {
      label: "Structure",
      value: project.structure || "\u2014",
      icon: <Building2 size={14} />,
    },
    {
      label: "Location",
      value: project.location || "\u2014",
      icon: <MapPin size={14} />,
    },
    {
      label: "Size",
      value: project.size ? formatSize(project.size) : "\u2014",
      icon: <Ruler size={14} />,
    },
    {
      label: "Budget",
      value: project.budget ? formatCurrency(project.budget) : "\u2014",
      icon: <Wallet size={14} />,
    },
    {
      label: "Year",
      value: project.year || "\u2014",
      icon: <Calendar size={14} />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E2621]/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_24px_48px_rgba(30,38,33,0.16)]">
        <div className="flex items-center justify-between border-b border-[#EFEDE6] px-6 py-4">
          <span
            className="text-[12px] uppercase tracking-[0.08em] text-[#7C8880]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Project Details
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#8A938C] transition-colors hover:bg-[#F6F6F2] hover:text-[#1E2621]"
          >
            <X size={15} />
          </button>
        </div>
        <div className="divide-y divide-[#EFEDE6] px-6 py-4">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 py-3"
            >
              <span className="flex items-center gap-2 text-[12.5px] font-medium text-[#5B655F]">
                {row.icon}
                {row.label}
              </span>
              <span className="text-right text-[13px] font-semibold text-[#1E2621]">
                {row.value}
              </span>
            </div>
          ))}
        </div>
        {project.created_at && (
          <div className="flex items-center gap-2 border-t border-[#EFEDE6] px-6 py-3.5 text-[11.5px] text-[#8A938C]">
            <Clock size={13} />
            Created {formatDateTime(project.created_at)}
          </div>
        )}
      </div>
    </div>
  );
}
