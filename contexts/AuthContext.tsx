"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
    AI_CONVERSATION_CLEARED_EVENT,
    clearAIConversation,
    getAIConversationStorageKey,
} from "@/lib/aiConversation";

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
  email_notifications?: boolean;
  push_notifications?: boolean;
  role_id?: number | null;
  system_role?: "user" | "admin" | "super_admin" | "facilitator_admin";
  role?:
    | {
        id: number;
        name?: string;
        level?: number;
      }
    | string
    | null;
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
        const response = await fetch("/be-api/auth/logout", {
            method: "POST",
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error("Logout failed");
        }

        if (user?.id) {
            const storageKey = getAIConversationStorageKey(user.id);

            try {
                clearAIConversation(window.sessionStorage, user.id);
            } catch {
                // Logout must continue if browser storage is unavailable.
            }

            window.dispatchEvent(
                new CustomEvent(AI_CONVERSATION_CLEARED_EVENT, {
                    detail: { storageKey },
                }),
            );
        }

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
            "[AuthContext] /me returned non-OK status",
            res.status,
            data,
          );

          setUser(null);
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
  }, []);

  if (loading) {
    const leaves = Array.from({ length: 12 }).map((_, i) => {
      const h = (i * 2654435761) >>> 0; // Knuth multiplicative hash
      const left = (h % 10000) / 100;
      const delay = ((h >> 8) % 1200) / -100;
      const duration = ((h >> 16) % 600) / 100 + 8;
      const scale = ((h >> 4) % 500) / 1000 + 0.4;
      const sway = ((h >> 12) % 800) / 10 + 40;

      return { i, left, delay, duration, scale, sway };
    });

    return (
      <div
        role="status"
        aria-live="polite"
        className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-white"
      >
        <span className="sr-only">Loading page…</span>

        <div className="absolute inset-0 pointer-events-none z-0">
          {leaves.map((leaf) => (
            <svg
              key={leaf.i}
              className="absolute top-[-40px] leaf-particle"
              style={
                {
                  left: `${leaf.left}%`,
                  animationDelay: `${leaf.delay}s`,
                  animationDuration: `${leaf.duration}s`,
                  transform: `scale(${leaf.scale})`,
                  "--sway-dist": `${leaf.sway}px`,
                } as React.CSSProperties
              }
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M2 22C2 22 6 18 12 17C18 16 22 11 22 4C22 4 15 4 9 10C4 15 2 22 2 22Z"
                fill="url(#auth-leaf-grad)"
              />
              <path
                d="M2 22C7 16 13 14 22 4"
                stroke="#22c55e"
                strokeWidth="1"
              />
              <defs>
                <linearGradient
                  id="auth-leaf-grad"
                  x1="0%"
                  y1="100%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#166534" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#4ade80" stopOpacity="0.8" />
                </linearGradient>
              </defs>
            </svg>
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center gap-4">
          <img
            src="/logo/proformax.svg"
            alt="ProFormaX"
            width={192}
            height={48}
            fetchPriority="high"
            className="h-12 w-48 object-contain animate-[logoPulse_1.4s_cubic-bezier(0.4,0,0.6,1)_infinite]"
          />
          <p className="text-sm tracking-wide text-gray-400 animate-[textPulse_1.4s_cubic-bezier(0.4,0,0.6,1)_infinite]">
            Loading page...
          </p>
        </div>

        <style>{`
                    @keyframes logoPulse {
                        0%, 100% { opacity: 0.55; transform: scale(0.97); }
                        50% { opacity: 1; transform: scale(1); }
                    }
                    @keyframes textPulse {
                        0%, 100% { opacity: 0.4; }
                        50% { opacity: 1; }
                    }
                    .leaf-particle {
                        animation: fall linear infinite;
                    }
                    @keyframes fall {
                        0% { transform: translateY(-5vh) translateX(0px) rotate(0deg); opacity: 0; }
                        10% { opacity: 1; }
                        50% { transform: translateY(50vh) translateX(var(--sway-dist)) rotate(360deg); }
                        90% { opacity: 1; }
                        100% { transform: translateY(105vh) translateX(calc(var(--sway-dist) * -0.5)) rotate(720deg); opacity: 0; }
                    }
                `}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
