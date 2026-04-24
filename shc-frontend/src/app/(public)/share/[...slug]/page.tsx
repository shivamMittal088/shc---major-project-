import { Suspense } from "react";

import { dayjs } from "@/lib/dayjs";
import { formatBytes } from "@/lib/utils";
import { getShcFile } from "@/server-actions/get-file.action";

import NotAuthorized from "./_components/NotAuthorized";
import FileExpired from "./_components/FileExpired";
import ShcFilePreview from "./_components/ShcFilePreview";
import LoadingPreview from "./_components/LoadingPreview";
import DownloadButton from "@/components/DownloadButton";
import RiskBadge from "@/components/RiskBadge";
import IntegrityVerifyButton from "@/components/IntegrityVerifyButton";

export default async function ShcFile({
  params,
}: {
  params: { slug: string[] };
}) {
  const fileId = params.slug[0];
  const { file, error, status } = await getShcFile(fileId);
  if (error !== undefined || file === undefined) {
    if (status === 410) {
      return <FileExpired />;
    }
    return <NotAuthorized />;
  }

  const expiresAt = file.expires_at ? dayjs(file.expires_at) : null;
  const expiryLabel = expiresAt
    ? expiresAt.isBefore(dayjs())
      ? "Expired"
      : `Expires ${expiresAt.fromNow()}`
    : null;

  const isExpiringSoon = expiresAt
    ? expiresAt.diff(dayjs(), "hour") < 4
    : false;

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
        </div>
      </nav>

      {/* ── Body: preview + optional risk sidebar ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Preview */}
        <main className="flex-1 overflow-auto p-4">
          <Suspense fallback={<LoadingPreview />}>
            <ShcFilePreview file={file} />
          </Suspense>
        </main>

        {/* Risk sidebar */}
        {file.risk && (
          <aside className="w-80 shrink-0 border-l border-slate-200 bg-white overflow-y-auto p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Risk Analysis
            </p>
            <RiskBadge
              score={file.risk.risk_score}
              level={file.risk.risk_level}
              explanations={file.risk.explanations}
              xai={file.risk.xai}
              fileId={file.id}
            />
            <IntegrityVerifyButton fileId={file.id} riskScore={file.risk.risk_score} />
          </aside>
        )}
      </div>
    </div>
  );
}
