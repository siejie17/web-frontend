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
    structure?: string;
    size?: string;
    budget?: string;
    adjusted_cost?: string;
    rating?: number;
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

async function fetchAuthedJson<T>(path: string, token: string): Promise<T | null> {
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

    const data = await fetchAuthedJson<{ user?: AuthUser } | AuthUser>("/me", token);

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

    const data = await fetchAuthedJson<ProjectsResponse>(`/users/${userId}/projects`, token);

    if (!data) {
        return [];
    }

    return data.projectsData ?? data.projects ?? [];
}

export async function getOwnedProject(projectId: string) {
    const user = await getCurrentUser();

    if (!user) {
        return { user: null, project: null };
    }

    const projects = await getUserProjects(user.id);
    const project = projects.find((item) => String(item.id) === projectId) ?? null;

    const selectedProject = await fetchAuthedJson<ProjectData>(`/projects/${projectId}`, await getSessionToken() ?? "");

    console.log("Selected Project:", selectedProject);

    return { user, project };
}
