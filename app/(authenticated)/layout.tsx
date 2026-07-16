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
import {
    ChevronDown,
    LogOut,
    UserRound,
    Sparkles,
    X,
    Info,
} from "lucide-react";
import { Plus_Jakarta_Sans, Inter, IBM_Plex_Mono } from "next/font/google";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

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

    const currentUser: User = { firstName, fullName, email, profilePicture, initials };

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const router = useRouter();

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
            className={`${display.variable} ${body.variable} ${mono.variable} min-h-screen bg-[#F6F6F2] text-[#1E2621]`}
            style={{ fontFamily: "var(--font-body)" }}
        >
            {/* z-40: page-level content (e.g. modals) that needs to sit above
          the header should use z-50, since this header is sticky and
          otherwise ties on stacking order with same-z-index siblings. */}
            <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#E4E1D8] bg-[#F6F6F2]/95 px-10 py-5">
                <div className="flex items-center gap-2.5">
                    <img
                        src="/logo/proformax-ori.png"
                        alt="ProFormaX"
                        className="h-8 w-8 object-contain"
                    />
                    <span
                        className="text-[18px] font-bold tracking-[-0.01em]"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        ProFormaX
                    </span>
                </div>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-[#EEF2EC] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
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
                            className={`text-[#5B655F] transition-transform ${menuOpen ? "rotate-180" : ""}`}
                        />
                    </button>

                    {menuOpen && (
                        <div
                            role="menu"
                            className="absolute right-0 top-[calc(100%+8px)] w-55 overflow-hidden rounded-[14px] border border-[#E4E1D8] bg-white shadow-[0_12px_32px_rgba(30,38,33,0.10)]"
                        >
                            <div className="border-b border-[#EFEDE6] px-4 py-3.5">
                                <div className="text-[13px] font-semibold">{currentUser.fullName}</div>
                                <div className="mt-0.5 text-[12px] text-[#5B655F]">
                                    {currentUser.email}
                                </div>
                            </div>
                            <MenuItem
                                icon={<UserRound size={16} />}
                                label="Profile"
                                action={() => router.push("/profile")}
                            />
                            <MenuItem icon={<Info size={16} />} label="About" action={() => router.push("/about")} />
                            <div className="my-1 h-px bg-[#EFEDE6]" />
                            <MenuItem
                                icon={<LogOut size={16} />}
                                label="Sign out"
                                danger
                                action={handleLogout}
                            />
                        </div>
                    )}
                </div>
            </header>

            {/* Single <main> landmark for every authenticated page. */}
            <main className="mx-auto max-w-380 px-10">{children}</main>

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
            className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-[#F6F6F2] ${danger ? "text-[#B4483C]" : "text-[#1E2621]"
                }`}
        >
            {icon}
            {label}
        </button>
    );
}

/* ---------------- AI Avatar (stub for future assistant) ---------------- */

function AIAvatar() {
    const [open, setOpen] = useState(false);

    return (
        <div className="fixed bottom-7 right-7 z-30">
            {open && (
                <div className="absolute bottom-16.5 right-0 w-65 rounded-2xl border border-[#E4E1D8] bg-white p-4.5 shadow-[0_16px_40px_rgba(30,38,33,0.14)]">
                    <div className="flex items-start justify-between">
                        <span className="text-[14px] font-semibold">
                            ProFormaX Assistant
                        </span>
                        <button
                            onClick={() => setOpen(false)}
                            aria-label="Close assistant preview"
                            className="text-[#8A938C] hover:text-[#5B655F]"
                        >
                            <X size={15} />
                        </button>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#5B655F]">
                        Ask about energy modeling, certifications, or portfolio trends. This
                        assistant is in active development.
                    </p>
                    <span className="mt-3 inline-block rounded-full bg-[#FBF3E7] px-2 py-0.75 text-[11px] text-[#C08A3E]">
                        Coming soon
                    </span>
                </div>
            )}

            <button
                onClick={() => setOpen((v) => !v)}
                aria-label="Open AI assistant"
                className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#1E2621] shadow-[0_10px_28px_rgba(30,38,33,0.28)]"
            >
                <span className="absolute -inset-1 animate-[pfx-pulse_2.4s_ease-out_infinite] rounded-full border-[1.5px] border-[#C08A3E] opacity-50" />
                <Sparkles size={20} className="text-[#F6F6F2]" />
                <span className="absolute right-0.5 top-0.5 h-2.25 w-2.25 rounded-full border-2 border-[#1E2621] bg-[#C08A3E]" />
            </button>
        </div>
    );
}
