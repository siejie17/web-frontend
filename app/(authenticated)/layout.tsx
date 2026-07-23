"use client";

/**
 * ProFormaX — Authenticated layout
 * ---------------------------------------------------------------
 * Wraps every route under app/(authenticated)/ with the shared
 * header/chrome. This is the single owner of:
 *   - the sticky header (logo, user menu)
 *   - the page background + font variables
 *   - the outer content max-width / horizontal padding
 *
 * Individual pages (e.g. assessments/new/page.tsx) should render
 * their own content only — no <main>, no min-h-screen, no font
 * wrapping, no horizontal padding — so there's exactly one of each
 * per rendered page instead of one nested inside another.
 * ---------------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound, Info } from "lucide-react";
import { Plus_Jakarta_Sans, Inter, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";

import AIAvatar from "@/components/ai/AIAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

interface User {
  firstName: string;
  fullName: string;
  profilePicture: string;
  email: string;
  initials: string;
}

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({
  children,
}: Readonly<AuthenticatedLayoutProps>) {
  const { user } = useAuth();

  const firstName = user?.first_name?.split(" ")[0] || "User";
  const fullName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : "Guest User";
  const email = user?.email || "guest@example.com";
  const profilePicture = user?.profile_pic || "";
  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const currentUser: User = {
    firstName,
    fullName,
    email,
    profilePicture,
    initials,
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const pathname = usePathname();

  const logoHref = pathname.includes("/dashboard") ? "#" : "/dashboard";

  const hideNavbar =
    pathname.includes("/assessments/new") ||
    pathname.includes("/assessments/new/results") ||
    pathname.includes("/assessments/history") ||
    pathname.includes("/profile") ||
    pathname.includes("/about");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <div
      className={`${display.variable} ${body.variable} ${mono.variable} relative min-h-screen text-[#1E2621]`}
    >
      {/* 1. Base Background Image Layer */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: "url('/images/main-background.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      />

      {/* 2. Opacity Tint Overlay Layer (Sits right on top of the image) */}

      <div className="pointer-events-none absolute inset-0 -z-10 bg-[#F6F6F2]/50" />

      {hideNavbar ? null : (
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#E4E1D8]/80 bg-white/78 px-10 py-5 shadow-[0_1px_12px_rgba(30,38,33,0.05)] backdrop-blur-lg">
          <Link
            href={logoHref}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <img
              src="/logo/proformax-ori.png"
              alt="ProFormaX Logo"
              className="h-8 w-8 object-contain"
            />
            <span
              className="text-[18px] font-bold tracking-[-0.01em]"
              style={{ fontFamily: "var(--font-display)" }} // Keep if not configured in tailwind.config
            >
              ProFormaX
            </span>
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-[#3E6B52]/[0.08] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
            >
              {currentUser.profilePicture ? (
                <img
                  src={`data:image/jpeg;base64,${currentUser.profilePicture}`}
                  alt={currentUser.fullName}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3E6B52] text-[13px] font-semibold text-[#F6F6F2]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {currentUser.initials}
                </span>
              )}
              <ChevronDown
                size={16}
                className={`text-[#5B655F] transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {menuOpen && (
              <>
                <style>{`
                  @keyframes menuIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+8px)] w-56 overflow-hidden rounded-[14px] border border-[#E4E1D8] bg-white shadow-[0_12px_32px_rgba(30,38,33,0.10)] [animation:menuIn_0.15s_ease-out]"
                >
                  <div className="border-b border-[#EFEDE6] px-4 py-3.5">
                    <div className="text-[13px] font-semibold text-[#1E2621]">
                      {currentUser.fullName}
                    </div>
                    <div className="mt-0.5 text-[12px] text-[#5B655F]">
                      {currentUser.email}
                    </div>
                  </div>
                  <MenuItem
                    icon={<UserRound size={16} />}
                    label="Profile"
                    action={() => router.push("/profile")}
                  />
                  <MenuItem
                    icon={<Info size={16} />}
                    label="About"
                    action={() => router.push("/about")}
                  />
                  <div className="my-1 h-px bg-[#EFEDE6]" />
                  <MenuItem
                    icon={<LogOut size={16} />}
                    label="Sign out"
                    danger
                    action={handleLogout}
                  />
                </div>
              </>
            )}
          </div>
        </header>
      )}

      {/* Single <main> landmark for every authenticated page. */}
      <main className="mx-auto max-w-380 px-10">
        {hideNavbar && (
          <div className="fixed top-6 left-6 z-[100] flex items-center gap-2.5 opacity-80">
            <img
              src="/logo/proformax-ori.png"
              alt=""
              className="h-7 w-7 object-contain"
            />
          </div>
        )}

        {children}
      </main>

      <AIAvatar />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  danger,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  action: () => void;
}) {
  return (
    <button
      role="menuitem"
      onClick={action}
      className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-[#F6F6F2] ${
        danger ? "text-[#B4483C]" : "text-[#1E2621]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
