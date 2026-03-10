import { Skeleton } from "@/components/ui/skeleton";

export default function FilesLoading() {
  return (
    <div className="space-y-3">
      <header className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Skeleton className="h-5 w-28 bg-slate-200/80" />
        <Skeleton className="mt-2 h-3 w-64 bg-slate-200/70" />
      </header>

      <div className="mb-3 flex flex-col gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50 px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-4 md:flex-1">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 bg-slate-200/80" />
            <Skeleton className="h-3 w-44 bg-slate-200/70" />
          </div>
        </div>
        <Skeleton className="h-8 w-20 bg-slate-800/20" />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          <div className="grid grid-cols-[minmax(0,1.4fr)_120px_90px_160px] gap-3 bg-slate-50 px-3 py-2">
            <Skeleton className="h-3 w-12 bg-slate-200/80" />
            <Skeleton className="h-3 w-10 bg-slate-200/80" />
            <Skeleton className="h-3 w-10 bg-slate-200/80" />
            <Skeleton className="ml-auto h-3 w-14 bg-slate-200/80" />
          </div>
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(0,1.4fr)_120px_90px_160px] items-center gap-3 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Skeleton className="h-6 w-6 rounded bg-slate-200/80" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-40 bg-slate-200/80" />
                  <Skeleton className="h-2.5 w-16 bg-slate-200/70" />
                </div>
              </div>
              <Skeleton className="h-3 w-16 bg-slate-200/80" />
              <Skeleton className="h-3 w-12 bg-slate-200/80" />
              <div className="ml-auto flex items-center gap-1">
                <Skeleton className="h-6 w-6 rounded bg-emerald-200/90" />
                <Skeleton className="h-6 w-6 rounded bg-sky-200/90" />
                <Skeleton className="h-6 w-14 rounded bg-slate-200/90" />
                <Skeleton className="h-6 w-6 rounded bg-rose-200/90" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
