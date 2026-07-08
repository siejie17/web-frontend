import { ReactNode } from "react";
import Image from "next/image";

type AuthLayoutProps = {
  children: ReactNode;
};

/**
 * Split-screen shell for auth flows. Left panel carries the brand logo, headline,
 * and background artwork; right panel holds the form. Collapses to a compact
 * top band on small screens so the form stays the focus on mobile.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left Panel */}
      <div className="relative flex shrink-0 flex-col overflow-hidden lg:pb-10 bg-forest/90 lg:h-auto lg:w-[50%] lg:px-16">
        <Image
          src="/images/auth-side-background.png"
          alt=""
          fill
          priority
          className="object-cover"
        />

        <div className="relative z-10 flex h-full flex-col justify-between px-6 py-4 animate-fade-up sm:px-8 lg:flex lg:justify-center lg:px-0 lg:pb-4">
          {/* Mobile compact header: only logo + brand word */}
          <div className="flex items-center gap-3 lg:hidden">
            <Image
              src="/logo/proformax-white.png"
              alt="ProFormaX"
              width={48}
              height={48}
              className="h-8 w-8 object-contain"
              priority
            />
            <span className="text-lg font-semibold tracking-[0.2em] text-paper">
              ProFormaX
            </span>
          </div>

          {/* Full left-panel content for large screens */}
          <div className="hidden max-w-md lg:block">
            <Image
              src="/logo/proformax-white.png"
              alt="ProFormaX"
              width={75}
              height={75}
              className="h-12.5 w-12.5 object-contain lg:h-18.75 lg:w-18.75"
              priority
            />

            <h1 className="mt-6 text-[36px] font-bold leading-[1.15] tracking-wider text-paper lg:text-[44px]">
              Hello
              <br />
              ProFormaX!👋🏻
            </h1>
            <p className="mt-4 text-base leading-relaxed text-paper/80">
              Skip repetitive and manual green-building workflows. Get highly
              productive through automation and save tons of time.
            </p>
          </div>

          {/* Footer */}
          <p className="hidden text-sm text-paper/60 lg:absolute lg:bottom-0 lg:left-6 lg:block">
            © {new Date().getFullYear()} ProFormaX. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel (Forms) */}
      <div className="flex flex-1 items-center justify-center bg-mist px-6 py-8 sm:px-8 sm:py-10 lg:px-16 lg:py-12">
        <div className="w-full max-w-105 animate-fade-up">{children}</div>
      </div>
    </div>
  );
}
