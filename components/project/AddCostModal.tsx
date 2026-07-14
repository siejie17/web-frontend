"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { DECIMAL_INPUT_RE } from "./CostBreakdownTree";

export type AddCostSubmitPayload = {
    description: string;
    cost: number;
    sectionName?: string;
};

export default function AddCostModal({
    visible,
    onClose,
    onAdd,
    parentPath,
    parentDescription,
    /** True only when the whole tree is currently empty and this is the very first item — asks for a section name too. */
    requiresSectionName = false,
}: {
    visible: boolean;
    onClose: () => void;
    onAdd: (payload: AddCostSubmitPayload) => void;
    parentPath: string | null;
    parentDescription?: string | null;
    requiresSectionName?: boolean;
}) {
    const [description, setDescription] = useState("");
    const [cost, setCost] = useState("");
    const [sectionName, setSectionName] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Reset the form each time the modal opens for a fresh add.
    useEffect(() => {
        if (visible) {
            setDescription("");
            setCost("");
            setSectionName("");
            setError(null);
        }
    }, [visible]);

    if (!visible) return null;

    const handleCostChange = (raw: string) => {
        const stripped = raw.replace(/,/g, "");
        if (!DECIMAL_INPUT_RE.test(stripped)) return;
        setCost(stripped);
    };

    const handleSubmit = () => {
        if (!description.trim()) {
            setError("Enter a description for this item.");
            return;
        }
        if (requiresSectionName && !sectionName.trim()) {
            setError("Enter a name for this section.");
            return;
        }
        const numericCost = parseFloat(cost);
        if (cost.trim() === "" || Number.isNaN(numericCost) || numericCost < 0) {
            setError("Enter a valid cost amount.");
            return;
        }

        onAdd({
            description: description.trim(),
            cost: numericCost,
            sectionName: requiresSectionName ? sectionName.trim() : undefined,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
            <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
                <div className="mb-5 flex items-start justify-between">
                    <div>
                        <h2 className="text-[17px] font-semibold text-[#1E2621]" style={{ fontFamily: "var(--font-display)" }}>
                            Add cost item
                        </h2>
                        {parentPath && parentDescription && (
                            <p className="mt-1 text-[12.5px] text-[#8A938C]">
                                Adding under <span className="font-medium text-[#5B655F]">{parentDescription}</span>
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8A938C] transition-colors hover:bg-[#F6F6F2] hover:text-[#1E2621]"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    {requiresSectionName && (
                        <Field label="Section name">
                            <input
                                type="text"
                                value={sectionName}
                                onChange={(e) => setSectionName(e.target.value)}
                                placeholder="e.g. SUBSTRUCTURE"
                                className="w-full rounded-xl border border-[#E4E1D8] bg-white px-3 py-2.5 text-[13.5px] text-[#1E2621] focus:border-[#3E6B52] focus:outline-none"
                            />
                        </Field>
                    )}

                    <Field label="Item description">
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g. Piling (Direct)"
                            className="w-full rounded-xl border border-[#E4E1D8] bg-white px-3 py-2.5 text-[13.5px] text-[#1E2621] focus:border-[#3E6B52] focus:outline-none"
                        />
                    </Field>

                    <Field label="Cost">
                        <div className="relative">
                            <span
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#8A938C]"
                                style={{ fontFamily: "var(--font-mono)" }}
                            >
                                RM
                            </span>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={cost}
                                onChange={(e) => handleCostChange(e.target.value)}
                                placeholder="0.00"
                                className="w-full rounded-xl border border-[#E4E1D8] bg-white py-2.5 pl-9 pr-3 text-[13.5px] tabular-nums text-[#1E2621] focus:border-[#3E6B52] focus:outline-none"
                                style={{ fontFamily: "var(--font-mono)" }}
                            />
                        </div>
                    </Field>

                    {error && <p className="text-[12.5px] text-[#B0453A]">{error}</p>}
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-2xl border border-[#E4E1D8] bg-white py-3 text-[13.5px] font-medium text-[#5B655F] transition-colors hover:border-[#C9D3CC]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="flex-1 rounded-2xl bg-[#3E6B52] py-3 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#325A44]"
                    >
                        Add item
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span
                className="mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-[#8A938C]"
                style={{ fontFamily: "var(--font-mono)" }}
            >
                {label}
            </span>
            {children}
        </label>
    );
}