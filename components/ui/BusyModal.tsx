"use client";

import { createPortal } from "react-dom";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function BusyModal({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl2 border border-white/60 bg-paper p-8 text-center shadow-soft">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sage/10 text-sage">
          <Loader2 size={22} className="animate-spin" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-ink">{title}</h2>
        {description && <p className="text-[15px] text-slate">{description}</p>}
      </div>
    </div>,
    document.body,
  );
}
