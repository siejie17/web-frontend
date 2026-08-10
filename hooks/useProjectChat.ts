"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiProjectChatService as chatService } from "@/services/apiProjectChatService";
import type {
  Attachment,
  MemberWithUser,
  ProjectMessage,
} from "@/lib/mockChat/types";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Central state owner for the project chat. The UI talks only to this hook,
 * which in turn talks only to the API chat service (Laravel via the /api
 * proxy routes). Components never touch the service directly.
 */
export function useProjectChat(realProjectId?: number | null) {
  const { user } = useAuth();
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
  }, []);

  const activate = useCallback(() => {
    isActiveRef.current = true;
    markAllRead();
  }, [markAllRead]);

  const deactivate = useCallback(() => {
    isActiveRef.current = false;
  }, []);

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

  /* Initial load + polling subscription. */
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

    Promise.all([
      chatService.getProjectMessages(projectId),
      chatService.getProjectMembers(projectId),
    ])
      .then(([page, memberList]) => {
        if (disposed) return;
        page.messages.forEach((m) => knownIdsRef.current.add(m.id));
        setMessages(page.messages);
        setHasMore(page.hasMore);
        oldestRef.current = page.messages[0]?.createdAt ?? null;
        setMembers(memberList);
        setMembersLoading(false);
        setInitialLoading(false);
        const owner = memberList.find((m) => m.isOwner)?.user.id ?? "";
        setProjectUserId(owner);
      })
      .catch(() => {
        if (disposed) return;
        setInitialLoading(false);
        setMembersLoading(false);
      });

    const unsubscribe = chatService.subscribe(projectId, (e) => {
      if (e.type === "message") {
        const msg = e.message as ProjectMessage;
        const isNew = !knownIdsRef.current.has(msg.id);
        if (isNew) knownIdsRef.current.add(msg.id);
        upsertMessage(msg);
        if (
          isNew &&
          !msg.system &&
          msg.senderId !== currentUserId &&
          !isActiveRef.current
        ) {
          unreadRef.current += 1;
          setUnread(unreadRef.current);
        }
      } else if (e.type === "update") {
        upsertMessage(e.message as ProjectMessage);
      } else if (e.type === "member") {
        setMembers(e.members as MemberWithUser[]);
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [projectId, currentUserId, upsertMessage]);

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
        .catch(() => setMessages(optimistic));
    },
    [projectId, currentUserId],
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
    activate,
    deactivate,
    markAllRead,
    loadOlder,
    send,
    toggleReaction,
    uploadAttachment,
    searchUsers,
    addMembers,
    removeMember,
  };
}