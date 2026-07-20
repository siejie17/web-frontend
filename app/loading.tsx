import Image from "next/image";

export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-mist">
      <div className="relative h-12 w-48">
        <Image
          src="/logo/proformax.svg"
          alt="ProFormaX"
          fill
          className="object-contain"
          priority
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 animate-bounce rounded-full bg-sage [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-sage-light [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-sage [animation-delay:300ms]" />
      </div>
    </div>
  );
}
