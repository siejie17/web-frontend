import type {
  Attachment,
  MemberWithUser,
  MessagePage,
  ProjectMessage,
  ProjectRole,
  User,
} from "@/lib/mockChat/types";

/* ---------------------------------------------------------------------------
 * Real API client for the project chat.
 *
 * Talks to Laravel through the Next.js proxy routes under /api/... (which add
 * the session_token bearer header server-side). Keeps the exact same public
 * interface as mockProjectChatService so `useProjectChat` can swap with no
 * component changes. Realtime is emulated with short polling; swap for Laravel
 * Echo/Pusher when broadcasting is configured.
 * ------------------------------------------------------------------------ */

const POLL_MS = 4000;

class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function api<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: init?.body instanceof FormData
      ? undefined
      : { "Content-Type": "application/json", Accept: "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      (data && (data.message || data.error)) || (typeof data === "string" && data) || "";
    throw new ApiError(
      detail ? `Request failed (${res.status}): ${detail}` : `Request failed (${res.status})`,
      res.status,
      data,
    );
  }
  return data as T;
}

const str = (v: unknown): string => (v == null ? "" : String(v));
const num = (v: unknown): number =>
  v == null || Number.isNaN(Number(v)) ? 0 : Number(v);

function toUser(raw: any): User {
  return {
    id: str(raw?.id),
    fullName: str(raw?.fullName),
    email: str(raw?.email),
    role: (raw?.role ?? "member") as User["role"],
    avatar: raw?.avatar_url ?? raw?.avatar ?? raw?.profile_pic ?? null,
  };
}

/**
 * Rewrite a backend media URL to the local Next.js proxy so the file can be
 * rendered inline (`<img>`/`<iframe>`) and downloaded. The browser cannot send
 * the Bearer token, so we proxy through `/be-api/media/{filename}` which adds
 * the session_token server-side.
 */
function proxyMediaUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  // Backend url looks like `{base}/api/media/{filename}`. Extract the filename.
  const match = rawUrl.match(/\/media\/([^/?#]+)/);
  if (!match) return rawUrl; // not a media url; leave untouched
  return `/be-api/media/${encodeURIComponent(match[1])}`;
}

function toAttachment(raw: any): Attachment | null {
  if (!raw) return null;
  // Unwrap a possible Laravel API resource wrapper (`{ data: { ... } }`).
  const a =
    raw && !Array.isArray(raw) && raw.data && typeof raw.data === "object"
      ? raw.data
      : raw;
  // The backend may report the file size under several different field names
  // (size, file_size, bytes, size_in_bytes, size_bytes). Normalise them all so
  // an attachment never renders as "0 B" just because the field name differs.
  const size = num(
    a.size ??
      a.file_size ??
      a.size_in_bytes ??
      a.size_bytes ??
      a.bytes,
  );
  // Same for the filename — Laravel may return it as original_name, filename,
  // name, file_name, originalName, or original_filename.
  const filename = str(
    a.original_name ??
      a.filename ??
      a.name ??
      a.file_name ??
      a.originalName ??
      a.original_filename,
  );
  const url = proxyMediaUrl(a.url ?? a.download_url ?? a.downloadUrl);
  return {
    id: str(a.id),
    filename,
    mimeType: str(a.mime_type ?? a.mimeType ?? ""),
    kind: (a.kind ?? "pdf") as Attachment["kind"],
    size,
    url,
    downloadUrl: url ? `${url}/download` : null,
    uploadedBy: str(a.uploaded_by ?? a.uploadedBy ?? a.user_id),
    uploadedAt: str(a.uploaded_at ?? a.uploadedAt ?? ""),
  };
}

function toReactions(raw: any): Record<string, string[]> {
  const r = raw?.reactions;
  if (!r) return {};
  if (Array.isArray(r)) {
    const out: Record<string, string[]> = {};
    for (const item of r) {
      (out[item?.emoji] ??= []).push(str(item?.user_id ?? item?.userId));
    }
    return out;
  }
  if (typeof r === "object") {
    const out: Record<string, string[]> = {};
    for (const [emoji, ids] of Object.entries(r)) {
      out[emoji] = (Array.isArray(ids) ? ids : [ids]).map((id) => str(id));
    }
    return out;
  }
  return {};
}

function toMessage(raw: any): ProjectMessage {
  // Laravel API resources sometimes wrap the payload in `data`; unwrap it.
  const m =
    raw && !Array.isArray(raw) && raw.data && typeof raw.data === "object"
      ? raw.data
      : raw;
  // The attachment may also be resource-wrapped (`attachment.data`).
  const attRaw =
    m?.attachment &&
    !Array.isArray(m.attachment) &&
    m.attachment.data &&
    typeof m.attachment.data === "object"
      ? m.attachment.data
      : m?.attachment;
  return {
    id: str(m?.id),
    projectId: num(m?.project_id ?? m?.projectId),
    // The sender may come as a flat id or as a nested user/sender object.
    senderId: str(
      m?.sender_id ??
        m?.senderId ??
        m?.user_id ??
        m?.sender?.id ??
        m?.user?.id ??
        "",
    ),
    message: str(m?.body ?? m?.message),
    attachment: toAttachment(attRaw),
    replyToId: m?.reply_to_id
      ? str(m.reply_to_id)
      : m?.replyToId
        ? str(m.replyToId)
        : null,
    createdAt: str(m?.created_at ?? m?.createdAt ?? ""),
    system: !!(m?.is_system ?? m?.system),
    reactions: toReactions(m),
  };
}

function toMember(raw: any): MemberWithUser {
  const mem = raw?.membership ?? raw;
  const role = (mem?.role ?? raw?.role ?? "member") as ProjectRole;
  return {
    membership: {
      id: str(mem?.id),
      projectId: num(mem?.project_id ?? mem?.projectId ?? raw?.project_id),
      userId: str(mem?.user_id ?? mem?.userId ?? raw?.user_id ?? raw?.user?.id),
      addedBy: str(mem?.added_by ?? mem?.addedBy ?? ""),
      role,
      createdAt: str(mem?.created_at ?? mem?.createdAt ?? ""),
    },
    user: toUser(raw?.user ?? raw),
    isOwner: !!(raw?.is_owner ?? raw?.isOwner),
    role: role ?? null,
  };
}

/* ---------------------------------------------------------------------------
 * Service
 * ------------------------------------------------------------------------ */

export const apiProjectChatService = {
  async getProjectMessages(
    projectId: number,
    options: { before?: string; limit?: number } = {},
  ): Promise<MessagePage> {
    const qs = new URLSearchParams();
    if (options.before) qs.set("before", options.before);
    if (options.limit) qs.set("limit", String(options.limit));
    const q = qs.toString();
    const raw = await api<any>(
      `/be-api/projects/${projectId}/messages${q ? `?${q}` : ""}`,
    );
    const list = Array.isArray(raw?.messages ?? raw?.data)
      ? (raw?.messages ?? raw?.data)
      : [];
    return {
      messages: list.map(toMessage),
      hasMore: !!(raw?.hasMore ?? raw?.has_more),
    };
  },

  async sendMessage(
    projectId: number,
    input: { message: string; attachment?: Attachment | null; replyToId?: string | null },
  ): Promise<ProjectMessage> {
    const raw = await api<any>(`/be-api/projects/${projectId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        message: input.message,
        attachmentId: input.attachment?.id,
        replyToId: input.replyToId,
      }),
    });
    return toMessage(raw);
  },

  async toggleReaction(
    projectId: number,
    messageId: string,
    emoji: string,
  ): Promise<ProjectMessage> {
    const raw = await api<any>(`/be-api/messages/${messageId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ emoji }),
    });
    // The hook only uses the resolved value to confirm success; build a
    // best-effort message so the response shape never breaks the caller.
    return toMessage(raw) ?? { id: messageId, projectId, senderId: "", message: "", createdAt: "" };
  },

  async uploadAttachment(
    projectId: number,
    file: File,
    onProgress?: (p: { percent: number; bytes: number }) => void,
  ): Promise<Attachment> {
    const form = new FormData();
    form.append("file", file);
    const raw = await api<any>(`/be-api/projects/${projectId}/attachments`, {
      method: "POST",
      body: form,
    });
    onProgress?.({ percent: 100, bytes: file.size });
    const att = toAttachment(raw);
    if (att) {
      // The backend may omit the size/filename fields; fall back to the real
      // local values so the chip/bubble never shows "0 B" or an empty name.
      if (!att.size) att.size = file.size;
      if (!att.filename) att.filename = file.name;
      return att;
    }
    return {
      id: str(raw?.id ?? ""),
      filename: file.name,
      mimeType: file.type,
      kind: (raw?.kind ?? "pdf") as Attachment["kind"],
      size: file.size,
      url: raw?.url ?? null,
      uploadedBy: "",
      uploadedAt: new Date().toISOString(),
    };
  },

  async getProjectMembers(projectId: number): Promise<MemberWithUser[]> {
    const raw = await api<any>(`/be-api/projects/${projectId}/members`);
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
    return list.map(toMember);
  },

  async searchUsers(
    _projectId: number,
    query: string,
    options: { excludeIds?: string[] } = {},
  ): Promise<User[]> {
    const qs = new URLSearchParams();
    if (query.trim()) qs.set("q", query.trim());
    else qs.set("limit", "10");
    if (options.excludeIds?.length) qs.set("exclude", options.excludeIds.join(","));
    const q = qs.toString();
    const raw = await api<any>(`/be-api/users/search${q ? `?${q}` : ""}`);
    const list = Array.isArray(raw?.users ?? raw?.data)
      ? (raw?.users ?? raw?.data)
      : Array.isArray(raw)
        ? raw
        : [];
    return list.map(toUser);
  },

  async addProjectMembers(
    projectId: number,
    userIds: string[],
  ): Promise<MemberWithUser[]> {
    const raw = await api<any>(`/be-api/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify({ userIds }),
    });
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
        ? raw.data
        : [];
    return list.map(toMember);
  },

  async removeProjectMember(projectId: number, userId: string): Promise<void> {
    await api(`/be-api/projects/${projectId}/members/${userId}`, {
      method: "DELETE",
    });
  },

  /**
   * Poll-based realtime. Emits the same event contract the hook expects:
   *   { type: "message" }  -> new message
   *   { type: "update" }   -> existing message changed (reactions/edits)
   *   { type: "member" }   -> membership changed
   */
  subscribe(projectId: number, handler: (e: any) => void): () => void {
    let firstTick = true;
    const seen = new Set<string>();
    const signatures = new Map<string, string>();
    let memberSig = "";

    const memberSignature = (list: MemberWithUser[]) =>
      list
        .map((m) => `${m.user.id}:${m.isOwner}:${m.role ?? ""}`)
        .sort()
        .join(",");

    const tick = async () => {
      try {
        const [page, members] = await Promise.all([
          this.getProjectMessages(projectId, { limit: 60 }),
          this.getProjectMembers(projectId),
        ]);

        if (firstTick) {
          firstTick = false;
          page.messages.forEach((m) => {
            seen.add(m.id);
            signatures.set(m.id, messageSignature(m));
          });
          memberSig = memberSignature(members);
          return;
        }

        const msig = memberSignature(members);
        if (msig !== memberSig) {
          memberSig = msig;
          handler({ type: "member", members });
        }

        for (const m of page.messages) {
          const sig = messageSignature(m);
          if (!seen.has(m.id)) {
            seen.add(m.id);
            signatures.set(m.id, sig);
            handler({ type: "message", message: m });
          } else if (signatures.get(m.id) !== sig) {
            signatures.set(m.id, sig);
            handler({ type: "update", message: m });
          }
        }
      } catch {
        /* ignore transient poll errors */
      }
    };

    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => clearInterval(interval);
  },

  /** No-op; realtime is handled by the polling `subscribe`. */
  simulateIncoming(_projectId: number): { cancel: () => void } {
    return { cancel: () => {} };
  },
};

function messageSignature(m: ProjectMessage): string {
  return `${m.message}|${m.attachment?.id ?? ""}|${JSON.stringify(m.reactions ?? {})}`;
}
