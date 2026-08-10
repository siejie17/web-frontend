import {
  attachments,
  cloneUser,
  projects,
  projectMembers,
  projectMessages,
  users,
  getUser,
} from "@/lib/mockChat/db";
import {
  formatFileSize,
  getAttachmentKind,
  imagePlaceholderDataUrl,
  isSupportedFile,
} from "@/lib/mockChat/assets";import type {
  Attachment,
  AttachmentKind,
  MemberWithUser,
  MessagePage,
  ProjectMessage,
  ProjectRole,
  User,
} from "@/lib/mockChat/types";

/* ---------------------------------------------------------------------------
 * Mock service layer.
 *
 * This is the single boundary between the UI and data. Every method is
 * async and returns fresh copies (never shared references) with simulated
 * network latency, so it can later be swapped for real Laravel API calls
 * without touching the React components.
 * ------------------------------------------------------------------------ */

const MIN_LATENCY = 300;
const MAX_LATENCY = 800;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const latency = () =>
  MIN_LATENCY + Math.random() * (MAX_LATENCY - MIN_LATENCY);

function cloneMessage(m: ProjectMessage): ProjectMessage {
  return {
    ...m,
    attachment: m.attachment ? { ...m.attachment } : null,
  };
}

/* ---------------------------------------------------------------------------
 * Realtime simulation (later: Laravel Echo / Pusher / WebSockets).
 * ------------------------------------------------------------------------ */

type ChatEvent =
  | { type: "message"; message: ProjectMessage }
  | { type: "update"; message: ProjectMessage }
  | { type: "member"; members: MemberWithUser[] };

const listeners = new Map<number, Set<(e: ChatEvent) => void>>();

