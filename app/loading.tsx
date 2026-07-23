export default function RootLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-mist"
    >
      <span className="sr-only">Loading page…</span>

      {/* Plain <img>, not next/image — this screen is meant to paint before
          hydration finishes. next/image's `fill` mode needs a layout pass
          (and may still proxy SVGs through the /_next/image optimizer)
          before anything shows, which fights the point of a loading state.
          fetchPriority hints the browser to fetch this before anything else
          competing for bandwidth. */}
      <img
        src="/logo/proformax.svg"
        alt="ProFormaX"
        width={192}
        height={48}
        fetchPriority="high"
        className="h-12 w-48 object-contain"
      />

      {/* Indeterminate progress line — a calmer "something is happening"
          cue than a spinner, pure CSS, no JS required to animate. */}
      <div className="relative h-1 w-40 overflow-hidden rounded-full bg-sage/15">
        <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-sage to-sage-light [animation:loadingSlide_1.4s_ease-in-out_infinite]" />
      </div>

      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 animate-bounce rounded-full bg-sage [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-sage-light [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-sage [animation-delay:300ms]" />
      </div>

      <style>{`
        @keyframes loadingSlide {
          0%   { left: -34%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
