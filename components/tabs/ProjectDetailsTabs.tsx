"use client";

import { useEffect, useState } from "react";
import {
    Building2,
    Layers,
    Tag,
    Ruler,
    Wallet,
    Calculator,
    Calendar,
    MapPin,
    FileText,
    ClipboardCheck,
    Inbox,
} from "lucide-react";

import { formatCurrency, formatSize } from "@/lib/utils";
import { type CostBreakdown } from "@/components/project/CostBreakdownTree";
import CostBreakdownHierarchy from "@/components/project/CostBreakdownHierarchy";

type Project = {
    building_type?: string | null;
    category?: string | null;
    classification?: string | null;
    size?: string | number | null;
    budget?: string | number | null;
    adjusted_cost?: string | number | null;
    year?: string | number | null;
    location?: string | null;
    structure?: string | null;
    rating?: number | null;
    target_certification?: string | null;
};

function formatValue(value: unknown) {
    if (value === null || value === undefined || value === "") {
        return "Not provided";
    }
    return String(value);
}

const TABS = [
    { key: "details", label: "Project Details", icon: FileText },
    { key: "cost", label: "Cost Breakdown", icon: Wallet },
    { key: "gbi", label: "GBI Assessment", icon: ClipboardCheck },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ProjectDetailTabs({
    selectedProject,
}: {
    selectedProject: any | null;
}) {
    const [activeTab, setActiveTab] = useState<TabKey>("details");
    const [projectData, setProjectData] = useState<Project | null>(null);
    const [costBreakdownData, setCostBreakdownData] = useState<CostBreakdown | null>(null);

    useEffect(() => {
        if (selectedProject) {
            const projectDetails = {
                building_type: selectedProject.projectData.building_type_name,
                category: selectedProject.projectData.category,
                classification: selectedProject.projectData.classification,
                size: selectedProject.projectData.size,
                budget: selectedProject.projectData.budget,
                adjusted_cost: selectedProject.projectData.adjusted_cost,
                year: selectedProject.projectData.year,
                location: selectedProject.projectData.location,
                structure: selectedProject.projectData.structure,
                rating: selectedProject.projectData.rating,
                target_certification: selectedProject.projectData.target_certification,
            };

            setProjectData(projectDetails);
            setCostBreakdownData(selectedProject.projectData.cost_breakdown);
        }
    }, [selectedProject]);

    return (
        <div>
            {/* ---------------- Tab bar (outside the card) ---------------- */}
            <div className="mb-4 flex flex-wrap gap-1.5">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            aria-current={isActive ? "page" : undefined}
                            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] ${isActive
                                    ? "bg-[#3E6B52] text-[#F6F6F2] shadow-[0_10px_24px_rgba(62,107,82,0.24)]"
                                    : "border border-[#E4E1D8] bg-white text-[#5B655F] hover:-translate-y-0.5 hover:border-[#C9D3CC] hover:text-[#3E6B52] hover:shadow-[0_10px_24px_rgba(30,38,33,0.08)]"
                                }`}
                        >
                            <Icon size={14} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ---------------- Card ---------------- */}
            <div className="overflow-hidden mb-16 rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.05)]">
                <div className="border-b border-[#EFEDE6] bg-[#FBFAF7] px-7 py-4 sm:px-9">
                    <span
                        className="text-[12px] uppercase tracking-[0.08em] text-[#7C8880]"
                        style={{ fontFamily: "var(--font-mono)" }}
                    >
                        {TABS.find((t) => t.key === activeTab)?.label}
                    </span>
                </div>

                <div className="px-7 py-8 sm:px-9 sm:py-9">
                    {activeTab === "details" && (
                        <>
                            <DetailSection
                                title="The basics"
                                description="What kind of building this is."
                            >
                                <DetailField
                                    icon={<Building2 size={15} />}
                                    label="Building type"
                                    value={formatValue(projectData?.building_type)}
                                />
                                <DetailField
                                    icon={<Layers size={15} />}
                                    label="Category"
                                    value={formatValue(projectData?.category)}
                                />
                                {projectData?.classification && (
                                    <DetailField
                                        icon={<Tag size={15} />}
                                        label="Classification"
                                        value={formatValue(projectData?.classification)}
                                    />
                                )}
                            </DetailSection>

                            <DetailSection
                                title="Scale & timing"
                                description="Size, cost, and when it was assessed."
                            >
                                <DetailField
                                    icon={<Ruler size={15} />}
                                    label="Size"
                                    value={formatSize(String(projectData?.size ?? ""))}
                                />
                                <DetailField
                                    icon={<Wallet size={15} />}
                                    label="Budget"
                                    value={formatCurrency(String(projectData?.budget ?? ""))}
                                />
                                <DetailField
                                    icon={<Calculator size={15} />}
                                    label="Adjusted cost"
                                    value={formatCurrency(String(projectData?.adjusted_cost ?? ""))}
                                />
                                <DetailField
                                    icon={<Calendar size={15} />}
                                    label="Year"
                                    value={formatValue(projectData?.year)}
                                />
                            </DetailSection>

                            <DetailSection
                                title="Location & structure"
                                description="Where the site sits and how it's built."
                                noBorder
                            >
                                <DetailField
                                    icon={<MapPin size={15} />}
                                    label="Location"
                                    value={formatValue(projectData?.location)}
                                />
                                <DetailField
                                    icon={<Building2 size={15} />}
                                    label="Structure"
                                    value={formatValue(projectData?.structure)}
                                />
                            </DetailSection>
                        </>
                    )}

                    {activeTab === "cost" &&
                        (costBreakdownData ? (
                            <CostBreakdownHierarchy
                                value={costBreakdownData}
                                onChange={() => { }}
                                onSubmit={async () => ({
                                    success: true,
                                    message: "Mock submit successful",
                                })}
                            />
                        ) : (
                            <EmptyTabState label="Cost breakdown" />
                        ))}

                    {activeTab === "gbi" && <EmptyTabState label="GBI assessment" />}
                </div>
            </div>
        </div>
    );
}

/* ---------------- Empty state ---------------- */

function EmptyTabState({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F6F6F2] text-[#8A938C]">
                <Inbox size={18} />
            </span>
            <p className="text-[13.5px] text-[#8A938C]">
                {label} isn&apos;t available yet.
            </p>
        </div>
    );
}

/* ---------------- Section wrapper (mirrors FormSection) ---------------- */

function DetailSection({
    title,
    description,
    children,
    noBorder,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
    noBorder?: boolean;
}) {
    return (
        <div className={`mb-8 pb-8 ${noBorder ? "" : "border-b border-[#EFEDE6]"}`}>
            <div className="mb-4">
                <h2
                    className="text-[15px] font-semibold"
                    style={{ fontFamily: "var(--font-display)" }}
                >
                    {title}
                </h2>
                {description && (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#8A938C]">
                        {description}
                    </p>
                )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">{children}</div>
        </div>
    );
}

/* ---------------- Field ---------------- */

function DetailField({
    icon,
    label,
    value,
    prefix,
    suffix,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    prefix?: string;
    suffix?: string;
}) {
    const isEmpty = value === "Not provided";

    return (
        <div className="flex items-start gap-3 rounded-2xl border border-[#EFEDE6] bg-[#FDFDFC] p-4">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F6F6F2] text-[#7C8880]">
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
                    className={`mt-1 truncate text-[14px] font-medium ${isEmpty ? "text-[#B7BEB8]" : "text-[#1E2621]"
                        }`}
                >
                    {prefix && <span className="mr-1">{prefix}</span>}
                    {value}
                    {suffix && <span className="ml-1">{suffix}</span>}
                </div>
            </div>
        </div>
    );
}
