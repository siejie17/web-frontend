"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AtSign,
  Calendar,
  ChevronRight,
  ClipboardList,
  Info,
  KeyRound,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";

import ChangePasswordModal from "@/components/profile/ChangePasswordModal";
import EditFieldModal from "@/components/profile/EditFieldModal";
import EditPictureModal from "@/components/profile/EditPictureModal";
import EditRoleModal, {
  formatRoleLabel,
  type RoleOption,
} from "@/components/profile/EditRoleModal";
import GlassPanel from "@/components/profile/GlassPanel";
import InfoTile from "@/components/profile/InfoTile";
import ProfileHero from "@/components/profile/ProfileHero";
import { BackButton } from "@/components/ui/BackButton";

type ProfileOverrides = {
  first_name?: string;
  last_name?: string;
  profile_pic?: string;
  role_id?: number | null;
  role_label?: string;
};

const QUICK_LINKS: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/assessments/new",
    label: "New Assessment",
    description: "Start scoring a project",
    icon: ClipboardList,
  },
  {
    href: "/assessments/history",
    label: "History",
    description: "Review past assessments",
    icon: Calendar,
  },
  {
    href: "/about",
    label: "About",
    description: "Learn more about ProFormaX",
    icon: Info,
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9BA39C]">
      {children}
    </h2>
  );
}

