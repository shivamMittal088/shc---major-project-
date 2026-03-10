export const FILE_LANGUAGE_FILTERS = [
  { value: "", label: "All languages" },
  { value: "ts", label: "TypeScript" },
  { value: "tsx", label: "TSX" },
  { value: "js", label: "JavaScript" },
  { value: "jsx", label: "JSX" },
  { value: "go", label: "Go" },
  { value: "rs", label: "Rust" },
  { value: "py", label: "Python" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "cs", label: "C#" },
  { value: "json", label: "JSON" },
  { value: "md", label: "Markdown" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "sql", label: "SQL" },
  { value: "sh", label: "Shell" },
  { value: "txt", label: "Text" },
];

const FILE_LANGUAGE_LABELS: Record<string, string> = Object.fromEntries(
  FILE_LANGUAGE_FILTERS.filter((option) => option.value !== "").map((option) => [option.value, option.label])
);

const FILE_LANGUAGE_TONES: Record<string, string> = {
  ts: "border-sky-400/20 bg-sky-400/10 text-sky-200",
  tsx: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
  js: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  jsx: "border-yellow-400/20 bg-yellow-400/10 text-yellow-200",
  go: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
  rs: "border-orange-400/20 bg-orange-400/10 text-orange-200",
  py: "border-indigo-400/20 bg-indigo-400/10 text-indigo-200",
  java: "border-rose-400/20 bg-rose-400/10 text-rose-200",
  c: "border-slate-400/20 bg-slate-400/10 text-slate-200",
  cpp: "border-blue-400/20 bg-blue-400/10 text-blue-200",
  cs: "border-violet-400/20 bg-violet-400/10 text-violet-200",
  json: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  md: "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200",
  html: "border-orange-400/20 bg-orange-400/10 text-orange-200",
  css: "border-sky-400/20 bg-sky-400/10 text-sky-200",
  sql: "border-teal-400/20 bg-teal-400/10 text-teal-200",
  sh: "border-lime-400/20 bg-lime-400/10 text-lime-200",
};

const FILE_STATUS_TONES: Record<string, string> = {
  uploaded: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  uploading: "border-sky-400/20 bg-sky-400/10 text-sky-200",
  failed: "border-rose-400/20 bg-rose-400/10 text-rose-200",
  not_started: "border-slate-400/20 bg-slate-400/10 text-slate-300",
};

export function getLanguageLabel(extension: string) {
  const normalizedExtension = extension.trim().toLowerCase();

  if (!normalizedExtension) {
    return "Unknown";
  }

  return FILE_LANGUAGE_LABELS[normalizedExtension] || normalizedExtension.toUpperCase();
}

export function getLanguageTone(extension: string) {
  const normalizedExtension = extension.trim().toLowerCase();
  return (
    FILE_LANGUAGE_TONES[normalizedExtension] ||
    "border-white/10 bg-white/5 text-slate-200"
  );
}

export function getStatusTone(status: string) {
  const normalizedStatus = status.trim().toLowerCase();
  return (
    FILE_STATUS_TONES[normalizedStatus] ||
    "border-white/10 bg-white/5 text-slate-200"
  );
}

export function formatStatusLabel(status: string) {
  return status
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}