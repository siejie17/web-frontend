"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Button from "./Button";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  imgSrc?: string;
  buttonText?: string;
};

/**
 * Message modal for confirmations, status, and simple alerts — the web
 * counterpart to the mobile app's MessageModal. Reuse for verification
 * prompts, save confirmations, error summaries, etc.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  imgSrc,
  buttonText = "Got it",
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl2 bg-paper p-8 text-center shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        {imgSrc && (
          <div className="mx-auto mb-5 h-20 w-20">
            <Image src={imgSrc} alt="" width={80} height={80} />
          </div>
        )}
        <h2 id="modal-title" className="mb-2 text-xl font-bold text-ink">
          {title}
        </h2>
        <p className="mb-6 text-[15px] text-slate">{description}</p>
        <Button onClick={onClose}>{buttonText}</Button>
      </div>
    </div>,
    document.body
  );
}
