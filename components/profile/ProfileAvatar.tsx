"use client";

import Image from "next/image";
import { Camera } from "lucide-react";

export default function ProfileAvatar({
  photo,
  initials,
  fullName,
  size = 96,
  onClick,
}: {
  photo: string;
  initials: string;
  fullName: string;
  size?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Change profile picture"
      className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#2F6B4F]/50 focus-visible:ring-offset-2"
      style={{ width: size, height: size }}
    >
      {/* Ambient glow ring */}
      <span
        aria-hidden="true"
        className="absolute -inset-2 rounded-full opacity-70 blur-lg transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "conic-gradient(from 180deg, #2F6B4F, #B8935A, #6FA98A, #2F6B4F)",
        }}
      />
      {/* Static ring border */}
      <span
        aria-hidden="true"
        className="absolute -inset-[3px] rounded-full bg-gradient-to-br from-[#2F6B4F] via-[#6FA98A] to-[#B8935A]"
      />

      <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-[#F4F3EF]">
        {photo ? (
          <Image
            src={photo.startsWith("data:") ? photo : `data:image/jpeg;base64,${photo}`}
            alt={fullName}
            width={size}
            height={size}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="font-serif font-medium text-[#17201B]"
            style={{ fontSize: size * 0.32 }}
          >
            {initials}
          </span>
        )}

        <span className="absolute inset-0 flex items-center justify-center bg-[#17201B]/40 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100">
          <Camera size={size * 0.22} className="text-white" strokeWidth={1.75} />
        </span>
      </span>
    </button>
  );
}