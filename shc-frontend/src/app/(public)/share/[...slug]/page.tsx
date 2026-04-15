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

  return (
    <div className="w-full h-full flex flex-col">
      <nav className="w-full bg-white z-10 border-b border-slate-200">
        <div className="container">
          <div className="py-[18px] flex items-start justify-between gap-6">
            <div>
              <a
                href="/"
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-2"
              >
                ← Back
              </a>
              <h2 className="text-2xl font-bold leading-tight text-gray-900">
                {file.name}
              </h2>
              <div>
                <p className="text-gray-500 text-sm">
                  Size: {formatBytes(file.size)} | Type: {file.mime_type} |{" "}
                  {dayjs(file.updated_at).fromNow()}
                  {expiryLabel && (
                    <span className="ml-2 text-amber-600 font-medium">
                      · {expiryLabel}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <DownloadButton
                  fileId={file.id}
                  fileName={file.name}
                  fileUrl={file.download_url}
                  fileExtension={file.extension}
                />
              </div>
              {file.risk ? (
                <div className="w-80">
                  <RiskBadge
                    score={file.risk.risk_score}
                    level={file.risk.risk_level}
                    explanations={file.risk.explanations}
                    xai={file.risk.xai}
                  />
                </div>
              ) : null}
              <a
                href="/faq"
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Help &amp; FAQ
              </a>
            </div>
          </div>
        </div>
      </nav>
      <section className="px-4 pb-4 pt-4 bg-slate-200 flex-1 overflow-auto min-h-0">
        <Suspense fallback={<LoadingPreview />}>
          <ShcFilePreview file={file} />
        </Suspense>
      </section>
    </div>
  );
}
