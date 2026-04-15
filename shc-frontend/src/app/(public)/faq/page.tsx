"use client";

import { useState } from "react";

type FAQItem = {
  question: string;
  answer: React.ReactNode;
};

const FEATURES_LIST = [
  { key: "is_executable_ext", label: "Executable file extension", desc: "Is the file a .exe, .bat, .sh, .ps1, etc." },
  { key: "is_archive", label: "Archive file type", desc: "Is the file a .zip, .rar, .tar, .7z, etc." },
  { key: "contains_macro_indicator", label: "Macro / script indicator", desc: "Does the file content reference macros, VBA, or embedded scripts" },
  { key: "domain_risk", label: "Domain reputation risk", desc: "Risk score of any external domain linked inside the file (0–1)" },
  { key: "entropy", label: "Content entropy", desc: "Shannon entropy of the file bytes — high entropy suggests encryption or obfuscation" },
  { key: "keyword_hit_count", label: "Social engineering keyword hits", desc: "Count of phishing/scam keywords found in text content" },
  { key: "size_mb", label: "File size (MB)", desc: "Raw file size — unusually large or small files for their type are suspicious" },
  { key: "size_anomaly", label: "File size anomaly for MIME type", desc: "Binary flag — 1 if the file size is abnormal for its declared MIME type" },
  { key: "share_frequency", label: "Share frequency", desc: "How many times this file has been shared across the platform" },
  { key: "download_frequency", label: "Download frequency", desc: "Total download count — viral spread of an unknown file is a risk signal" },
  { key: "unknown_upload_source", label: "Unknown upload source", desc: "Binary flag — 1 if the upload origin cannot be verified" },
  { key: "known_bad_hash", label: "Known malicious hash match", desc: "Binary flag — 1 if the file hash matches a known-malware indicator list" },
  { key: "text_length", label: "Text content length", desc: "Character count of extracted text — unusually long hidden text is a red flag" },
];

