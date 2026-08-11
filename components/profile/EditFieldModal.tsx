"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import ModalActions from "./ModalActions";
import PremiumModal from "./PremiumModal";

export default function EditFieldModal({
  label,
  initialValue,
  onClose,
  onSave,
}: {
  label: string;
  initialValue: string;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();

    if (!trimmed) {
      setError(`${label} can't be empty.`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumModal title={`Edit ${label.toLowerCase()}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="edit-field-input"
            className="mb-1.5 block text-[11px] uppercase tracking-[0.1em] text-[#9BA39C]"
          >
            {label}
          </label>
          <input
            id="edit-field-input"
            type="text"
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-full rounded-xl border border-[#E7E5DE] bg-white px-3.5 py-2.5 text-sm text-[#17201B] outline-none transition-colors focus:border-[#2F6B4F] focus:ring-4 focus:ring-[#2F6B4F]/10"
            placeholder={`Enter your ${label.toLowerCase()}`}
          />
        </div>

        {error && <p className="text-sm text-[#B3413B]">{error}</p>}

        <ModalActions saving={saving} onClose={onClose} />
      </form>
    </PremiumModal>
  );
}