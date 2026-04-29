import { ShcFile } from "@/types/file.type";
import RiskBadge from "@/components/RiskBadge";
import ModelMetricsPanel from "@/components/ModelMetricsPanel";

export default function AnalysisPage({ file }: { file: ShcFile }) {
  if (!file.risk) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">No analysis available</p>
          <p className="mt-1.5 text-sm text-slate-500">
            Risk analysis has not been performed for this file yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">Risk Analysis</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          ML-powered threat scoring with explainability and on-chain integrity verification.
        </p>
      </div>

      <RiskBadge
        score={file.risk.risk_score}
        level={file.risk.risk_level}
        explanations={file.risk.explanations}
        xai={file.risk.xai}
        fileId={file.id}
      />

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Model Metrics
        </p>
        <ModelMetricsPanel />
      </div>
    </div>
  );
}
