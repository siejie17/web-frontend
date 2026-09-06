"use client";

import type { UserRole } from "@/lib/mockChat/types";

const ROLE_STYLES: Record<UserRole, { bg: string; fg: string }> = {
  Member: { bg: "rgba(124,136,128,0.12)", fg: "#5B655F" },
  Developer: { bg: "rgba(62,107,82,0.12)", fg: "#2E5140" },
  "GBI Facilitator": { bg: "rgba(192,138,62,0.14)", fg: "#8A6420" },
  Architect: { bg: "rgba(51,85,110,0.12)", fg: "#2C4A5E" },
  Engineer: { bg: "rgba(91,78,122,0.12)", fg: "#4E3E6E" },
  "Quantity Surveyor": { bg: "rgba(176,77,60,0.12)", fg: "#8C3A26" },
  "Project Manager": { bg: "rgba(46,110,99,0.12)", fg: "#1F5B52" },
};

export function RoleBadge({ role }: { role: UserRole }) {
  const s = ROLE_STYLES[role] ?? ROLE_STYLES.Developer;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {role}
    </span>
  );
}
