"use client";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { XAIExplanation } from "@/types/file.type";
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

export default function RiskBadge({ score, level, explanations, xai }: RiskBadgeProps) {
  const ui = levelStyles(level);
  const Icon = ui.icon;

  const maxShap = xai?.shap_top_features?.length
    ? Math.max(...xai.shap_top_features.map((f) => Math.abs(f.shap_value)))
    : 1;

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

          {/* Faithfulness score */}
          {xai.faithfulness_score != null && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Rule faithfulness
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  xai.faithfulness_score >= 0.8
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : xai.faithfulness_score >= 0.5
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                    : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                }`}
              >
                {Math.round(xai.faithfulness_score * 100)}%
              </span>
            </div>
          )}

          {/* Coverage gap score */}
          {xai.coverage_gap_score != null && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Rule coverage gap
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  xai.coverage_gap_score <= 0.2
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : xai.coverage_gap_score <= 0.5
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                    : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                }`}
              >
                {Math.round(xai.coverage_gap_score * 100)}%
              </span>
            </div>
          )}

          {/* Coverage gap detail */}
          {(xai.coverage_gap_detail?.length ?? 0) > 0 && (
            <ul className="space-y-0.5">
              {xai.coverage_gap_detail!.map((detail, i) => {
                const isCovered = detail.startsWith("COVERED");
                return (
                  <li
                    key={i}
                    className={`text-[10px] leading-tight ${isCovered ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
                  >
                    {detail}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Faithfulness detail */}
          {(xai.faithfulness_detail?.length ?? 0) > 0 && (
            <ul className="space-y-0.5">
              {xai.faithfulness_detail!.map((detail, i) => {
                const isAligned = detail.startsWith("ALIGNED");
                return (
                  <li
                    key={i}
                    className={`text-[10px] leading-tight ${isAligned ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
                  >
                    {detail}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
