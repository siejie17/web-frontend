import type { AttachmentKind } from "./types";

/** Prebuilt gradient pairs used to render initial-based avatars. */
export const AVATAR_GRADIENTS = [
  "from-[#3E6B52] to-[#6E9A7D]",
  "from-[#2E5140] to-[#7FB39A]",
  "from-[#7A4E2E] to-[#C08A3E]",
  "from-[#33556E] to-[#7FA8C4]",
  "from-[#5B4E7A] to-[#A999CC]",
  "from-[#7A3E44] to-[#C4777F]",
  "from-[#4E6B2E] to-[#9FB97A]",
  "from-[#2E6E63] to-[#79BFB1]",
] as const;

export function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarGradient(seed: string): string {
  const g = AVATAR_GRADIENTS[hashSeed(seed) % AVATAR_GRADIENTS.length];
  return g;
}

/* ---------------------------------------------------------------------------
 * Attachment validation & classification
 * ------------------------------------------------------------------------ */

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp"]);
const IMAGE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);
const PDF_MIME = "application/pdf";
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const ALLOWED_EXTENSIONS = new Set([
  ...IMAGE_EXT,
  "pdf",
  "xlsx",
]);

export function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export function getAttachmentKind(filename: string, mimeType?: string | null): AttachmentKind | null {
  const ext = getExtension(filename);
  if (IMAGE_EXT.has(ext) || (mimeType && IMAGE_MIME.has(mimeType))) return "image";
  if (ext === "pdf" || mimeType === PDF_MIME) return "pdf";
  if (ext === "xlsx" || mimeType === XLSX_MIME) return "spreadsheet";
  return null;
}

export function isSupportedFile(filename: string, mimeType?: string | null): boolean {
  return getAttachmentKind(filename, mimeType) !== null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ---------------------------------------------------------------------------
 * Timestamp / date helpers
 * ------------------------------------------------------------------------ */

export function parseDate(value: string | null | undefined): Date {
  const d = new Date(
    value && value.includes(" ") ? value.replace(" ", "T") : value ?? "",
  );
  return isNaN(d.getTime()) ? new Date() : d;
}

export function formatTime(value: string): string {
  const d = parseDate(value);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d);
}

export function formatFullDate(value: string): string {
  const d = parseDate(value);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dateSeparatorLabel(value: string): string {
  const d = parseDate(value);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(d, now)) return "Today";
  if (isSameDay(d, yesterday)) return "Yesterday";
  return formatFullDate(value);
}

/** Build an SVG data-URI image used as a placeholder for mock image attachments. */
export function imagePlaceholderDataUrl(seed: string, label: string): string {
  const w = 640;
  const h = 400;
  const s = label || "Attachment";
  const svg = [
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>`,
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>`,
    `<stop offset='0' stop-color='#2E5140'/>`,
    `<stop offset='1' stop-color='#7FB39A'/>`,
    `</linearGradient></defs>`,
    `<rect width='${w}' height='${h}' fill='url(#g)'/>`,
    `<rect width='${w}' height='${h}' fill='rgba(0,0,0,0.15)'/>`,
    `<text x='50%' y='50%' fill='rgba(255,255,255,0.92)' font-family='sans-serif' font-size='28' font-weight='600' text-anchor='middle' dominant-baseline='middle'>${s}</text>`,
    `</svg>`,
  ].join("");
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