function emit(projectId: number, event: ChatEvent) {
  listeners.get(projectId)?.forEach((cb) => cb(event));
}

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${++idCounter}`;

/* ---------------------------------------------------------------------------
 * Internal mutations
 * ------------------------------------------------------------------------ */

function persistMessage(projectId: number, message: ProjectMessage) {
  projectMessages.push(message);
  emit(projectId, { type: "message", message: cloneMessage(message) });
  return cloneMessage(message);
}

function upsertMember(
  projectId: number,
  userId: string,
  addedBy: string,
  role: ProjectRole = "member",
) {
  const existing = projectMembers.find(
    (m) => m.projectId === projectId && m.userId === userId,
  );
  if (existing) return null;
  const membership = {
    id: nextId("pm"),
    projectId,
    userId,
    addedBy,
    role,
    createdAt: new Date().toISOString(),
  };
  projectMembers.push(membership);
  return membership;
}

/* ---------------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------------ */

export interface SendMessageInput {
  message: string;
  attachment?: Attachment | null;
  replyToId?: string | null;
}

export interface UploadProgress {
  percent: number;
  bytes: number;
}

export const mockProjectChatService = {
  /** Fetch the most recent page of messages (chronological ascending). */
  async getProjectMessages(
    projectId: number,
    options: { before?: string; limit?: number } = {},
  ): Promise<MessagePage> {
    await delay(latency());
    const limit = options.limit ?? 25;
    const relevant = projectMessages
      .filter((m) => m.projectId === projectId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    let page = relevant;
    if (options.before) {
      page = relevant.filter((m) => m.createdAt < options.before!);
    }
    const sliced = page.slice(-limit);
    const hasMore = sliced.length < page.length;
    return {
      messages: sliced.map(cloneMessage),
      hasMore,
    };
  },

  /** Send a message and broadcast it to the project's subscribers. */
  async sendMessage(
    projectId: number,
    input: SendMessageInput,
  ): Promise<ProjectMessage> {
    await delay(latency());
    const created: ProjectMessage = {
      id: nextId("m"),
      projectId,
      senderId: getUser(sessionUser)?.id ?? "u1",
      message: input.message,
      attachment: input.attachment ? { ...input.attachment } : null,
      replyToId: input.replyToId ?? null,
      createdAt: new Date().toISOString(),
    };
    return persistMessage(projectId, created);
  },

  /**
   * Toggle the current user's reaction on a message. Emits an `update` event
   * (upsert-by-id) so subscribers refresh in place rather than appending.
   */
  async toggleReaction(
    projectId: number,
    messageId: string,
    emoji: string,
  ): Promise<ProjectMessage> {
    await delay(latency());
    const m = projectMessages.find(
      (x) => x.id === messageId && x.projectId === projectId,
    );
    if (!m) throw new Error("Message not found");
    m.reactions = m.reactions ?? {};
    const list = (m.reactions[emoji] ??= []);
    const idx = list.indexOf(sessionUser);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(sessionUser);
    if (list.length === 0) delete m.reactions[emoji];
    emit(projectId, { type: "update", message: cloneMessage(m) });
    return cloneMessage(m);
  },

  /**
   * Validate + "upload" a file, reporting simulated progress. Returns the
   * persisted Attachment record.
   */
  async uploadAttachment(
    file: { name: string; type?: string; size: number },
    onProgress?: (p: UploadProgress) => void,
  ): Promise<Attachment> {
    if (!isSupportedFile(file.name, file.type)) {
      throw new Error(
        `Unsupported file type. Allowed: PNG, JPG, JPEG, WEBP, PDF, XLSX.`,
      );
    }
    const kind = getAttachmentKind(file.name, file.type) as AttachmentKind;

    await new Promise<void>((resolve) => {
      const start = Date.now();
      const duration = 1100;
      const tick = () => {
        const p = Math.min(1, (Date.now() - start) / duration);
        onProgress?.({
          percent: Math.round(p * 100),
          bytes: Math.round(file.size * p),
        });
        if (p < 1) setTimeout(tick, 90);
        else resolve();
      };
      tick();
    });

    const created: Attachment = {
      id: nextId("att"),
      filename: file.name,
      mimeType: file.type ?? "",
      kind,
      size: file.size,
      uploadedBy: sessionUser,
      uploadedAt: new Date().toISOString(),
      url:
        kind === "image"
          ? imagePlaceholderDataUrl(file.name, file.name)
          : null,
    };
    attachments.push(created);
    return { ...created };
  },

  /** Project members with their user records + ownership flag. */
  async getProjectMembers(projectId: number): Promise<MemberWithUser[]> {
    await delay(latency());
    const project = projects.find((p) => p.id === projectId);
    return projectMembers
      .filter((m) => m.projectId === projectId)
      .map((m) => {
        const user = getUser(m.userId);
        return {
          membership: { ...m },
          user: user ? { ...user } : ({ id: m.userId } as User),
          isOwner: project?.userId === m.userId,
          role: m.role ?? null,
        };
      })
      .sort((a, b) =>
        a.isOwner === b.isOwner
          ? a.user.fullName.localeCompare(b.user.fullName)
          : a.isOwner
            ? -1
            : 1,
      );
  },

  /** Search users by name or email. */
  async searchUsers(
    query: string,
    options: { excludeIds?: string[] } = {},
  ): Promise<User[]> {
    await delay(latency());
    const q = query.trim().toLowerCase();
    const exclude = new Set(options.excludeIds ?? []);
    if (!q) {
      return users
        .filter((u) => !exclude.has(u.id))
        .slice(0, 8)
        .map((u) => ({ ...u }));
    }
    return users
      .filter(
        (u) =>
          !exclude.has(u.id) &&
          (u.fullName.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)),
      )
      .slice(0, 12)
      .map((u) => ({ ...u }));
  },

  /** Add members (dedupes) and emit a system message for the feed. */
  async addProjectMembers(
    projectId: number,
    userIds: string[],
    role?: ProjectRole,
  ): Promise<MemberWithUser[]> {
    await delay(latency());
    const project = projects.find((p) => p.id === projectId);
    const added: MemberWithUser[] = [];
    for (const userId of userIds) {
      const membership = upsertMember(projectId, userId, sessionUser, role ?? "member");
      if (!membership) continue;
      const user = getUser(userId)!;
      added.push({
        membership,
        user: { ...user },
        isOwner: project?.userId === userId,
        role: membership.role ?? null,
      });
    }
    if (added.length > 0) {
      const names = added.map((a) => a.user.fullName).join(", ");
      const systemMsg: ProjectMessage = {
        id: nextId("m"),
        projectId,
        senderId: sessionUser,
        message: `added ${names} to the project.`,
        attachment: null,
        replyToId: null,
        createdAt: new Date().toISOString(),
        system: true,
      } as ProjectMessage;
      projectMessages.push(systemMsg);
      emit(projectId, { type: "message", message: cloneMessage(systemMsg) });
      emit(projectId, {
        type: "member",
        members: await this.getProjectMembers(projectId),
      });
    }
    return added;
  },

  /** Remove a member (owner cannot be removed). */
  async removeProjectMember(projectId: number, userId: string): Promise<void> {
    await delay(latency());
    const project = projects.find((p) => p.id === projectId);
    if (project?.userId === userId) return;
    const idx = projectMembers.findIndex(
      (m) => m.projectId === projectId && m.userId === userId,
    );
    if (idx >= 0) projectMembers.splice(idx, 1);
    emit(projectId, {
      type: "member",
      members: await this.getProjectMembers(projectId),
    });
  },

  /** Subscribe to realtime events for a project. Returns an unsubscribe fn. */
  subscribe(projectId: number, handler: (e: ChatEvent) => void): () => void {
    if (!listeners.has(projectId)) listeners.set(projectId, new Set());
    listeners.get(projectId)!.add(handler);
    return () => listeners.get(projectId)?.delete(handler);
  },

  /**
   * Simulate an incoming message from a colleague (demo of realtime). The
   * actual production wiring will be Laravel Broadcasting via Echo/Pusher.
   */
  simulateIncoming(projectId: number): { cancel: () => void } {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return { cancel: () => {} };
    const colleagues = projectMembers
      .filter(
        (m) => m.projectId === projectId && m.userId !== sessionUser,
      )
      .map((m) => m.userId);
    if (colleagues.length === 0) return { cancel: () => {} };
    const senderId = colleagues[Math.floor(Math.random() * colleagues.length)];
    const repliess = [
      "Confirmed on my end — I'll update the section checklist and share the latest version.",
      "Noted. I've logged this in the tracker and will follow up at the next stand-up.",
      "Agreed — let's keep the material language consistent across the packages. Uploading the revision shortly.",
      "Good point. I'll run the numbers and post the updated summary here.",
      "Reviewed and approved. Nothing blocking from my side.",
    ];
    const text = repliess[Math.floor(Math.random() * repliess.length)];

    const handle = setTimeout(() => {
      const created: ProjectMessage = {
        id: nextId("m"),
        projectId,
        senderId,
        message: text,
        attachment: null,
        replyToId: null,
        createdAt: new Date().toISOString(),
      };
      persistMessage(projectId, created);
    }, 5000 + Math.random() * 5000);

    return { cancel: () => clearTimeout(handle) };
  },

  getProjectUserId(projectId: number): string | null {
    return projects.find((p) => p.id === projectId)?.userId ?? null;
  },
};

/* ---------------------------------------------------------------------------
 * Session identity (mock: fixed to the demo user).
 * ------------------------------------------------------------------------ */

let sessionUser = "u1";
export function setSessionUser(id: string) {
  sessionUser = id;
}
export function getSessionUserId(): string {
  return sessionUser;
}

/** Resolve a projectId from the app onto a seeded mock project (1..3). */
export function resolveMockProjectId(realProjectId?: number | null): number {
  if (!realProjectId) return 1;
  return ((Math.abs(realProjectId) - 1) % projects.length) + 1;
}

export { formatFileSize };
