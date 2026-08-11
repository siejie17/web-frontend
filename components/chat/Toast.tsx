"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle } from "lucide-react";

export type ToastKind = "success" | "error";

export type ChatToastData = { id: number; message: string; kind: ToastKind };

export function ChatToast({
  toast,
  onDismiss,
}: {
  toast: ChatToastData | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 3200);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full border px-4 py-2.5 text-[13px] font-medium shadow-[0_12px_32px_rgba(30,38,33,0.18)] backdrop-blur ${
              toast.kind === "success"
                ? "border-[#BFD6C8] bg-white/90 text-[#2E5140]"
                : "border-[#E8C0B8] bg-white/90 text-[#963B31]"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                toast.kind === "success" ? "bg-[#3E6B52]/10" : "bg-[#B4483C]/10"
              }`}
            >
              {toast.kind === "success" ? (
                <Check size={12} className="text-[#3E6B52]" />
              ) : (
                <AlertCircle size={12} className="text-[#B4483C]" />
              )}
            </span>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
