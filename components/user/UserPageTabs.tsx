"use client";

import { BookOpen, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/recommendations", label: "Recommendations", icon: Sparkles },
  { href: "/references", label: "References", icon: BookOpen },
] as const;

export default function UserPageTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="User pages"
      className="flex w-full gap-1 overflow-x-auto rounded-2xl border border-[#E4E1D8] bg-white/80 p-1.5 shadow-[0_4px_16px_rgba(30,38,33,0.04)] backdrop-blur"
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-[#3E6B52] text-white shadow-sm"
                : "text-[#667169] hover:bg-[#EDF3EE] hover:text-[#315B45]"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
