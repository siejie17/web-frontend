import Image from "next/image";

export default function RootLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex min-h-screen items-center justify-center"
    >
      {/* 1. Base Background Image Layer — same as AuthenticatedLayout */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/main-background.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* 2. Opacity Tint Overlay Layer — same as AuthenticatedLayout */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[#F6F6F2]/50" />

      <span className="sr-only">Loading page…</span>
      <img
        src="/logo/proformax.svg"
        alt="ProFormaX"
        width={192}
        height={48}
        fetchPriority="high"
        className="h-12 w-48 object-contain animate-[logoPulse_1.4s_cubic-bezier(0.4,0,0.6,1)_infinite]"
      />
      <style>{`
        @keyframes logoPulse {
          0%, 100% {
            opacity: 0.55;
            transform: scale(0.97);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
