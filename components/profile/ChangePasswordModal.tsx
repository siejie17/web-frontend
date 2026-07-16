"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import ModalActions from "./ModalActions";
import PremiumModal from "./PremiumModal";

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] uppercase tracking-[0.1em] text-[#9BA39C]"
      >
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoFocus={autoFocus}
        autoComplete={id === "current-password" ? "current-password" : "new-password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#E7E5DE] bg-white px-3.5 py-2.5 text-sm text-[#17201B] outline-none transition-colors focus:border-[#2F6B4F] focus:ring-4 focus:ring-[#2F6B4F]/10"
        placeholder="••••••••"
      />
    </div>
  );
}

export default function ChangePasswordModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (currentPassword: string, newPassword: string) => Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(currentPassword, newPassword);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumModal
      title="Change password"
      description="Use at least 8 characters."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          id="current-password"
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoFocus
        />
        <PasswordField
          id="new-password"
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
        />
        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />

        {error && <p className="text-sm text-[#B3413B]">{error}</p>}

        <ModalActions saving={saving} onClose={onClose} saveLabel="Update password" />
      </form>
    </PremiumModal>
  );
}