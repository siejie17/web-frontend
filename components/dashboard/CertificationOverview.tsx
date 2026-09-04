"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { ShieldCheck } from "lucide-react";

import { CERTIFICATION_THRESHOLDS, getCertificationLevel, roundScore } from "@/lib/analytics";

function CertificationOverviewSkeleton() {
    return (
        <div className="rounded-xl2 border border-[#E4E1D8] bg-white p-4 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-6">
            <span className="block h-4 w-40 animate-pulse rounded-full bg-[#E7E4DA]" />
            <div className="mt-6 flex justify-center">
                <span className="block h-40 w-40 animate-pulse rounded-full bg-[#F1EFE7]" />
            </div>
            <div className="mt-6 space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className="block h-3 w-full animate-pulse rounded-full bg-[#EDEBE2]" />
                ))}
            </div>
        </div>
    );
}

export function CertificationOverview({
    averageScore,
    loading,
}: {
    averageScore: number;
    loading?: boolean;
}) {
    if (loading) return <CertificationOverviewSkeleton />;

    const level = getCertificationLevel(averageScore);
    const displayScore = roundScore(averageScore);
    const clampedScore = Math.max(0, Math.min(100, averageScore));

    const gaugeData = [
        { name: "score", value: clampedScore },
        { name: "remainder", value: 100 - clampedScore },
    ];

    return (
        <div className="rounded-xl2 border border-[#E4E1D8] bg-white p-4 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-6">
            <div className="mb-1 text-[15px] font-semibold text-[#1E2621] sm:text-[16px]">
                Certification overview
            </div>
            <p className="mb-5 text-[12.5px] text-[#8A938C] sm:text-[13px]">
                Predicted portfolio GBI score
            </p>

            <div className="mt-2 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
                {/* Pie chart */}
                <div className="relative h-44 w-44 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={gaugeData}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                                innerRadius="72%"
                                outerRadius="100%"
                                stroke="none"
                            >
                                <Cell fill={level.color} />
                                <Cell fill="#EDEBE2" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span
                            className="text-[30px] font-bold leading-none text-[#1E2621]"
                            style={{ fontFamily: "var(--font-display)" }}
                        >
                            {displayScore}
                        </span>

                        <span className="mt-1 text-[11px] text-[#8A938C]">
                            GBI score
                        </span>

                        <span
                            className="mt-1 text-[14px] font-semibold"
                            style={{ color: level.color }}
                        >
                            {level.label}
                        </span>
                    </div>
                </div>

                {/* Certification thresholds */}
                <ul className="w-full max-w-[180px] space-y-2">
                    {CERTIFICATION_THRESHOLDS.map((threshold) => (
                        <li
                            key={threshold.label}
                            className="flex items-center justify-between gap-4 text-[12.5px] text-[#5B655F]"
                        >
                            <span className="flex items-center gap-2">
                                <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: threshold.color }}
                                />
                                {threshold.label}
                            </span>

                            <span
                                className="shrink-0 font-mono text-[12px] text-[#8A938C]"
                                style={{ fontFamily: "var(--font-mono)" }}
                            >
                                {threshold.label === "Not certified"
                                    ? "< 35"
                                    : `≥ ${threshold.min}`}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-[#EEF2EC] px-3.5 py-3">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#3E6B52]" />
                <div>
                    <div className="text-[12.5px] font-semibold text-[#1E2621]">
                        {level.label === "Not certified" ? "Below certification threshold" : `${level.label} threshold met`}
                    </div>
                    <p className="mt-0.5 text-[12px] text-[#5B655F]">
                        {level.label === "Not certified"
                            ? "Your portfolio's average predicted score is below the Certified threshold."
                            : `You're on track for ${level.label} certification.`}
                    </p>
                </div>
            </div>
        </div>
    );
}