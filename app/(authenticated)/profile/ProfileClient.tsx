"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AtSign,
  Bell,
  Calendar,
  ChevronRight,
  ClipboardList,
  Info,
  KeyRound,
  Mail,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";

import ChangePasswordModal from "@/components/profile/ChangePasswordModal";
import EditFieldModal from "@/components/profile/EditFieldModal";
import EditPictureModal from "@/components/profile/EditPictureModal";
import GlassPanel from "@/components/profile/GlassPanel";
import InfoTile from "@/components/profile/InfoTile";
import PreferenceCard from "@/components/profile/PreferenceCard";
import ProfileHero from "@/components/profile/ProfileHero";
import { BackButton } from "@/components/ui/BackButton";
import UserPageTabs from "@/components/user/UserPageTabs";

type ProfileOverrides = {
  first_name?: string;
  last_name?: string;
  profile_pic?: string;
};

const QUICK_LINKS: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/assessments/new",
    label: "New Assessment",
    description: "Start scoring a project",
    icon: ClipboardList,
  },
  {
    href: "/assessments/history",
    label: "History",
    description: "Review past assessments",
    icon: Calendar,
  },
  {
    href: "/about",
    label: "About",
    description: "Learn more about ProFormaX",
    icon: Info,
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9BA39C]">
      {children}
    </h2>
  );
}