const FAQS: FAQItem[] = [
  {
    question: "What is ShareCode?",
    answer:
      "ShareCode is a secure file-sharing platform that uses a hybrid risk-scoring engine — combining rule-based heuristics and a machine learning model — to assess whether a shared file is safe, suspicious, or dangerous before anyone downloads it.",
  },
  {
    question: "How does the risk score work?",
    answer: (
      <span>
        Every uploaded file is analysed in two ways:
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li><strong>Rule-based engine</strong> — fast, human-written heuristics (e.g. "flag executable extensions", "flag known-bad hashes").</li>
          <li><strong>ML model</strong> — a Random Forest classifier trained on 3,200 synthetic samples with 13 features. It assigns a probability score.</li>
        </ol>
        <span className="block mt-2">Both scores are combined into a final 0–100 risk score. Below 30 = Safe, 30–70 = Suspicious, above 70 = Dangerous.</span>
      </span>
    ),
  },
  {
    question: "Which dataset was used to train the ML model?",
    answer: (
      <span>
        We used a <strong>controlled synthetic dataset</strong> calibrated to published threat statistics — 12% executable rate, 4% known-bad hash rate — because no single public dataset covers all 13 features our hybrid model requires. This also ensures full reproducibility without licensing constraints.
        <br /><br />
        The dataset contains <strong>3,200 samples</strong> generated using statistically realistic probability distributions (Bernoulli, Poisson, log-normal) with labels derived from a weighted risk formula based on cybersecurity domain knowledge.
        <br /><br />
        The 13 features the model uses are:
        <ul className="mt-3 space-y-2">
          {FEATURES_LIST.map((f) => (
            <li key={f.key} className="flex flex-col">
              <span className="font-semibold text-slate-800 dark:text-slate-100">{f.label}</span>
              <span className="text-slate-500 dark:text-slate-400 text-xs">{f.desc}</span>
            </li>
          ))}
        </ul>
      </span>
    ),
  },
  {
    question: "What is SHAP and why is it shown?",
    answer:
      "SHAP (SHapley Additive exPlanations) is a game-theory-based method that explains the ML model's decision. For each file, it shows which features pushed the risk score up (red bars) or down (green bars) and by how much. This makes the model's reasoning transparent instead of a black box.",
  },
  {
    question: "What is Rule Faithfulness?",
    answer:
      "Rule Faithfulness measures how well the human-written rules agree with the ML model. For each rule that fired on a file, we check whether the corresponding feature's SHAP value also points in the same risk direction. 100% = all rules and the model fully agree. Low faithfulness means some rules may be outdated or wrong.",
  },
  {
    question: "What is Coverage Gap?",
    answer:
      "Coverage Gap identifies features that the ML model considers important (high SHAP value) but that no existing rule covers. A high coverage gap means the rule set has blind spots. The SHAP-derived rule suggestions shown in purple are auto-generated to close those gaps.",
  },
  {
    question: "What are SHAP-derived rule suggestions?",
    answer:
      'When the ML model relies on a feature that no rule currently checks, the system automatically generates a Python code snippet showing exactly what rule could be added. For example: if features["size_mb"] > 45.2: score += 10. These are not active rules — they are recommendations derived from SHAP coverage gap analysis.',
  },
  {
    question: "Where are uploaded files stored?",
    answer: (
      <span>
        Files are stored in <strong>Cloudflare R2</strong> — Cloudflare&apos;s S3-compatible object storage. R2 stores the actual file bytes; the database only stores metadata (name, size, MIME type, owner, visibility).
        <br /><br />
        Here is the full upload flow:
        <ol className="list-decimal list-inside mt-2 space-y-2">
          <li>
            <strong>Register the file</strong> — The frontend sends the file name, size, and MIME type to the backend. The backend creates a database record and generates an R2 object key in the format:
            <code className="block mt-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs break-all">
              &lt;user-uuid&gt;/&lt;random-uuid&gt;_filename.pdf
            </code>
          </li>
          <li>
            <strong>Pre-signed upload URL</strong> — The backend asks Cloudflare R2 to generate a short-lived <strong>pre-signed PUT URL</strong>. This URL is sent back to the frontend.
          </li>
          <li>
            <strong>Direct upload to R2</strong> — The frontend uploads the file <em>directly</em> to Cloudflare R2 using that URL. The file bytes never pass through the Go backend server, keeping it fast and lightweight.
          </li>
          <li>
            <strong>Mark as complete</strong> — After the upload succeeds, the frontend notifies the backend, which updates the file&apos;s <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">upload_status</code> to <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">completed</code> in the database.
          </li>
        </ol>
        <br />
        For <strong>downloads</strong>, the same pre-signed pattern is used in reverse — the backend generates a short-lived <strong>pre-signed GET URL</strong> (valid ~15 minutes) and returns it to the frontend. The browser downloads directly from R2.
        <br /><br />
        In local development mode (<code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">SHC_STORAGE_MODE=local</code>), files are saved to a <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">.storage/</code> folder on disk instead of R2, with no pre-signed URLs needed.
      </span>
    ),
  },
  {
    question: "Are shared file links accessible without logging in?",
    answer: (
      <span>
        By default, every file you upload is <strong>private</strong>. This means the share link{" "}
        <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">/share/&lt;uuid&gt;</code> will show a &ldquo;Not Authorised&rdquo; page to anyone who is not logged in — including you, if you open it in a private browser window.
        <br /><br />
        To make a file publicly accessible:
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>Go to your <strong>Dashboard</strong> after logging in.</li>
          <li>Find the file in your list.</li>
          <li>Click the <strong>visibility toggle</strong> (the lock / globe icon) next to the file.</li>
          <li>The file instantly becomes <strong>public</strong> — anyone with the link can now view and download it without logging in.</li>
        </ol>
        <br />
        Click the toggle again to make it private again. The change is immediate and does not require re-uploading.
      </span>
    ),
  },
  {
    question: "How does the public/private toggle work technically?",
    answer: (
      <span>
        Each file has an <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">is_public</code> boolean column in the database. When you click the toggle:
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>The frontend sends a <strong>PATCH</strong> request to the backend with the file&apos;s UUID.</li>
          <li>The backend verifies that the request comes from the file&apos;s owner.</li>
          <li>It flips <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">is_public</code> from <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">true → false</code> or <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">false → true</code>.</li>
          <li>User file list caches in Redis are invalidated so your dashboard reflects the change immediately.</li>
        </ol>
        <br />
        When someone opens the share link, the backend checks <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">is_public</code> — if it is <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">false</code> and the requester is not the owner, the API returns <strong>403 Forbidden</strong> and the frontend shows the &ldquo;Not Authorised&rdquo; page. No single-use tokens or expiry — it is purely a database flag that can be toggled instantly.
      </span>
    ),
  },
  {
    question: "How are share links generated?",
    answer: (
      <span>
        When you upload a file, the backend assigns it a <strong>UUID (Universally Unique Identifier)</strong> — a randomly generated 128-bit ID like{" "}
        <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">7651da5f-1a49-4d74-8881-5ee63955f15b</code>.
        <br /><br />
        The share link is simply:
        <code className="block mt-2 mb-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded text-xs break-all">
          https://yoursite.com/share/&lt;file-uuid&gt;
        </code>
        There is no sequential numbering (1, 2, 3…) — UUIDs are statistically impossible to guess, so knowing one link gives you no information about any other file. Access is further controlled by the file&apos;s <strong>visibility setting</strong> — private files return a &ldquo;not authorised&rdquo; page even if someone has the link.
        <br /><br />
        The UUID is generated by the backend database (PostgreSQL <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">gen_random_uuid()</code>) at upload time and never changes.
      </span>
    ),
  },
  {
    question: "Is my file stored permanently?",
    answer:
      "Files are stored in Cloudflare R2 object storage. You can delete or toggle visibility at any time from your dashboard. Private files are not accessible via share links.",
  },
  {
    question: "Can I use ShareCode from the command line?",
    answer:
      "Yes. There is an official CLI client (shc-cli) built in Rust. It supports login, upload, download, list, rename, delete, and toggle visibility — all from your terminal. Run shc --help for the full command list.",
  },
  {
    question: "What file types are supported?",
    answer:
      "All file types are accepted. The risk engine applies type-specific analysis — for example, entropy checks are more meaningful for binaries, while keyword analysis applies to text-based documents.",
  },
];

function FAQAccordion({ item, index }: { item: FAQItem; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 pr-4">
          {item.question}
        </span>
        <span
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-2 text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 leading-relaxed">
          {item.answer}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <a
            href="/"
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mb-4 inline-block"
          >
            ← Back to ShareCode
          </a>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Help &amp; FAQ</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">
            Everything you need to know about ShareCode and its AI-powered risk scoring engine.
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">

        {/* General */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
            General
          </h2>
          <div className="space-y-3">
            {FAQS.slice(0, 2).map((item, i) => (
              <FAQAccordion key={i} item={item} index={i} />
            ))}
          </div>
        </section>

        {/* ML & Dataset */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
            Machine Learning &amp; Dataset
          </h2>
          <div className="space-y-3">
            {FAQS.slice(2, 8).map((item, i) => (
              <FAQAccordion key={i} item={item} index={i} />
            ))}
          </div>
        </section>

        {/* Platform */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
            Platform &amp; Usage
          </h2>
          <div className="space-y-3">
            {FAQS.slice(8).map((item, i) => (
              <FAQAccordion key={i} item={item} index={i} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
