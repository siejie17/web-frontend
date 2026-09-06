export async function administrationApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/be-api/administration/${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Unable to complete this request.");
  return data as T;
}

export type SystemRole = "user" | "admin" | "super_admin" | "facilitator_admin";

export type AdminUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  system_role: SystemRole;
  email_verified_at?: string | null;
  created_at?: string;
  facilitator_assignments?: Array<{
    id: number;
    project_id: number;
    user_id: number;
    status: "active" | "revoked";
    project?: {
      id: number;
      name: string;
      assessment_status: string;
      owner?: Pick<AdminUser, "id" | "first_name" | "last_name" | "email">;
    };
  }>;
};

export type Assessment = {
  id: number;
  name: string;
  rating: number;
  target_certification?: string | null;
  assessment_status: string;
  created_at: string;
  owner?: AdminUser;
  facilitator_assignments?: Array<{
    id: number;
    user_id: number;
    status: "active" | "revoked";
    facilitator?: AdminUser;
  }>;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
};
