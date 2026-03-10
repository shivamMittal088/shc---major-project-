import { Skeleton } from "@/components/ui/skeleton";

export default function PrivateLoading() {
  return (
    <div className="container mx-auto max-w-7xl p-0.5 md:p-1">
      <header className="mb-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-3 text-white shadow-sm">
        <Skeleton className="h-7 w-52 bg-white/20" />
        <Skeleton className="mt-2 h-3 w-56 bg-white/15" />
      </header>

      <div className="mb-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          "border-sky-200 bg-sky-50/80 border-b-sky-100",
          "border-emerald-200 bg-emerald-50/80 border-b-emerald-100",
          "border-indigo-200 bg-indigo-50/80 border-b-indigo-100",
          "border-yellow-200 bg-yellow-50 border-b-yellow-200",
          "border-pink-200 bg-pink-50 border-b-pink-200",
          "border-cyan-200 bg-cyan-50 border-b-cyan-200",
        ].map((cardClass, index) => (
          <div
            key={index}
            className={`overflow-hidden rounded-xl border shadow-sm ${cardClass}`}
          >
            <div className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full bg-white/50" />
                <Skeleton className="h-4 w-28 bg-white/55" />
              </div>
            </div>
            <div className="border-t border-white/40 px-4 py-3">
              <Skeleton className="h-8 w-20 bg-white/60" />
              <Skeleton className="mt-2 h-3 w-40 bg-white/45" />
            </div>
          </div>
        ))}

        <div className="overflow-hidden rounded-xl border border-orange-200 bg-orange-50 shadow-sm md:col-span-2 lg:col-span-3">
          <div className="border-b border-orange-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full bg-orange-200/90" />
              <Skeleton className="h-4 w-32 bg-orange-200/90" />
            </div>
          </div>
          <div className="space-y-3 px-4 py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <Skeleton className="h-16 w-16 rounded-full bg-orange-200/90" />
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-md bg-white p-2 shadow-sm"
                    >
                      <Skeleton className="h-4 w-4 rounded-full bg-orange-200/80" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-16 bg-orange-200/80" />
                        <Skeleton className="h-3 w-28 bg-orange-100/90" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-md bg-white p-2 shadow-sm">
                  <Skeleton className="h-4 w-4 rounded-full bg-orange-200/80" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-20 bg-orange-200/80" />
                    <Skeleton className="h-3 w-32 bg-orange-100/90" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
