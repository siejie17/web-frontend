"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, ArrowUpRight, BadgeCheck, BookOpen, ClipboardCheck, Home,
  LogOut, Menu, ShieldCheck, Sparkles, Users, X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AccessDenied from "@/components/errors/AccessDenied";
import AIAvatar from "@/components/ai/AIAvatar";
import type { SystemRole } from "@/lib/administrationApi";

type NavItem = { href: string; label: string; description: string; icon: React.ReactNode };

const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", description: "Operational pulse", icon: <Home size={18} /> },
  { href: "/admin/assessments", label: "Assessments", description: "Review and appoint", icon: <ClipboardCheck size={18} /> },
  { href: "/admin/recommendations", label: "Recommendations", description: "Guidance by level", icon: <Sparkles size={18} /> },
  { href: "/admin/users", label: "Manage users", description: "Facilitator access", icon: <Users size={18} /> },
  { href: "/admin/references", label: "References", description: "Standards and guides", icon: <BookOpen size={18} /> },
];

const superNav: NavItem[] = [
  ...adminNav,
  { href: "/super-admin", label: "User management", description: "Admin governance", icon: <ShieldCheck size={18} /> },
  { href: "/super-admin/activity-logs", label: "Activity logs", description: "Read-only audit trail", icon: <Activity size={18} /> },
];

const facilitatorNav: NavItem[] = [
  { href: "/facilitator", label: "Appointments", description: "Assigned assessments", icon: <BadgeCheck size={18} /> },
];

function navigationFor(role?: string) {
  if (role === "super_admin") return superNav;
  if (role === "facilitator_admin") return facilitatorNav;
  return adminNav;
}

export default function AdministrationShell({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: SystemRole[] }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = user?.system_role || "user";

  if (!allowedRoles.includes(role)) return <AccessDenied />;

  const nav = navigationFor(role);
  const roleLabel = role === "super_admin" ? "SuperAdmin" : role === "facilitator_admin" ? "Facilitator Admin" : "Admin";

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-[#173b2a] text-white">
      <div className="border-b border-white/10 px-6 py-6">
        <Link href={nav[0].href} className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Image src="/logo/proformax-white.png" alt="ProFormaX" width={28} height={28} />
          </span>
          <span>
            <span className="block text-[15px] font-bold tracking-[0.04em]">ProFormaX</span>
            <span className="mt-0.5 block text-xs uppercase tracking-[0.14em] text-white/60">Administration</span>
          </span>
        </Link>
      </div>

      <div className="px-5 py-5">
        <p className="truncate text-sm font-semibold">{user?.first_name} {user?.last_name}</p>
        <p className="mt-1 text-sm text-[#b9cbbf]">{roleLabel}</p>
      </div>

      <nav className="scrollbar-hidden flex-1 space-y-1 overflow-y-auto px-3 pb-5">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${active ? "bg-white text-[#173b2a] shadow-lg" : "text-white/78 hover:bg-white/8 hover:text-white"}`}>
              <span className={active ? "text-[#3e6b52]" : "text-[#b9cbbf]"}>{item.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className={`mt-0.5 block truncate text-sm ${active ? "text-[#5f6d64]" : "text-white/65"}`}>{item.description}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-white/10 px-3 py-2.5">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl bg-white/6 px-3 py-2.5 text-sm text-white/65 transition hover:bg-white/10 hover:text-white">
          <LogOut size={16} /> Sign out
        </button>
      </div>

    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f5f0] text-[#1e2621]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-70 lg:block">{sidebar}</aside>
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close menu" className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} /><aside className="relative h-full w-[min(18rem,calc(100vw-2.5rem))]">{sidebar}</aside></div>}
      <div className="lg:pl-70">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#e4e7df] bg-white/88 px-3 backdrop-blur-xl sm:px-5 lg:h-17 lg:px-10">
          <button aria-label="Open administration menu" aria-expanded={mobileOpen} className="rounded-lg p-2 text-[#3e6b52] lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button>
          <div className="hidden items-center gap-3 sm:flex">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78837b]">Green building administration</p>
            <span className="h-4 w-px bg-[#dfe4dc]" />
            <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-medium text-[#829087] transition hover:text-[#3e6b52]">
              Client workspace <ArrowUpRight size={11} />
            </Link>
          </div>
          <Link href="/dashboard" aria-label="Open client workspace" title="Client workspace" className="rounded-lg p-2 text-[#78837b] transition hover:bg-[#f1f4ef] hover:text-[#3e6b52] sm:hidden">
            <ArrowUpRight size={17} />
          </Link>
        </header>
        <main className="mx-auto max-w-360 px-4 py-5 sm:px-8 sm:py-7 lg:px-10 lg:py-10">{children}</main>
      </div>
      <AIAvatar />
    </div>
  );
}
