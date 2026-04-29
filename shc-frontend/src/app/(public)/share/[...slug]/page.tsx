import { Suspense } from "react";

import { dayjs } from "@/lib/dayjs";
import { formatBytes } from "@/lib/utils";
import { getShcFile } from "@/server-actions/get-file.action";

import NotAuthorized from "./_components/NotAuthorized";
import FileExpired from "./_components/FileExpired";
import ShcFilePreview from "./_components/ShcFilePreview";
import LoadingPreview from "./_components/LoadingPreview";
import AnalysisPage from "./_components/AnalysisPage";
import IntegrityPage from "./_components/IntegrityPage";
import DownloadButton from "@/components/DownloadButton";

export default async function ShcFile({
  params,
}: {
  params: { slug: string[] };
}) {
  const fileId = params.slug[0];
  const tab = params.slug[1]; // undefined = preview | "analysis" | "integrity"
  const { file, error, status } = await getShcFile(fileId);

  if (error !== undefined || file === undefined) {
    if (status === 410) return <FileExpired />;
    return <NotAuthorized />;
  }

  const expiresAt = file.expires_at ? dayjs(file.expires_at) : null;
  const expiryLabel = expiresAt
    ? expiresAt.isBefore(dayjs())
      ? "Expired"
      : `Expires ${expiresAt.fromNow()}`
    : null;
  const isExpiringSoon = expiresAt ? expiresAt.diff(dayjs(), "hour") < 4 : false;

  const previewHref = `/share/${fileId}`;
  const analysisHref = `/share/${fileId}/analysis`;
  const integrityHref = `/share/${fileId}/integrity`;
  const isAnalysis = tab === "analysis";
  const isIntegrity = tab === "integrity";

  return (
    <div className="w-full h-full flex flex-col bg-slate-50">
      {/* ── Compact top nav ── */}
      <nav className="w-full bg-white z-10 border-b border-slate-200 shadow-sm shrink-0">
        <div className="px-6">
          <div className="py-3 flex items-center justify-between gap-6">
            {/* Left: file info */}
            <div className="min-w-0 flex-1">
              <a
                href="/"
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-1"
              >
                ← SHC
              </a>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-semibold text-slate-900 truncate leading-tight">
                  {file.name}
                </h1>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  {file.mime_type}
                </span>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  {formatBytes(file.size)}
                </span>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">
                  {dayjs(file.updated_at).fromNow()}
                </span>
                {expiryLabel && (
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                      isExpiringSoon
                        ? "bg-red-50 text-red-600"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    ⏱ {expiryLabel}
                  </span>
                )}
                {file.notarization_tx && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${file.notarization_tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="File hash notarized on Ethereum Sepolia — click to verify on-chain"
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    ✓ Notarized on-chain
                  </a>
                )}
              </div>
            </div>

            {/* Right: download + help */}
            <div className="flex items-center gap-4 shrink-0">
              <a
                href="/faq"
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                FAQ
              </a>
              <DownloadButton
                fileId={file.id}
                fileName={file.name}
                fileUrl={file.download_url}
                fileExtension={file.extension}
              />
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 -mb-px">
            <a
              href={previewHref}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                !isAnalysis && !isIntegrity
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Preview
            </a>
            {file.risk && (
              <a
                href={analysisHref}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                  isAnalysis
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Risk Analysis
              </a>
            )}
            <a
              href={integrityHref}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                isIntegrity
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Integrity
            </a>
          </div>
        </div>
      </nav>

      {/* ── Body ── */}
      <main className="flex-1 overflow-auto">
        {isAnalysis ? (
          <AnalysisPage file={file} />
        ) : isIntegrity ? (
          <IntegrityPage file={file} />
        ) : (
          <div className="h-full p-4">
            <Suspense fallback={<LoadingPreview />}>
              <ShcFilePreview file={file} />
            </Suspense>
          </div>
        )}
      </main>
    </div>
  );
}