function QuickLinkCard({
  href,
  label,
  description,
  icon: Icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-4 rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-[0_4px_12px_rgba(30,38,33,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#C9D3CC] hover:shadow-[0_10px_24px_rgba(30,38,33,0.08)] active:translate-y-0"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3E6B52]/10 text-[#3E6B52] transition-colors group-hover:bg-[#3E6B52] group-hover:text-white">
          <Icon size={18} />
        </span>
        <ChevronRight
          size={16}
          className="text-[#C9D3CC] transition-all group-hover:translate-x-0.5 group-hover:text-[#3E6B52]"
        />
      </div>
      <div>
        <p className="text-[13.5px] font-semibold text-[#1E2621]">{label}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[#8A938C]">
          {description}
        </p>
      </div>
    </Link>
  );
}

export default function ProfileClient() {
  const { user } = useAuth();

  const [overrides, setOverrides] = useState<ProfileOverrides>({});
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [editingField, setEditingField] = useState<
    "first_name" | "last_name" | null
  >(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isActive = true;

    const fetchRoles = async () => {
      try {
        setLoadingRoles(true);
        const res = await fetch("/be-api/roles", {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.message ?? "Unable to fetch roles");
        }

        const fetchedRoles = Array.isArray(data?.roles) ? data.roles : [];

        if (!isActive) {
          return;
        }

        setRoles(fetchedRoles);
      } catch (error) {
        console.error("Error fetching roles:", error);
        if (isActive) {
          setMessage("Could not load roles right now.");
        }
      } finally {
        if (isActive) {
          setLoadingRoles(false);
        }
      }
    };

    fetchRoles();

    return () => {
      isActive = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      window.location.href = "/login";
    }
  }, [user]);

  // Generic PATCH used by the name and picture modals. Adjust the endpoint
  // to match whatever route your API actually exposes for profile updates.
  const updateProfile = async (payload: Record<string, string>) => {
    if (!user) {
      throw new Error("Not signed in");
    }

    const res = await fetch(`/be-api/user-profile?userId=${user.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.message ?? "Unable to save changes.");
    }

    return data;
  };

  const currentRoleId =
    overrides.role_id ??
    getUserRoleId(user?.role_id ?? null, user?.role ?? null) ??
    getRoleIdFromLabel(getUserRoleLabel(user?.role ?? null), roles) ??
    null;
  const currentRoleLabel =
    overrides.role_label ??
    getRoleLabelFromId(currentRoleId, roles) ??
    getUserRoleLabel(user?.role ?? null) ??
    "Member";

  const profilePhoto =
    overrides.profile_pic ?? user?.profile_pic ?? user?.profile_picture ?? "";
  const firstName = overrides.first_name ?? user?.first_name ?? "";
  const lastName = overrides.last_name ?? user?.last_name ?? "";
  const initials = getInitials(firstName, lastName, user?.name);
  const fullName = getFullName(firstName, lastName, user?.name);
  const memberSince = getMemberSince(user?.created_at);

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-[#8A9089]">Redirecting to login…</p>
      </div>
    );
  }

  return (
    <div
      className="py-4"
    >
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-2">
        <BackButton
          text="Dashboard"
          redirect="/dashboard"
        />

        {/* ---------------- Profile Hero ---------------- */}
        <ProfileHero
          fullName={fullName}
          role={currentRoleLabel}
          memberSince={memberSince}
          photo={profilePhoto}
          initials={initials}
          emailVerified={Boolean(user.email_verified_at)}
          onEditPhoto={() => setShowPictureModal(true)}
        />

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center justify-between overflow-hidden rounded-2xl border border-[#E7E5DE] bg-white px-4 py-3 text-sm text-[#17201B] shadow-sm"
            >
              {message}
              <button
                type="button"
                onClick={() => setMessage(null)}
                aria-label="Dismiss"
                className="text-[#9BA39C] transition-colors hover:text-[#17201B]"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <GlassPanel className="p-5 sm:p-6">
          <SectionLabel>Account</SectionLabel>
          <div className="mt-3 grid gap-1 sm:grid-cols-2">
            <InfoTile
              icon={User}
              label="First name"
              value={firstName || "Not provided"}
              onEdit={() => setEditingField("first_name")}
            />
            <InfoTile
              icon={Users}
              label="Last name"
              value={lastName || "Not provided"}
              onEdit={() => setEditingField("last_name")}
            />
          </div>
          <div className="mt-1 space-y-1">
            <InfoTile
              icon={ShieldCheck}
              label="Role"
              value={currentRoleLabel}
              onEdit={() => setShowRoleModal(true)}
            />
            <InfoTile
              icon={AtSign}
              label="Email"
              value={user.email || "Not provided"}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[#2F6B4F] transition-colors hover:bg-[#2F6B4F]/8"
          >
            <KeyRound size={14} />
            Change password
          </button>
        </GlassPanel>

        {/* ---------------- Quick Links ---------------- */}
        <div>
          <SectionLabel>Quick Links</SectionLabel>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {QUICK_LINKS.map((link) => (
              <QuickLinkCard key={link.href} {...link} />
            ))}
          </div>
        </div>
      </div>

      {editingField && (
        <EditFieldModal
          label={editingField === "first_name" ? "First name" : "Last name"}
          initialValue={editingField === "first_name" ? firstName : lastName}
          onClose={() => setEditingField(null)}
          onSave={async (value) => {
            await updateProfile({ [editingField]: value });
            setOverrides((prev) => ({ ...prev, [editingField]: value }));
            setMessage(
              `${editingField === "first_name" ? "First" : "Last"} name updated.`
            );
          }}
        />
      )}

      {showPictureModal && (
        <EditPictureModal
          currentPhoto={profilePhoto}
          fallbackInitials={initials}
          onClose={() => setShowPictureModal(false)}
          onSave={async (base64) => {
            await updateProfile({ profile_pic: base64 });
            setOverrides((prev) => ({ ...prev, profile_pic: base64 }));
            setMessage("Profile picture updated.");
          }}
        />
      )}

      {showRoleModal && (
        <EditRoleModal
          roles={roles}
          currentRoleId={currentRoleId}
          loadingRoles={loadingRoles}
          onClose={() => setShowRoleModal(false)}
          onSave={async ({ roleId, customRole }) => {
            if (!user) {
              throw new Error("Not signed in");
            }

            const res = await fetch(`/be-api/users/${user.id}/role`, {
              method: "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                customRole !== undefined
                  ? { custom_role: customRole }
                  : { role_id: roleId }
              ),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
              throw new Error(data?.message ?? "Unable to update role.");
            }

            const roleLabel =
              customRole !== undefined
                ? customRole
                : (() => {
                    const selectedRole = roles.find(
                      (role) => role.id === roleId
                    );
                    return selectedRole
                      ? formatRoleLabel(selectedRole)
                      : undefined;
                  })();

            setOverrides((prev) => ({
              ...prev,
              role_id: customRole !== undefined ? null : roleId,
              role_label: roleLabel ?? prev.role_label,
            }));
            setMessage("Role updated.");
          }}
        />
      )}

      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSave={async (currentPassword, newPassword) => {
            if (!user) {
              throw new Error("Not signed in");
            }

            const res = await fetch(`/be-api/user-password?userId=${user.id}`, {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
              }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
              throw new Error(data?.message ?? "Unable to update password.");
            }

            setMessage("Password updated.");
          }}
        />
      )}
    </div>
  );
}

function getFullName(firstName?: string, lastName?: string, name?: string) {
  const parts = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (parts) {
    return parts;
  }

  return name || "Profile";
}

function getInitials(firstName?: string, lastName?: string, name?: string) {
  const source =
    [firstName, lastName].filter(Boolean).join(" ").trim() || name || "P";
  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getMemberSince(createdAt?: string) {
  if (!createdAt) return undefined;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.getFullYear().toString();
}

function getUserRoleId(
  roleId?: number | null,
  role?: { id?: number } | string | null
) {
  if (typeof roleId === "number") {
    return roleId;
  }

  if (role && typeof role === "object" && typeof role.id === "number") {
    return role.id;
  }

  return null;
}

function getUserRoleLabel(
  role?:
    | {
        id?: number;
        name?: string;
        display_name?: string;
        title?: string;
        level?: number;
      }
    | string
    | null
) {
  if (!role) {
    return null;
  }

  if (typeof role === "string") {
    return role;
  }

  return (
    role.display_name ??
    role.title ??
    role.name ??
    (typeof role.level === "number" ? `Level ${role.level}` : null)
  );
}

function getRoleLabelFromId(
  roleId: number | null,
  roles: RoleOption[]
) {
  if (roleId === null) {
    return null;
  }

  const role = roles.find((item) => item.id === roleId);
  return role ? formatRoleLabel(role) : null;
}

function getRoleIdFromLabel(
  roleLabel: string | null,
  roles: RoleOption[]
) {
  if (!roleLabel) {
    return null;
  }

  const normalizedLabel = normalizeRoleValue(roleLabel);
  const role = roles.find((item) => {
    const candidates = [
      item.label,
      item.display_name,
      item.title,
      item.name,
    ].filter(Boolean) as string[];

    return candidates.some(
      (candidate) => normalizeRoleValue(candidate) === normalizedLabel
    );
  });

  return role?.id ?? null;
}

function normalizeRoleValue(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}
