"use client";

import { motion } from "framer-motion";

export default function AnimatedToggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6B4F]/40 focus-visible:ring-offset-2 ${
        checked
          ? "border-[#2F6B4F] bg-[#2F6B4F]"
          : "border-[#E7E5DE] bg-[#EFEDE6]"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      style={
        checked
          ? { boxShadow: "0 0 0 4px rgba(47,107,79,0.12), 0 2px 8px rgba(47,107,79,0.25)" }
          : undefined
      }
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
        style={{ marginLeft: checked ? "calc(100% - 1.375rem)" : "0.125rem" }}
      />
    </button>
  );
}