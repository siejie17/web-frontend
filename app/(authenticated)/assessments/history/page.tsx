// app/projects/page.tsx (or your exact route path)
import { redirect } from "next/navigation";
import { getOwnedProjects } from "@/lib/server/project-access"; // Adjust this import path to your server file
import ProjectHistoryClient from "./ProjectHistoryClient";

export const dynamic = "force-dynamic"; // Ensure cookie-based sessions are evaluated dynamically

export default async function ProjectHistoryPage() {
  const { user, projectsList } = await getOwnedProjects();

  // Redirect to login if user session is invalid
  if (!user || !projectsList) {
    redirect("/login");
  }

  return <ProjectHistoryClient initialProjects={projectsList} />;
}