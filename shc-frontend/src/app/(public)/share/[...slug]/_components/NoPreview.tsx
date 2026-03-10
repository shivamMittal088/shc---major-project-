export default async function NoPreview({
  fileSizeLimitExceeded,
  title,
  description,
}: {
  fileSizeLimitExceeded?: boolean;
  title?: string;
  description?: string;
}) {
  if (fileSizeLimitExceeded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-4xl font-bold text-red-500">
          File too large to preview
        </p>
      </div>
    );
  }
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="max-w-2xl rounded-xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
        <p className="text-3xl font-bold text-slate-900">
          {title || "No preview available"}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          {description || "Please download the file to view it."}
        </p>
      </div>
    </div>
  );
}
