import { Check } from "lucide-react";

export default function PasswordRequirement({ met, children }: { met: boolean; children: React.ReactNode }) {
    return (
        <li className="flex items-center gap-2 text-sm">
            <span
                className={`flex h-4 w-4 flex-none items-center justify-center rounded-full ring-1 transition-colors ${
                    met ? "bg-sage text-white ring-sage" : "text-transparent ring-slate/30"
                }`}
            >
                <Check size={11} strokeWidth={3} />
            </span>
            <span className={met ? "text-ink" : "text-slate"}>{children}</span>
        </li>
    );
}