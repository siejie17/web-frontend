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
                    return;
                }

                const restoredUser = data?.user ?? data;
                console.log(data);
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
            {!loading ? children : null}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}