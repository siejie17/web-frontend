"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type BackButtonProps = {
  text?: string;
  redirect?: string;
  action?: () => void;
};

export function BackButton({ text, redirect, action }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => (redirect ? router.push(redirect) : action ? action() : router.back())}
      className="group mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7C8880] transition-colors duration-200 hover:text-[#3E6B52]"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <ChevronLeft
        size={14}
        className="shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5"
      />
      {redirect ? `Back to ${text}` : "Back"}
    </button>
  );
}
