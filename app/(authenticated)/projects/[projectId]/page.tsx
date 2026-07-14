import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getOwnedProject } from "@/lib/server/project-access";
import AccessDenied from "@/components/errors/AccessDenied";
import ProjectDetailTabs from "@/components/tabs/ProjectDetailsTabs";
import ProjectDetailsHeader from "@/components/project/ProjectDetailsHeader";

export default async function ProjectDetailsPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const { projectId } = await params;
    const { user, project, selectedProject } = await getOwnedProject(projectId);

    if (!user) redirect("/login");
    if (!project) return <AccessDenied />;
    if (!selectedProject) return notFound();

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

            {/* ---------------- Header (client component — needs useState to collapse/expand) ---------------- */}
            <ProjectDetailsHeader project={project} />

            {/* ---------------- Tabbed content ---------------- */}
            <ProjectDetailTabs selectedProject={selectedProject} />
        </div>
    );
}