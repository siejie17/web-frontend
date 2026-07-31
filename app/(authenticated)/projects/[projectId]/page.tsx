import { redirect, notFound } from "next/navigation";

import { getOwnedProject } from "@/lib/server/project-access";
import AccessDenied from "@/components/errors/AccessDenied";
import ProjectPageWrapper from "./ProjectPageWrapper";

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

    return <ProjectPageWrapper project={project} selectedProject={selectedProject} />;
}
