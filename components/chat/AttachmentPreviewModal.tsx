"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import type { Attachment } from "@/lib/mockChat/types";
import { formatFileSize } from "@/lib/mockChat/assets";
import { downloadAttachment } from "./downloadAttachment";

const SPREADSHEET_ROWS = [
  ["Facade glazing", "Facade", "1", "lot", "182,000"],
  ["Curtain wall system", "Facade", "1", "lot", "1,240,000"],
  ["Low-VOC paint", "Finishes", "1,200", "m2", "21,600"],
  ["Acoustic ceiling panels", "Finishes", "800", "m2", "76,000"],
  ["Recycled steel reinforcement", "Structure", "42", "tonne", "159,600"],
  ["Rainwater harvesting", "Landscape", "1", "lot", "48,200"],
];

export function AttachmentPreviewModal({
  attachment,
  onClose,
}: {
  attachment: Attachment | null;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(1);
  }, [attachment?.id]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!attachment) return;
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [attachment, handleKey]);

  if (!attachment) return null;

  const clampZoom = (z: number) => Math.min(3, Math.max(1, z));

  return (
    <div className="fixed inset-0 z-80">
      <AnimatePresence>
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-[#080D0A]/80 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-white">
                  {attachment.filename}
                </p>
                <p className="text-[11.5px] text-white/60">
                  {attachment.kind === "image"
                    ? "Image"
                    : attachment.kind === "pdf"
                      ? "PDF document"
                      : "Spreadsheet"}{" "}
                  · {formatFileSize(attachment.size)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {attachment.kind === "image" && (
                  <>
                    <ToolbarButton
                      label="Zoom out"
                      onClick={() => setZoom((z) => clampZoom(z - 0.25))}
                    >
                      <ZoomOut size={17} />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Zoom in"
                      onClick={() => setZoom((z) => clampZoom(z + 0.25))}
                    >
                      <ZoomIn size={17} />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Reset zoom"
                      onClick={() => setZoom(1)}
                    >
                      <Maximize2 size={17} />
                    </ToolbarButton>
                  </>
                )}
                <ToolbarButton
                  label="Download"
                  onClick={() => {
                    downloadAttachment(attachment).catch((err) => {
                      console.error("Attachment download failed:", err);
                    });
                  }}
                >
                  <Download size={17} />
                </ToolbarButton>
                <ToolbarButton label="Close" onClick={onClose}>
                  <X size={18} />
                </ToolbarButton>
              </div>
            </div>

            {/* Body — consistent, glanceable preview area */}
            <div className="relative h-[62vh] w-full overflow-hidden p-5">
              {attachment.kind === "image" ? (
                <div className="flex h-full w-full items-center justify-center overflow-hidden">
                  <img
                    src={attachment.url ?? undefined}
                    alt={attachment.filename}
                    className="max-h-full max-w-full rounded-xl object-contain shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition-transform duration-200"
                    style={{ transform: `scale(${zoom})` }}
                  />
                </div>
              ) : attachment.kind === "pdf" ? (
                attachment.url ? (
                  <iframe
                    src={attachment.url}
                    title={attachment.filename}
                    className="h-full w-full rounded-xl bg-white"
                  />
                ) : (
                  <PdfFallback attachment={attachment} />
                )
              ) : (
                <SpreadsheetPreview attachment={attachment} />
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-white/50"
    >
      {children}
    </button>
  );
}

function PdfFallback({ attachment }: { attachment: Attachment }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-white/20 bg-white/5 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B4483C]/20 text-white">
        <FileText size={30} />
      </span>
      <div>
        <p className="text-[14px] font-semibold text-white">
          {attachment.filename}
        </p>
        <p className="mt-1 text-[12.5px] text-white/60">
          PDF preview is unavailable in this demo. Use the download button to
          open the file.
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          downloadAttachment(attachment).catch((err) => {
            console.error("Attachment download failed:", err);
          });
        }}
        className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/25"
      >
        <Download size={14} />
        Download PDF
      </button>
    </div>
  );
}

function SpreadsheetPreview({ attachment }: { attachment: Attachment }) {
  return (
    <div className="flex h-full w-full flex-col rounded-xl border border-white/10 bg-white/90">
      <div className="flex items-center gap-2 border-b border-[#E4E1D8] px-4 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1C7A5E] text-white">
          <FileSpreadsheet size={13} />
        </span>
        <span className="truncate text-[12.5px] font-semibold text-[#1E2621]">
          {attachment.filename}
        </span>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#F1F0EA] text-left text-[10.5px] uppercase tracking-wide text-[#5B655F]">
              <th className="border border-[#E4E1D8] px-2.5 py-1.5 font-semibold">Item</th>
              <th className="border border-[#E4E1D8] px-2.5 py-1.5 font-semibold">Category</th>
              <th className="border border-[#E4E1D8] px-2.5 py-1.5 font-semibold">Qty</th>
              <th className="border border-[#E4E1D8] px-2.5 py-1.5 font-semibold">Unit</th>
              <th className="border border-[#E4E1D8] px-2.5 py-1.5 font-semibold">Total (RM)</th>
            </tr>
          </thead>
          <tbody>
            {SPREADSHEET_ROWS.map((r) => (
              <tr key={r[0]} className="odd:bg-white even:bg-[#FAFAF7]">
                <td className="border border-[#E4E1D8] px-2.5 py-1.5 font-medium text-[#1E2621]">{r[0]}</td>
                <td className="border border-[#E4E1D8] px-2.5 py-1.5 text-[#5B655F]">{r[1]}</td>
                <td className="border border-[#E4E1D8] px-2.5 py-1.5 text-[#5B655F]">{r[2]}</td>
                <td className="border border-[#E4E1D8] px-2.5 py-1.5 text-[#5B655F]">{r[3]}</td>
                <td className="border border-[#E4E1D8] px-2.5 py-1.5 text-right font-semibold text-[#2E5140]">{r[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end border-t border-[#E4E1D8] px-4 py-2">
        <button
          type="button"
          onClick={() => {
            downloadAttachment(attachment).catch((err) => {
              console.error("Attachment download failed:", err);
            });
          }}
          className="flex items-center gap-1.5 rounded-full bg-[#3E6B52] px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#2E5140]"
        >
          <Download size={13} />
          Download
        </button>
      </div>
    </div>
  );
}
