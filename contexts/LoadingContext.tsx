"use client";

import { createContext, ReactNode, useCallback, useContext, useRef } from "react";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-sage-100">
          <div className="h-full w-full origin-left animate-loading-bar bg-sage" />
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  );
}
