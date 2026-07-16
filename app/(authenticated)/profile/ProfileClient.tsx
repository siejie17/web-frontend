"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  AtSign,
  Bell,
  History,
  Info,
  KeyRound,
  Mail,
  User,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";

import ChangePasswordModal from "@/components/profile/ChangePasswordModal";
import EditFieldModal from "@/components/profile/EditFieldModal";
import EditPictureModal from "@/components/profile/EditPictureModal";
import GlassPanel from "@/components/profile/GlassPanel";
import InfoTile from "@/components/profile/InfoTile";
import NavigationCard from "@/components/profile/NavigationCard";
import PreferenceCard from "@/components/profile/PreferenceCard";
import ProfileHero from "@/components/profile/ProfileHero";
import UserStats from "@/components/profile/UserStats";
import { BackToHomeButton } from "@/components/ui/BackToHomeButton";

type PreferenceState = {
  emailNotifications: boolean;
  pushNotifications: boolean;
};

const initialPreferences: PreferenceState = {
  emailNotifications: false,
  pushNotifications: false,
};

// Local overrides let the page reflect a successful edit immediately.
// If `useAuth` exposes a way to refresh/replace the session user (e.g. a
// `refreshUser()` or `setUser()`), call that instead inside each `onSave`
// below and this override layer can be removed.
type ProfileOverrides = {
  first_name?: string;
  last_name?: string;
  profile_pic?: string;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9BA39C]">
      {children}
    </h2>
  );
}

export default function ProfileClient() {
  const { user } = useAuth();

  const [overrides, setOverrides] = useState<ProfileOverrides>({});
  const [settings, setSettings] = useState<PreferenceState>(initialPreferences);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [savingPreference, setSavingPreference] =
    useState<keyof PreferenceState | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

    const fetchPreferences = async () => {
      try {
        setLoadingPreferences(true);
        const res = await fetch(`/api/user-preferences?userId=${user.id}`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.message ?? "Unable to fetch preferences");
        }

        const preferences = data?.preferences ?? data ?? {};

        if (!isActive) {
          return;
        }

        setSettings({
          emailNotifications: Boolean(
            preferences.email_notifications ?? preferences.emailNotifications
          ),
          pushNotifications: Boolean(
            preferences.push_notifications ?? preferences.pushNotifications
          ),
        });
      } catch (error) {
        console.error("Error fetching preferences:", error);
        if (isActive) {
          setMessage("Could not load notification preferences.");
        }
      } finally {
        if (isActive) {
          setLoadingPreferences(false);
        }
      }
    };

    fetchPreferences();

    return () => {
      isActive = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      window.location.href = "/login";
    }
  }, [user]);

  const handlePreferenceChange = async (
    preferenceKey: keyof PreferenceState,
    value: boolean
  ) => {
    if (!user) {
      return;
    }

    const fieldMapping: Record<keyof PreferenceState, string> = {
      emailNotifications: "email_notifications",
      pushNotifications: "push_notifications",
    };

    setMessage(null);
    setSettings((prev) => ({ ...prev, [preferenceKey]: value }));
    setSavingPreference(preferenceKey);

    try {
      const res = await fetch(`/api/user-preferences?userId=${user.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [fieldMapping[preferenceKey]]: value,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message ?? "Unable to update preferences");
      }

      setMessage("Preferences saved.");
    } catch (error) {
      console.error("Error updating preference:", error);
      setSettings((prev) => ({ ...prev, [preferenceKey]: !value }));
      setMessage("We could not save that change right now.");
    } finally {
      setSavingPreference(null);
    }
  };

  // Generic PATCH used by the name and picture modals. Adjust the endpoint
  // to match whatever route your API actually exposes for profile updates.
  const updateProfile = async (payload: Record<string, string>) => {
    if (!user) {
      throw new Error("Not signed in");
    }

    const res = await fetch(`/api/user-profile?userId=${user.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.message ?? "Unable to save changes.");
    }

    return data;
  };

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
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-2">
        <BackToHomeButton />
        <ProfileHero
          fullName={fullName}
          role={"Member"}
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

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Account */}
          <GlassPanel className="p-5 sm:p-6">
            <SectionLabel>Account</SectionLabel>
            <div className="mt-3 space-y-1">
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
              <InfoTile
                icon={AtSign}
                label="Email"
                value={user.email || "Not provided"}
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

          {/* Preferences */}
          <GlassPanel className="p-5 sm:p-6">
            <SectionLabel>Notifications</SectionLabel>
            <div className="mt-3 space-y-2">
              <PreferenceCard
                icon={Bell}
                title="Push"
                description="In-app and device alerts."
                checked={settings.pushNotifications}
                loading={loadingPreferences || savingPreference === "pushNotifications"}
                onChange={(value) => handlePreferenceChange("pushNotifications", value)}
              />
              <PreferenceCard
                icon={Mail}
                title="Email"
                description="Updates sent to your inbox."
                checked={settings.emailNotifications}
                loading={loadingPreferences || savingPreference === "emailNotifications"}
                onChange={(value) => handlePreferenceChange("emailNotifications", value)}
              />
            </div>
          </GlassPanel>
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

            const res = await fetch(`/api/user-password?userId=${user.id}`, {
              method: "PATCH",
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