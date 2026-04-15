export default async function NoPreview({
  fileSizeLimitExceeded,
  title,
  description,
}: {
  fileSizeLimitExceeded?: boolean;
  title?: string;
  description?: string;
}) {
  const displayTitle = fileSizeLimitExceeded
    ? "File too large to preview"
    : title || "No preview available";

  const displayDescription = fileSizeLimitExceeded
    ? "This file exceeds the 5 MB preview limit. Download it to view the contents."
    : description || "Download the file to view its contents.";

  return (
    <div className="flex h-full min-h-64 items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <svg
            className="h-7 w-7 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-900">{displayTitle}</p>
        <p className="mt-1.5 text-sm text-slate-500">{displayDescription}</p>
      </div>
    </div>
  );
}
