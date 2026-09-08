"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { apiProjectChatService } from "@/services/apiProjectChatService";
import { useAuth } from "@/contexts/AuthContext";

type ChatUnreadContextValue = {
  unreadByProject: Record<number, number>;
  markRead: (projectId: number, messageId?: string) => Promise<void>;
  incrementUnread: (projectId: number) => void;
  setUnreadCount: (projectId: number, count: number) => void;
  computeUnread: (projectId: number) => Promise<number>;
  refreshProjects: (projectIds: number[]) => Promise<void>;
};

const ChatUnreadContext =
  createContext<ChatUnreadContextValue | undefined>(undefined);

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadByProject, setUnreadByProject] = useState<Record<string, number>>(
    {},
  );
  const trackedProjectIdsRef = useRef<number[]>([]);

  const setUnreadCount = useCallback((projectId: number, count: number) => {
    if (!trackedProjectIdsRef.current.includes(projectId)) {
      trackedProjectIdsRef.current = [
        ...trackedProjectIdsRef.current,
        projectId,
      ];
    }
    setUnreadByProject((previous) => ({
      ...previous,
      [projectId]: Math.max(0, count),
    }));
  }, []);

  const fetchCounts = useCallback(async () => {
    if (!user?.id) return {};
    return apiProjectChatService.getUnreadCounts();
  }, [user?.id]);

  const markRead = useCallback(
    async (projectId: number, messageId?: string) => {
      setUnreadCount(projectId, 0);
      try {
        const remaining = await apiProjectChatService.markProjectRead(
          projectId,
          messageId,
        );
        setUnreadCount(projectId, remaining);
      } catch {
        const counts = await fetchCounts().catch(() => null);
        if (counts) setUnreadCount(projectId, counts[projectId] ?? 0);
      }
    },
    [fetchCounts, setUnreadCount],
  );

  const incrementUnread = useCallback((projectId: number) => {
    if (!trackedProjectIdsRef.current.includes(projectId)) {
      trackedProjectIdsRef.current = [
        ...trackedProjectIdsRef.current,
        projectId,
      ];
    }
    setUnreadByProject((previous) => ({
      ...previous,
      [projectId]: (previous[projectId] ?? 0) + 1,
    }));
  }, []);

  const computeUnread = useCallback(
    async (projectId: number): Promise<number> => {
      try {
        const counts = await fetchCounts();
        const count = counts[projectId] ?? 0;
        setUnreadCount(projectId, count);
        return count;
      } catch {
        return 0;
      }
    },
    [fetchCounts, setUnreadCount],
  );

  const refreshProjects = useCallback(
    async (projectIds: number[]) => {
      trackedProjectIdsRef.current = [...new Set(projectIds)];
      if (projectIds.length === 0) return;

      try {
        const counts = await fetchCounts();
        setUnreadByProject((previous) => {
          const next = { ...previous };
          projectIds.forEach((projectId) => {
            next[projectId] = counts[projectId] ?? 0;
          });
          return next;
        });
      } catch {
        // Keep the last known counts during a temporary network failure.
      }
    },
    [fetchCounts],
  );

  useEffect(() => {
    if (!user?.id) {
      setUnreadByProject({});
      trackedProjectIdsRef.current = [];
      return;
    }

    const refreshTracked = () => {
      const ids = trackedProjectIdsRef.current;
      if (ids.length > 0) void refreshProjects(ids);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshTracked();
    };

    const interval = window.setInterval(refreshTracked, 10_000);
    window.addEventListener("focus", refreshTracked);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshTracked);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshProjects, user?.id]);

  return (
    <ChatUnreadContext.Provider
      value={{
        unreadByProject,
        markRead,
        incrementUnread,
        setUnreadCount,
        computeUnread,
        refreshProjects,
      }}
    >
      {children}
    </ChatUnreadContext.Provider>
  );
}

export function useChatUnread() {
  const context = useContext(ChatUnreadContext);
  if (!context) {
    throw new Error("useChatUnread must be used within ChatUnreadProvider");
  }
  return context;
}
