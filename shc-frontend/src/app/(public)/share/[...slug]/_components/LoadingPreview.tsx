export default function LoadingPreview() {
  return (
    <div className="flex h-full min-h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
        <p className="text-sm text-slate-400">Loading preview…</p>
      </div>
    </div>
  );
}
