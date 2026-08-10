export type UserRole =
  | "Developer"
  | "GBI Facilitator"
  | "Architect"
  | "Engineer"
  | "Quantity Surveyor"
  | "Project Manager";

/**
 * Project-level access roles (stored in the roles table).
 * Higher level = more permissions.
 */
export type ProjectRole =
  | "member"
  | "developer"
  | "quantity_surveyor"
  | "gbi_facilitator";

export type User = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
};

export type Project = {
  id: number;
  name: string;
  userId: string;
};

export type ProjectMember = {
  id: string;
  projectId: number;
  userId: string;
  addedBy: string;
  role: ProjectRole;
  createdAt: string;
};

export type AttachmentKind = "image" | "pdf" | "spreadsheet";

export type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  kind: AttachmentKind;
  size: number;
  url?: string | null;
  downloadUrl?: string | null;
  uploadedBy: string;
  uploadedAt: string;
};

export type ProjectMessage = {
  id: string;
  projectId: number;
  senderId: string;
  message: string;
  attachment?: Attachment | null;
  replyToId?: string | null;
  createdAt: string;
  system?: boolean;
  reactions?: Record<string, string[]>;
};

export type MemberWithUser = {
  membership: ProjectMember;
  user: User;
  isOwner: boolean;
  role: ProjectRole | null;
};

export type MessagePage = {
  messages: ProjectMessage[];
  hasMore: boolean;
};
