export type UserRole = "user" | "admin" | "super_admin";

export function normalizeRole(role: unknown): UserRole {
  return role === "admin" || role === "super_admin" ? role : "user";
}

export function dashboardForRole(role: unknown) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "super_admin") return "/super-admin";
  if (normalizedRole === "admin") return "/admin";
  return "/dashboard";
}

export function canAccessPath(role: unknown, pathname: string) {
  const normalizedRole = normalizeRole(role);

  if (pathname.startsWith("/super-admin")) {
    return normalizedRole === "super_admin";
  }

  if (pathname.startsWith("/admin")) {
    return normalizedRole === "admin" || normalizedRole === "super_admin";
  }

  return true;
}
