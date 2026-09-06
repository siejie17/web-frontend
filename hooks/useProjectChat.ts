"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiProjectChatService as chatService } from "@/services/apiProjectChatService";
import type {
  Attachment,
  MemberWithUser,
  ProjectMessage,
} from "@/lib/mockChat/types";
import { useAuth } from "@/contexts/AuthContext";
import { useChatUnread } from "@/contexts/ChatUnreadContext";

/**
 * Central state owner for the project chat. The UI talks only to this hook,
 * which in turn talks only to the API chat service (Laravel via the /api
 * proxy routes). Components never touch the service directly.
 */
export function useProjectChat(realProjectId?: number | null) {
  const { user } = useAuth();
  const {
    markRead,
    incrementUnread,
    setUnreadCount,
    unreadByProject,
  } = useChatUnread();
  // The /me id arrives as an integer; senders are strings, so normalise to a
  // string to make `isOwn` (bubble placement) and member matching line up.
  const currentUserId = useMemo(
    () => (user?.id != null ? String(user.id) : ""),
    [user?.id],
  );
  const currentUserAvatar = user?.profile_pic || user?.profile_picture || null;

  // Use the real database project id directly (no mock remapping).
  const projectId: number | null = realProjectId || realProjectId === 0 ? realProjectId : null;

  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [projectUserId, setProjectUserId] = useState("");

  const [unread, setUnread] = useState(0);
  const unreadRef = useRef(0);
  const isActiveRef = useRef(false);
  const knownIdsRef = useRef<Set<string>>(new Set());

  const [hasMore, setHasMore] = useState(true);
  const oldestRef = useRef<string | null>(null);

  const currentMember = useMemo(
    () => members.find((m) => m.user.id === currentUserId) ?? null,
    [members, currentUserId],
  );
  const isCreator = useMemo(
    () => projectUserId === currentUserId,
    [projectUserId, currentUserId],
  );

  const markAllRead = useCallback(() => {
    unreadRef.current = 0;
    setUnread(0);
    if (projectId) {
      const latestMessageId = messages[messages.length - 1]?.id;
      void markRead(projectId, latestMessageId);
    }
  }, [projectId, markRead, messages]);

  const activate = useCallback(() => {
    // Opening the tab alone does NOT mark messages as read. Reading is driven
    // by actually reaching the bottom of the message list (see ChatMessages'
    // onAtBottom), which advances the persisted last-read timestamp. This way
    // the unread badge stays visible until the user scrolls to the bottom.
    isActiveRef.current = true;
  }, []);

  const deactivate = useCallback(() => {
    isActiveRef.current = false;
  }, []);

  /**
   * Seed the tab badge from the global store. Messages may have arrived (or
   * been computed by refreshProjects) before this page mounted, so mirror the
   * store's count into the session unread. It stays visible until the user
   * actually reaches the bottom of the chat.
   */
  useEffect(() => {
    if (!projectId) return;
    const baseline = unreadByProject[projectId] ?? 0;
    if (unreadRef.current < baseline) {
      unreadRef.current = baseline;
      setUnread(baseline);
    }
  }, [projectId, unreadByProject]);

  const upsertMessage = useCallback((msg: ProjectMessage) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = msg;
        return next;
      }
      return [...prev, msg];
    });
  }, []);

  useEffect(() => {
    isActiveRef.current = false;
  }, []);

  /* Initial load + incremental synchronization subscription. */
  useEffect(() => {
    if (!projectId) {
      setInitialLoading(false);
      setMembersLoading(false);
      return;
    }

    let disposed = false;
    isActiveRef.current = false;
    unreadRef.current = 0;
    knownIdsRef.current = new Set();

    setInitialLoading(true);
    setMembersLoading(true);

    chatService.getProjectMessages(projectId)
      .then((page) => {
        if (disposed) return;
        page.messages.forEach((m) => knownIdsRef.current.add(m.id));
        setMessages(page.messages);
        setHasMore(page.hasMore);
        oldestRef.current = page.messages[0]?.createdAt ?? null;
        const initialUnread = page.unreadCount ?? 0;
        unreadRef.current = initialUnread;
        setUnread(initialUnread);
        setUnreadCount(projectId, initialUnread);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!disposed) setInitialLoading(false);
      });

    chatService.getProjectMembers(projectId)
      .then((memberList) => {
        if (disposed) return;
        setMembers(memberList);
        const owner = memberList.find((m) => m.isOwner)?.user.id ?? "";
        setProjectUserId(owner);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!disposed) setMembersLoading(false);
      });

    const unsubscribe = chatService.subscribe(projectId, (e) => {
      if (e.type === "message") {
        const msg = e.message as ProjectMessage;
        const isNew = !knownIdsRef.current.has(msg.id);
        if (isNew) knownIdsRef.current.add(msg.id);
        upsertMessage(msg);
        if (isNew && !msg.system && msg.senderId !== currentUserId) {
          unreadRef.current += 1;
          setUnread(unreadRef.current);
          incrementUnread(projectId);
        }
      } else if (e.type === "update") {
        upsertMessage(e.message as ProjectMessage);
      } else if (e.type === "delete") {
        const messageId = String(e.messageId);
        knownIdsRef.current.delete(messageId);
        setMessages((current) => current.filter((message) => message.id !== messageId));
      } else if (e.type === "member") {
        setMembers(e.members as MemberWithUser[]);
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [
    projectId,
    currentUserId,
    upsertMessage,
    incrementUnread,
    setUnreadCount,
  ]);

  /** Load an older page and prepend it (lazy pagination). */
  const loadOlder = useCallback(async () => {
    if (!projectId || loadingOlder || !hasMore || !oldestRef.current) return;
    setLoadingOlder(true);
    try {
      const page = await chatService.getProjectMessages(projectId, {
        before: oldestRef.current,
        limit: 25,
      });
      if (page.messages.length > 0) {
        page.messages.forEach((m) => knownIdsRef.current.add(m.id));
        setMessages((prev) => {
          const map = new Map(
            [...page.messages, ...prev].map((m) => [m.id, m]),
          );
          return Array.from(map.values());
        });
        oldestRef.current = page.messages[0].createdAt;
      }
      setHasMore(page.hasMore);
    } finally {
      setLoadingOlder(false);
    }
  }, [projectId, loadingOlder, hasMore]);

  /** Send a message with an optional attachment + reply. */
  const send = useCallback(
    async (
      textOrInput:
        | string
        | {
            message: string;
            attachment?: Attachment | null;
            replyToId?: string | null;
          },
    ) => {
      if (!projectId) return null;
      const input =
        typeof textOrInput === "string"
          ? { message: textOrInput }
          : textOrInput;
      const trimmed = input.message.trim();
      if (!trimmed && !input.attachment) return null;
      setSending(true);
      try {
        const msg = await chatService.sendMessage(projectId, {
          message: trimmed,
          attachment: input.attachment ?? null,
          replyToId: input.replyToId ?? null,
        });
        // The backend may echo only the attachment_id (no nested attachment
        // object) in the POST response. Re-attach the locally-known attachment
        // so the bubble shows the preview container + correct file name/size
        // immediately, even before the next poll returns the full resource.
        if (input.attachment && !msg.attachment) {
          msg.attachment = input.attachment;
        }
        knownIdsRef.current.add(msg.id);
        upsertMessage(msg);
        return msg;
      } finally {
        setSending(false);
      }
    },
    [projectId, upsertMessage],
  );

  /** Optimistically toggle the current user's reaction on a message. */
  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!projectId) return;
      const optimistic = (prev: ProjectMessage[]) =>
        prev.map((x) => {
          if (x.id !== messageId) return x;
          const reactions = { ...(x.reactions ?? {}) };
          const list = reactions[emoji] ?? [];
          const has = list.includes(currentUserId);
          const next = has
            ? list.filter((id) => id !== currentUserId)
            : [...list, currentUserId];
          if (next.length === 0) delete reactions[emoji];
          else reactions[emoji] = next;
          return { ...x, reactions };
        });
      setMessages(optimistic);
      return chatService
        .toggleReaction(projectId, messageId, emoji)
        .then((reactions) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === messageId ? { ...message, reactions } : message,
            ),
          );
        })
        .catch(async (error) => {
          const page = await chatService
            .getProjectMessages(projectId, { limit: 60 })
            .catch(() => null);
          const serverMessage = page?.messages.find((message) => message.id === messageId);
          if (serverMessage) upsertMessage(serverMessage);
          throw error;
        });
    },
    [projectId, currentUserId, upsertMessage],
  );

  /** Upload a file; throws for unsupported types. */
  const uploadAttachment = useCallback(
    (file: File, onProgress?: (p: { percent: number; bytes: number }) => void) =>
      chatService.uploadAttachment(projectId!, file, onProgress),
    [projectId],
  );

  const searchUsers = useCallback(
    (query: string) =>
      projectId
        ? chatService.searchUsers(projectId, query, {
            excludeIds: members.map((m) => m.user.id),
          })
        : Promise.resolve([]),
    [projectId, members],
  );

  const addMembers = useCallback(
    async (userIds: string[]) => {
      if (!projectId) return [];
      // If the POST succeeds the members ARE added. A later refresh failure
      // must not turn a successful add into an error.
      const added = await chatService.addProjectMembers(projectId, userIds);
      try {
        const refreshed = await chatService.getProjectMembers(projectId);
        setMembers(refreshed);
        setProjectUserId(refreshed.find((m) => m.isOwner)?.user.id ?? "");
      } catch {
        setMembers((prev) => {
          const existing = new Set(prev.map((m) => m.user.id));
          return [...prev, ...added.filter((m) => !existing.has(m.user.id))];
        });
      }
      return added;
    },
    [projectId],
  );

  const removeMember = useCallback(
    async (userId: string) => {
      if (!projectId) return;
      await chatService.removeProjectMember(projectId, userId);
      const refreshed = await chatService.getProjectMembers(projectId);
      setMembers(refreshed);
    },
    [projectId],
  );

  const updateMessage = useCallback(
    async (messageId: string, message: string) => {
      if (!projectId) return;
      const updated = await chatService.updateMessage(projectId, messageId, message);
      upsertMessage(updated);
    },
    [projectId, upsertMessage],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!projectId) return;
      await chatService.deleteMessage(projectId, messageId);
      setMessages((current) => current.filter((message) => message.id !== messageId));
      knownIdsRef.current.delete(messageId);
    },
    [projectId],
  );

  const updateMemberRole = useCallback(
    async (userId: string, roleId: number) => {
      if (!projectId) return;
      await chatService.updateProjectMemberRole(projectId, userId, roleId);
      const refreshed = await chatService.getProjectMembers(projectId);
      setMembers(refreshed);
    },
    [projectId],
  );

  return {
    projectId,
    currentUserId,
    currentUserAvatar,
    currentMember,
    isCreator,
    messages,
    initialLoading,
    loadingOlder,
    hasMore,
    sending,
    members,
    membersLoading,
    memberIds: members.map((m) => m.user.id),
    unread,
    updateMemberRole,
    activate,
    deactivate,
    markAllRead,
    loadOlder,
    send,
    toggleReaction,
    updateMessage,
    deleteMessage,
    uploadAttachment,
    searchUsers,
    addMembers,
    removeMember,
  };
}
