"use client";

import { createContext, ReactNode, useCallback, useContext, useState } from "react";

type LoadingContextValue = {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
};

const LoadingContext = createContext<LoadingContextValue>({
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
});

export function useLoading() {
  return useContext(LoadingContext);
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const isLoading = count > 0;

  const startLoading = useCallback(() => setCount((c) => c + 1), []);
  const stopLoading = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {isLoading && (() => {
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
            className="fixed inset-0 z-9999 flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-white"
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
                    fill="url(#loading-ctx-leaf-grad)"
                  />
                  <path d="M2 22C7 16 13 14 22 4" stroke="#22c55e" strokeWidth="1" />
                  <defs>
                    <linearGradient id="loading-ctx-leaf-grad" x1="0%" y1="100%" x2="100%" y2="0%">
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
      })()}
      {children}
    </LoadingContext.Provider>
  );
}
