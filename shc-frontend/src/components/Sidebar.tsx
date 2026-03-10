"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, BarChart3, DollarSign, Files } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const PAGE_LOAD_TIME_STORAGE_KEY = "shc-page-load-times";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

const MENUS = [
  {
    pathname: "/",
    name: "Overview",
    icon: BarChart3,
    hint: "Usage and limits",
  },
  {
    pathname: "/files",
    name: "My Files",
    icon: Files,
    hint: "Manage uploads",
  },
  {
    pathname: "/subscription",
    name: "Subscription",
    icon: DollarSign,
    hint: "Plan and billing",
  },
];

export default function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [pageLoadTimes, setPageLoadTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    const syncPageLoadTimes = () => {
      try {
        const rawValue = window.localStorage.getItem(PAGE_LOAD_TIME_STORAGE_KEY);
        setPageLoadTimes(rawValue ? JSON.parse(rawValue) : {});
      } catch {
        setPageLoadTimes({});
      }
    };

    syncPageLoadTimes();
    window.addEventListener("storage", syncPageLoadTimes);
    window.addEventListener("shc:page-load-time-updated", syncPageLoadTimes);

    return () => {
      window.removeEventListener("storage", syncPageLoadTimes);
      window.removeEventListener("shc:page-load-time-updated", syncPageLoadTimes);
    };
  }, []);

  return (
    <aside className={cn("relative", className)}>
      <div className="space-y-3">
        <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-2.5 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Workspace
          </p>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-100">
            Developer cockpit for snippets, links, and plan usage.
          </p>
        </div>

        <p className="px-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Workspace
        </p>
        <div className="space-y-1">
          {MENUS.map((menu) => {
            const Icon = menu.icon;
            const isActive = pathname === menu.pathname;
            const loadTimeLabel = pageLoadTimes[menu.pathname];

            return (
              <motion.div
                key={menu.pathname}
                whileHover={{ x: 2 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <Link
                  href={menu.pathname}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-[16px] border px-2.5 py-2.5 transition-all",
                    isActive
                      ? "border-cyan-400/20 bg-gradient-to-r from-cyan-500/14 to-indigo-500/10 text-white shadow-[0_20px_50px_-36px_rgba(34,211,238,0.55)]"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/15 hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-xl border",
                      isActive
                        ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                        : "border-white/10 bg-white/[0.04] text-slate-300"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-semibold leading-5">{menu.name}</span>
                    <span
                      className={cn(
                        "truncate text-[11px]",
                        isActive ? "text-slate-300" : "text-slate-500"
                      )}
                    >
                      {menu.hint}
                    </span>
                    {loadTimeLabel && (menu.pathname === "/" || menu.pathname === "/files") && (
                      <span
                        className={cn(
                          "mt-0.5 truncate text-[9px] font-medium",
                          isActive ? "text-cyan-100/90" : "text-slate-500"
                        )}
                      >
                        Opened in {loadTimeLabel}
                      </span>
                    )}
                  </span>

                  <ArrowUpRight
                    className={cn(
                      "h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                      isActive ? "text-cyan-100" : "text-slate-500"
                    )}
                  />
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="rounded-[18px] border border-white/10 bg-gradient-to-br from-cyan-400/10 via-transparent to-indigo-500/10 px-2.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Flow
          </p>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-100">
            Ship snippets fast, manage access, and track workspace velocity from one place.
          </p>
        </div>
      </div>
    </aside>
  );
}
