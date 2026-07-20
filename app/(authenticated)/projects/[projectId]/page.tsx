import { redirect, notFound } from "next/navigation";

import { getOwnedProject } from "@/lib/server/project-access";
import AccessDenied from "@/components/errors/AccessDenied";
import ProjectDetailTabs from "@/components/tabs/ProjectDetailsTabs";
import ProjectDetailsHeader from "@/components/project/ProjectDetailsHeader";
import { BackButton } from "@/components/ui/BackButton";

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
            <BackButton />

            {/* ---------------- Header (client component — needs useState to collapse/expand) ---------------- */}
            <ProjectDetailsHeader project={project} />

            {/* ---------------- Tabbed content ---------------- */}
            <ProjectDetailTabs selectedProject={selectedProject} />
        </div>
    );
}
