"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, UserPlus } from "lucide-react";
import type { Attachment, ProjectMessage } from "@/lib/mockChat/types";
import { useProjectChat } from "@/hooks/useProjectChat";
import { AvatarStack } from "./Avatar";
import { ChatMessages } from "./ChatMessages";
import { MessageComposer } from "./MessageComposer";
import { AttachmentPreviewModal } from "./AttachmentPreviewModal";
import { MemberListModal } from "./MemberListModal";
import { AddMembersModal } from "./AddMembersModal";
import { ChatToast, type ChatToastData } from "./Toast";

export function ProjectChatTab({
  realProjectId,
  active,
  isProjectOwner = false,
  onUnreadChange,
  onMembersChange,
}: {
  realProjectId?: number | null;
  active: boolean;
  isProjectOwner?: boolean;
  onUnreadChange?: (unread: number) => void;
  onMembersChange?: (count: number) => void;
}) {
  const chat = useProjectChat(realProjectId);
  const permissions = chat.currentMember?.membership.permissions ?? [];
  const canSendMessages = isProjectOwner || permissions.includes("send_messages");
  const canManageMembers = isProjectOwner || permissions.includes("manage_members");
  const canManageRoles = isProjectOwner || permissions.includes("manage_roles");

  const [toast, setToast] = useState<ChatToastData | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{
    messageId: string;
    senderName: string;
    preview: string;
  } | null>(null);

  const chatUnread = chat.unread;
  const { activate: chatActivate, deactivate: chatDeactivate } = chat;

  const notify = useCallback((kind: "success" | "error", message: string) => {
    setToast({ id: Date.now(), kind, message });
  }, []);

  /* Keep the parent tab badge in sync + activate/deactivate. */
  useEffect(() => {
    if (active) chatActivate();
    else chatDeactivate();
  }, [active, chatActivate, chatDeactivate, chat.projectId]);

  useEffect(() => {
    onUnreadChange?.(chatUnread);
  }, [chatUnread, onUnreadChange]);

  useEffect(() => {
    onMembersChange?.(chat.members.length);
  }, [chat.members.length, onMembersChange]);

  // Use the AuthContext profile picture for the current user's avatar so every
  // surface (bubbles, stack, member list) reflects their uploaded photo.
  const effectiveMembers = useMemo(
    () =>
      chat.members.map((m) =>
        m.user.id === chat.currentUserId && chat.currentUserAvatar
          ? { ...m, user: { ...m.user, avatar: chat.currentUserAvatar } }
          : m,
      ),
    [chat.members, chat.currentUserId, chat.currentUserAvatar],
  );

  const usersById = useMemo(() => {
    const map = new Map(effectiveMembers.map((m) => [m.user.id, m.user]));
    return map;
  }, [effectiveMembers]);

  const handleSend = useCallback(
    async (input: { message: string; attachment: Attachment | null; replyToId?: string | null }) => {
      await chat.send(input);
    },
    [chat],
  );

  const handleReply = useCallback(
    (m: ProjectMessage) => {
      const target = chat.messages.find((x) => x.id === m.id);
      if (!target) return;
      const senderName = usersById.get(target.senderId)?.fullName ?? "Someone";
      const preview =
        target.message || (target.attachment ? target.attachment.filename : "");
      setReplyTarget({ messageId: target.id, senderName, preview });
    },
    [chat.messages, usersById],
  );

  const handleReaction = useCallback(
    async (m: { id: string }, emoji: string) => {
      try {
        await chat.toggleReaction(m.id, emoji);
      } catch (error) {
        notify(
          "error",
          error instanceof Error ? error.message : "Unable to update reaction.",
        );
      }
    },
    [chat, notify],
  );

  return (
    <>
      <div className="flex flex-col h-[70vh] min-h-[420px] sm:h-[75vh] lg:h-200">
        {/* Slim toolbar (the Team discussion header lives on the card) */}
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
          <AvatarStack members={effectiveMembers} max={5} size={30} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMembers(true)}
              className="flex items-center gap-1.5 rounded-full border border-[#E4E1D8] bg-white px-3 py-2 sm:py-1.5 text-[12px] font-medium text-[#5B655F] shadow-sm transition-colors hover:border-[#C9D3CC] hover:text-[#3E6B52]"
            >
              <Users size={13} />
              <span className="hidden sm:inline">Members</span>
            </button>
            {canManageMembers && (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 rounded-full bg-[#3E6B52] px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_6px_16px_rgba(46,81,64,0.2)] transition-all hover:bg-[#2E5140]"
              >
                <UserPlus size={13} />
                <span className="hidden sm:inline">Add User</span>
              </button>
            )}
          </div>
        </div>

        {/* Body — blends into the app background */}
        <div
          className={`relative flex flex-col overflow-hidden rounded-2xl bg-[#F6F6F2] h-full`}
        >
          <ChatMessages
            messages={chat.messages}
            usersById={usersById}
            currentUserId={chat.currentUserId}
            initialLoading={chat.initialLoading}
            loadingOlder={chat.loadingOlder}
            hasMore={chat.hasMore}
            loadOlder={chat.loadOlder}
            onOpenAttachment={setPreviewAttachment}
            onReply={handleReply}
            onReaction={handleReaction}
            onEdit={chat.updateMessage}
            onDelete={chat.deleteMessage}
            onActionError={(message) => notify("error", message)}
            canInteract={canSendMessages}
            active={active}
            onAtBottom={chat.markAllRead}
          />
          {canSendMessages && (
            <MessageComposer
              onSend={handleSend}
              uploadAttachment={chat.uploadAttachment}
              disabled={chat.sending}
              onToast={notify}
              replyTarget={replyTarget}
              onCancelReply={() => setReplyTarget(null)}
            />
          )}
        </div>
      </div>

      {/* Modals + preview + toast */}
      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
      {showMembers && (
        <MemberListModal
          members={effectiveMembers}
          currentUserId={chat.currentUserId}
          canManageMembers={canManageMembers}
          canManageRoles={canManageRoles}
          onClose={() => setShowMembers(false)}
          onRemoveMember={chat.removeMember}
          onChangeMemberRole={chat.updateMemberRole}
          onToast={notify}
        />
      )}
      <AddMembersModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        searchUsers={chat.searchUsers}
        onAdd={chat.addMembers}
        onToast={notify}
        memberIds={chat.memberIds}
      />
      <ChatToast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
