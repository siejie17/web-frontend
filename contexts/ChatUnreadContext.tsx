"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { apiProjectChatService } from "@/services/apiProjectChatService";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Global unread-message tracking for project chats.
 *
 * The chat hook (`useProjectChat`) only runs while a project's chat is mounted,
 * so its unread count is lost as soon as you navigate away. This context keeps
 * a per-project "last read" timestamp (persisted in localStorage) and computes
 * unread counts on demand by fetching each project's latest messages. That lets
 * surfaces like the assessment history cards show "new messages" badges even
 * when no chat page is open.
 *
 * Responsibilities:
 *  - markRead(projectId)   -> record "now" as the read timestamp, clear unread
 *  - incrementUnread(id)   -> bump unread by one (used by the live chat hook)
 *  - computeUnread(id)     -> fetch messages and derive unread from last-read
 *  - refreshProjects(ids)  -> compute unread for many projects (history page)
 */

const STORAGE_KEY = "chat-unread-last-read";

type ChatUnreadContextValue = {
  unreadByProject: Record<number, number>;
  markRead: (projectId: number) => void;
  incrementUnread: (projectId: number) => void;
  computeUnread: (projectId: number) => Promise<number>;
  refreshProjects: (projectIds: number[]) => Promise<void>;
};

const ChatUnreadContext =
  createContext<ChatUnreadContextValue | undefined>(undefined);

function loadLastRead(): Record<number, string> {
  // Guard for SSR — localStorage doesn't exist on the server.
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object") return parsed as Record<number, string>;
    return {};
  } catch {
    return {};
  }
}

function persistLastRead(map: Record<number, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* storage may be unavailable (private mode etc.) — ignore */
  }
}

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const currentUserId = user?.id != null ? String(user.id) : "";

  const [unreadByProject, setUnreadByProject] = useState<Record<number, number>>(
    {},
  );
  const lastReadRef = useRef<Record<number, string>>(loadLastRead());

  const markRead = useCallback((projectId: number) => {
    const now = new Date().toISOString();
    lastReadRef.current = { ...lastReadRef.current, [projectId]: now };
    persistLastRead(lastReadRef.current);
    setUnreadByProject((prev) => ({ ...prev, [projectId]: 0 }));
  }, []);

  const incrementUnread = useCallback((projectId: number) => {
    setUnreadByProject((prev) => ({
      ...prev,
      [projectId]: (prev[projectId] ?? 0) + 1,
    }));
  }, []);

  const computeUnread = useCallback(
    async (projectId: number): Promise<number> => {
      if (!currentUserId) return 0;
      try {
        const page = await apiProjectChatService.getProjectMessages(projectId, {
          limit: 60,
        });
        const lastReadAt = lastReadRef.current[projectId];
        const lastReadTime = lastReadAt ? new Date(lastReadAt).getTime() : 0;

        let count = 0;
        for (const m of page.messages) {
          if (m.system) continue;
          if (m.senderId === currentUserId) continue;
          const created = new Date(m.createdAt).getTime();
          if (!lastReadAt || created > lastReadTime) count++;
        }
        setUnreadByProject((prev) => ({ ...prev, [projectId]: count }));
        return count;
      } catch {
        return 0;
      }
    },
    [currentUserId],
  );

  const refreshProjects = useCallback(
    async (projectIds: number[]) => {
      await Promise.all(projectIds.map((id) => computeUnread(id)));
    },
    [computeUnread],
  );

  return (
    <ChatUnreadContext.Provider
      value={{
        unreadByProject,
        markRead,
        incrementUnread,
        computeUnread,
        refreshProjects,
      }}
    >
      {children}
    </ChatUnreadContext.Provider>
  );
}

export function useChatUnread() {
  const ctx = useContext(ChatUnreadContext);
  if (!ctx) throw new Error("useChatUnread must be used within ChatUnreadProvider");
  return ctx;
}