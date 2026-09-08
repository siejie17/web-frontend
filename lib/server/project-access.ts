import "server-only";

import { cookies } from "next/headers";
import { ProjectData } from "@/types/project";

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
  certificate?: {
    certificate_number: string;
    certification_level: string;
    approved_actual_score: number;
    maximum_score: number;
    status: "issued" | "revoked";
    verification_code: string;
    issued_at?: string | null;
  } | null;
  changed_cert?: boolean;
  status?: string;
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

  return { user, project, selectedProject, isShared };
}

type ActualRatingsResponse = {
  success?: boolean;
  ratings?: Record<string, number>;
};

/**
 * Fetches actual assessment marks for a set of projects in ONE request,
 * instead of firing a full /projects/{id} call per project (the old N+1
 * pattern). The backend loads all actual answers and computes green-element
 * marks in a single pass.
 */
async function fetchActualRatings(
  projectIds: number[],
  token: string,
): Promise<Record<string, number>> {
  if (projectIds.length === 0) return {};

  const ids = Array.from(new Set(projectIds));
  const data = await fetchAuthedJson<ActualRatingsResponse>(
    `/users/0/projects/actual-ratings?project_ids=${ids.join(",")}`,
    token,
  );

  if (!data || !data.ratings) return {};

  return data.ratings;
}

async function enrichWithActualRatings(
  projectsList: Project[],
  token: string,
): Promise<Project[]> {
  if (projectsList.length === 0) return [];

  const idList = projectsList
    .map((p) => Number(p.id))
    .filter((id) => Number.isFinite(id));

  const ratingMap = await fetchActualRatings(idList, token);

  return projectsList.map((p) => ({
    ...p,
    actual_rating:
      ratingMap[String(p.id)] ??
      ratingMap[Number(p.id)] ??
      p.actual_rating,
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

  return { user, sharedProjectsList: enriched };
}
