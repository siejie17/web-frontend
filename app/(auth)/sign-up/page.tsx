"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus, ArrowRight, Info } from "lucide-react";

import api from "@/lib/api";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import PasswordRequirement from "@/components/ui/PasswordRequirement";

type FieldState = { value: string; error: string };

const PASSWORD_MIN_LENGTH = 6;

function getPasswordChecks(password: string) {
    return {
        length: password.length >= PASSWORD_MIN_LENGTH,
        upperLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
    };
}

/** Label content for the Password field: the usual legend text plus an info
 *  icon that reveals the requirements tooltip beside it on hover/focus. */
function PasswordLabel({ passwordChecks }: { passwordChecks: ReturnType<typeof getPasswordChecks> }) {
    return (
        <span className="group relative inline-flex items-center gap-1.5">
            Password
            <button
                type="button"
                aria-label="Password requirements"
                className="flex items-center justify-center rounded-md text-slate transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-sage/40"
            >
                <Info size={14} />
            </button>
 
            <div
                className="invisible absolute left-0 top-full z-20 mt-2 w-100 rounded-lg border border-sage/15 bg-white p-3 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 sm:left-full sm:top-1/2 sm:mt-0 sm:ml-3 sm:w-60 sm:-translate-y-1/2"
                role="tooltip"
            >
                {/* Arrow: points up on mobile (tooltip below), left on desktop (tooltip beside) */}
                <span
                    className="absolute -top-1.25 left-3 h-2.5 w-2.5 rotate-45 border-l border-t border-sage/15 bg-white sm:left-1.25 sm:top-1/2 sm:-translate-y-1/2 sm:border-t-0 sm:border-b"
                    aria-hidden="true"
                />
 
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate/70">
                    Password requirements
                </p>
                <ul className="space-y-1.5">
                    <PasswordRequirement met={passwordChecks.length}>
                        Minimum 6 characters
                    </PasswordRequirement>
                    <PasswordRequirement met={passwordChecks.upperLower}>
                        Upper &amp; lower case letters
                        <span className="ml-1 text-slate/60">(recommended)</span>
                    </PasswordRequirement>
                    <PasswordRequirement met={passwordChecks.special}>
                        At least one special character
                        <span className="ml-1 text-slate/60">(recommended)</span>
                    </PasswordRequirement>
                </ul>
            </div>
        </span>
    );
}

