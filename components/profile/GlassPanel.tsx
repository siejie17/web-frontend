"use client";

import type { ReactNode } from "react";

export default function GlassPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 shadow-[0_1px_2px_rgba(23,32,27,0.04),0_16px_40px_-16px_rgba(23,32,27,0.18)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}