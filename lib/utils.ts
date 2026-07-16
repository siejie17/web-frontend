import type { CertificationLevel } from "@/types/project";

export function getTimePeriod(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return "Morning";
  if (hour === 12) return "Noon";
  if (hour >= 13 && hour < 18) return "Afternoon";
  if (hour >= 18 && hour < 21) return "Evening";
  if (hour >= 21) return "Night";
  return "Midnight";
}

export function formatRelativeTime(timestamp: any) {
  const date = new Date(timestamp.replace(" ", "T"));
  const now = new Date();

  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    return "A day ago";
  }
  if (days < 7) {
    return `${days} days ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks === 1) {
    return "A week ago";
  }
  if (weeks < 5) {
    return `${weeks} weeks ago`;
  }

  const months = Math.floor(days / 30);
  if (months === 1) {
    return "A month ago";
  }
  if (months < 12) {
    return `${months} months ago`;
  }

  const years = Math.floor(days / 365);
  if (years === 1) {
    return "A year ago";
  }

  return `${years} years ago`;
}

export function formatCurrency(value : any) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return value;
  return `RM ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatSize(value: any) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return value;
  return `${n.toLocaleString("en-US")} m²`;
}

export const tokens = {
  canvas: "#FAFAF7",
  surface: "#FFFFFF",
  ink: "#131A17",
  inkMuted: "#5B6A62",
  border: "#E5E7E0",
  predicted: "#3E5C8A", // blueprint ink
  predictedSoft: "#EAEEF6",
  actual: "#1C7A5E", // built emerald
  actualSoft: "#E4F3EC",
  amber: "#B3791E",
  amberSoft: "#FBF0DD",
  rust: "#AE4B32",
  rustSoft: "#FBEAE4",
} as const;

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const certificationPalette: Record<
  CertificationLevel,
  { bg: string; text: string; ring: string }
> = {
  Platinum: { bg: "bg-slate-900", text: "text-slate-50", ring: "ring-slate-700" },
  Gold: { bg: "bg-[#B3791E]", text: "text-amber-50", ring: "ring-[#8f5f16]" },
  Silver: { bg: "bg-slate-400", text: "text-white", ring: "ring-slate-300" },
  Certified: { bg: "bg-[#1C7A5E]", text: "text-white", ring: "ring-[#155c46]" },
  "Not Certified": { bg: "bg-[#AE4B32]", text: "text-white", ring: "ring-[#8c3a26]" },
};

export function clampPct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}