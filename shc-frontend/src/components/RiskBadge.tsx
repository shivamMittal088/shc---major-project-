import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

type RiskLevel = "Low" | "Medium" | "High";

type RiskBadgeProps = {
  score: number;
  level: RiskLevel;
  explanations: string[];
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

export default function RiskBadge({ score, level, explanations }: RiskBadgeProps) {
  const ui = levelStyles(level);
  const Icon = ui.icon;

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
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

      {explanations.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
          {explanations.slice(0, 3).map((reason) => (
            <li key={reason}>- {reason}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
