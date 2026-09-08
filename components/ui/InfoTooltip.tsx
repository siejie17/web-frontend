import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function InfoTooltip({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleClick = () => {
    // Only use click-to-toggle on touch/coarse-pointer devices.
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <span
      ref={tooltipRef}
      className={`group/tip relative inline-flex overflow-visible ${
        isOpen ? "is-open" : ""
      }`}
    >
      <button
        type="button"
        aria-label="More information"
        aria-describedby={isOpen ? "info-tooltip" : undefined}
        onClick={handleClick}
        className="flex h-5 w-5 items-center justify-center rounded-full text-[#9BA39C] transition-colors hover:text-[#3E6B52] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#3E6B52]"
      >
        <Info size={13} strokeWidth={2} />
      </button>

      <span
        id="info-tooltip"
        role="tooltip"
        className={`
          pointer-events-none absolute z-30
          w-[min(19.5rem,calc(100vw-2rem))]
          rounded-xl border border-[#2A342E]
          bg-[#1E2621] px-3 py-2
          text-[11px] font-normal normal-case
          leading-relaxed tracking-normal text-[#F6F6F2]
          opacity-0 shadow-[0_14px_32px_rgba(30,38,33,0.32)]
          transition-all duration-150

          /* Mobile: below the icon */
          left-1/2 top-full mt-2
          -translate-x-1/2 translate-y-1 scale-95

          /* Desktop: right of the icon */
          md:left-full md:top-1/2 md:mt-0 md:ml-2
          md:w-78
          md:-translate-x-0 md:-translate-y-1/2
          md:translate-x-1

          /* Desktop hover/focus */
          md:group-hover/tip:pointer-events-auto
          md:group-hover/tip:translate-x-0
          md:group-hover/tip:scale-100
          md:group-hover/tip:opacity-100
          md:group-focus-within/tip:pointer-events-auto
          md:group-focus-within/tip:translate-x-0
          md:group-focus-within/tip:scale-100
          md:group-focus-within/tip:opacity-100

          /* Mobile tap */
          group-[.is-open]/tip:pointer-events-auto
          group-[.is-open]/tip:translate-y-0
          group-[.is-open]/tip:scale-100
          group-[.is-open]/tip:opacity-100
        `}
      >
        {text}

        {/* Mobile arrow: points upward */}
        <span
          className="
            absolute left-1/2 top-0
            -translate-x-1/2 -translate-y-full
            border-[5px] border-transparent
            border-b-[#1E2621]

            /* Desktop arrow: points left */
            md:left-0 md:top-1/2
            md:-translate-x-full md:-translate-y-1/2
            md:border-b-transparent
            md:border-r-[#1E2621]
          "
        />
      </span>
    </span>
  );
}