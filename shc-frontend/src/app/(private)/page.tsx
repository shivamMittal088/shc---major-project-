import { getMe } from "@/server-actions/get-me.action";
import { getFiles } from "@/server-actions/get-files.action";
import {
  ActivitySquare,
  ArrowUpRight,
  BarChart3,
  CloudCog,
  FileCode2,
  HardDrive,
  Lock,
  Sparkles,
} from "lucide-react";
import { formatPageLoadTime } from "@/lib/page-load-time";
import BackendUnavailableNotice from "@/components/BackendUnavailableNotice";
import PageLoadTimeReporter from "@/components/PageLoadTimeReporter";
import { formatBytes } from "@/lib/utils";
import { dayjs } from "@/lib/dayjs";
import AnimatedPanel from "@/components/ui/animated-panel";
import Link from "next/link";
import { getLanguageLabel, getLanguageTone } from "@/lib/file-presentation";

export default async function DashboardPage() {
  const startedAt = Date.now();
  let user;
  let recentFiles;

  try {
    [user, recentFiles] = await Promise.all([
      getMe(),
      getFiles({ page: 1, limit: 5 }),
    ]);
  } catch (error) {
    return (
      <div className="container mx-auto max-w-7xl space-y-2 p-0 md:p-0.5">
        <header className="rounded-[18px] border border-white/10 bg-gradient-to-br from-cyan-500/12 via-white/[0.04] to-indigo-500/12 px-3 py-3 shadow-[0_20px_56px_-42px_rgba(56,189,248,0.9)] backdrop-blur-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200/80">
            Overview
          </p>
          <h1 className="mt-1 text-base font-semibold tracking-tight text-white">Control tower unavailable</h1>
          <p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-300">
            The dashboard could not load its backend data right now.
          </p>
        </header>

        <BackendUnavailableNotice
          title="Overview is temporarily unavailable"
          description={
            error instanceof Error ? error.message : "Unable to load account overview right now."
          }
        />
      </div>
    );
  }

  const loadTimeLabel = formatPageLoadTime(Date.now() - startedAt);
  const storageUsedBytes =
    user.subscription.subscription_plan.max_storage_bytes -
    user.subscription.storage_remaining_bytes;
  const recentFilesThisWeek = recentFiles.results.filter((file) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return new Date(file.created_at).getTime() >= sevenDaysAgo;
  }).length;
  const recentSharedFiles = recentFiles.results.filter((file) => file.is_public).slice(0, 4);
  const fallbackRecentFiles = recentFiles.results.slice(0, 4);
  const filesToShow = recentSharedFiles.length > 0 ? recentSharedFiles : fallbackRecentFiles;
  const usageSections = [
    {
      label: "Storage used",
      value: `${Math.min(
        100,
        Math.round(
          (storageUsedBytes / user.subscription.subscription_plan.max_storage_bytes) * 100
        )
      )}%`,
      width: Math.min(
        100,
        Math.round((storageUsedBytes / user.subscription.subscription_plan.max_storage_bytes) * 100)
      ),
      tone: "from-cyan-400 to-blue-500",
      detail: `${formatBytes(storageUsedBytes)} of ${formatBytes(
        user.subscription.subscription_plan.max_storage_bytes
      )}`,
    },
    {
      label: "Write budget",
      value: `${Math.max(
        0,
        user.subscription.subscription_plan.max_daily_writes -
          user.subscription.today_remaining_writes
      )}/${user.subscription.subscription_plan.max_daily_writes}`,
      width: Math.min(
        100,
        Math.round(
          ((user.subscription.subscription_plan.max_daily_writes -
            user.subscription.today_remaining_writes) /
            user.subscription.subscription_plan.max_daily_writes) *
            100
        )
      ),
      tone: "from-fuchsia-400 to-violet-500",
      detail: `${user.subscription.today_remaining_writes} writes left today`,
    },
    {
      label: "Read budget",
      value: `${Math.max(
        0,
        user.subscription.subscription_plan.max_daily_reads -
          user.subscription.today_remaining_reads
      )}/${user.subscription.subscription_plan.max_daily_reads}`,
      width: Math.min(
        100,
        Math.round(
          ((user.subscription.subscription_plan.max_daily_reads -
            user.subscription.today_remaining_reads) /
            user.subscription.subscription_plan.max_daily_reads) *
            100
        )
      ),
      tone: "from-emerald-400 to-teal-500",
      detail: `${user.subscription.today_remaining_reads} reads left today`,
    },
  ];

  return (
    <div className="container mx-auto max-w-7xl space-y-2 p-0 md:p-0.5">
      <PageLoadTimeReporter pathname="/" label={loadTimeLabel} />
      <AnimatedPanel hoverLift={false} className="overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-br from-cyan-500/14 via-white/[0.04] to-indigo-500/12 px-3 py-3 shadow-[0_20px_56px_-42px_rgba(56,189,248,0.95)] backdrop-blur-2xl">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
              <ActivitySquare className="h-3 w-3" />
              Developer overview
            </div>
            <h1 className="mt-1.5 text-[15px] font-semibold tracking-tight text-white md:text-base">
              Keep SHC in flow, {user.name.split(" ")[0]}.
            </h1>
            <p className="mt-1 max-w-2xl text-[9px] leading-4 text-slate-300">
              Monitor snippet velocity, review recent shared assets, and stay ahead of your storage and usage limits from one command-center view.
            </p>
          </div>

          <div className="grid gap-1.5 sm:grid-cols-3 xl:min-w-[360px]">
            {[
              {
                label: "Plan",
                value: user.subscription.subscription_plan.name,
                meta: user.subscription.status,
              },
              {
                label: "Load time",
                value: loadTimeLabel,
                meta: "Rendered live",
              },
              {
                label: "Workspace",
                value: `${user.file_count} files`,
                meta: `${recentFiles.total_results} indexed assets`,
              },
            ].map((item) => (
              <div key={item.label} className="rounded-[12px] border border-white/10 bg-white/[0.05] p-2 backdrop-blur-xl">
                <p className="text-[8px] uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                <p className="mt-0.5 text-[11px] font-semibold leading-4 text-white">{item.value}</p>
                <p className="mt-0.5 text-[9px] text-slate-400">{item.meta}</p>
              </div>
            ))}
          </div>
        </div>
      </AnimatedPanel>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Files",
            value: user.file_count.toString(),
            detail: "Uploaded and available in your workspace",
            icon: FileCode2,
            tone: "from-cyan-400/18 to-sky-500/10 text-cyan-100",
          },
          {
            label: "Recent Files",
            value: recentFilesThisWeek.toString(),
            detail: "Created in the last 7 days",
            icon: Sparkles,
            tone: "from-fuchsia-400/18 to-violet-500/10 text-fuchsia-100",
          },
          {
            label: "Storage Used",
            value: formatBytes(storageUsedBytes),
            detail: `${formatBytes(user.subscription.storage_remaining_bytes)} left in plan`,
            icon: HardDrive,
            tone: "from-emerald-400/18 to-teal-500/10 text-emerald-100",
          },
          {
            label: "Plan Status",
            value: user.subscription.status,
            detail: `${user.subscription.subscription_plan.name} workspace active`,
            icon: CloudCog,
            tone: "from-amber-400/18 to-orange-500/10 text-amber-100",
          },
        ].map((card, index) => {
          const Icon = card.icon;

          return (
            <AnimatedPanel
              key={card.label}
              delay={0.04 * (index + 1)}
              className={`rounded-[16px] border border-white/10 bg-gradient-to-br ${card.tone} p-2.5 backdrop-blur-xl shc-hover-glow`}
            >
              <div className="flex items-center justify-between">
                <div className="grid h-7.5 w-7.5 place-items-center rounded-lg border border-white/10 bg-white/[0.06]">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <ArrowUpRight className="h-2.5 w-2.5 text-white/40" />
              </div>
              <p className="mt-2.5 text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {card.label}
              </p>
              <p className="mt-0.5 text-sm font-semibold tracking-tight text-white">{card.value}</p>
              <p className="mt-0.5 text-[9px] leading-4 text-slate-300">{card.detail}</p>
            </AnimatedPanel>
          );
        })}
      </div>

      <div className="grid gap-2 lg:grid-cols-[1.25fr_0.75fr]">
        <AnimatedPanel delay={0.08} className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3 shadow-[0_18px_50px_-38px_rgba(56,189,248,0.7)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Recent shared files
              </p>
              <h2 className="mt-1 text-xs font-semibold text-white">Latest links leaving your workspace</h2>
            </div>
            <Link href="/files" className="text-[9px] font-medium text-cyan-200 hover:text-cyan-100">
              View all
            </Link>
          </div>

          <div className="mt-2.5 space-y-1.5">
            {filesToShow.length === 0 && (
              <div className="rounded-[12px] border border-dashed border-white/10 bg-white/[0.03] px-3 py-3 text-[10px] text-slate-400">
                No files have been shared yet. Publish a snippet from the My Files page to see activity here.
              </div>
            )}

            {filesToShow.map((file) => (
              <div
                key={file.id}
                className="flex flex-col gap-1 rounded-[12px] border border-white/10 bg-white/[0.03] px-2.5 py-2 transition-all hover:border-cyan-400/20 hover:bg-white/[0.05] md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold text-white">{file.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[9px] text-slate-400">
                    <span className={`rounded-full border px-1.5 py-0.5 font-medium ${getLanguageTone(file.extension)}`}>
                      {getLanguageLabel(file.extension)}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5">
                      {file.is_public ? "Public" : "Private"}
                    </span>
                    <span>{dayjs(file.updated_at).fromNow()}</span>
                  </div>
                </div>
                <Link
                  href={`/share/${file.id}`}
                  className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-semibold text-cyan-100 transition-all hover:bg-cyan-400/15"
                >
                  Open share view
                  <ArrowUpRight className="h-2.5 w-2.5" />
                </Link>
              </div>
            ))}
          </div>
        </AnimatedPanel>

        <AnimatedPanel delay={0.12} className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3 shadow-[0_18px_50px_-38px_rgba(168,85,247,0.55)] backdrop-blur-2xl">
          <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Capacity runway
          </p>
          <h2 className="mt-1 text-xs font-semibold text-white">Usage snapshot</h2>
          <div className="mt-2.5 space-y-2.5">
            {usageSections.map((section) => (
              <div key={section.label}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-[9px] font-medium text-slate-200">{section.label}</span>
                  <span className="text-[9px] font-semibold text-white">{section.value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${section.tone}`}
                    style={{ width: `${section.width}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[9px] text-slate-400">{section.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-2.5 rounded-[12px] border border-white/10 bg-gradient-to-br from-indigo-500/14 to-transparent px-2.5 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-white">
              <Lock className="h-3.5 w-3.5 text-cyan-200" />
              Recommended next move
            </div>
            <p className="mt-1 text-[9px] leading-4 text-slate-300">
              Keep your most reusable snippets public and archive low-value uploads before storage reaches the plan ceiling.
            </p>
            <Link href="/subscription" className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-semibold text-cyan-200 hover:text-cyan-100">
              Review subscription options
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </AnimatedPanel>
      </div>
    </div>
  );
}
