import "server-only";

import { cookies } from "next/headers";
import { ProjectData } from "@/types/project";
import { computeActualMarks } from "@/lib/assessment-utils";

type AuthUser = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
};

export type Project = {
  id: number;
  name: string;
  year?: string;
  location?: string;
  category?: string;
  classification?: string;
  building_type?: string;
  type_name?: string;
  structure?: string;
  size?: string;
  budget?: string;
  adjusted_cost?: string;
  rating?: number;
  actual_rating?: number;
  target_certification?: string;
  certifications?: Record<string, unknown>;
  created_at?: string;
};

type ProjectsResponse = {
  projectsData?: Project[];
  projects?: Project[];
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

function getApiBaseUrl() {
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  return apiBaseUrl;
}

async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get("session_token")?.value ?? null;
}

async function fetchAuthedJson<T>(
  path: string,
  token: string,
): Promise<T | null> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return null;
  }

  return data as T;
}

export async function getCurrentUser() {
  const token = await getSessionToken();

  if (!token) {
    return null;
  }

  const data = await fetchAuthedJson<{ user?: AuthUser } | AuthUser>(
    "/me",
    token,
  );

  if (!data) {
    return null;
  }

  if ("user" in data) {
    return data.user ?? null;
  }

  return data as AuthUser;
}

export async function getUserProjects(userId: string) {
  const token = await getSessionToken();

  if (!token) {
    return [];
  }

  const data = await fetchAuthedJson<ProjectsResponse>(
    `/users/${userId}/projects`,
    token,
  );

  if (!data) {
    return [];
  }

  return data.projectsData ?? data.projects ?? [];
}

export async function getSharedProjects(userId: string) {
  const token = await getSessionToken();

  if (!token) {
    return [];
  }

  const data = await fetchAuthedJson<ProjectsResponse>(
    `/users/${userId}/projects/added-to-me`,
    token,
  );

  if (!data) {
    return [];
  }

  return data.projectsData ?? data.projects ?? [];
}

export async function getOwnedProject(projectId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, project: null, selectedProject: null, isShared: false };
  }

  const [ownedProjects, sharedProjects] = await Promise.all([
    getUserProjects(user.id),
    getSharedProjects(user.id),
  ]);

  const project =
    ownedProjects.find((item) => String(item.id) === projectId) ??
    sharedProjects.find((item) => String(item.id) === projectId) ??
    null;

  const isShared =
    !ownedProjects.some((item) => String(item.id) === projectId) &&
    sharedProjects.some((item) => String(item.id) === projectId);

  const selectedProject = await fetchAuthedJson<ProjectData>(
    `/projects/${projectId}`,
    (await getSessionToken()) ?? "",
  );

  console.log("Selected Project:", selectedProject);

  return { user, project, selectedProject, isShared };
}

async function fetchProjectActualMarks(
  projectId: number,
  token: string,
): Promise<number | null> {
  const data = await fetchAuthedJson<any>(
    `/projects/${projectId}`,
    token,
  );

  if (!data) return null;

  const greenElements = data?.green_elements ?? [];
  const projectData = data?.projectData ?? data;

  if (!Array.isArray(greenElements) || greenElements.length === 0) return null;

  return computeActualMarks(greenElements, projectData);
}

async function enrichWithActualRatings(
  projectsList: Project[],
  token: string,
): Promise<Project[]> {
  const actualRatings = await Promise.all(
    projectsList.map(async (p) => {
      const marks = await fetchProjectActualMarks(p.id, token);
      return { id: p.id, marks };
    }),
  );

  const ratingMap: Record<number, number | null> = {};
  actualRatings.forEach((r) => {
    ratingMap[r.id] = r.marks;
  });

  return projectsList.map((p) => ({
    ...p,
    actual_rating: ratingMap[p.id] ?? p.actual_rating,
  }));
}

export async function getOwnedProjects() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, projects: null };
  }

  const token = await getSessionToken();
  if (!token) {
    return { user, projectsList: [] };
  }

  const projectsList = await getUserProjects(user.id);
  const enriched = await enrichWithActualRatings(projectsList, token);

  console.log(enriched);

  return { user, projectsList: enriched };
}

export async function getSharedProjectsHistory() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, projects: null };
  }

  const token = await getSessionToken();
  if (!token) {
    return { user, sharedProjectsList: [] };
  }

  const sharedProjectsList = await getSharedProjects(user.id);
  const enriched = await enrichWithActualRatings(sharedProjectsList, token);

  console.log(enriched);

  return { user, sharedProjectsList: enriched };
}
