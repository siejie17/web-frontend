"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Crown, UserMinus } from "lucide-react";
import type { MemberWithUser } from "@/lib/mockChat/types";
import { Avatar } from "./Avatar";
import { RoleBadge } from "./RoleBadge";
import type { ToastKind } from "./Toast";

export function MemberListModal({
  members,
  currentUserId,
  isCreator,
  onClose,
  onRemoveMember,
  onToast,
}: {
  members: MemberWithUser[];
  currentUserId: string;
  isCreator: boolean;
  onClose: () => void;
  onRemoveMember: (userId: string) => Promise<void>;
  onToast: (kind: ToastKind, message: string) => void;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const remove = async (m: MemberWithUser) => {
    if (!isCreator || m.isOwner) return;
    setRemovingId(m.user.id);
    try {
      await onRemoveMember(m.user.id);
      onToast("success", `${m.user.fullName} was removed from the project.`);
    } catch {
      onToast("error", "Could not remove the member. Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1E2621]/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_24px_60px_rgba(30,38,33,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#EFEDE6] px-6 py-4">
          <div>
            <p
              className="text-[15px] font-semibold text-[#1E2621]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Project members
            </p>
            <p className="text-[12px] text-[#8A938C]">
              {members.length} member{members.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8A938C] transition-colors hover:bg-[#F6F6F2] hover:text-[#1E2621]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {members.map((m) => {
            const me = m.user.id === currentUserId;
            return (
              <div
                key={m.user.id}
                className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-[#FBFAF7]"
              >
                <Avatar name={m.user.fullName} size={40} showOnline src={m.user.avatar} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13.5px] font-semibold text-[#1E2621]">
                      {m.user.fullName}
                    </span>
                    {m.isOwner && (
                      <span title="Project owner" className="text-[#C08A3E]">
                        <Crown size={13} />
                      </span>
                    )}
                    {me && (
                      <span className="text-[10.5px] text-[#8A938C]">(you)</span>
                    )}
                  </div>
                  <span className="block truncate text-[11.5px] text-[#8A938C]">
                    {m.user.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(m)}
                  disabled={!isCreator || m.isOwner || removingId === m.user.id}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-transparent text-[#A9B0AA] transition-all ${
                    isCreator && !m.isOwner
                      ? "opacity-0 group-hover:opacity-100 hover:bg-[#FBEAE4] hover:text-[#B4483C]"
                      : "invisible"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                  aria-label={`Remove ${m.user.fullName}`}
                  title="Remove member"
                  aria-hidden={!isCreator || m.isOwner}
                  tabIndex={isCreator && !m.isOwner ? 0 : -1}
                >
                  <UserMinus size={14} />
                </button>
                <RoleBadge role={m.user.role} />
              </div>
            );
          })}
        </div>

        {!isCreator && (
          <p className="border-t border-[#EFEDE6] px-6 py-3 text-center text-[11.5px] text-[#8A938C]">
            Only the project owner can manage members.
          </p>
        )}
      </motion.div>
    </div>
  );
}
