"use client";

import { Fraunces } from "next/font/google";
import { motion } from "framer-motion";
import { BadgeCheck, ShieldCheck, Sparkles } from "lucide-react";

import ProfileAvatar from "./ProfileAvatar";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Working late,";
  if (hour < 12) return "Good morning,";
  if (hour < 18) return "Good afternoon,";
  return "Good evening,";
}

export default function ProfileHero({
  fullName,
  role,
  memberSince,
  photo,
  initials,
  emailVerified,
  onEditPhoto,
}: {
  fullName: string;
  role: string;
  memberSince?: string;
  photo: string;
  initials: string;
  emailVerified: boolean;
  onEditPhoto: () => void;
}) {
  const badges = [
    { label: "Verified", icon: BadgeCheck, active: emailVerified },
    { label: "Active user", icon: Sparkles, active: true },
  ].filter((badge) => badge.active);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border border-white/60"
    >
      {/* Gradient wash */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #EAF3EC 0%, #F7F5EE 45%, #FDFAF2 100%)",
        }}
      />
      {/* Decorative blurred shapes */}
      <div
        aria-hidden="true"
        className="absolute -left-16 -top-24 h-64 w-64 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, #6FA98A, transparent 70%)" }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #B8935A, transparent 70%)" }}
      />

      <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:py-8">
        <ProfileAvatar
          photo={photo}
          initials={initials}
          fullName={fullName}
          size={104}
          onClick={onEditPhoto}
        />

        <div className="min-w-0">
          <p className="text-sm font-medium tracking-wide text-[#6B756E]">
            {getGreeting()}
          </p>
          <h1
            className={`${fraunces.className} mt-1 truncate text-4xl italic leading-tight tracking-tight text-[#17201B] sm:text-[2.75rem]`}
          >
            {fullName}
          </h1>
          <p className="mt-1.5 text-sm text-[#6B756E]">
            {role}
            {memberSince ? (
              <span className="text-[#9BA39C]"> · Member since {memberSince}</span>
            ) : null}
          </p>

          {badges.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {badges.map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#2F6B4F]/15 bg-white/70 px-3 py-1 text-xs font-medium text-[#254F3C] shadow-sm backdrop-blur-sm"
                >
                  <Icon size={13} strokeWidth={2} />
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}