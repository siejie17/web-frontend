"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, MessageSquareText, Sparkles, Loader2 } from "lucide-react";
import type { Attachment, ProjectMessage, User } from "@/lib/mockChat/types";
import { dateSeparatorLabel } from "@/lib/mockChat/assets";
import { ChatBubble } from "./ChatBubble";

const SPRING = { type: "spring", stiffness: 380, damping: 32, mass: 0.7 } as const;

function MessageSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex items-end gap-2.5 py-2">
      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-linear-to-br from-[#EDEAE0] to-[#E4E1D8]" />
      <div className="flex-1">
        <div className="h-2.5 w-24 animate-pulse rounded-full bg-[#EDEAE0]" />
        <div
          className={`mt-2.5 h-11 animate-pulse rounded-[18px] rounded-bl-[6px] bg-linear-to-br from-[#F1F0EA] to-[#EDEAE0] ${
            wide ? "w-4/5" : "w-3/5"
          }`}
        />
      </div>
    </div>
  );
}

export function ChatMessages({
  messages,
  usersById,
  currentUserId,
  initialLoading,
  loadingOlder,
  hasMore,
  loadOlder,
  onOpenAttachment,
  onReply,
  onReaction,
}: {
  messages: ProjectMessage[];
  usersById: Map<string, User>;
  currentUserId: string;
  initialLoading: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  loadOlder: () => void;
  onOpenAttachment: (a: Attachment) => void;
  onReply: (m: ProjectMessage) => void;
  onReaction: (m: ProjectMessage, emoji: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);
  const stickToBottomRef = useRef(true);

  const messagesById = useMemo(
    () => new Map(messages.map((m) => [m.id, m])),
    [messages],
  );

  // Scroll to bottom when a new message arrives or on first load.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, initialLoading]);

  // When the user loads older messages, preserve scroll position.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !loadingOlder) return;
    el.scrollTop = el.scrollHeight;
    // small rAF to ensure layout is committed
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [loadingOlder]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 120;
    setShowJump(distanceFromBottom > 200);
  };

  // Derive date separators + grouping.
  const rows: {
    type: "date" | "message";
    date?: string;
    message?: ProjectMessage;
    grouped?: boolean;
    endOfRun?: boolean;
  }[] = [];
  let lastDateKey = "";
  let prevMsg: ProjectMessage | null = null;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const dateKey = dateSeparatorLabel(m.createdAt);
    if (dateKey !== lastDateKey) {
      rows.push({ type: "date", date: dateKey });
      lastDateKey = dateKey;
    }
    const grouped =
      !!prevMsg &&
      !prevMsg.system &&
      !m.system &&
      prevMsg.senderId === m.senderId &&
      dateSeparatorLabel(prevMsg.createdAt) === dateKey;
    const next = messages[i + 1] ?? null;
    const endOfRun =
      !m.system &&
      (!next || next.system || next.senderId !== m.senderId ||
        dateSeparatorLabel(next.createdAt) !== dateKey);
    rows.push({ type: "message", message: m, grouped, endOfRun });
    prevMsg = m;
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* soft top fade so content doesn't hard-clip under any header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-linear-to-b from-[#FAF9F5] to-transparent" />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="chat-scroll flex-1 overflow-y-auto px-4 py-4 sm:px-6"
      >
        {initialLoading ? (
          <div className="space-y-1 py-2">
            <MessageSkeleton />
            <MessageSkeleton wide />
            <MessageSkeleton />
          </div>
        ) : messages.length === 0 ? (
          <EmptyChat />
        ) : (
          <>
            {hasMore && (
              <div className="mb-3 flex justify-center">
                <motion.button
                  type="button"
                  onClick={loadOlder}
                  disabled={loadingOlder}
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-2 rounded-full border border-[#E4E1D8]/80 bg-white/90 px-4 py-2 text-[12px] font-semibold text-[#2E5140] shadow-[0_1px_2px_rgba(30,38,33,0.04),0_6px_16px_-6px_rgba(30,38,33,0.10)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#BFD6C8] hover:shadow-[0_2px_4px_rgba(30,38,33,0.05),0_10px_22px_-6px_rgba(30,38,33,0.14)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {loadingOlder ? (
                    <Loader2 size={13} className="animate-spin" strokeWidth={2.5} />
                  ) : (
                    <ArrowUp size={13} strokeWidth={2.5} />
                  )}
                  <span className="tracking-[-0.005em]">
                    {loadingOlder ? "Loading…" : "Load earlier messages"}
                  </span>
                </motion.button>
              </div>
            )}

            {rows.map((row, idx) => {
              if (row.type === "date") {
                return (
                  <div key={`date-${idx}`} className="my-5 flex items-center gap-3">
                    <span className="h-px flex-1 bg-linear-to-r from-transparent to-[#E4E1D8]" />
                    <span className="rounded-full border border-[#E4E1D8]/60 bg-[#F1F0EA]/80 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#8A938C]">
                      {row.date}
                    </span>
                    <span className="h-px flex-1 bg-linear-to-l from-transparent to-[#E4E1D8]" />
                  </div>
                );
              }
              const m = row.message!;
              const sender = usersById.get(m.senderId) ?? null;
              const isOwn = m.senderId === currentUserId;
              let replyName: string | null = null;
              let replyPreview: string | null = null;
              if (m.replyToId) {
                const target = messagesById.get(m.replyToId);
                if (target) {
                  replyName =
                    usersById.get(target.senderId)?.fullName ?? "Someone";
                  replyPreview =
                    target.message ||
                    (target.attachment ? target.attachment.filename : "");
                }
              }
              return (
                <ChatBubble
                  key={m.id}
                  message={m}
                  sender={sender}
                  isOwn={isOwn}
                  isGrouped={row.grouped ?? false}
                  endOfRun={row.endOfRun ?? false}
                  onOpenAttachment={onOpenAttachment}
                  onReply={onReply}
                  onReaction={onReaction}
                  currentUserId={currentUserId}
                  replyName={replyName}
                  replyPreview={replyPreview}
                />
              );
            })}
          </>
        )}
      </div>

      <AnimatePresence>
        {showJump && !initialLoading && messages.length > 0 && (
          <motion.button
            key="jump-to-bottom"
            initial={{ opacity: 0, scale: 0.85, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 6 }}
            transition={SPRING}
            type="button"
            onClick={() => {
              const el = scrollRef.current;
              if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
            }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className="absolute bottom-4 right-6 flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br from-[#4B8065] to-[#2A4C3B] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(30,38,33,0.10),0_14px_30px_-8px_rgba(46,81,64,0.5)] transition-shadow duration-200 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_2px_rgba(30,38,33,0.12),0_18px_36px_-6px_rgba(46,81,64,0.55)]"
            aria-label="Jump to latest message"
          >
            <ArrowUp size={18} strokeWidth={2.25} className="rotate-180" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyChat() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="flex h-full flex-col items-center justify-center gap-5 py-16 text-center"
    >
      <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#E4E1D8]/60 bg-linear-to-br from-[#F6F6F2] to-[#EFEDE6] text-[#3E6B52] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_20px_-8px_rgba(30,38,33,0.14)]">
        <MessageSquareText size={26} strokeWidth={1.75} />
        <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-[#D9A552] to-[#B4813A] text-white shadow-[0_2px_6px_rgba(180,129,58,0.4)]">
          <Sparkles size={12} strokeWidth={2.25} />
        </span>
      </span>
      <div className="max-w-xs">
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-[#1E2621]">
          Start the conversation
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#8A938C]">
          This is the start of the project discussion. Share an update, an
          attachment, or a note for the team.
        </p>
      </div>
    </motion.div>
  );
}