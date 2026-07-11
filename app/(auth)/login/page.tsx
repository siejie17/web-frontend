"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, ArrowRight } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { canAccessPath, dashboardForRole } from "@/lib/auth-roles";

type FieldState = { value: string; error: string };

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [email, setEmail] = useState<FieldState>({ value: "", error: "" });
    const [password, setPassword] = useState<FieldState>({ value: "", error: "" });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [isNotVerifiedModalOpen, setIsNotVerifiedModalOpen] = useState(false);
    const [isResetSentModalOpen, setIsResetSentModalOpen] = useState(
        searchParams.get("passwordResetEmailSent") === "true"
    );

    const onLoginPressed = async (e: React.FormEvent) => {
        e.preventDefault();

        const emailError = email.value ? "" : "Email cannot be empty";
        const passwordError = password.value ? "" : "Password cannot be empty";

        if (emailError || passwordError) {
            setEmail((s) => ({ ...s, error: emailError }));
            setPassword((s) => ({ ...s, error: passwordError }));
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.value,
                    password: password.value,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw { response: { data } };
            }

            const { user } = data;

            if (user && user.email_verified_at) {
                await login(data.token ?? "", user);
                const requestedPath = searchParams.get("redirect");
                const roleDashboard = dashboardForRole(user.role);
                const safeDestination =
                    requestedPath?.startsWith("/") &&
                    !requestedPath.startsWith("//") &&
                    canAccessPath(user.role, requestedPath)
                        ? requestedPath
                        : roleDashboard;

                router.replace(safeDestination);
            } else {
                setIsNotVerifiedModalOpen(true);
            }
        } catch (err: any) {
            const message = err.response?.data?.message || "Network or server error";

            let emailFieldError = "";
            let passwordFieldError = "";

            if (err.response?.data?.errors) {
                const errors = err.response.data.errors;
                if (errors.email) emailFieldError = errors.email.join(" ");
                if (errors.password) passwordFieldError = errors.password.join(" ");
            }

            if (message.toLowerCase().includes("email")) emailFieldError = message;
            if (message.toLowerCase().includes("password")) passwordFieldError = message;

            if (!emailFieldError && !passwordFieldError) {
                emailFieldError = message;
                passwordFieldError = message;
            }

            setEmail((s) => ({ ...s, error: emailFieldError }));
            setPassword((s) => ({ ...s, error: passwordFieldError }));
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
                    <div className="pfx-stage-1 mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/15 via-sage/15 to-blue-900/10 text-sage ring-1 ring-sage/20">
                        <Lock size={20} strokeWidth={2} />
                    </div>

                    <p className="pfx-stage-2 mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-sage/70">
                        Account access
                    </p>
                    <h2 className="pfx-stage-2 mb-2 text-[28px] font-bold leading-tight text-ink">
                        Welcome back
                    </h2>
                    <p className="pfx-stage-3 text-[15px] text-slate">
                        Sign in to access your projects
                    </p>

                    <div
                        className="pfx-accent-bar mt-5 h-[3px] rounded-full bg-gradient-to-r from-emerald-500 via-teal-600 to-blue-900"
                        aria-hidden="true"
                    />
                </div>

                <form onSubmit={onLoginPressed} noValidate className="relative">
                    <div className="pfx-stage-3">
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
                        <TextField
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            value={password.value}
                            onChange={(e) => setPassword({ value: e.target.value, error: "" })}
                            errorText={password.error}
                            disabled={loading}
                            required
                            rightIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((s) => !s)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="flex items-center justify-center rounded-md p-1 text-slate transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-sage/40"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            }
                        />
                    </div>

                    <div className="pfx-stage-4 mb-8 flex items-center justify-end">
                        <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-sage transition-colors hover:text-sage-dark"
                        >
                            Forgot your password?
                        </Link>
                    </div>

                    <div className="pfx-stage-5">
                        <Button type="submit" loading={loading}>
                            <span className="flex items-center justify-center gap-2">
                                Sign in
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
                Don&apos;t have an account?{" "}
                <Link
                    href="/sign-up"
                    className="font-medium text-sage transition-colors hover:text-sage-dark"
                >
                    Create one
                </Link>
            </p>

            <Modal
                isOpen={isNotVerifiedModalOpen}
                onClose={() => setIsNotVerifiedModalOpen(false)}
                title="Verify your email to continue"
                description="We've sent a verification link to your inbox. Confirm your email, then sign in again."
                buttonText="Got it"
            />

            <Modal
                isOpen={isResetSentModalOpen}
                onClose={() => setIsResetSentModalOpen(false)}
                title="Check your inbox"
                description="We've sent password reset instructions to your email."
                buttonText="Got it"
            />
        </>
    );
}
