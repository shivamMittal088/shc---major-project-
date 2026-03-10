import { Skeleton } from "@/components/ui/skeleton";

export default function PrivateLoading() {
  return (
    <div className="container mx-auto max-w-7xl space-y-5 p-0.5 md:p-1">
      <header className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-r from-white/[0.06] to-cyan-500/[0.08] px-5 py-5 shadow-[0_30px_90px_-60px_rgba(56,189,248,0.75)] backdrop-blur-xl">
        <Skeleton className="h-8 w-60 bg-white/10" />
        <Skeleton className="mt-3 h-4 w-72 bg-white/10" />
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_70px_-50px_rgba(56,189,248,0.55)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-2xl bg-white/10" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 bg-white/10" />
                <Skeleton className="h-3 w-20 bg-white/10" />
              </div>
            </div>
            <div className="mt-6">
              <Skeleton className="h-10 w-28 bg-white/10" />
              <Skeleton className="mt-3 h-3 w-40 bg-white/10" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_28px_90px_-60px_rgba(56,189,248,0.55)] backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full bg-white/10" />
            <Skeleton className="h-4 w-32 bg-white/10" />
          </div>
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <Skeleton className="h-4 w-40 bg-white/10" />
                <Skeleton className="mt-2 h-3 w-24 bg-white/10" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_28px_90px_-60px_rgba(168,85,247,0.45)] backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full bg-white/10" />
            <Skeleton className="h-4 w-28 bg-white/10" />
          </div>
          <div className="mt-5 space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index}>
                <Skeleton className="h-3 w-24 bg-white/10" />
                <Skeleton className="mt-2 h-2 w-full bg-white/10" />
              </div>
            ))}
            <Skeleton className="h-20 w-full rounded-2xl bg-white/10" />
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_28px_90px_-60px_rgba(56,189,248,0.55)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full bg-white/10" />
          <Skeleton className="h-4 w-36 bg-white/10" />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <Skeleton className="h-4 w-28 bg-white/10" />
              <Skeleton className="mt-3 h-8 w-20 bg-white/10" />
              <Skeleton className="mt-3 h-3 w-32 bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