export default function RegisterPage() {
    const router = useRouter();

    const [firstName, setFirstName] = useState<FieldState>({ value: "", error: "" });
    const [lastName, setLastName] = useState<FieldState>({ value: "", error: "" });
    const [email, setEmail] = useState<FieldState>({ value: "", error: "" });
    const [password, setPassword] = useState<FieldState>({ value: "", error: "" });
    const [confirmPassword, setConfirmPassword] = useState<FieldState>({ value: "", error: "" });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

    const passwordChecks = getPasswordChecks(password.value);

    const onRegisterPressed = async (e: React.FormEvent) => {
        e.preventDefault();

        const firstNameError = firstName.value ? "" : "First name cannot be empty";
        const lastNameError = lastName.value ? "" : "Last name cannot be empty";
        const emailError = email.value ? "" : "Email cannot be empty";
        const passwordError = !password.value
            ? "Password cannot be empty"
            : password.value.length < PASSWORD_MIN_LENGTH
                ? `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
                : "";
        const confirmPasswordError = !confirmPassword.value
            ? "Please confirm your password"
            : confirmPassword.value !== password.value
                ? "Passwords do not match"
                : "";

        if (firstNameError || lastNameError || emailError || passwordError || confirmPasswordError) {
            setFirstName((s) => ({ ...s, error: firstNameError }));
            setLastName((s) => ({ ...s, error: lastNameError }));
            setEmail((s) => ({ ...s, error: emailError }));
            setPassword((s) => ({ ...s, error: passwordError }));
            setConfirmPassword((s) => ({ ...s, error: confirmPasswordError }));
            return;
        }

        setLoading(true);

        try {
            await api.post("/register", {
                first_name: firstName.value,
                last_name: lastName.value,
                email: email.value,
                password: password.value,
                password_confirmation: confirmPassword.value,
            });

            setIsVerifyModalOpen(true);
        } catch (err: any) {
            const message = err.response?.data?.message || "Network or server error";

            let firstNameFieldError = "";
            let lastNameFieldError = "";
            let emailFieldError = "";
            let passwordFieldError = "";

            if (err.response?.data?.errors) {
                const errors = err.response.data.errors;
                if (errors.first_name) firstNameFieldError = errors.first_name.join(" ");
                if (errors.last_name) lastNameFieldError = errors.last_name.join(" ");
                if (errors.email) emailFieldError = errors.email.join(" ");
                if (errors.password) passwordFieldError = errors.password.join(" ");
            }

            if (!firstNameFieldError && !lastNameFieldError && !emailFieldError && !passwordFieldError) {
                emailFieldError = message;
            }

            setFirstName((s) => ({ ...s, error: firstNameFieldError }));
            setLastName((s) => ({ ...s, error: lastNameFieldError }));
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
                @keyframes pfx-check-in {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .pfx-stage-1 { animation: pfx-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .pfx-stage-2 { animation: pfx-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.06s both; }
                .pfx-stage-3 { animation: pfx-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both; }
                .pfx-stage-4 { animation: pfx-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both; }
                .pfx-stage-5 { animation: pfx-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.24s both; }
                .pfx-stage-6 { animation: pfx-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both; }
                .pfx-accent-bar { animation: pfx-grow 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
                .pfx-requirements { animation: pfx-check-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both; }
                @media (prefers-reduced-motion: reduce) {
                    .pfx-stage-1, .pfx-stage-2, .pfx-stage-3, .pfx-stage-4, .pfx-stage-5, .pfx-stage-6, .pfx-requirements {
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
                        <UserPlus size={20} strokeWidth={2} />
                    </div>

                    <p className="pfx-stage-2 mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-sage/70">
                        Account access
                    </p>
                    <h2 className="pfx-stage-2 mb-2 text-[28px] font-bold leading-tight text-ink">
                        Create your account
                    </h2>
                    <p className="pfx-stage-3 text-[15px] text-slate">
                        Get started with your projects in minutes
                    </p>

                    <div
                        className="pfx-accent-bar mt-5 h-0.75 rounded-full bg-linear-to-r from-emerald-500 via-teal-600 to-blue-900"
                        aria-hidden="true"
                    />
                </div>

                <form onSubmit={onRegisterPressed} noValidate className="relative">
                    <div className="pfx-stage-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField
                            label="First name"
                            type="text"
                            autoComplete="given-name"
                            value={firstName.value}
                            onChange={(e) => setFirstName({ value: e.target.value, error: "" })}
                            errorText={firstName.error}
                            disabled={loading}
                            required
                        />
                        <TextField
                            label="Last name"
                            type="text"
                            autoComplete="family-name"
                            value={lastName.value}
                            onChange={(e) => setLastName({ value: e.target.value, error: "" })}
                            errorText={lastName.error}
                            disabled={loading}
                            required
                        />
                    </div>

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
                            label={<PasswordLabel passwordChecks={passwordChecks} />}
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
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

                    <div className="pfx-stage-5">
                        <TextField
                            label="Confirm password"
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={confirmPassword.value}
                            onChange={(e) => setConfirmPassword({ value: e.target.value, error: "" })}
                            errorText={confirmPassword.error}
                            disabled={loading}
                            required
                            rightIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword((s) => !s)}
                                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                    className="flex items-center justify-center rounded-md p-1 text-slate transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-sage/40"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            }
                        />
                    </div>

                    <div className="pfx-stage-6">
                        <Button type="submit" loading={loading}>
                            <span className="flex items-center justify-center gap-2">
                                Create account
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

            <p className="pfx-stage-6 mt-8 text-center text-sm text-slate">
                Already have an account?{" "}
                <Link
                    href="/login"
                    className="font-medium text-sage transition-colors hover:text-sage-dark"
                >
                    Sign in
                </Link>
            </p>

            <Modal
                isOpen={isVerifyModalOpen}
                onClose={() => {
                    setIsVerifyModalOpen(false);
                    router.push("/login");
                }}
                title="Verify your email to continue"
                description="We've sent a verification link to your inbox. Confirm your email, then sign in to get started."
                buttonText="Got it"
            />
        </>
    );
}