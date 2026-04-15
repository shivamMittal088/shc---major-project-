"use client";
import { useState } from "react";
import { ShieldAlert, ShieldCheck, ShieldQuestion, Check, X, Loader2 } from "lucide-react";
import { XAIExplanation } from "@/types/file.type";
import { acceptRule, rejectRule } from "@/server-actions/rule-verdict.action";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type RiskLevel = "Low" | "Medium" | "High";

type RiskBadgeProps = {
  score: number;
  level: RiskLevel;
  explanations: string[];
  xai?: XAIExplanation | null;
  fileId?: string;
};

function levelStyles(level: RiskLevel) {
  if (level === "High") {
    return {
      icon: ShieldAlert,
      badgeClass:
        "border-red-300/40 bg-red-100 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200",
      label: "Dangerous",
    };
  }

  if (level === "Medium") {
    return {
      icon: ShieldQuestion,
      badgeClass:
        "border-amber-300/40 bg-amber-100 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
      label: "Suspicious",
    };
  }

  return {
    icon: ShieldCheck,
    badgeClass:
      "border-emerald-300/40 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
    label: "Safe",
  };
}

export default function RiskBadge({ score, level, explanations, xai, fileId }: RiskBadgeProps) {
  const ui = levelStyles(level);
  const Icon = ui.icon;

  const maxShap = xai?.shap_top_features?.length
    ? Math.max(...xai.shap_top_features.map((f) => Math.abs(f.shap_value)))
    : 1;

  const ruleCount = xai?.suggested_rules?.length ?? 0;
  const [ruleStates, setRuleStates] = useState<("pending" | "accepted" | "rejected")[]>(
    () => Array(ruleCount).fill("pending")
  );
  const [ruleLoading, setRuleLoading] = useState<boolean[]>(
    () => Array(ruleCount).fill(false)
  );

  const setRule = async (i: number, action: "accepted" | "rejected") => {
    const rule = xai!.suggested_rules![i];
    setRuleLoading((prev) => prev.map((v, idx) => (idx === i ? true : v)));
    try {
      if (action === "accepted") {
        await acceptRule(rule, fileId);
      } else {
        await rejectRule(rule, fileId);
      }
      setRuleStates((prev) => prev.map((s, idx) => (idx === i ? action : s)));
    } finally {
      setRuleLoading((prev) => prev.map((v, idx) => (idx === i ? false : v)));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/70 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${ui.badgeClass}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {ui.label}
        </span>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-300">
          Risk Score: {score}/100
        </span>
      </div>

      {/* Rule-based explanations */}
      {explanations.length > 0 && (
        <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
          {explanations.slice(0, 3).map((reason) => (
            <li key={reason}>- {reason}</li>
          ))}
        </ul>
      )}

      {/* SHAP panel */}
      {xai && (xai.shap_top_features?.length ?? 0) > 0 && (
        <div className="border-t border-slate-100 dark:border-white/10 pt-2 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Model explanation (SHAP)
          </p>

          <ResponsiveContainer
            width="100%"
            height={xai.shap_top_features.length * 32 + 24}
          >
            <BarChart
              layout="vertical"
              data={xai.shap_top_features.map((f) => ({
                name: f.feature,
                value: f.shap_value,
                direction: f.direction,
                key: f.feature_key,
              }))}
              margin={{ top: 0, right: 48, bottom: 0, left: 4 }}
            >
              <XAxis
                type="number"
                domain={[-maxShap * 1.15, maxShap * 1.15]}
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                tickFormatter={(v: number) => v.toFixed(2)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine x={0} stroke="#cbd5e1" strokeWidth={1} />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.08)" }}
                formatter={(value: number) => [
                  (value > 0 ? "+" : "") + value.toFixed(4),
                  "SHAP value",
                ]}
                contentStyle={{
                  fontSize: 11,
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 6,
                  color: "#e2e8f0",
                }}
              />
              <Bar dataKey="value" radius={[3, 3, 3, 3]} maxBarSize={18}>
                {xai.shap_top_features.map((feat) => (
                  <Cell
                    key={feat.feature_key}
                    fill={
                      feat.direction === "increases_risk"
                        ? "#f87171"
                        : "#34d399"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* ── Rules followed ── */}
          {(xai.faithfulness_detail?.filter((d) => d.startsWith("ALIGNED")).length ?? 0) > 0 && (
            <div className="border-t border-slate-100 dark:border-white/10 pt-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Rules followed
                </p>
                {xai.faithfulness_score != null && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      xai.faithfulness_score >= 0.8
                        ? "bg-emerald-100 text-emerald-700"
                        : xai.faithfulness_score >= 0.5
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {Math.round(xai.faithfulness_score * 100)}% faithful
                  </span>
                )}
              </div>
              <ul className="space-y-1">
                {xai.faithfulness_detail!
                  .filter((d) => d.startsWith("ALIGNED"))
                  .map((detail, i) => {
                    const label = detail.replace(/^ALIGNED:\s*/i, "");
                    return (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                          <Check className="h-2 w-2 text-emerald-600" />
                        </span>
                        <span className="text-[10px] leading-tight text-slate-600 dark:text-slate-300">
                          {label}
                        </span>
                      </li>
                    );
                  })}
              </ul>
              {/* Misaligned rules */}
              {xai.faithfulness_detail!.some((d) => d.startsWith("MISALIGNED")) && (
                <ul className="space-y-1">
                  {xai.faithfulness_detail!
                    .filter((d) => d.startsWith("MISALIGNED"))
                    .map((detail, i) => {
                      const label = detail.replace(/^MISALIGNED:\s*/i, "");
                      return (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-red-100">
                            <X className="h-2 w-2 text-red-500" />
                          </span>
                          <span className="text-[10px] leading-tight text-red-500 dark:text-red-400">
                            {label}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          )}

          {/* ── Rule coverage gap ── */}
          {(xai.coverage_gap_detail?.length ?? 0) > 0 && (
            <div className="border-t border-slate-100 dark:border-white/10 pt-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Rule coverage
                </p>
                {xai.coverage_gap_score != null && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      xai.coverage_gap_score <= 0.2
                        ? "bg-emerald-100 text-emerald-700"
                        : xai.coverage_gap_score <= 0.5
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {Math.round(xai.coverage_gap_score * 100)}% gap
                  </span>
                )}
              </div>
              <ul className="space-y-1">
                {xai.coverage_gap_detail!.map((detail, i) => {
                  const isCovered = detail.startsWith("COVERED");
                  const label = detail.replace(/^(COVERED|GAP):\s*/i, "");
                  return (
                    <li key={i} className="flex items-start gap-1.5">
                      <span
                        className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${
                          isCovered ? "bg-emerald-100" : "bg-amber-100"
                        }`}
                      >
                        {isCovered ? (
                          <Check className="h-2 w-2 text-emerald-600" />
                        ) : (
                          <X className="h-2 w-2 text-amber-600" />
                        )}
                      </span>
                      <span
                        className={`text-[10px] leading-tight ${
                          isCovered
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* ── Suggested rules with Accept / Reject ── */}
          {(xai.suggested_rules?.length ?? 0) > 0 && (
            <div className="border-t border-slate-100 dark:border-white/10 pt-2 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                Suggested rules
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Auto-generated from coverage gap features. Accept to apply, reject to dismiss.
              </p>
              <ul className="space-y-2">
                {xai.suggested_rules!.map((rule, i) => {
                  const state = ruleStates[i] ?? "pending";
                  const loading = ruleLoading[i] ?? false;
                  return (
                    <li
                      key={i}
                      className={`rounded-lg border p-2 transition-colors ${
                        state === "accepted"
                          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                          : state === "rejected"
                          ? "border-slate-200 bg-slate-50 dark:border-white/5 dark:bg-white/5 opacity-50"
                          : "border-violet-200/60 bg-violet-50/50 dark:border-violet-500/20 dark:bg-violet-500/5"
                      }`}
                    >
                      <p
                        className={`text-[10px] font-mono leading-relaxed whitespace-pre-wrap break-all ${
                          state === "accepted"
                            ? "text-emerald-700 dark:text-emerald-300"
                            : state === "rejected"
                            ? "text-slate-400 line-through"
                            : "text-violet-700 dark:text-violet-300"
                        }`}
                      >
                        {rule}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {loading ? (
                          <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                        ) : state === "pending" ? (
                          <>
                            <button
                              onClick={() => setRule(i, "accepted")}
                              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                            >
                              <Check className="h-2.5 w-2.5" /> Accept
                            </button>
                            <button
                              onClick={() => setRule(i, "rejected")}
                              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                            >
                              <X className="h-2.5 w-2.5" /> Reject
                            </button>
                          </>
                        ) : (
                          <>
                            <span
                              className={`text-[10px] font-semibold ${
                                state === "accepted" ? "text-emerald-600" : "text-slate-400"
                              }`}
                            >
                              {state === "accepted" ? "✓ Accepted" : "✗ Rejected"}
                            </span>
                            <button
                              onClick={() => setRule(i, state === "accepted" ? "rejected" : "accepted")}
                              className="text-[10px] text-slate-400 hover:text-slate-600 underline transition-colors"
                            >
                              undo
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
