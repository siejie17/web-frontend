import Link from "next/link";
import { redirect } from "next/navigation";
import {
    ChevronLeft,
    ChevronRight,
    Building2,
    Layers,
    Tag,
    Ruler,
    Wallet,
    Calculator,
    Calendar,
    Clock,
    MapPin,
    Award,
    Star,
} from "lucide-react";

import { getOwnedProject } from "@/lib/server/project-access";
import { formatCurrency, formatSize } from "@/lib/utils";
import AccessDenied from "@/components/errors/AccessDenied";

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

export default async function ProjectDetailsPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const { projectId } = await params;
    const { user, project } = await getOwnedProject(projectId);

    if (!user) redirect("/login");
    if (!project) return <AccessDenied />;

    const hasRating = project.rating !== null && project.rating !== undefined;
    const hasTarget =
        project.target_certification !== null &&
        project.target_certification !== undefined &&
        project.target_certification !== "";

    return (
        <div className="mx-auto max-w-275 pb-10 pt-6">
            {/* ---------------- Breadcrumb ---------------- */}
            <nav
                aria-label="Breadcrumb"
                className="mb-5 flex items-center gap-1.5 text-[12.5px] text-[#8A938C]"
            >
                <Link
                    href="/dashboard"
                    className="flex items-center gap-1 rounded-sm transition-colors hover:text-[#3E6B52] hover:underline underline-offset-2 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52] cursor-pointer"
                >
                    <ChevronLeft size={13} className="shrink-0" />
                    Back to Dashboard
                </Link>
            </nav>

            {/* ---------------- Header ---------------- */}
            <section className="mb-6 rounded-3xl border border-[#E4E1D8] bg-[#FCFCF8] p-6 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
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
                        <p className="mt-3 text-[14px] leading-relaxed text-[#5B655F]">
                            Full breakdown of the inputs and results for this assessment.
                        </p>

                        <div className="mt-3 flex items-center gap-1.5 text-[12.5px] text-[#8A938C]">
                            <Clock size={13} className="shrink-0" />
                            <span>Created {formatDateTime(project.created_at)}</span>
                        </div>
                    </div>
                </div>

                {/* Headline stats */}
                {(hasRating || hasTarget) && (
                    <div className="mt-6 grid grid-cols-1 gap-3 border-t border-[#EFEDE6] pt-6 sm:grid-cols-2">
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

            {/* ---------------- Details card ---------------- */}
            <div className="overflow-hidden rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.05)]">
                <div className="border-b border-[#EFEDE6] bg-[#FBFAF7] px-7 py-4 sm:px-9">
                    <span
                        className="text-[12px] uppercase tracking-[0.08em] text-[#7C8880]"
                        style={{ fontFamily: "var(--font-mono)" }}
                    >
                        Full breakdown
                    </span>
                </div>

                <div className="px-7 py-8 sm:px-9 sm:py-9">
                    <DetailSection title="The basics" description="What kind of building this is.">
                        <DetailField icon={<Building2 size={15} />} label="Building type" value={formatValue(project.building_type)} />
                        <DetailField icon={<Layers size={15} />} label="Category" value={formatValue(project.category)} />
                        {project.classification && (
                            <DetailField icon={<Tag size={15} />} label="Classification" value={formatValue(project.classification)} />
                        )}
                    </DetailSection>

                    <DetailSection title="Scale & timing" description="Size, cost, and when it was assessed.">
                        <DetailField icon={<Ruler size={15} />} label="Size" value={formatSize(project.size)} />
                        <DetailField icon={<Wallet size={15} />} label="Budget" value={formatCurrency(project.budget)} />
                        <DetailField icon={<Calculator size={15} />} label="Adjusted cost" value={formatCurrency(project.adjusted_cost)} />
                        <DetailField icon={<Calendar size={15} />} label="Year" value={formatValue(project.year)} />
                    </DetailSection>

                    <DetailSection title="Location & structure" description="Where the site sits and how it's built." noBorder>
                        <DetailField icon={<MapPin size={15} />} label="Location" value={formatValue(project.location)} />
                        <DetailField icon={<Building2 size={15} />} label="Structure" value={formatValue(project.structure)} />
                    </DetailSection>
                </div>
            </div>
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
                <h2 className="text-[15px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                    {title}
                </h2>
                {description && (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#8A938C]">{description}</p>
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
            className={`flex items-center gap-3 rounded-2xl border p-4 ${highlighted
                ? "border-[#CFE0D6] bg-[#EEF2EC]"
                : "border-[#EFEDE6] bg-[#FDFDFC]"
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