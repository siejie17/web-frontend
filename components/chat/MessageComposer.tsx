"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, Send, X, Loader2, ImageIcon, FileText, CornerUpLeft } from "lucide-react";
import type { Attachment } from "@/lib/mockChat/types";
import { formatFileSize, getExtension, isSupportedFile } from "@/lib/mockChat/assets";
import type { ToastKind } from "./Toast";

const MAX_LEN = 2000;

/** Human-readable file type label derived from the filename extension. */
function fileTypeLabel(attachment: Attachment): string {
  const ext = getExtension(attachment.filename);
  if (ext) return ext.toUpperCase();
  return attachment.kind === "image"
    ? "Image"
    : attachment.kind === "pdf"
      ? "PDF"
      : "Spreadsheet";
}

function AttachmentChip({
  attachment,
  progress,
  onRemove,
}: {
  attachment: Attachment;
  progress: number | null;
  onRemove: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center gap-2.5 rounded-xl border border-[#E4E1D8] bg-white px-3 py-2 shadow-sm"
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${
          attachment.kind === "image" ? "bg-[#3E6B52]" : attachment.kind === "pdf" ? "bg-[#B4483C]" : "bg-[#1C7A5E]"
        }`}
      >
        {attachment.kind === "image" ? <ImageIcon size={15} /> : <FileText size={15} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-semibold text-[#1E2621]">
          {attachment.filename}
        </span>
        {progress !== null && progress < 100 ? (
          <span className="mt-1 block">
            <span className="block h-1 w-full overflow-hidden rounded-full bg-[#EFEDE6]">
              <motion.span
                className="block h-full rounded-full bg-[#3E6B52]"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </span>
            <span className="mt-0.5 block text-[10px] text-[#8A938C]">
              Uploading… {progress}%
            </span>
          </span>
        ) : (
          <span className="block text-[10.5px] text-[#8A938C]">
            {fileTypeLabel(attachment)} · {formatFileSize(attachment.size)}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={progress !== null && progress < 100}
        className="flex h-7 w-7 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full text-[#8A938C] transition-colors hover:bg-[#F6F6F2] hover:text-[#B4483C] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Remove attachment"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function MessageComposer({
  onSend,
  uploadAttachment,
  disabled,
  onToast,
  replyTarget,
  onCancelReply,
}: {
  onSend: (input: {
    message: string;
    attachment: Attachment | null;
    replyToId?: string | null;
  }) => Promise<void>;
  uploadAttachment: (
    file: File,
    onProgress?: (p: { percent: number; bytes: number }) => void,
  ) => Promise<Attachment>;
  disabled?: boolean;
  onToast: (kind: ToastKind, message: string) => void;
  replyTarget?: { messageId: string; senderName: string; preview: string } | null;
  onCancelReply?: () => void;
}) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      if (!isSupportedFile(file.name, file.type)) {
        onToast(
          "error",
          `"${file.name}" isn't supported. Use PNG, JPG, JPEG, WEBP, PDF or XLSX.`,
        );
        return;
      }
      if (uploading) return;
      setUploading(true);
      setProgress(0);
      try {
        const att = await uploadAttachment(file, (p) => setProgress(p.percent));
        // Keep the server-provided URL (used for download/preview). Only fall
        // back to a local blob URL for preview when the server didn't return
        // one — otherwise the blob URL would break downloads.
        if (att.url) {
          setAttachment(att);
        } else {
          const objectUrl = URL.createObjectURL(file);
          setAttachment({ ...att, url: objectUrl });
        }
      } catch (e) {
        onToast("error", (e as Error).message ?? "Upload failed.");
      } finally {
        setUploading(false);
        setProgress(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [uploadAttachment, uploading, onToast],
  );

  const submit = useCallback(async () => {
    const trimmed = text.trim();
    if ((!trimmed && !attachment) || uploading || disabled) return;
    const att = attachment;
    try {
      await onSend({
        message: trimmed,
        attachment: att,
        replyToId: replyTarget?.messageId ?? null,
      });
      setText("");
      setAttachment(null);
      onCancelReply?.();
    } catch (error) {
      onToast(
        "error",
        error instanceof Error ? error.message : "Unable to send message.",
      );
    }
  }, [text, attachment, uploading, disabled, onSend, replyTarget, onCancelReply, onToast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const canSend =
    (text.trim().length > 0 || attachment !== null) && !uploading && !disabled;
  const charCount = text.length;

  return (
    <div className="border-t border-[#EFEDE6] bg-[#FBFAF7] px-3 py-2.5 sm:px-6 sm:py-3">
      <AnimatePresence>{attachment && (
        <div className="mb-2.5">
          <AttachmentChip
            attachment={attachment}
            progress={progress}
            onRemove={() => setAttachment(null)}
          />
        </div>
      )}</AnimatePresence>

      <AnimatePresence>{replyTarget && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          className="mb-2.5 flex items-center gap-2.5 rounded-xl border border-[#DCE9E1] bg-[#EFF6F1] px-3 py-2"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3E6B52] text-white">
            <CornerUpLeft size={15} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-[#2E5140]">
              Replying to {replyTarget.senderName}
            </span>
            <span className="block truncate text-[11.5px] text-[#5B655F]">
              {replyTarget.preview}
            </span>
          </span>
          <button
            type="button"
            onClick={onCancelReply}
            className="flex h-7 w-7 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full text-[#8A938C] transition-colors hover:bg-white hover:text-[#B4483C]"
            aria-label="Cancel reply"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}</AnimatePresence>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex items-end gap-1.5 sm:gap-2 rounded-2xl border bg-white p-1.5 sm:p-2 transition-all ${
          dragOver
            ? "border-dashed border-[#3E6B52] ring-2 ring-[#3E6B52]/20"
            : "border-[#E4E1D8] focus-within:border-[#BFD6C8] focus-within:ring-2 focus-within:ring-[#3E6B52]/10"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf,.xlsx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full text-[#5B655F] transition-colors hover:bg-[#F1F0EA] hover:text-[#3E6B52] disabled:opacity-50"
          aria-label="Attach file"
          title="Attach a file"
        >
          <Paperclip size={18} />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Write a message…"
          className="max-h-36 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[13.5px] text-[#1E2621] placeholder:text-[#A9B0AA] focus:outline-none"
        />
        <span className="mb-1 hidden text-[10px] tabular-nums text-[#A9B0AA] sm:block">
          {charCount > 0 && `${charCount}/${MAX_LEN}`}
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#3E6B52] to-[#2E5140] text-white shadow-[0_8px_18px_rgba(46,81,64,0.3)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          aria-label="Send message"
        >
          {uploading || disabled ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Send size={16} className="translate-x-px" />
          )}
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[10.5px] text-[#A9B0AA]">
        <span className="sm:hidden">PNG, JPG, WEBP, PDF, XLSX only</span>
        <span className="hidden sm:inline">
          Enter to send · Shift+Enter for a new line · Drag &amp; drop to attach · PNG, JPG, WEBP, PDF, XLSX only
        </span>
      </p>
    </div>
  );
}