function QuickLinkCard({
  href,
  label,
  description,
  icon: Icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-4 rounded-2xl border border-[#E4E1D8] bg-white p-5 shadow-[0_4px_12px_rgba(30,38,33,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#C9D3CC] hover:shadow-[0_10px_24px_rgba(30,38,33,0.08)] active:translate-y-0"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3E6B52]/10 text-[#3E6B52] transition-colors group-hover:bg-[#3E6B52] group-hover:text-white">
          <Icon size={18} />
        </span>
        <ChevronRight
          size={16}
          className="text-[#C9D3CC] transition-all group-hover:translate-x-0.5 group-hover:text-[#3E6B52]"
        />
      </div>
      <div>
        <p className="text-[13.5px] font-semibold text-[#1E2621]">{label}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[#8A938C]">
          {description}
        </p>
      </div>
    </Link>
  );
}

export default function ProfileClient() {
  const { user } = useAuth();

  const [overrides, setOverrides] = useState<ProfileOverrides>({});
  const [message, setMessage] = useState<string | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(Boolean(user?.email_notifications));
  const [pushNotifications, setPushNotifications] = useState(Boolean(user?.push_notifications));
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [pushAvailable, setPushAvailable] = useState(false);

  const [editingField, setEditingField] = useState<
    "first_name" | "last_name" | null
  >(null);
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isActive = true;

    Promise.all([
      fetch(`/be-api/preferences?userId=${user.id}`, { credentials: "include", cache: "no-store" }),
      fetch("/be-api/push-subscriptions", { credentials: "include", cache: "no-store" }),
    ]).then(async ([preferencesResponse, pushResponse]) => {
      const preferences = await preferencesResponse.json().catch(() => null);
      const push = await pushResponse.json().catch(() => null);
      if (!isActive) return;
      if (preferencesResponse.ok) {
        setEmailNotifications(Boolean(preferences?.preferences?.email_notifications));
        setPushNotifications(Boolean(preferences?.preferences?.push_notifications && push?.subscribed));
      }
      setPushAvailable(Boolean(pushResponse.ok && push?.enabled && "serviceWorker" in navigator && "PushManager" in window));
      setVapidPublicKey(push?.public_key ?? null);
    }).catch(() => {
      if (isActive) setPushAvailable(false);
    });

    return () => {
      isActive = false;
    };
  }, [user]);

  const updatePreference = async (payload: { email_notifications?: boolean; push_notifications?: boolean }) => {
    if (!user) throw new Error("Not signed in");
    const response = await fetch(`/be-api/preferences?userId=${user.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message ?? "Unable to update notification preferences.");
  };

  const toggleEmailNotifications = async (enabled: boolean) => {
    setPreferencesLoading(true);
    try {
      await updatePreference({ email_notifications: enabled });
      setEmailNotifications(enabled);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update email notifications.");
    } finally {
      setPreferencesLoading(false);
    }
  };

  const togglePushNotifications = async (enabled: boolean) => {
    setPreferencesLoading(true);
    try {
      if (!pushAvailable || !vapidPublicKey) throw new Error("Browser push is unavailable or not configured.");
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (enabled) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") throw new Error("Notification permission was not granted.");
        subscription ??= await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        const serialized = subscription.toJSON();
        const response = await fetch("/be-api/push-subscriptions", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...serialized, content_encoding: "aes128gcm" }),
        });
        if (!response.ok) throw new Error("Unable to register this browser for push notifications.");
      } else if (subscription) {
        await fetch("/be-api/push-subscriptions", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      await updatePreference({ push_notifications: enabled });
      setPushNotifications(enabled);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update push notifications.");
    } finally {
      setPreferencesLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      window.location.href = "/login";
    }
  }, [user]);

  // Generic PATCH used by the name and picture modals. Adjust the endpoint
  // to match whatever route your API actually exposes for profile updates.
  const updateProfile = async (payload: Record<string, string>) => {
    if (!user) {
      throw new Error("Not signed in");
    }

    const res = await fetch(`/be-api/user-profile?userId=${user.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const validationMessage = data?.errors
        ? (Object.values(data.errors).flat().find((value) => typeof value === "string") as string | undefined)
        : undefined;
      throw new Error(validationMessage ?? data?.message ?? "Unable to save changes.");
    }

    return data;
  };

  const currentRoleLabel =
    getUserRoleLabel(user?.system_role ?? null) ??
    "Member";

  const profilePhoto =
    overrides.profile_pic ?? user?.profile_pic ?? user?.profile_picture ?? "";
  const firstName = overrides.first_name ?? user?.first_name ?? "";
  const lastName = overrides.last_name ?? user?.last_name ?? "";
  const initials = getInitials(firstName, lastName, user?.name);
  const fullName = getFullName(firstName, lastName, user?.name);
  const memberSince = getMemberSince(user?.created_at);

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-[#8A9089]">Redirecting to login…</p>
      </div>
    );
  }

  return (
    <div
      className="py-4"
    >
      <div className="mx-auto md:max-w-375 space-y-8 px-4 py-2">
        {/* ---------------- Profile Hero ---------------- */}
        <ProfileHero
          fullName={fullName}
          role={currentRoleLabel}
          memberSince={memberSince}
          photo={profilePhoto}
          initials={initials}
          emailVerified={Boolean(user.email_verified_at)}
          onEditPhoto={() => setShowPictureModal(true)}
        />

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center justify-between overflow-hidden rounded-2xl border border-[#E7E5DE] bg-white px-4 py-3 text-sm text-[#17201B] shadow-sm"
            >
              {message}
              <button
                type="button"
                onClick={() => setMessage(null)}
                aria-label="Dismiss"
                className="text-[#9BA39C] transition-colors hover:text-[#17201B]"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <GlassPanel className="p-5 sm:p-6">
          <SectionLabel>Account</SectionLabel>
          <div className="mt-3 grid gap-1 sm:grid-cols-2">
            <InfoTile
              icon={User}
              label="First name"
              value={firstName || "Not provided"}
              onEdit={() => setEditingField("first_name")}
            />
            <InfoTile
              icon={Users}
              label="Last name"
              value={lastName || "Not provided"}
              onEdit={() => setEditingField("last_name")}
            />
          </div>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            <InfoTile
              icon={AtSign}
              label="Email"
              value={user.email || "Not provided"}
            />
            <InfoTile
              icon={ShieldCheck}
              label="System Role"
              value={currentRoleLabel}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[#2F6B4F] transition-colors hover:bg-[#2F6B4F]/8"
          >
            <KeyRound size={14} />
            Change password
          </button>
        </GlassPanel>

        <GlassPanel className="p-5 sm:p-6">
          <SectionLabel>Notifications</SectionLabel>
          <div className="mt-3 space-y-1">
            <PreferenceCard
              icon={Mail}
              title="Email notifications"
              description="Project invitations, facilitator assignments, and assessment decisions"
              checked={emailNotifications}
              loading={preferencesLoading}
              onChange={toggleEmailNotifications}
            />
            <PreferenceCard
              icon={Bell}
              title="Push notifications"
              description={pushAvailable ? "Project activity and new chat messages on this device" : "Unavailable until browser push is configured"}
              checked={pushNotifications && pushAvailable}
              loading={preferencesLoading || !pushAvailable}
              onChange={togglePushNotifications}
            />
          </div>
        </GlassPanel>

        {/* ---------------- Quick Links ---------------- */}
        <div>
          <SectionLabel>Quick Links</SectionLabel>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {QUICK_LINKS.map((link) => (
              <QuickLinkCard key={link.href} {...link} />
            ))}
          </div>
        </div>
      </div>

      {editingField && (
        <EditFieldModal
          label={editingField === "first_name" ? "First name" : "Last name"}
          initialValue={editingField === "first_name" ? firstName : lastName}
          onClose={() => setEditingField(null)}
          onSave={async (value) => {
            await updateProfile({ [editingField]: value });
            setOverrides((prev) => ({ ...prev, [editingField]: value }));
            setMessage(
              `${editingField === "first_name" ? "First" : "Last"} name updated.`
            );
          }}
        />
      )}

      {showPictureModal && (
        <EditPictureModal
          currentPhoto={profilePhoto}
          fallbackInitials={initials}
          onClose={() => setShowPictureModal(false)}
          onSave={async (base64) => {
            await updateProfile({ profile_pic: base64 });
            setOverrides((prev) => ({ ...prev, profile_pic: base64 }));
            setMessage("Profile picture updated.");
          }}
        />
      )}

      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSave={async (currentPassword, newPassword) => {
            if (!user) {
              throw new Error("Not signed in");
            }

            const res = await fetch(`/be-api/user-password?userId=${user.id}`, {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
              }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
              throw new Error(data?.message ?? "Unable to update password.");
            }

            setMessage("Password updated.");
          }}
        />
      )}
    </div>
  );
}

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function getFullName(firstName?: string, lastName?: string, name?: string) {
  const parts = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (parts) {
    return parts;
  }

  return name || "Profile";
}

function getInitials(firstName?: string, lastName?: string, name?: string) {
  const source =
    [firstName, lastName].filter(Boolean).join(" ").trim() || name || "P";
  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getMemberSince(createdAt?: string) {
  if (!createdAt) return undefined;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.getFullYear().toString();
}

function getUserRoleLabel(
  role?:
    | {
        id?: number;
        name?: string;
        display_name?: string;
        title?: string;
        level?: number;
      }
    | string
    | null
) {
  if (!role) {
    return null;
  }

  if (typeof role === "string") {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  return (
    role.display_name ??
    role.title ??
    role.name ??
    (typeof role.level === "number" ? `Level ${role.level}` : null)
  );
}
