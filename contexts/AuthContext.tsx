"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

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
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const login = async (token: string, user: User) => {
        setUser(user);
    };

    const logout = async () => {
        setUser(null);
    };

    useEffect(() => {
        const restoreSession = async () => {
            try {
                const res = await fetch("/api/auth/me", {
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                });

                const data = await res.json().catch(() => null);

                if (!res.ok) {
                    console.warn("[AuthContext] /api/auth/me returned non-OK status", res.status, data);
                    setUser(null);
                    window.location.href = "/login";
                    return;
                }

                const restoredUser = data?.user ?? data;
                setUser(restoredUser);
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        restoreSession();
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
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
