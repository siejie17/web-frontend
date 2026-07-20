"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, ArrowRight } from "lucide-react";

import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";

type FieldState = { value: string; error: string };

export default function ForgotPasswordPage() {
    const router = useRouter();

    const [email, setEmail] = useState<FieldState>({ value: "", error: "" });
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const emailError = email.value ? "" : "Email cannot be empty";

        if (emailError) {
            setEmail((s) => ({ ...s, error: emailError }));
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email: email.value }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw { response: { data } };
            }

            router.push("/login?passwordResetEmailSent=true");
        } catch (err: any) {
            const message = err.response?.data?.message || "Network or server error";

            let emailFieldError = "";
            if (err.response?.data?.errors?.email) {
                emailFieldError = err.response.data.errors.email.join(" ");
            }

            setEmail((s) => ({ ...s, error: emailFieldError || message }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Local entrance choreography — a quiet, staggered rise rather than a single fade.
                Respects prefers-reduced-motion. */}
            <style>{`
                @keyframes pfx-rise {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pfx-grow {
                    from { width: 0; opacity: 0; }
                    to { width: 2.75rem; opacity: 1; }
                }
                .pfx-stage-1 { animation: pfx-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .pfx-stage-2 { animation: pfx-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.06s both; }
                .pfx-stage-3 { animation: pfx-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both; }
                .pfx-stage-4 { animation: pfx-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both; }
                .pfx-stage-5 { animation: pfx-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.24s both; }
                .pfx-accent-bar { animation: pfx-grow 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
                @media (prefers-reduced-motion: reduce) {
                    .pfx-stage-1, .pfx-stage-2, .pfx-stage-3, .pfx-stage-4, .pfx-stage-5 {
                        animation: none;
                    }
                    .pfx-accent-bar { animation: none; width: 2.75rem; }
                }
            `}</style>

            <div className="relative">
                {/* Faint arc motif — a quiet echo of the auth artwork, no longer clipped to a card edge */}
                <svg
                    className="pointer-events-none absolute -right-6 -top-14 h-36 w-36 text-sage/10"
                    viewBox="0 0 200 200"
                    fill="none"
                    aria-hidden="true"
                >
                    <path d="M20 180 A160 160 0 0 1 180 20" stroke="currentColor" strokeWidth="1" />
                    <path d="M50 190 A160 160 0 0 1 190 50" stroke="currentColor" strokeWidth="1" />
                    <path d="M80 198 A160 160 0 0 1 198 80" stroke="currentColor" strokeWidth="1" />
                </svg>

                <div className="relative mb-9">
                    <div className="pfx-stage-1 mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-emerald-500/15 via-sage/15 to-blue-900/10 text-sage ring-1 ring-sage/20">
                        <KeyRound size={20} strokeWidth={2} />
                    </div>

                    <p className="pfx-stage-2 mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-sage/70">
                        Account access
                    </p>
                    <h2 className="pfx-stage-2 mb-2 text-[28px] font-bold leading-tight text-ink">
                        Forgot your password?
                    </h2>
                    <p className="pfx-stage-3 text-[15px] text-slate">
                        Enter your email and we&apos;ll send you a link to reset it
                    </p>

                    <div
                        className="pfx-accent-bar mt-5 h-0.75 rounded-full bg-linear-to-r from-emerald-500 via-teal-600 to-blue-900"
                        aria-hidden="true"
                    />
                </div>

                <form onSubmit={onSubmit} noValidate className="relative">
                    <div className="pfx-stage-3 mb-8">
                        <TextField
                            label="Email address"
                            type="email"
                            autoComplete="email"
                            value={email.value}
                            onChange={(e) => setEmail({ value: e.target.value, error: "" })}
                            errorText={email.error}
                            disabled={loading}
                            required
                        />
                    </div>

                    <div className="pfx-stage-4">
                        <Button type="submit" loading={loading}>
                            <span className="flex items-center justify-center gap-2">
                                Send reset link
                                {!loading && (
                                    <ArrowRight
                                        size={16}
                                        className="transition-transform duration-150 group-hover:translate-x-0.5"
                                    />
                                )}
                            </span>
                        </Button>
                    </div>
                </form>
            </div>

            <p className="pfx-stage-5 mt-8 text-center text-sm text-slate">
                Remembered your password?{" "}
                <Link
                    href="/login"
                    className="font-medium text-sage transition-colors hover:text-sage-dark"
                >
                    Sign in
                </Link>
            </p>
        </>
    );
}