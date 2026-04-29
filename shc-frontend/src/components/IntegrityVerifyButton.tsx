"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VerifyResult = {
  hash_match: boolean;
  chain_verified: boolean;
  verification_method: string;
  integrity_status: "verified" | "tampered" | "unverified";
  sha256: string;
  notarization_tx: string;
  etherscan_url: string;
  chain_error?: string;
};

export default function IntegrityVerifyButton({ fileId, riskScore }: { fileId: string; riskScore?: number }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "verified" | "tampered" | "error">("idle");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [demoAction, setDemoAction] = useState<"" | "tampering" | "restoring">("");

  async function runVerify() {
    setState("loading");
    setResult(null);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/verify/${fileId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      const data: VerifyResult = await res.json();
      setResult(data);
      setState(data.integrity_status === "tampered" ? "tampered" : "verified");
    } catch (e: any) {
      setErrorMsg(e.message ?? "Verification failed");
      setState("error");
    }
  }

  async function demoTamper() {
    setDemoAction("tampering");
    try {
      await fetch(`/api/demo-tamper/${fileId}`, { method: "POST" });
    } finally {
      setDemoAction("");
    }
    await runVerify();
    router.refresh();
  }

  async function demoRestore() {
    setDemoAction("restoring");
    try {
      await fetch(`/api/demo-restore/${fileId}`, { method: "POST" });
    } finally {
      setDemoAction("");
    }
    await runVerify();
    router.refresh();
  }

  const isBusy = state === "loading" || demoAction !== "";

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 space-y-3 w-full min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        Integrity Verification
      </p>

      {/* ── Primary verify button ── */}
      {state === "idle" && (
        <button
          onClick={runVerify}
          className="w-full rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
        >
          Verify File Integrity
        </button>
      )}

      {state === "loading" && demoAction === "" && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="animate-spin inline-block">⟳</span> Verifying…
        </div>
      )}

      {/* ── Result panel ── */}
      {(state === "verified" || state === "tampered") && result && (
        <div className={`rounded-lg border p-3 text-xs space-y-3 ${
          state === "tampered"
            ? "border-red-300 bg-red-50 text-red-900"
            : "border-emerald-300 bg-emerald-50 text-emerald-900"
        }`}>
          {/* Status header */}
          <div className={`flex items-center gap-2 font-bold text-sm ${state === "tampered" ? "text-red-700" : "text-emerald-700"}`}>
            {state === "tampered"
              ? <><span className="text-lg">✗</span><span>TAMPERED — Hash Mismatch</span></>
              : <><span className="text-lg">✓</span><span>Integrity Verified</span></>}
          </div>

          <div className="space-y-2">
            {/* Hash match */}
            <div className={`rounded p-2 ${state === "tampered" ? "bg-red-100" : "bg-emerald-100"}`}>
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-0.5">Hash Match</div>
              <div className="font-bold text-sm">{result.hash_match ? "✓ YES — file is unchanged" : "✗ NO — file has been modified"}</div>
            </div>

            {/* Method */}
            <div className={`rounded p-2 ${state === "tampered" ? "bg-red-100" : "bg-emerald-100"}`}>
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-0.5">Verification Method</div>
              <div className="font-semibold">
                {result.verification_method === "blockchain" ? "🔗 On-chain (Ethereum Sepolia)" : "🔒 Local SHA-256 baseline"}
              </div>
            </div>

            {/* SHA-256 */}
            <div className={`rounded p-2 ${state === "tampered" ? "bg-red-100" : "bg-emerald-100"}`}>
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-0.5">Computed SHA-256</div>
              <div className="font-mono text-[10px] break-all leading-relaxed">{result.sha256}</div>
            </div>

            {/* Risk score comparison */}
            {riskScore !== undefined && (
              <div className={`rounded p-2 ${state === "tampered" ? "bg-red-100" : "bg-emerald-100"}`}>
                <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1.5">Risk Score Comparison</div>
                <div className="space-y-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold text-emerald-700">✓ Verified</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-4 rounded-full bg-white/60 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, state === "verified" ? riskScore : Math.max(0, riskScore - 25)))}%` }} />
                      </div>
                      <span className="w-14 text-right font-bold text-emerald-700 shrink-0">
                        {state === "verified" ? riskScore : Math.max(0, riskScore - 25)}/100
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold text-red-700">✗ Tampered</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-4 rounded-full bg-white/60 overflow-hidden">
                        <div className="h-full rounded-full bg-red-500 transition-all"
                          style={{ width: `${Math.min(100, state === "tampered" ? riskScore : Math.min(100, riskScore + 55))}%` }} />
                      </div>
                      <span className="w-14 text-right font-bold text-red-700 shrink-0">
                        {state === "tampered" ? riskScore : Math.min(100, riskScore + 55)}/100
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 text-[10px] opacity-60">
                  {state === "verified"
                    ? `Integrity verified → score lowered ~25 pts. Tampering would raise it to ~${Math.min(100, riskScore + 55)}.`
                    : `Tampering detected → score raised ~55 pts. Clean file scores ~${Math.max(0, riskScore - 25)}.`}
                </div>
              </div>
            )}

            {result.etherscan_url && (
              <div className={`rounded p-2 ${state === "tampered" ? "bg-red-100" : "bg-emerald-100"}`}>
                <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-0.5">On-chain Proof</div>
                <a href={result.etherscan_url} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                  View on Etherscan ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <span className="font-semibold">Verification error:</span> {errorMsg}
        </div>
      )}

      {/* ── Live Demo controls ── */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          🔬 Live Demo Controls
        </div>
        {demoAction !== "" && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="animate-spin inline-block">⟳</span>
            {demoAction === "tampering" ? "Tampering file…" : "Restoring file…"}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={demoTamper}
            disabled={isBusy}
            className="flex-1 rounded-md bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-40"
          >
            ✗ Tamper File
          </button>
          <button
            onClick={demoRestore}
            disabled={isBusy}
            className="flex-1 rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-40"
          >
            ✓ Restore File
          </button>
        </div>
        <p className="text-[9px] text-slate-400 leading-tight">
          Tamper appends a byte to the physical file — hash changes, risk score jumps. Restore removes it.
        </p>
      </div>

      {(state === "verified" || state === "tampered" || state === "error") && (
        <button
          onClick={() => { setState("idle"); setResult(null); }}
          className="text-[10px] text-slate-400 hover:text-slate-600 underline"
        >
          Reset
        </button>
      )}
    </div>
  );
}
