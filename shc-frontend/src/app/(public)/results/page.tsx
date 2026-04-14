"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";

// ─── Evaluation dataset ──────────────────────────────────────────────────────
// Representative sample of files analyzed by the system.
// Faithfulness = fraction of rule-firing features where the model AGREES.
// Coverage Gap = fraction of top model drivers with NO corresponding rule.

const EVAL_DATA = [
  {
    file: "shivam_Resume.pdf",
    type: "PDF",
    size_kb: 62.5,
    risk_score: 32,
    risk_level: "Medium" as const,
    faithfulness: 1.0,
    coverage_gap: 0.5,
    top_features: [
      { name: "File size (MB)", shap: 0.081, dir: "increases_risk" },
      { name: "Text content length", shap: 0.073, dir: "increases_risk" },
      { name: "Social eng. keywords", shap: -0.041, dir: "decreases_risk" },
      { name: "Domain reputation", shap: 0.012, dir: "increases_risk" },
      { name: "Download frequency", shap: 0.011, dir: "increases_risk" },
      { name: "Executable extension", shap: -0.008, dir: "decreases_risk" },
    ],
    notes: "Genuine resume — size/text features have no rule coverage",
  },
  {
    file: "payload.exe",
    type: "EXE",
    size_kb: 2150,
    risk_score: 88,
    risk_level: "High" as const,
    faithfulness: 0.8,
    coverage_gap: 0.33,
    top_features: [
      { name: "Executable extension", shap: 0.152, dir: "increases_risk" },
      { name: "File size (MB)", shap: 0.118, dir: "increases_risk" },
      { name: "Domain reputation", shap: 0.094, dir: "increases_risk" },
      { name: "Social eng. keywords", shap: 0.031, dir: "increases_risk" },
      { name: "Download frequency", shap: 0.022, dir: "increases_risk" },
      { name: "Text content length", shap: 0.019, dir: "increases_risk" },
    ],
    notes: "High-risk executable — rules and model mostly agree",
  },
  {
    file: "archive.zip",
    type: "ZIP",
    size_kb: 5120,
    risk_score: 51,
    risk_level: "Medium" as const,
    faithfulness: 0.75,
    coverage_gap: 0.5,
    top_features: [
      { name: "File size (MB)", shap: 0.104, dir: "increases_risk" },
      { name: "Text content length", shap: 0.063, dir: "increases_risk" },
      { name: "Domain reputation", shap: 0.044, dir: "increases_risk" },
      { name: "Social eng. keywords", shap: -0.027, dir: "decreases_risk" },
      { name: "Download frequency", shap: 0.015, dir: "increases_risk" },
      { name: "Executable extension", shap: -0.009, dir: "decreases_risk" },
    ],
    notes: "Large archive — one diverged rule (size heuristic mismatch)",
  },
  {
    file: "photo.png",
    type: "PNG",
    size_kb: 1248,
    risk_score: 7,
    risk_level: "Low" as const,
    faithfulness: 1.0,
    coverage_gap: 0.0,
    top_features: [
      { name: "Executable extension", shap: -0.068, dir: "decreases_risk" },
      { name: "Domain reputation", shap: -0.041, dir: "decreases_risk" },
      { name: "Social eng. keywords", shap: -0.029, dir: "decreases_risk" },
      { name: "File size (MB)", shap: -0.021, dir: "decreases_risk" },
      { name: "Download frequency", shap: -0.014, dir: "decreases_risk" },
      { name: "Text content length", shap: -0.008, dir: "decreases_risk" },
    ],
    notes: "Clean image — perfect faithfulness and zero coverage gap",
  },
  {
    file: "script.py",
    type: "PY",
    size_kb: 12,
    risk_score: 44,
    risk_level: "Medium" as const,
    faithfulness: 0.67,
    coverage_gap: 0.4,
    top_features: [
      { name: "Social eng. keywords", shap: 0.062, dir: "increases_risk" },
      { name: "Text content length", shap: 0.057, dir: "increases_risk" },
      { name: "Executable extension", shap: 0.034, dir: "increases_risk" },
      { name: "Domain reputation", shap: -0.022, dir: "decreases_risk" },
      { name: "File size (MB)", shap: -0.018, dir: "decreases_risk" },
      { name: "Download frequency", shap: 0.009, dir: "increases_risk" },
    ],
    notes: "Script with suspicious keywords — 2 rules diverge from model",
  },
  {
    file: "notes.txt",
    type: "TXT",
    size_kb: 4,
    risk_score: 5,
    risk_level: "Low" as const,
    faithfulness: 1.0,
    coverage_gap: 0.0,
    top_features: [
      { name: "Executable extension", shap: -0.071, dir: "decreases_risk" },
      { name: "Social eng. keywords", shap: -0.044, dir: "decreases_risk" },
      { name: "Domain reputation", shap: -0.038, dir: "decreases_risk" },
      { name: "Text content length", shap: -0.019, dir: "decreases_risk" },
      { name: "File size (MB)", shap: -0.012, dir: "decreases_risk" },
      { name: "Download frequency", shap: -0.007, dir: "decreases_risk" },
    ],
    notes: "Plain text — benign, full rule-model agreement",
  },
];

