import { Suspense } from "react";

import { dayjs } from "@/lib/dayjs";
import { formatBytes } from "@/lib/utils";
import { getShcFile } from "@/server-actions/get-file.action";

import NotAuthorized from "./_components/NotAuthorized";
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
  const { file, error } = await getShcFile(fileId);
  if (error !== undefined || file === undefined) {
    return <NotAuthorized />;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <nav className="w-full bg-white z-10 border-b border-slate-200">
        <div className="container">
          <div className="py-[18px] flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold leading-tight text-gray-900">
                {file.name}
              </h2>
              <div>
                <p className="text-gray-500 text-sm">
                  Size: {formatBytes(file.size)} | Type: {file.mime_type} |{" "}
                  {dayjs(file.updated_at).fromNow()}
                </p>
              </div>
              {file.risk ? (
                <div className="mt-3 max-w-xl">
                  <RiskBadge
                    score={file.risk.risk_score}
                    level={file.risk.risk_level}
                    explanations={file.risk.explanations}
                    xai={file.risk.xai}
                  />
                </div>
              ) : null}
            </div>

            <div>
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
      <section className="px-4 pb-4 pt-4 bg-slate-200 flex-1 overflow-auto min-h-0">
        <Suspense fallback={<LoadingPreview />}>
          <ShcFilePreview file={file} />
        </Suspense>
      </section>
    </div>
  );
}
