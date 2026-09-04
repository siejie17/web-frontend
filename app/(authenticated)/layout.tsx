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

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  BookOpen,
  ChartLine,
  ChartNoAxesGantt,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  LogOut,
  ShieldCheck,
  Sparkles,
  SquareChartGantt,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Plus_Jakarta_Sans, Inter, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";

import AIAvatar from "@/components/ai/AIAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

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

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  read_at?: string | null;
  created_at?: string;
};

type CategoryMeta = {
  icon: typeof Bell;
  tint: string;
  tintSoft: string;
  gradient: string;
};

const CATEGORY_RULES: Array<{ test: RegExp; meta: CategoryMeta }> = [
  {
    test: /overdue|urgent|reject|fail|expir|risk/i,
    meta: { icon: AlertTriangle, tint: "#B5533C", tintSoft: "#B5533C14", gradient: "linear-gradient(135deg, #C2664D, #B5533C)" },
  },
  {
    test: /approv|complete|verified|passed|certif|publish/i,
    meta: { icon: CheckCircle2, tint: "#3E6B52", tintSoft: "#3E6B5214", gradient: "linear-gradient(135deg, #4C7E61, #3E6B52)" },
  },
  {
    test: /cost|budget|estimate|price|invoice|proforma/i,
    meta: { icon: TrendingUp, tint: "#B4802E", tintSoft: "#B4802E14", gradient: "linear-gradient(135deg, #C6953F, #B4802E)" },
  },
  {
    test: /team|invite|assign|member|collaborat|shared/i,
    meta: { icon: Users, tint: "#51707C", tintSoft: "#51707C14", gradient: "linear-gradient(135deg, #628390, #51707C)" },
  },
];

const DEFAULT_CATEGORY: CategoryMeta = {
  icon: Bell,
  tint: "#5E7A68",
  tintSoft: "#5E7A6814",
  gradient: "linear-gradient(135deg, #6E8C79, #5E7A68)",
};

function getCategory(item: NotificationItem): CategoryMeta {
  const text = `${item.title} ${item.message}`;
  const match = CATEGORY_RULES.find((rule) => rule.test.test(text));
  return match ? match.meta : DEFAULT_CATEGORY;
}

