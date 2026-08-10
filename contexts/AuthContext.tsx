"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
    id: string;
    name: string;
    email: string;
    email_verified_at: string | null;
    first_name: string;
    last_name: string;
    profile_pic: string;
    profile_picture?: string;
    created_at?: string;
};

type AuthContextValue = {
    user: User | null;
    loading: boolean;
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Routes that never need an authenticated session probe (handled by middleware). */
const AUTH_PATHS = ["/login", "/register", "/forgot-password"];

function isAuthPath(pathname: string) {
    return AUTH_PATHS.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const login = async (token: string, user: User) => {
        setUser(user);
    };

    const logout = async () => {
        setUser(null);
        router.replace("/login");
    };

    useEffect(() => {
        let cancelled = false;

        const restoreSession = async () => {
            try {
                const pathname = window.location.pathname;

                // Auth pages (login/register/forgot-password) don't need a /me
                // probe — the middleware already decided we're unauthenticated.
                // This avoids the redundant 401 + redirect loop on those pages.
                if (isAuthPath(pathname)) {
                    if (!cancelled) setUser(null);
                    return;
                }

                const res = await fetch("/be-api/auth/me", {
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                });

                const data = await res.json().catch(() => null);

                if (!res.ok) {
                    if (cancelled) return;
                    console.warn(
                        "[AuthContext] /api/auth/me returned non-OK status",
                        res.status,
                        data,
                    );
                    setUser(null);
                    // Preserve the intended destination so we can return after login.
                    const target = pathname + window.location.search;
                    const to =
                        target && target !== "/"
                            ? `/login?redirect=${encodeURIComponent(target)}`
                            : "/login";
                    router.replace(to);
                    return;
                }

                const restoredUser = data?.user ?? data;
                if (!cancelled) setUser(restoredUser);
            } catch {
                if (!cancelled) setUser(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        restoreSession();

        return () => {
            cancelled = true;
        };
    }, [router]);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading ? children : (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-mist">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-sage [animation-delay:0ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-sage-light [animation-delay:150ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-sage [animation-delay:300ms]" />
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
