import { getFiles } from "@/server-actions/get-files.action";
import FileListItem from "@/components/FileListItem";
import React from "react";
import FileUploader from "@/components/FileUploader";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatPageLoadTime } from "@/lib/page-load-time";
import BackendUnavailableNotice from "@/components/BackendUnavailableNotice";
import PageLoadTimeReporter from "@/components/PageLoadTimeReporter";

const FILES_PER_PAGE = 10;

function parsePageNumber(page: string | string[] | undefined) {
  const parsedPage = Number(Array.isArray(page) ? page[0] : page);

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return parsedPage;
}

function buildFilesPageHref(page: number) {
  return page <= 1 ? "/files" : `/files?page=${page}`;
}

export default async function ShcFiles({
  searchParams,
}: {
  searchParams?: { page?: string | string[] };
}) {
  const startedAt = Date.now();
  const requestedPage = parsePageNumber(searchParams?.page);
  let files;

  try {
    files = await getFiles({ page: requestedPage, limit: FILES_PER_PAGE });
  } catch (error) {
    return (
      <div className="space-y-3">
        <header className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">My Files</h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Upload, share, and manage your files from one place.
          </p>
        </header>

        <BackendUnavailableNotice
          title="Files are temporarily unavailable"
          description={
            error instanceof Error ? error.message : "Unable to load your files right now."
          }
        />
      </div>
    );
  }

  const loadTimeLabel = formatPageLoadTime(Date.now() - startedAt);
  const currentPage = files.current_page || 1;
  const totalPages = Math.max(files.total_pages || 1, 1);
  const startResult = files.total_results === 0 ? 0 : (currentPage - 1) * files.per_page + 1;
  const endResult = files.total_results === 0 ? 0 : startResult + files.results.length - 1;

  return (
    <div className="space-y-3">
      <PageLoadTimeReporter pathname="/files" label={loadTimeLabel} />
      <header className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">My Files</h1>
        <p className="mt-0.5 text-xs text-slate-600">
          Upload, share, and manage your files from one place.
        </p>
      </header>

      <FileUploader />

      {files.results.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-xs text-slate-600">
          No files yet. Upload your first file using the button above.
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[260px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Date
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Size
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {files.results.map((file) => (
                <React.Fragment key={file.id}>
                  <FileListItem file={file} />
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {files.total_results > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-600 md:flex-row md:items-center md:justify-between">
            <p>
              Showing {startResult}-{endResult} of {files.total_results} files
            </p>

            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
              >
                <Link href={buildFilesPageHref(currentPage - 1)} aria-disabled={currentPage <= 1}>
                  Previous
                </Link>
              </Button>

              <span className="min-w-[90px] text-center font-medium text-slate-700">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                asChild
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
              >
                <Link href={buildFilesPageHref(currentPage + 1)} aria-disabled={currentPage >= totalPages}>
                  Next
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
