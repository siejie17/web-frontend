"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";

export default function EvidenceRemovalDialog({
  fileName,
  busy,
  onConfirm,
  onCancel,
}: {
  fileName: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#17201b]/45 p-4 backdrop-blur-[2px]" role="presentation">
      <div role="alertdialog" aria-modal="true" aria-labelledby="remove-evidence-title" aria-describedby="remove-evidence-description" className="w-full max-w-sm rounded-3xl border border-white/70 bg-white p-6 shadow-[0_24px_70px_rgba(23,32,27,0.28)]">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 size={20} /></span>
        <h3 id="remove-evidence-title" className="mt-4 text-lg font-bold text-[#243129]">Confirm evidence removal</h3>
        <p id="remove-evidence-description" className="mt-2 text-sm leading-6 text-[#6d796f]">
          Are you sure you want to remove <strong className="break-all text-[#344139]">{fileName}</strong>? This file will no longer be available as evidence.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} onClick={onCancel} className="inline-flex items-center justify-center rounded-xl border border-[#d8ddd8] bg-white px-4 py-2.5 text-sm font-semibold text-[#526057] transition hover:bg-[#f5f7f4] disabled:opacity-50">No, keep</button>
          <button type="button" disabled={busy} onClick={onConfirm} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">
            {busy && <LoaderCircle size={14} className="animate-spin" />}
            {busy ? "Removing…" : "Yes, remove"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
