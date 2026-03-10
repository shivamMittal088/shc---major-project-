import { getFiles } from "@/server-actions/get-files.action";
import FileListItem from "@/components/FileListItem";
import React from "react";
import FileUploader from "@/components/FileUploader";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatPageLoadTime } from "@/lib/page-load-time";
import BackendUnavailableNotice from "@/components/BackendUnavailableNotice";
import PageLoadTimeReporter from "@/components/PageLoadTimeReporter";
import AnimatedPanel from "@/components/ui/animated-panel";
import { Input } from "@/components/ui/input";
import { Code2, Search, Sparkles } from "lucide-react";

const FILES_PER_PAGE = 9;

function parsePageNumber(page: string | string[] | undefined) {
  const parsedPage = Number(Array.isArray(page) ? page[0] : page);

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return parsedPage;
}

function parseQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function buildFilesPageHref(page: number, search: string) {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("page", String(page));
  }

  if (search.trim()) {
    params.set("search", search.trim());
  }

  const query = params.toString();
  return query ? `/files?${query}` : "/files";
}

export default async function ShcFiles({
  searchParams,
}: {
  searchParams?: {
    page?: string | string[];
    search?: string | string[];
  };
}) {
  const startedAt = Date.now();
  const requestedPage = parsePageNumber(searchParams?.page);
  const search = parseQueryValue(searchParams?.search);
  let files;

  try {
    files = await getFiles({
      page: requestedPage,
      limit: FILES_PER_PAGE,
      search,
    });
  } catch (error) {
    return (
      <div className="space-y-5">
        <header className="rounded-[30px] border border-white/10 bg-gradient-to-br from-cyan-500/12 via-white/[0.04] to-indigo-500/12 px-6 py-6 shadow-[0_34px_110px_-70px_rgba(56,189,248,0.95)] backdrop-blur-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200/80">
            My Files
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-white">File vault unavailable</h1>
          <p className="mt-2 max-w-2xl text-xs text-slate-300">
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
  const searchSuggestions = Array.from(
    new Set(files.results.map((file) => file.name.trim()).filter(Boolean))
  ).slice(0, 12);

  return (
    <div className="space-y-5">
      <PageLoadTimeReporter pathname="/files" label={loadTimeLabel} />
      <AnimatedPanel hoverLift={false} className="overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-cyan-500/12 via-white/[0.04] to-indigo-500/12 px-6 py-6 shadow-[0_34px_110px_-70px_rgba(56,189,248,1)] backdrop-blur-2xl">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
              <Code2 className="h-3.5 w-3.5" />
              Snippet vault
            </div>
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-white md:text-2xl">
              Curate every shared file from one sharp workspace.
            </h1>
            <p className="mt-3 max-w-2xl text-xs leading-5 text-slate-300">
              Search, publish, and edit files with a layout tuned for fast developer workflows.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
            {[
              { label: "Visible files", value: files.total_results.toString(), meta: "Matching current search" },
              { label: "Current page", value: `${currentPage}/${totalPages}`, meta: `${FILES_PER_PAGE} per page` },
              { label: "Data loaded", value: loadTimeLabel, meta: "Server fetch timing" },
            ].map((item) => (
              <div key={item.label} className="rounded-[22px] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl">
                <p className="text-[9px] uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                <p className="mt-1 text-[10px] text-slate-400">{item.meta}</p>
              </div>
            ))}
          </div>
        </div>
      </AnimatedPanel>

      <FileUploader />

      <AnimatedPanel delay={0.05} className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_28px_90px_-60px_rgba(56,189,248,0.75)] backdrop-blur-2xl">
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center" action="/files">
          <input type="hidden" name="page" value="1" />
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              name="search"
              defaultValue={search}
              list="files-search-suggestions"
              autoComplete="on"
              placeholder="Search by file name"
              className="h-11 rounded-2xl border-white/10 bg-white/[0.04] pl-11 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-300/25"
            />
            <datalist id="files-search-suggestions">
              {searchSuggestions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <Button className="h-11 rounded-full bg-gradient-to-r from-cyan-400 to-sky-400 px-5 text-xs font-semibold text-slate-950 hover:opacity-90">
            Search
          </Button>

          <Link
            href="/files"
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-xs font-semibold text-slate-200 transition-all hover:bg-white/[0.06]"
          >
            Clear
          </Link>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
            {files.total_results} results
          </span>
          {search.trim() && (
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-cyan-100">
              Search: {search}
            </span>
          )}
        </div>
      </AnimatedPanel>

      {files.results.length === 0 && (
        <AnimatedPanel delay={0.08} className="rounded-[26px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center shadow-[0_28px_90px_-60px_rgba(56,189,248,0.55)] backdrop-blur-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/10 text-cyan-100">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-white">No files match this view</h2>
          <p className="mt-2 text-xs text-slate-400">
            Try a different search query or upload a new snippet to get started.
          </p>
        </AnimatedPanel>
      )}

      {files.results.length > 0 && (
        <section className="grid grid-cols-1 gap-3">
          {files.results.map((file, index) => (
            <FileListItem key={file.id} file={file} index={index} />
          ))}
        </section>
      )}

      {files.total_results > 0 && (
        <AnimatedPanel delay={0.12} className="rounded-[26px] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[0_28px_90px_-60px_rgba(56,189,248,0.55)] backdrop-blur-2xl">
          <div className="flex flex-col gap-3 text-[10px] text-slate-400 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-slate-300">
              Showing {startResult}-{endResult} of {files.total_results} files
            </p>

            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                className="rounded-full border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]"
              >
                <Link
                  href={buildFilesPageHref(currentPage - 1, search)}
                  aria-disabled={currentPage <= 1}
                >
                  Previous
                </Link>
              </Button>

              <span className="min-w-[110px] text-center text-xs font-medium text-slate-200">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                asChild
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                className="rounded-full border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]"
              >
                <Link
                  href={buildFilesPageHref(currentPage + 1, search)}
                  aria-disabled={currentPage >= totalPages}
                >
                  Next
                </Link>
              </Button>
            </div>
          </div>
        </AnimatedPanel>
      )}
    </div>
  );
}
