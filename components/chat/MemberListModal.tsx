"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Crown, LoaderCircle, UserMinus, X } from "lucide-react";
import type { MemberWithUser, ProjectRole, UserRole } from "@/lib/mockChat/types";
import { Avatar } from "./Avatar";
import { RoleBadge } from "./RoleBadge";
import type { ToastKind } from "./Toast";

type RoleOption = {
  id: number;
  name: ProjectRole;
  display_name: string;
  description?: string | null;
  level: number;
};

export function MemberListModal({
  members,
  currentUserId,
  canManageMembers,
  canManageRoles,
  onClose,
  onRemoveMember,
  onChangeMemberRole,
  onToast,
}: {
  members: MemberWithUser[];
  currentUserId: string;
  canManageMembers: boolean;
  canManageRoles: boolean;
  onClose: () => void;
  onRemoveMember: (userId: string) => Promise<void>;
  onChangeMemberRole: (userId: string, roleId: number) => Promise<void>;
  onToast: (kind: ToastKind, message: string) => void;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  useEffect(() => {
    if (!canManageRoles) return;

    let active = true;
    setRolesLoading(true);
    fetch("/be-api/roles", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message ?? "Unable to load roles.");
        if (active) setRoles(Array.isArray(data?.roles) ? data.roles : []);
      })
      .catch((error) => {
        if (active) {
          onToast("error", error instanceof Error ? error.message : "Unable to load roles.");
        }
      })
      .finally(() => {
        if (active) setRolesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canManageRoles, onToast]);

  const rolesByName = useMemo(
    () => new Map(roles.map((role) => [role.name, role])),
    [roles],
  );

  const remove = async (m: MemberWithUser) => {
    if (!canManageMembers || m.isOwner) return;
    setRemovingId(m.user.id);
    try {
      await onRemoveMember(m.user.id);
      onToast("success", `${m.user.fullName} was removed from the project.`);
    } catch {
      onToast("error", "Could not remove the member. Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  const changeRole = async (member: MemberWithUser, nextRoleId: number) => {
    if (!canManageRoles || member.isOwner || member.membership.roleId === nextRoleId) return;

    const nextRole = roles.find((role) => role.id === nextRoleId);
    if (!nextRole) return;

    if (
      nextRole.name === "gbi_facilitator" &&
      !window.confirm(`Grant ${member.user.fullName} full project access as GBI Facilitator?`)
    ) {
      return;
    }

    setSavingRoleId(member.user.id);
    try {
      await onChangeMemberRole(member.user.id, nextRoleId);
      onToast("success", `${member.user.fullName}'s role was changed to ${nextRole.display_name}.`);
    } catch (error) {
      onToast("error", error instanceof Error ? error.message : "Could not update the member role.");
    } finally {
      setSavingRoleId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-[#1E2621]/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_24px_60px_rgba(30,38,33,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#EFEDE6] px-6 py-4">
          <div>
            <p
              className="text-[15px] font-semibold text-[#1E2621]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Project members
            </p>
            <p className="text-[12px] text-[#8A938C]">
              {members.length} member{members.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8A938C] transition-colors hover:bg-[#F6F6F2] hover:text-[#1E2621]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {members.map((m) => {
            const me = m.user.id === currentUserId;
            return (
              <div
                key={m.user.id}
                className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-[#FBFAF7]"
              >
                <Avatar name={m.user.fullName} size={40} showOnline src={m.user.avatar} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13.5px] font-semibold text-[#1E2621]">
                      {m.user.fullName}
                    </span>
                    {m.isOwner && (
                      <span title="Project owner" className="text-[#C08A3E]">
                        <Crown size={13} />
                      </span>
                    )}
                    {me && (
                      <span className="text-[10.5px] text-[#8A938C]">(you)</span>
                    )}
                  </div>
                  <span className="block truncate text-[11.5px] text-[#8A938C]">
                    {m.user.email}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {canManageRoles && !m.isOwner ? (
                    <div className="relative">
                      {rolesLoading ? (
                        <span className="flex h-8 w-34 items-center justify-center rounded-lg border border-[#DDE2DD] bg-[#F9FAF8] text-[#8A938C]">
                          <LoaderCircle className="animate-spin" size={14} />
                        </span>
                      ) : (
                        <select
                          value={m.membership.roleId ?? rolesByName.get(m.membership.role)?.id ?? ""}
                          onChange={(event) => void changeRole(m, Number(event.target.value))}
                          disabled={roles.length === 0 || savingRoleId === m.user.id || removingId === m.user.id}
                          aria-label={`Change ${m.user.fullName}'s project role`}
                          title={rolesByName.get(m.membership.role)?.description ?? "Project role"}
                          className="h-8 w-34 appearance-none rounded-lg border border-[#DDE2DD] bg-white pl-2.5 pr-7 text-[11px] font-semibold text-[#425048] outline-none transition-colors hover:border-[#AEBAB1] focus:border-[#3E6B52] focus:ring-2 focus:ring-[#3E6B52]/15 disabled:cursor-wait disabled:bg-[#F6F6F2] disabled:text-[#8A938C]"
                        >
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.display_name}
                            </option>
                          ))}
                        </select>
                      )}
                      {savingRoleId === m.user.id ? (
                        <LoaderCircle className="pointer-events-none absolute right-2 top-2 animate-spin text-[#3E6B52]" size={14} />
                      ) : rolesLoading ? (
                        <span className="absolute inset-0" aria-hidden />
                      ) : (
                        <ChevronDown className="pointer-events-none absolute right-2 top-2 text-[#7C8880]" size={14} />
                      )}
                    </div>
                  ) : (
                    <RoleBadge role={projectRoleLabel(m.membership.role) as UserRole} />
                  )}
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    disabled={!canManageMembers || m.isOwner || removingId === m.user.id || savingRoleId === m.user.id}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-transparent text-[#A9B0AA] transition-all ${
                      canManageMembers && !m.isOwner
                        ? "hover:bg-[#FBEAE4] hover:text-[#B4483C]"
                        : "hidden"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                    aria-label={`Remove ${m.user.fullName}`}
                    title="Remove member"
                  >
                    {removingId === m.user.id ? <LoaderCircle size={14} className="animate-spin" /> : <UserMinus size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {!canManageMembers && !canManageRoles && (
          <p className="border-t border-[#EFEDE6] px-6 py-3 text-center text-[11.5px] text-[#8A938C]">
            Only the project owner can manage members.
          </p>
        )}
      </motion.div>
    </div>
  );
}

function projectRoleLabel(role: ProjectRole): UserRole {
  const labels: Record<ProjectRole, UserRole> = {
    member: "Member",
    developer: "Developer",
    quantity_surveyor: "Quantity Surveyor",
    gbi_facilitator: "GBI Facilitator",
  };

  return labels[role];
}
