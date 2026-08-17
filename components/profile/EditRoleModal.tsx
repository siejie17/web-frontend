"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

import ModalActions from "./ModalActions";
import PremiumModal from "./PremiumModal";

export type RoleOption = {
  id: number;
  name?: string;
  label?: string;
  display_name?: string;
  title?: string;
  level?: number;
  description?: string;
};

const OTHERS_VALUE = "others";

export type RoleSavePayload = {
  roleId: number | null;
  customRole?: string;
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
  onSave: (payload: RoleSavePayload) => Promise<void>;
}) {
  const [selectedRoleId, setSelectedRoleId] = useState(
    currentRoleId ? String(currentRoleId) : ""
  );
  const [expandedId, setExpandedId] = useState<string | null>(
    currentRoleId ? String(currentRoleId) : null
  );
  const [customRole, setCustomRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedRoleId(currentRoleId ? String(currentRoleId) : "");
    setExpandedId(currentRoleId ? String(currentRoleId) : null);
  }, [currentRoleId]);

  const roleOptions = useMemo(
    () => [
      ...roles.map((role) => ({
        id: String(role.id),
        label: formatRoleLabel(role),
        description: role.description,
      })),
      {
        id: OTHERS_VALUE,
        label: "Others",
        description:
          "Choose this if your role isn't listed, then enter it below.",
      },
    ],
    [roles]
  );

  const selectedRole = useMemo(
    () => roles.find((role) => String(role.id) === selectedRoleId),
    [roles, selectedRoleId]
  );
  const isOthers = selectedRoleId === OTHERS_VALUE;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedRoleId) {
      setError("Please choose a role.");
      return;
    }

    if (isOthers) {
      const trimmed = customRole.trim();
      if (!trimmed) {
        setError("Please enter your custom role.");
        return;
      }
      await submit({ roleId: null, customRole: formatTitleCase(trimmed) });
      return;
    }

    const roleId = Number(selectedRoleId);
    if (Number.isNaN(roleId)) {
      setError("Please choose a valid role.");
      return;
    }

    await submit({ roleId });
  };

  const submit = async (payload: RoleSavePayload) => {
    setSaving(true);
    setError(null);

    try {
      await onSave(payload);
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
        <div>
          <label
            id="edit-role-label"
            className="mb-2 block text-sm font-medium text-[#17201B]"
          >
            Role
          </label>

          {loadingRoles ? (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-12 animate-pulse rounded-xl border border-[#EFEDE6] bg-[#FAFAF8]"
                />
              ))}
            </div>
          ) : roles.length === 0 ? (
            <p className="rounded-xl border border-[#EFEDE6] bg-[#FAFAF8] px-3.5 py-3 text-sm text-[#5B655F]">
              No roles are available right now.
            </p>
          ) : (
            <div
              role="listbox"
              aria-labelledby="edit-role-label"
              className="divide-y divide-[#EFEDE6] overflow-hidden rounded-xl border border-[#EFEDE6] bg-white"
            >
              {roleOptions.map((role) => {
                const isSelected = selectedRoleId === role.id;
                const isExpanded = expandedId === role.id;
                const hasDescription = Boolean(role.description);

                return (
                  <div key={role.id} className="bg-white">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      aria-expanded={isExpanded}
                      disabled={saving}
                      onClick={() => {
                        setSelectedRoleId(role.id);
                        setExpandedId(isExpanded ? null : role.id);
                      }}
                      className={`flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-70 ${
                        isSelected ? "bg-[#2F6B4F]/5" : "hover:bg-[#FAFAF8]"
                      }`}
                    >
                      <span
                        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isSelected
                            ? "border-[#2F6B4F] bg-[#2F6B4F]"
                            : "border-[#C9D3CC] bg-white"
                        }`}
                      >
                        {isSelected && <Check size={11} strokeWidth={3} className="text-white" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm font-medium ${
                            isSelected ? "text-[#2F6B4F]" : "text-[#17201B]"
                          }`}
                        >
                          {role.label}
                        </span>
                      </span>
                      {hasDescription && (
                        <ChevronDown
                          size={16}
                          className={`shrink-0 text-[#9BA39C] transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </button>

                    {hasDescription && (
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            key="description"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="bg-[#FAFAF8] px-3.5 pb-3 pl-9 text-[13px] leading-relaxed text-[#8A938C]">
                              {role.description}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isOthers && (
          <div className="space-y-1.5">
            <label
              htmlFor="custom-role-input"
              className="block text-sm font-medium text-[#17201B]"
            >
              Custom role
            </label>
            <input
              id="custom-role-input"
              autoFocus
              value={customRole}
              onChange={(event) => setCustomRole(event.target.value)}
              disabled={saving}
              placeholder="e.g. Senior Project Manager"
              className="w-full rounded-xl border border-[#E7E5DE] bg-white px-3.5 py-2.5 text-sm text-[#17201B] outline-none transition-colors placeholder:text-[#9BA39C] focus:border-[#2F6B4F] focus:ring-4 focus:ring-[#2F6B4F]/10 disabled:cursor-not-allowed disabled:bg-[#FAFAF8]"
            />
          </div>
        )}

        <div className="rounded-2xl border border-[#EFEDE6] bg-[#FAFAF8] px-3.5 py-3 text-sm text-[#5B655F]">
          <span className="block text-[11px] uppercase tracking-widest text-[#9BA39C]">
            Selected role
          </span>
          <span className="mt-1 block font-medium text-[#17201B]">
            {isOthers
              ? customRole.trim()
                ? formatTitleCase(customRole.trim())
                : "Enter your custom role"
              : selectedRole
                ? formatRoleLabel(selectedRole)
                : "No role selected"}
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

export function formatTitleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}
