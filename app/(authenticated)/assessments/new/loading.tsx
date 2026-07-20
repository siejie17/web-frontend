export default function NewAssessmentLoading() {
  return (
    <div className="mx-auto max-w-275 pb-10 pt-6">
      {/* Back button skeleton */}
      <div className="mb-4 h-9 w-36 animate-pulse rounded-full bg-[#EFEDE6]" />

      {/* Intro skeleton */}
      <section className="mb-8 rounded-3xl border border-[#E4E1D8] bg-[#FCFCF8] p-6 shadow-[0_8px_24px_rgba(30,38,33,0.04)] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="w-full">
            <span className="mb-3 block h-3 w-24 animate-pulse rounded-full bg-[#E4E1D8]" />
            <span className="block h-8 w-72 animate-pulse rounded-lg bg-[#E4E1D8]" />
            <span className="mt-3 block h-4 w-96 animate-pulse rounded-full bg-[#EFEDE6]" />
          </div>
        </div>
      </section>

      {/* Form card skeleton */}
      <div className="relative mb-5 rounded-3xl border border-[#E4E1D8] bg-white shadow-[0_8px_24px_rgba(30,38,33,0.05)]">
        <div className="overflow-hidden rounded-t-3xl">
          <div className="border-b border-[#EFEDE6] bg-[#FBFAF7] px-7 py-4 sm:px-9">
            <span className="block h-3 w-28 animate-pulse rounded-full bg-[#E4E1D8]" />
            <div className="mt-2.5 h-1 w-full rounded-full bg-[#EFEDE6]" />
          </div>
        </div>
        <div className="space-y-8 px-7 py-8 sm:px-9 sm:py-9">
          {[0, 1, 2].map((section) => (
            <div key={section} className="space-y-4">
              <div>
                <span className="mb-2 block h-3.5 w-24 animate-pulse rounded-full bg-[#EFEDE6]" />
                <span className="block h-3 w-36 animate-pulse rounded-full bg-[#F6F6F2]" />
              </div>
              <div className="space-y-4">
                {[0, 1].map((i) => (
                  <div key={i}>
                    <span className="mb-1.5 block h-3 w-32 animate-pulse rounded-full bg-[#EFEDE6]" />
                    <span className="block h-11 w-full animate-pulse rounded-[14px] bg-[#F6F6F2]" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
