"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import ModalActions from "./ModalActions";
import PremiumModal from "./PremiumModal";

export type RoleOption = {
  id: number;
  name?: string;
  label?: string;
  display_name?: string;
  title?: string;
  level?: number;
};

export default function EditRoleModal({
  roles,
  currentRoleId,
  loadingRoles,
  onClose,
  onSave,
}: {
  roles: RoleOption[];
  currentRoleId: number | null;
  loadingRoles: boolean;
  onClose: () => void;
  onSave: (roleId: number) => Promise<void>;
}) {
  const [selectedRoleId, setSelectedRoleId] = useState(
    currentRoleId ? String(currentRoleId) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedRoleId(currentRoleId ? String(currentRoleId) : "");
  }, [currentRoleId]);

  const selectedRole = useMemo(
    () => roles.find((role) => String(role.id) === selectedRoleId),
    [roles, selectedRoleId]
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedRoleId) {
      setError("Please choose a role.");
      return;
    }

    const roleId = Number(selectedRoleId);
    if (Number.isNaN(roleId)) {
      setError("Please choose a valid role.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(roleId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumModal
      title="Edit role"
      description="Choose the account role that should appear on your profile."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="edit-role-select"
            className="text-sm font-medium text-[#17201B]"
          >
            Role
          </label>

          <select
            id="edit-role-select"
            autoFocus
            value={selectedRoleId}
            onChange={(event) => setSelectedRoleId(event.target.value)}
            disabled={loadingRoles || saving}
            className="w-full rounded-xl border border-[#E7E5DE] bg-white px-3.5 py-2.5 text-sm text-[#17201B] outline-none transition-colors focus:border-[#2F6B4F] focus:ring-4 focus:ring-[#2F6B4F]/10 disabled:cursor-not-allowed disabled:bg-[#FAFAF8]"
          >
            <option value="">
              {loadingRoles ? "Loading roles..." : "Choose a role"}
            </option>

            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {formatRoleLabel(role)}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-[#EFEDE6] bg-[#FAFAF8] px-3.5 py-3 text-sm text-[#5B655F]">
          <span className="block text-[11px] uppercase tracking-[0.1em] text-[#9BA39C]">
            Selected role
          </span>
          <span className="mt-1 block font-medium text-[#17201B]">
            {selectedRole ? formatRoleLabel(selectedRole) : "No role selected"}
          </span>
        </div>

        {error && <p className="text-sm text-[#B3413B]">{error}</p>}

        <ModalActions
          saving={saving}
          onClose={onClose}
          saveLabel="Update role"
        />
      </form>
    </PremiumModal>
  );
}

export function formatRoleLabel(role: RoleOption) {
  return (
    role.label ??
    role.display_name ??
    role.title ??
    role.name ??
    `Role ${role.id}`
  );
}
