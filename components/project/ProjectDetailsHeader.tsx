"use client";

import { useState } from "react";
import { ChevronDown, Award, Star, Clock } from "lucide-react";

function formatValue(value: unknown) {
    if (value === null || value === undefined || value === "") {
        return "Not provided";
    }
    return String(value);
}

function formatDateTime(value?: string) {
    if (!value) return "Not provided";
    const date = new Date(value.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

type ProjectDetailsHeaderProps = {
    project: {
        name: string;
        created_at?: string;
        rating?: string | number | null;
        target_certification?: string | number | null;
    };
};

export default function ProjectDetailsHeader({ project }: ProjectDetailsHeaderProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const hasRating = project.rating !== null && project.rating !== undefined;
    const hasTarget =
        project.target_certification !== null &&
        project.target_certification !== undefined &&
        project.target_certification !== "";

    return (
        <section className="mb-6 overflow-hidden rounded-3xl border border-[#E4E1D8] bg-[#FCFCF8] shadow-[0_8px_24px_rgba(30,38,33,0.04)]">
            <div
                role="button"
                tabIndex={0}
                onClick={() => setIsExpanded((v) => !v)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setIsExpanded((v) => !v);
                }}
                className="flex cursor-pointer flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8"
            >
                <div className="min-w-0">
                    <p
                        className="mb-3 text-[12px] uppercase tracking-[0.08em] text-[#7C8880]"
                        style={{ fontFamily: "var(--font-mono)" }}
                    >
                        Project details
                    </p>
                    <h1
                        className="truncate text-[30px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[32px]"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        {project.name}
                    </h1>

                    {isExpanded && (
                        <div className="mt-3 flex items-center gap-1.5 text-[12.5px] text-[#8A938C]">
                            <Clock size={13} className="shrink-0" />
                            <span>Created {formatDateTime(project.created_at)}</span>
                        </div>
                    )}
                </div>

                <span className="flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[#E4E1D8] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5B655F] transition-colors hover:border-[#C9D3CC] hover:text-[#3E6B52]">
                    <ChevronDown
                        size={14}
                        className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                    {isExpanded ? "Collapse" : "Expand"}
                </span>
            </div>

            {/* Headline stats */}
            {isExpanded && (hasRating || hasTarget) && (
                <div className="grid grid-cols-1 gap-3 border-t border-[#EFEDE6] px-6 pb-6 pt-6 sm:grid-cols-2 sm:px-8 sm:pb-8">
                    <StatCard
                        icon={<Star size={16} />}
                        label="Target rating"
                        value={formatValue(project.rating)}
                        highlighted={hasRating}
                    />
                    <StatCard
                        icon={<Award size={16} />}
                        label="Target certification scale"
                        value={formatValue(project.target_certification)}
                        highlighted={hasTarget}
                    />
                </div>
            )}
        </section>
    );
}

/* ---------------- Headline stat card ---------------- */

function StatCard({
    icon,
    label,
    value,
    highlighted,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    highlighted?: boolean;
}) {
    return (
        <div
            className={`flex items-center gap-3 rounded-2xl border p-4 ${highlighted ? "border-[#CFE0D6] bg-[#EEF2EC]" : "border-[#EFEDE6] bg-[#FDFDFC]"
                }`}
        >
            <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${highlighted ? "bg-[#3E6B52] text-[#F6F6F2]" : "bg-[#F6F6F2] text-[#7C8880]"
                    }`}
            >
                {icon}
            </span>
            <div className="min-w-0">
                <div
                    className="text-[11px] uppercase tracking-[0.08em] text-[#8A938C]"
                    style={{ fontFamily: "var(--font-mono)" }}
                >
                    {label}
                </div>
                <div
                    className={`mt-0.5 truncate text-[16px] font-semibold ${highlighted ? "text-[#2C4A3A]" : "text-[#1E2621]"
                        }`}
                >
                    {value}
                </div>
            </div>
        </div>
    );
}