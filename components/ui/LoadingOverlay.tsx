"use client";

import { Loader2 } from "lucide-react";

type LoadingOverlayVariant = "dark" | "light";

/**
 * Reusable full-screen loading overlay. Used to show a blocking indicator
 * while a long-running action is in flight (running an assessment, submitting
 * results, saving project changes, ...).
 *
 * - `dark`: near-opaque scrim with a bare spinner and light text (for heavy,
 *   imperative actions like running or submitting an assessment).
 * - `light`: a translucent scrim with a white card, gradient-ring spinner and
 *   shadow (for saving-style background actions).
 *
 * Pass extra classes via `className` to override stacking context etc.
 */
export default function LoadingOverlay({
  title,
  description,
  variant = "dark",
  className = "",
}: {
  title: string;
  description?: string;
  variant?: LoadingOverlayVariant;
  className?: string;
}) {
  if (variant === "light") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`fixed inset-0 z-50 flex items-center justify-center bg-[#1E2621]/8 backdrop-blur-[3px] ${className}`}
        style={{ animation: "overlayFadeIn 0.25s ease-out" }}
      >
        <div
          className="flex flex-col items-center gap-4 rounded-[28px] border border-[#E4E1D8]/80 bg-white/95 px-10 py-8"
          style={{
            boxShadow:
              "0 24px 48px -12px rgba(30,38,33,0.18), 0 8px 20px -8px rgba(30,38,33,0.10), 0 0 0 1px rgba(228,225,216,0.6)",
            animation: "cardRiseIn 0.35s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div className="relative h-11 w-11">
            <svg
              viewBox="0 0 44 44"
              className="h-11 w-11"
              style={{ animation: "loadingOverlaySpin 0.9s linear infinite" }}
            >
              <circle cx="22" cy="22" r="18" fill="none" stroke="#EDEAE0" strokeWidth="3.5" />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="url(#loading-overlay-ring)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="113"
                strokeDashoffset="82"
              />
              <defs>
                <linearGradient id="loading-overlay-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3E6B52" />
                  <stop offset="100%" stopColor="#8FB89C" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[14.5px] font-semibold tracking-[-0.01em] text-[#1E2621]">
              {title}
            </span>
            {description && (
              <span className="text-[12px] text-[#8A8F85]">{description}</span>
            )}
          </div>
        </div>

        <style>{`
          @keyframes overlayFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes cardRiseIn {
            from { opacity: 0; transform: scale(0.94) translateY(6px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes loadingOverlaySpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // dark (default)
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#1E2621]/60 px-6 text-center backdrop-blur-sm ${className}`}
    >
      <Loader2 size={32} className="animate-spin text-[#F6F6F2]" />
      <p className="text-[15px] font-medium text-[#F6F6F2]">{title}</p>
      {description && <p className="text-[13px] text-[#C9D3CC]">{description}</p>}
    </div>
  );
}
