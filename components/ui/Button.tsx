"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  children: ReactNode;
};

const variantStyles: Record<string, string> = {
  primary:
    "bg-gradient-to-r from-emerald-500 via-teal-600 to-blue-900 text-paper shadow-soft " +
    "hover:from-emerald-600 hover:via-teal-700 hover:to-blue-950 " +
    "active:from-emerald-700 active:via-teal-800 active:to-blue-950 " +
    "disabled:bg-slate-200 disabled:bg-none disabled:text-slate-400 disabled:shadow-none",
  secondary:
    "bg-transparent text-ink border border-slate-200 hover:border-sage/40 hover:bg-mist disabled:border-slate-200 disabled:text-slate-400",
  ghost:
    "bg-transparent text-sage hover:bg-sage-50 disabled:text-slate-400",
};

/**
 * Standard button for ProFormaX web. Use `variant="primary"` for the main
 * action on a screen (sign in, calculate score, save project), `secondary`
 * for alternate actions, and `ghost` for low-emphasis / inline actions.
 */
export default function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5
        text-[15px] font-semibold transition-all duration-150
        active:scale-[0.98] hover:cursor-pointer
        disabled:cursor-not-allowed disabled:active:scale-100
        ${variantStyles[variant]}
        ${className}`}
      disabled={Boolean(disabled) || Boolean(loading)}
      {...rest}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {loading ? "Please wait…" : children}
    </button>
  );
}