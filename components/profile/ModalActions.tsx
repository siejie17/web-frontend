"use client";

import { Check, Loader2 } from "lucide-react";

export default function ModalActions({
  saving,
  onClose,
  saveLabel = "Save changes",
}: {
  saving: boolean;
  onClose: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="rounded-full px-4 py-2 text-sm font-medium text-[#6B756E] transition-colors hover:bg-[#F4F3EF] disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-full bg-[#17201B] px-4 py-2 text-sm font-medium text-white shadow-[0_1px_2px_rgba(23,32,27,0.1)] transition-all duration-200 hover:bg-[#2F6B4F] hover:shadow-[0_4px_14px_rgba(47,107,79,0.35)] disabled:opacity-70"
      >
        {saving ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Saving
          </>
        ) : (
          <>
            <Check size={14} />
            {saveLabel}
          </>
        )}
      </button>
    </div>
  );
}