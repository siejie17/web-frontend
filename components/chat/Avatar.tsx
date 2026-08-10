"use client";

import Image from "next/image";
import { avatarGradient, avatarInitials } from "@/lib/mockChat/assets";

/** Normalise a stored base64 profile picture into a consumer-ready src. */
function photoSrc(value: string): string {
  return value.startsWith("data:") ? value : `data:image/jpeg;base64,${value}`;
}

export function Avatar({
  name,
  size = 36,
  className = "",
  showOnline,
  src,
}: {
  name: string;
  size?: number;
  className?: string;
  showOnline?: boolean;
  src?: string | null;
}) {
  const initials = avatarInitials(name || "?");
  const gradient = avatarGradient(name || "?");
  return (
    <span
      className={`relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-linear-to-br ${gradient} text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      title={name}
    >
      {src ? (
        <Image
          src={photoSrc(src)}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
      {showOnline && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#2FBF71]" />
      )}
    </span>
  );
}

/** Small circular avatar used in overlapping stacks. */
export function AvatarStack({
  members,
  max = 4,
  size = 30,
}: {
  members: { user: { id: string; fullName: string; avatar?: string | null }; isOwner?: boolean }[];
  max?: number;
  size?: number;
}) {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;
  return (
    <div className="flex items-center">
      {visible.map((m, i) => (
        <span
          key={m.user.id}
          className="-ml-1.5 first:ml-0"
          style={{ zIndex: max - i }}
        >
          <Avatar name={m.user.fullName} size={size} className="ring-2 ring-white" src={m.user.avatar} />
        </span>
      ))}
      {overflow > 0 && (
        // Non-interactive: this stack renders inside a clickable parent control,
        // so it must not contain a nested <button>.
        <span
          className="-ml-1.5 flex items-center justify-center rounded-full bg-[#E6EAE6] font-semibold text-[#3E6B52] ring-2 ring-white"
          style={{ width: size, height: size, fontSize: size * 0.34 }}
          aria-label={`${overflow} more members`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
