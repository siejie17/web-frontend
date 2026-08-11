"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";

import ModalActions from "./ModalActions";
import PremiumModal from "./PremiumModal";

export default function EditPictureModal({
    currentPhoto,
    fallbackInitials,
    onClose,
    onSave,
}: {
    currentPhoto: string;
    fallbackInitials: string;
    onClose: () => void;
    onSave: (base64: string) => Promise<void>;
}) {
    const [preview, setPreview] = useState<string>(
        currentPhoto
            ? currentPhoto.startsWith("data:")
                ? currentPhoto
                : `data:image/jpeg;base64,${currentPhoto}`
            : ""
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("Please choose an image file.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError("Please choose an image under 5MB.");
            return;
        }

        setError(null);
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        if (!preview) {
            setError("Choose a photo first.");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await onSave(preview);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <PremiumModal title="Edit profile picture" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-[#F4F3EF] shadow-[0_4px_16px_rgba(23,32,27,0.1)] ring-1 ring-[#E7E5DE]">
                        {preview ? (
                            <Image
                                src={preview}
                                alt="Preview"
                                width={112}
                                height={112}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <span className="text-2xl font-medium text-[#17201B]">
                                {fallbackInitials}
                            </span>
                        )}
                    </div>

                    <input
                        id="profile-photo-upload"
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        aria-label="Upload profile picture"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-full border border-[#E7E5DE] px-4 py-2 text-sm font-medium text-[#17201B] transition-colors hover:border-[#2F6B4F]/40 hover:bg-[#FAFAF8]"
                    >
                        <Camera size={14} />
                        Choose photo
                    </button>
                </div>

                {error && <p className="text-center text-sm text-[#B3413B]">{error}</p>}

                <ModalActions saving={saving} onClose={onClose} saveLabel="Save photo" />
            </form>
        </PremiumModal>
    );
}