function formatRelative(dateStr?: string): string {
  if (!dateStr) return "Just now";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const previousUnreadRef = useRef(0);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const pathname = usePathname();

  const logoHref = pathname.includes("/dashboard") ? "#" : "/dashboard";
  const canAccessAdmin = user?.system_role === "admin" || user?.system_role === "super_admin";
  const canAccessFacilitator = user?.system_role === "facilitator_admin";

  const hideNavbar =
    pathname.includes("/assessments/new") ||
    pathname.includes("/assessments/new/results") ||
    pathname.includes("/projects") ||
    pathname.includes("/profile") ||
    pathname.includes("/recommendations") ||
    pathname.includes("/notifications") ||
    pathname.includes("/about");

  const playNotificationSound = useCallback(() => {
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;

      const audioContext = new AudioCtor();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.0001;

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const now = audioContext.currentTime;
      gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      oscillator.start(now);
      oscillator.stop(now + 0.3);

      void audioContext.resume();
    } catch {
      // Ignore audio autoplay restrictions and browser incompatibility.
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) {
      previousUnreadRef.current = 0;
      setUnreadCount(0);
      return;
    }

    try {
      const response = await fetch("/be-api/notifications/unread-count", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json().catch(() => ({ count: 0 }));
      const nextCount = Number(data?.count ?? data?.unread_count ?? 0);

      if (nextCount > previousUnreadRef.current) {
        playNotificationSound();
      }

      previousUnreadRef.current = nextCount;
      setUnreadCount(nextCount);
    } catch {
      // Keep the last known count during a temporary failure.
    }
  }, [playNotificationSound, user?.id]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    setLoadingNotifications(true);
    try {
      const response = await fetch("/be-api/notifications?limit=10", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        setNotifications([]);
        return;
      }

      const data = await response.json().catch(() => ({ data: [] }));
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];
      setNotifications(list as NotificationItem[]);
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user?.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedOutsideMenu = !!menuRef.current && !menuRef.current.contains(target);
      const clickedOutsideNotifications = !!notificationsRef.current && !notificationsRef.current.contains(target);
      const clickedOutsideMobileMenu = !!mobileMenuRef.current && !mobileMenuRef.current.contains(target);

      if (clickedOutsideMenu) {
        setMenuOpen(false);
      }
      if (clickedOutsideNotifications) {
        setNotificationsOpen(false);
      }
      if (clickedOutsideMobileMenu) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    void fetchUnreadCount();
    const interval = window.setInterval(() => {
      void fetchUnreadCount();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (notificationsOpen && user?.id) {
      void fetchNotifications();
    }
  }, [fetchNotifications, notificationsOpen, user?.id]);

  // Close the user menu whenever the route changes (e.g. navigating back from another page).
  useEffect(() => {
    setMenuOpen(false);
    setNotificationsOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/be-api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/be-api/notifications/${notificationId}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      if (response.ok) {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notificationId ? { ...item, read_at: new Date().toISOString() } : item,
          ),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      }
    } catch {
      // Ignore transient errors for now.
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (notification.link) {
      setNotificationsOpen(false);
      if (notification.id) {
        await markNotificationRead(notification.id);
      }
      router.push(notification.link);
      return;
    }

    if (notification.id) {
      await markNotificationRead(notification.id);
    }
    setNotificationsOpen(false);
  };

  return (
    <div
      className={`${display.variable} ${body.variable} relative min-h-screen text-[#1E2621]`}
    >
      {/* 1. Base Background Image Layer */}
      {/* <div className="fixed inset-0 -z-10">
        <Image
          src="/images/main-background.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div> */}

      {/* 2. Opacity Tint Overlay Layer (Sits right on top of the image) */}

      <div className="pointer-events-none fixed inset-0 -z-10 bg-[#F6F6F2]/50" />

      {hideNavbar ? null : (
        <header className="sticky top-0 z-40 border-b border-[#E4E1D8]/70 bg-white/75 px-6 shadow-[0_1px_0_rgba(30,38,33,0.03),0_16px_40px_-24px_rgba(30,38,33,0.25)] backdrop-blur-2xl sm:px-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3E6B52]/40 to-transparent" />

          <div className="mx-auto flex max-w-560 items-center justify-between py-2.5">
            {/* Left: logo + navigation tabs */}
            <div className="hidden items-center gap-5 sm:flex">
              <Link
                href={logoHref}
                className="group flex items-center gap-2.5"
              >
                <img
                  src="/logo/proformax-ori.png"
                  alt="ProFormaX Logo"
                  className="h-7 w-7 object-contain transition-transform duration-200 group-hover:scale-105"
                />
                <span
                  className="text-[17px] font-bold tracking-[-0.01em] text-[#1E2621] transition-colors group-hover:text-[#3E6B52]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  ProFormaX
                </span>
              </Link>

              <nav className="flex items-center px-8 gap-4">
                {[
                  { href: "/dashboard", label: "Dashboard" },
                  { href: "/assessments/history", label: "Assessments" },
                  { href: "/references", label: "References" },
                ].map(({ href, label }) => {
                  const isActive =
                    href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(href.split("?")[0]);

                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`relative px-3 py-1.5 text-[13.5px] font-medium transition-colors ${
                        isActive
                          ? "text-[#3E6B52]"
                          : "text-[#667169] hover:text-[#315B45]"
                      }`}
                    >
                      {label}
                      {isActive && (
                        <span className="absolute inset-x-0 -bottom-2.5 h-0.5 rounded-full bg-[#3E6B52]" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Mobile: centered logo + accordion trigger (all menu items consolidated) */}
            <div className="relative flex flex-1 items-center justify-center sm:hidden" ref={mobileMenuRef}>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={mobileMenuOpen}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${mobileMenuOpen ? "bg-[#3E6B52]/10" : "hover:bg-[#F6F6F2]"
                  }`}
              >
                <img
                  src="/logo/proformax-ori.png"
                  alt="ProFormaX Logo"
                  className="h-7 w-7 object-contain"
                />
                <span
                  className="text-[17px] font-bold tracking-[-0.01em] text-[#1E2621]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  ProFormaX
                </span>
                {unreadCount > 0 && (
                  <span
                    className="ml-0.5 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-semibold text-white"
                    style={{ backgroundImage: "linear-gradient(135deg, #C2664D, #B5533C)" }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                <ChevronDown
                  size={15}
                  className={`text-[#5B655F] transition-transform duration-200 ${mobileMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

{typeof document !== "undefined" &&
  createPortal(
              <AnimatePresence>
                {mobileMenuOpen && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="fixed inset-0 z-50 flex flex-col bg-white/98 backdrop-blur-xl"
                  >
                    {/* Top bar: logo + close */}
                    <div className="flex items-center justify-between border-b border-[#EFEDE6] px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src="/logo/proformax-ori.png"
                          alt="ProFormaX Logo"
                          className="h-7 w-7 object-contain"
                        />
                        <span
                          className="text-[17px] font-bold tracking-[-0.01em] text-[#1E2621]"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          ProFormaX
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label="Close menu"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-[#5B655F] transition-colors hover:bg-[#F6F6F2]"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* User info */}
                    <div className="flex items-center gap-3 px-5 py-5">
                      {currentUser.profilePicture ? (
                        <img
                          src={currentUser.profilePicture}
                          alt={currentUser.fullName}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className="flex h-12 w-12 items-center justify-center rounded-full text-[14px] font-semibold text-white"
                          style={{ fontFamily: "var(--font-display)", backgroundImage: "linear-gradient(135deg, #4C7E61, #294A39)" }}
                        >
                          {currentUser.initials}
                        </span>
                      )}
                      <div className="min-w-0 text-left">
                        <div className="truncate text-[15px] font-semibold text-[#1E2621]">
                          {currentUser.fullName}
                        </div>
                        <div className="truncate text-[13px] text-[#8A938C]">
                          {currentUser.email}
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-[#EFEDE6]" />

                    {/* Menu items — fills remaining screen */}
                    <div className="flex-1 overflow-y-auto px-3 py-3">
                      <MenuItem
                        icon={<ChartLine size={18} />}
                        label="Dashboard"
                        large
                        action={() => {
                          setMobileMenuOpen(false);
                          router.push("/dashboard");
                        }}
                      />
                      <MenuItem
                        icon={<SquareChartGantt size={18} />}
                        label="Assessments"
                        large
                        action={() => {
                          setMobileMenuOpen(false);
                          router.push("/assessments/history");
                        }}
                      />
                      <MenuItem
                        icon={<Bell size={18} />}
                        label="Notifications"
                        badge={unreadCount > 0 ? (unreadCount > 99 ? "99+" : String(unreadCount)) : undefined}
                        large
                        action={() => {
                          setMobileMenuOpen(false);
                          router.push("/notifications");
                        }}
                      />
                      <MenuItem
                        icon={<UserRound size={18} />}
                        label="Profile"
                        large
                        action={() => {
                          setMobileMenuOpen(false);
                          router.push("/profile");
                        }}
                      />
                      <MenuItem
                        icon={<Sparkles size={18} />}
                        label="Recommendations"
                        large
                        action={() => {
                          setMobileMenuOpen(false);
                          router.push("/recommendations");
                        }}
                      />
                      <MenuItem
                        icon={<BookOpen size={18} />}
                        label="References"
                        large
                        action={() => {
                          setMobileMenuOpen(false);
                          router.push("/references");
                        }}
                      />
                      {canAccessAdmin && (
                        <MenuItem
                          icon={<ShieldCheck size={18} />}
                          label="Admin view"
                          large
                          action={() => {
                            setMobileMenuOpen(false);
                            router.push("/admin");
                          }}
                        />
                      )}
                      <MenuItem
                        icon={<Info size={18} />}
                        label="About"
                        large
                        action={() => {
                          setMobileMenuOpen(false);
                          router.push("/about");
                        }}
                      />
                      {canAccessFacilitator && (
                        <MenuItem
                          icon={<BadgeCheck size={18} />}
                          label="Facilitator view"
                          large
                          action={() => {
                            setMobileMenuOpen(false);
                            router.push("/facilitator");
                          }}
                        />
                      )}
                    </div>

                    {/* Sign out pinned to bottom */}
                    <div className="border-t border-[#EFEDE6] p-3">
                      <MenuItem
                        icon={<LogOut size={18} />}
                        label="Sign out"
                        danger
                        large
                        action={() => {
                          setMobileMenuOpen(false);
                          void handleLogout();
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>,
              document.body
  )}
            </div>

            {/* Desktop icon cluster (bell + avatar) — hidden on mobile, replaced by the accordion above */}
            <div className="hidden items-center gap-1.5 rounded-full border border-[#E4E1D8] bg-white/70 p-1 shadow-[0_2px_10px_rgba(30,38,33,0.04)] sm:flex">
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                  onClick={() => setNotificationsOpen((value) => !value)}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${notificationsOpen ? "bg-[#3E6B52]/10 text-[#3E6B52]" : "text-[#5B655F] hover:bg-[#F6F6F2] hover:text-[#3E6B52]"
                    }`}
                >
                  <Bell size={17} />
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        key={unreadCount}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        className="absolute -right-1 -top-1 flex min-h-[19px] min-w-[19px] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white shadow-[0_2px_6px_rgba(181,83,60,0.4)]"
                        style={{ backgroundImage: "linear-gradient(135deg, #C2664D, #B5533C)" }}
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 top-[calc(100%+12px)] w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-[20px] border border-[#E4E1D8] bg-white/95 shadow-[0_24px_60px_rgba(30,38,33,0.16)] backdrop-blur-xl"
                    >
                      <div className="flex items-center justify-between border-b border-[#EFEDE6] px-4 py-3.5">
                        <p
                          className="text-[13px] font-semibold text-[#1E2621]"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          Notifications
                        </p>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-[#3E6B52]/10 px-2 py-0.5 text-[10px] font-semibold text-[#3E6B52]">
                            {unreadCount} unread
                          </span>
                        )}
                      </div>

                      <div className="max-h-90 overflow-y-auto p-1.5">
                        {loadingNotifications ? (
                          <div className="space-y-1.5 p-2">
                            {[1, 2, 3].map((item) => (
                              <div key={item} className="h-16 animate-pulse rounded-2xl bg-[#F1F0EA]" />
                            ))}
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#3E6B52]/8 text-[#3E6B52]">
                              <Bell size={14} />
                            </div>
                            <p className="text-[12px] text-[#8A938C]">You do not have any notifications yet.</p>
                          </div>
                        ) : (
                          notifications.map((notification) => {
                            const category = getCategory(notification);
                            const CategoryIcon = category.icon;
                            const isUnread = !notification.read_at;

                            return (
                              <button
                                key={notification.id}
                                type="button"
                                onClick={() => void handleNotificationClick(notification)}
                                className="flex w-full items-start gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-[#F6F6F2]"
                              >
                                <div
                                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                                  style={{ backgroundImage: category.gradient }}
                                >
                                  <CategoryIcon size={13} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <span
                                      className={`truncate text-[12.5px] ${isUnread ? "font-semibold text-[#1E2621]" : "font-medium text-[#3F4842]"}`}
                                    >
                                      {notification.title}
                                    </span>
                                    {isUnread && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3E6B52]" />}
                                  </div>
                                  <p className="mt-0.5 line-clamp-1 text-[11.5px] leading-5 text-[#5B655F]">
                                    {notification.message}
                                  </p>
                                  <span className="mt-1 inline-block text-[10.5px] text-[#8A938C]">
                                    {formatRelative(notification.created_at)}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>

                      <div className="border-t border-[#EFEDE6] p-2">
                        <button
                          type="button"
                          onClick={() => {
                            setNotificationsOpen(false);
                            router.push("/notifications");
                          }}
                          className="group flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#3E6B52] transition-colors hover:bg-[#3E6B52]/8"
                        >
                          See all
                          <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-5 w-px bg-[#E4E1D8]" />

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition-colors ${menuOpen ? "bg-[#3E6B52]/10" : "hover:bg-[#F6F6F2]"
                    }`}
                >
                  {currentUser.profilePicture ? (
                    <img
                      src={`${currentUser.profilePicture}`}
                      alt={currentUser.fullName}
                      className={`h-7 w-7 rounded-full object-cover ring-2 transition-all ${menuOpen ? "ring-[#3E6B52]/40" : "ring-transparent"}`}
                    />
                  ) : (
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold text-white ring-2 transition-all ${menuOpen ? "ring-[#3E6B52]/40" : "ring-transparent"}`}
                      style={{ fontFamily: "var(--font-display)", backgroundImage: "linear-gradient(135deg, #4C7E61, #294A39)" }}
                    >
                      {currentUser.initials}
                    </span>
                  )}
                  <ChevronDown
                    size={15}
                    className={`text-[#5B655F] transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 top-[calc(100%+12px)] w-60 overflow-hidden rounded-[20px] border border-[#E4E1D8] bg-white/95 shadow-[0_24px_60px_rgba(30,38,33,0.16)] backdrop-blur-xl"
                    >
                      <div className="flex items-center gap-3 border-b border-[#EFEDE6] px-4 py-3.5">
                        {currentUser.profilePicture ? (
                          <img
                            src={currentUser.profilePicture}
                            alt={currentUser.fullName}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-full text-[12.5px] font-semibold text-white"
                            style={{ fontFamily: "var(--font-display)", backgroundImage: "linear-gradient(135deg, #4C7E61, #294A39)" }}
                          >
                            {currentUser.initials}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-[#1E2621]">
                            {currentUser.fullName}
                          </div>
                          <div className="truncate text-[11.5px] text-[#8A938C]">
                            {currentUser.email}
                          </div>
                        </div>
                      </div>
                      <div className="p-1.5">
                        <MenuItem
                          icon={<UserRound size={16} />}
                          label="Profile"
                          action={() => router.push("/profile")}
                        />
                        <MenuItem
                          icon={<Sparkles size={16} />}
                          label="Recommendations"
                          action={() => router.push("/recommendations")}
                        />
                        <MenuItem
                          icon={<Info size={16} />}
                          label="About"
                          action={() => router.push("/about")}
                        />
                        {canAccessAdmin && (
                          <MenuItem
                            icon={<ShieldCheck size={16} />}
                            label="Admin view"
                            action={() => router.push("/admin")}
                          />
                        )}
                        {canAccessFacilitator && (
                          <MenuItem
                            icon={<BadgeCheck size={16} />}
                            label="Facilitator view"
                            action={() => router.push("/facilitator")}
                          />
                        )}
                      </div>
                      <div className="h-px bg-[#EFEDE6]" />
                      <div className="p-1.5">
                        <MenuItem
                          icon={<LogOut size={16} />}
                          label="Sign out"
                          danger
                          action={handleLogout}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Single <main> landmark for every authenticated page. */}
      <main className="px-4">
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
  badge,
  large,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  badge?: string;
  large?: boolean;
  action: () => void;
}) {
  return (
    <button
      role="menuitem"
      onClick={action}
      className={`flex w-full items-center gap-3 rounded-xl text-left font-medium transition-colors ${large ? "px-3.5 py-3.5 text-[14.5px]" : "px-3 py-2.5 text-[13px]"
        } ${danger ? "text-[#B4483C] hover:bg-[#B4483C]/8" : "text-[#1E2621] hover:bg-[#F6F6F2]"}`}
    >
      <span className={danger ? "text-[#B4483C]" : "text-[#7C8880]"}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
          style={{ backgroundImage: "linear-gradient(135deg, #C2664D, #B5533C)" }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
