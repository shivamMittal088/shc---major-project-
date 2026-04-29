import { ShcFile } from "@/types/file.type";
import IntegrityVerifyButton from "@/components/IntegrityVerifyButton";

export default function IntegrityPage({ file }: { file: ShcFile }) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">File Integrity</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          On-chain hash verification anchored to Ethereum Sepolia. Confirms the file
          has not been tampered with since upload.
        </p>
      </div>

      {file.notarization_tx ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
          <p className="font-semibold mb-1">✓ Notarized on-chain</p>
          <p className="text-emerald-600 break-all">
            Transaction:{" "}
            <a
              href={`https://sepolia.etherscan.io/tx/${file.notarization_tx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-emerald-800"
            >
              {file.notarization_tx}
            </a>
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
          This file has not been notarized on-chain yet.
        </div>
      )}

      <IntegrityVerifyButton
        fileId={file.id}
        riskScore={file.risk?.risk_score}
      />
    </div>
  );
}
