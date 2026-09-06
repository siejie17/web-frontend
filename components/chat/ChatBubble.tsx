"use client";

import { memo, useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  FileSpreadsheet,
  ImageIcon,
  Download,
  CornerUpLeft,
  Check,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import type { Attachment, ProjectMessage, User } from "@/lib/mockChat/types";
import { formatFileSize, formatTime } from "@/lib/mockChat/assets";
import { Avatar } from "./Avatar";
import { downloadAttachment } from "./downloadAttachment";

const KIND_ICON: Record<
  Attachment["kind"],
  { Icon: typeof FileText; bg: string }
> = {
  image: { Icon: ImageIcon, bg: "bg-linear-to-br from-[#4B8065] to-[#2E5140]" },
  pdf: { Icon: FileText, bg: "bg-linear-to-br from-[#C85A4D] to-[#9E3B30]" },
  spreadsheet: {
    Icon: FileSpreadsheet,
    bg: "bg-linear-to-br from-[#219073] to-[#155F49]",
  },
};

const REACTION_EMOJIS = ["👍", "❤️", "🎉", "👀"] as const;

const SPRING = { type: "spring", stiffness: 380, damping: 32, mass: 0.7 } as const;

export function AttachmentInline({
  attachment,
  onOpen,
}: {
  attachment: Attachment;
  onOpen: (a: Attachment) => void;
}) {
  const { Icon, bg } = KIND_ICON[attachment.kind];
  return (
    <div className="mt-2 flex max-w-[85vw] sm:max-w-72 items-center gap-1 rounded-2xl border border-[#E4E1D8]/80 bg-white/95 p-2.5 text-left shadow-[0_1px_2px_rgba(30,38,33,0.04),0_8px_20px_-6px_rgba(30,38,33,0.10)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-px hover:border-[#C9D3CC] hover:shadow-[0_2px_4px_rgba(30,38,33,0.05),0_14px_28px_-8px_rgba(30,38,33,0.16)]">
      <button
        type="button"
        onClick={() => onOpen(attachment)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`Preview attachment ${attachment.filename}`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_6px_rgba(30,38,33,0.18)] ${bg}`}
        >
          <Icon size={17} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-semibold tracking-[-0.01em] text-[#1E2621]">
            {attachment.filename}
          </span>
          <span className="block text-[11px] font-medium text-[#9CA39B]">
            {formatFileSize(attachment.size)}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          downloadAttachment(attachment).catch((err) => {
            console.error("Attachment download failed:", err);
          });
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9CA39B] transition-all duration-150 hover:bg-[#EFF6F1] hover:text-[#2E5140] active:scale-90"
        aria-label="Download attachment"
        title="Download"
      >
        <Download size={14} strokeWidth={2.25} />
      </button>
    </div>
  );
}

function Timestamp({ value, className = "" }: { value: string; className?: string }) {
  return (
    <span
      className={`select-none text-[10.5px] font-medium tracking-wide text-[#A5ACA4] tabular-nums ${className}`}
    >
      {formatTime(value)}
    </span>
  );
}

function ReplyQuote({ name, preview }: { name: string; preview: string }) {
  return (
    <div className="mb-2 flex items-center gap-2.5 rounded-xl border-l-[2.5px] border-[#3E6B52]/40 bg-linear-to-r from-[#EFF6F1] to-white/40 px-2.5 py-1.5">
      <CornerUpLeft size={11} strokeWidth={2.5} className="shrink-0 text-[#7CA189]" />
      <span className="min-w-0">
        <span className="block truncate text-[10.5px] font-semibold tracking-[-0.01em] text-[#2E5140]">
          {name}
        </span>
        <span className="block truncate text-[11.5px] text-[#6B746E]">
          {preview}
        </span>
      </span>
    </div>
  );
}

function ReactionRow({
  reactions,
  currentUserId,
  onToggle,
  disabled = false,
}: {
  reactions: Record<string, string[]> | undefined;
  currentUserId: string;
  onToggle: (emoji: string) => void;
  disabled?: boolean;
}) {
  const entries = Object.entries(reactions ?? {}).filter(
    ([, ids]) => ids.length > 0,
  );
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {entries.map(([emoji, ids]) => {
        const me = ids.includes(currentUserId);
        return (
          <motion.button
            key={emoji}
            type="button"
            onClick={() => onToggle(emoji)}
            disabled={disabled}
            whileTap={disabled ? undefined : { scale: 0.88 }}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors duration-150 ${me
              ? "border-[#3E6B52]/50 bg-[#EFF6F1] text-[#2E5140] shadow-[inset_0_0_0_1px_rgba(62,107,82,0.06)]"
              : "border-[#E4E1D8] bg-white text-[#6B746E] hover:border-[#C9D3CC] hover:bg-[#F8F7F2]"
              } disabled:cursor-default disabled:hover:border-[#E4E1D8] disabled:hover:bg-white`}
          >
            <span className="text-[12px] leading-none">{emoji}</span>
            <span className="tabular-nums">{ids.length}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function ReactionActions({
  onToggle,
  onReply,
}: {
  onToggle: (emoji: string) => void;
  onReply: () => void;
}) {
  return (
    <div
      className="absolute right-0 -top-9 z-20 flex items-center gap-0.5 rounded-full border border-[#E4E1D8]/70 bg-white/90 px-1 py-1 opacity-100 shadow-[0_2px_4px_rgba(30,38,33,0.04),0_10px_24px_-6px_rgba(30,38,33,0.18)] backdrop-blur-md transition-all duration-150 ease-out sm:opacity-0 sm:group-hover:-translate-y-0.5 sm:group-hover:opacity-100"
      data-reactions
    >
      {REACTION_EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onToggle(e)}
          className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-full text-[14px] transition-transform duration-150 hover:scale-115 hover:bg-[#F1F0EA] active:scale-95"
          aria-label={`React with ${e}`}
        >
          {e}
        </button>
      ))}
      <span className="mx-0.5 h-3.5 w-px bg-[#E4E1D8]" />
      <button
        type="button"
        onClick={onReply}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[#6B746E] transition-colors duration-150 hover:bg-[#EFF6F1] hover:text-[#2E5140]"
        aria-label="Reply"
        title="Reply"
      >
        <CornerUpLeft size={13} strokeWidth={2.25} />
      </button>
    </div>
  );
}

export const ChatBubble = memo(function ChatBubble({
  message,
  sender,
  isOwn,
  isGrouped,
  endOfRun,
  onOpenAttachment,
  onReply,
  onReaction,
  onEdit,
  onDelete,
  onActionError,
  canInteract = true,
  currentUserId,
  replyName,
  replyPreview,
}: {
  message: ProjectMessage;
  sender: User | null;
  isOwn: boolean;
  isGrouped: boolean;
  endOfRun: boolean;
  onOpenAttachment: (a: Attachment) => void;
  onReply: (m: ProjectMessage) => void;
  onReaction: (m: ProjectMessage, emoji: string) => void;
  onEdit: (messageId: string, message: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onActionError: (message: string) => void;
  canInteract?: boolean;
  currentUserId: string;
  replyName?: string | null;
  replyPreview?: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.message);
  const [action, setAction] = useState<"edit" | "delete" | null>(null);
  const [showActions, setShowActions] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setShowActions(true);
    }, 500);
  }, []);

  const handlePointerUp = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  const handlePointerCancel = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  const handlePointerMove = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  const saveEdit = async () => {
    const next = draft.trim();
    if ((!next && !message.attachment) || next === message.message) {
      setDraft(message.message);
      setEditing(false);
      return;
    }

    setAction("edit");
    try {
      await onEdit(message.id, next);
      setEditing(false);
    } catch (error) {
      onActionError(error instanceof Error ? error.message : "Unable to update message.");
    } finally {
      setAction(null);
    }
  };

  const deleteMessage = async () => {
    if (!window.confirm("Delete this message? This cannot be undone.")) return;

    setAction("delete");
    try {
      await onDelete(message.id);
    } catch (error) {
      onActionError(error instanceof Error ? error.message : "Unable to delete message.");
      setAction(null);
    }
  };

  if (message.system) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="flex justify-center py-2.5"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E1D8]/60 bg-[#F1F0EA]/80 px-3.5 py-1.5 text-[11.5px] text-[#6B746E] shadow-[0_1px_2px_rgba(30,38,33,0.03)] backdrop-blur-sm">
          <span className="font-semibold text-[#2E5140]">
            {sender?.fullName?.split(" ")[0] || sender?.fullName || "Someone"}
          </span>
          {message.message}
        </span>
      </motion.div>
    );
  }

  if (isOwn) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING}
        className={`group relative flex flex-col items-end ${isGrouped ? "mt-1" : "mt-4"
          }`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerMove={handlePointerMove}
        onClick={(e) => {
          if (didLongPress.current) {
            e.stopPropagation();
            return;
          }
          setShowActions(false);
        }}
      >
        {replyName && (
          <div className="mb-1.5 w-fit max-w-[70%] rounded-2xl rounded-br-md border border-[#EFEDE6] bg-white px-3 py-2 shadow-[0_1px_2px_rgba(30,38,33,0.03)]">
            <ReplyQuote
              name={replyName.split(" ")[0] || replyName}
              preview={replyPreview ?? ""}
            />
          </div>
        )}

        <div className="flex max-w-[85%] flex-col items-end sm:max-w-[78%] lg:max-w-md">
          {message.attachment && (
            <div className="relative z-10 mb-1.5">
              <AttachmentInline
                attachment={message.attachment}
                onOpen={onOpenAttachment}
              />
            </div>
          )}

          <div className="flex max-w-full items-center gap-1.5">
            {canInteract && !editing && (
              <div
                className={`flex items-center rounded-full border border-[#E4E1D8] bg-white p-0.5 shadow-sm transition-opacity duration-150 ${
                  showActions
                    ? "opacity-100"
                    : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100"
                }`}
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setDraft(message.message);
                    setEditing(true);
                    setShowActions(false);
                  }}
                  disabled={action !== null}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#6B746E] hover:bg-[#EFF6F1] hover:text-[#2E5140] disabled:opacity-40"
                  aria-label="Edit message"
                  title="Edit message"
                >
                  <Pencil size={12.5} />
                </button>
                <button
                  type="button"
                  onClick={deleteMessage}
                  disabled={action !== null}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#8A938C] hover:bg-[#FBEAE4] hover:text-[#B4483C] disabled:opacity-40"
                  aria-label="Delete message"
                  title="Delete message"
                >
                  {action === "delete" ? <Loader2 size={12.5} className="animate-spin" /> : <Trash2 size={12.5} />}
                </button>
              </div>
            )}

            <div className="relative max-w-full">
              <div
                className={`max-w-full rounded-xl2 rounded-br-md px-4 text-[13.5px] leading-relaxed transition-shadow duration-200 ${
                  editing
                    ? "border border-[#3E6B52]/25 bg-[#EFF6F1] text-[#1E2621] shadow-[0_1px_2px_rgba(30,38,33,0.04),0_8px_20px_-6px_rgba(30,38,33,0.08)]"
                    : "bg-linear-to-br from-[#4B8065] via-[#3E6B52] to-[#2A4C3B] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_1px_2px_rgba(30,38,33,0.08),0_14px_30px_-10px_rgba(46,81,64,0.45)] group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(30,38,33,0.10),0_18px_36px_-8px_rgba(46,81,64,0.5)]"
                } ${editing || message.message ? "py-2.5" : "py-2"}`}
              >
                {editing ? (
                  <div className="min-w-0 w-[min(16rem,70vw)] sm:min-w-64 sm:w-auto">
                    <textarea
                      autoFocus
                      value={draft}
                      onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          setDraft(message.message);
                          setEditing(false);
                        }
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void saveEdit();
                        }
                      }}
                      rows={2}
                      disabled={action === "edit"}
                      className="max-h-32 w-full resize-none bg-transparent text-[13.5px] text-[#1E2621] outline-none placeholder:text-[#6B746E]/60"
                      aria-label="Edit message text"
                    />
                    <div className="mt-1 flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(message.message);
                          setEditing(false);
                        }}
                        disabled={action === "edit"}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[#6B746E] hover:bg-[#E4E1D8]/50 hover:text-[#1E2621]"
                        aria-label="Cancel editing"
                        title="Cancel"
                      >
                        <X size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveEdit()}
                        disabled={action === "edit" || (!draft.trim() && !message.attachment)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3E6B52] text-white hover:bg-[#2E5140] disabled:opacity-50"
                        aria-label="Save message"
                        title="Save"
                      >
                        {action === "edit" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      </button>
                    </div>
                  </div>
                ) : message.message ? (
                  <p className="whitespace-pre-wrap tracking-[-0.005em]">{message.message}</p>
                ) : null}
              </div>
            </div>
          </div>

          <span className="mt-1 flex items-center gap-1 pr-1">
            {message.editedAt && <span className="text-[10px] text-[#A5ACA4]">edited</span>}
            <Timestamp value={message.createdAt} />
          </span>
          <div className="mt-1 pr-0.5">
            <ReactionRow
              reactions={message.reactions}
              currentUserId={currentUserId}
              onToggle={(emoji) => onReaction(message, emoji)}
              disabled={!canInteract}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING}
      className={`flex items-end gap-2.5 ${isGrouped ? "mt-1" : "mt-4"}`}
    >
      <div className="w-8 shrink-0 self-end">
        {endOfRun && (
          <span className="block overflow-hidden rounded-full ring-2 ring-white shadow-[0_1px_3px_rgba(30,38,33,0.12)]">
            <Avatar
              name={sender?.fullName ?? "?"}
              size={32}
              src={sender?.avatar}
            />
          </span>
        )}
      </div>

      {/* Message column */}
      <div className="group relative flex w-fit max-w-[85%] min-w-0 flex-col sm:max-w-[78%] lg:max-w-md">
        {/* Sender info follows message column width */}
        {!isGrouped && sender && (
          <div className="mb-1 ml-2.5 flex items-center gap-2">
            <span className="text-[12.5px] font-semibold tracking-[-0.01em] text-[#1E2621]">
              {sender.fullName.split(" ")[0] || sender.fullName}
            </span>

            <Timestamp value={message.createdAt} />
          </div>
        )}

        {message.attachment && (
          <div className="relative z-10 -mb-2.5 self-start">
            <AttachmentInline
              attachment={message.attachment}
              onOpen={onOpenAttachment}
            />
          </div>
        )}

        {replyName && (
          <div className="self-start rounded-2xl rounded-bl-md border border-[#EFEDE6] bg-white px-3 py-2 shadow-[0_1px_2px_rgba(30,38,33,0.03),0_6px_16px_-4px_rgba(30,38,33,0.06)]">
            <ReplyQuote
              name={replyName.split(" ")[0] || replyName}
              preview={replyPreview ?? ""}
            />
          </div>
        )}

        {/* Actual message */}
        <div className="w-fit max-w-full">
          <div className="relative">
            {!isOwn && canInteract && (
              <ReactionActions
                onToggle={(id) => onReaction(message, id)}
                onReply={() => onReply(message)}
              />
            )}

            <div
              className={`rounded-xl2 rounded-bl-md border border-[#EFEDE6] bg-white px-4 text-[13.5px] leading-relaxed tracking-[-0.005em] text-[#1E2621] shadow-[0_1px_2px_rgba(30,38,33,0.03),0_8px_20px_-8px_rgba(30,38,33,0.10)] transition-all duration-200 group-hover:-translate-y-px group-hover:border-[#E4E1D8] group-hover:shadow-[0_2px_4px_rgba(30,38,33,0.04),0_16px_32px_-10px_rgba(30,38,33,0.14)] ${message.attachment ? "pt-5 pb-2.5" : "py-2.5"
                }`}
            >
              {message.message && (
                <p className="whitespace-pre-wrap">
                  {message.message}
                </p>
              )}
            </div>
          </div>

          <div className="pt-1.5 pl-0.5">
            <ReactionRow
              reactions={message.reactions}
              currentUserId={currentUserId}
              onToggle={(id) => onReaction(message, id)}
              disabled={!canInteract}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
});