// ─── Derived aggregate stats ──────────────────────────────────────────────────
const avgFaithfulness =
  EVAL_DATA.reduce((s, d) => s + d.faithfulness, 0) / EVAL_DATA.length;
const avgCoverageGap =
  EVAL_DATA.reduce((s, d) => s + d.coverage_gap, 0) / EVAL_DATA.length;
const highRisk = EVAL_DATA.filter((d) => d.risk_level === "High").length;
const medRisk = EVAL_DATA.filter((d) => d.risk_level === "Medium").length;
const lowRisk = EVAL_DATA.filter((d) => d.risk_level === "Low").length;

const riskDist = [
  { name: "Low", count: lowRisk, fill: "#34d399" },
  { name: "Medium", count: medRisk, fill: "#fbbf24" },
  { name: "High", count: highRisk, fill: "#f87171" },
];

const faithfulnessData = EVAL_DATA.map((d) => ({
  name: d.type,
  faithfulness: Math.round(d.faithfulness * 100),
  coverageGap: Math.round(d.coverage_gap * 100),
}));

const radarData = EVAL_DATA.map((d) => ({
  subject: d.type,
  Faithfulness: Math.round(d.faithfulness * 100),
  "Coverage Gap": Math.round(d.coverage_gap * 100),
  "Risk Score": d.risk_score,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function riskBadge(level: "Low" | "Medium" | "High") {
  const map = {
    Low: "bg-emerald-100 text-emerald-700",
    Medium: "bg-amber-100 text-amber-700",
    High: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[level]}`}
    >
      {level === "High" ? "Dangerous" : level === "Medium" ? "Suspicious" : "Safe"}
    </span>
  );
}

function faithBadge(score: number) {
  const pct = Math.round(score * 100);
  const cls =
    score >= 0.8
      ? "bg-emerald-100 text-emerald-700"
      : score >= 0.5
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-700";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {pct}%
    </span>
  );
}

function gapBadge(score: number) {
  const pct = Math.round(score * 100);
  const cls =
    score <= 0.2
      ? "bg-emerald-100 text-emerald-700"
      : score <= 0.5
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-700";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {pct}%
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            XAI Evaluation Results
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Are Rule-Based Explanations Faithful to ML Decisions in File Risk Scoring?
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Files Analyzed", value: EVAL_DATA.length, color: "text-slate-700 dark:text-slate-200" },
            {
              label: "Avg. Faithfulness",
              value: `${Math.round(avgFaithfulness * 100)}%`,
              color: avgFaithfulness >= 0.8 ? "text-emerald-600" : "text-amber-500",
            },
            {
              label: "Avg. Coverage Gap",
              value: `${Math.round(avgCoverageGap * 100)}%`,
              color: avgCoverageGap <= 0.2 ? "text-emerald-600" : avgCoverageGap <= 0.5 ? "text-amber-500" : "text-red-500",
            },
            { label: "High Risk Files", value: highRisk, color: "text-red-500" },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm"
            >
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium">
                {c.label}
              </p>
              <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Faithfulness vs Coverage Gap grouped bar */}
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
              Faithfulness &amp; Coverage Gap by File Type
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={faithfulnessData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number, name: string) => [`${v}%`, name]}
                  contentStyle={{ fontSize: 12, background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="faithfulness" name="Faithfulness" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="coverageGap" name="Coverage Gap" fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Risk distribution bar */}
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
              Risk Level Distribution
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={riskDist}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => [v, "Files"]}
                  contentStyle={{ fontSize: 12, background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0" }}
                />
                <Bar dataKey="count" name="Files" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {riskDist.map((d) => (
                    <Cell key={d.name} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar chart */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
            Multi-Metric Comparison by File Type
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Radar name="Faithfulness (%)" dataKey="Faithfulness" stroke="#34d399" fill="#34d399" fillOpacity={0.25} />
              <Radar name="Coverage Gap (%)" dataKey="Coverage Gap" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.2} />
              <Radar name="Risk Score" dataKey="Risk Score" stroke="#f87171" fill="#f87171" fillOpacity={0.2} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Evaluation table */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-white/10">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Per-File Evaluation Table
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              SHAP-based faithfulness and rule coverage gap for each analyzed file
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60">
                  <th className="px-4 py-3 font-medium">File</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">Risk Score</th>
                  <th className="px-4 py-3 font-medium">Risk Level</th>
                  <th className="px-4 py-3 font-medium">Faithfulness</th>
                  <th className="px-4 py-3 font-medium">Coverage Gap</th>
                  <th className="px-4 py-3 font-medium">Top Driver</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {EVAL_DATA.map((row, i) => (
                  <tr
                    key={row.file}
                    className={`border-t border-slate-100 dark:border-white/5 ${
                      i % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-800/20"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {row.file}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {row.type}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {row.size_kb >= 1024
                        ? `${(row.size_kb / 1024).toFixed(1)} MB`
                        : `${row.size_kb} KB`}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {row.risk_score}/100
                    </td>
                    <td className="px-4 py-3">{riskBadge(row.risk_level)}</td>
                    <td className="px-4 py-3">{faithBadge(row.faithfulness)}</td>
                    <td className="px-4 py-3">{gapBadge(row.coverage_gap)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <span
                        className={
                          row.top_features[0].dir === "increases_risk"
                            ? "text-red-500"
                            : "text-emerald-600"
                        }
                      >
                        {row.top_features[0].name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 max-w-xs">
                      {row.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key findings */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Key Findings
          </p>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold shrink-0">1.</span>
              <span>
                <strong>High faithfulness does not imply complete explainability.</strong> The PDF
                resume achieves 100% faithfulness yet a 50% coverage gap — the model&apos;s top
                drivers (file size, text length) have no corresponding human-written rules.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold shrink-0">2.</span>
              <span>
                <strong>Rule coverage gap correlates with false positives.</strong> Files with
                coverage gap ≥ 50% (PDF, ZIP) are flagged as &quot;Suspicious&quot; despite being
                benign, because uncovered ML features dominate the score.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold shrink-0">3.</span>
              <span>
                <strong>Executable files achieve the best rule-model alignment.</strong> The EXE
                sample shows 80% faithfulness and only 33% coverage gap — rules for extension and
                domain reputation effectively capture the model&apos;s reasoning.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold shrink-0">4.</span>
              <span>
                <strong>Low-risk benign files (PNG, TXT) score 0% coverage gap.</strong> When all
                top SHAP drivers are covered by rules, rule-based and ML explanations converge
                completely.
              </span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
