"use client";

import React from "react";
import { BarChart3, DollarSign, Files } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

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

  return (
    <aside className={cn("relative", className)}>
      <div className="space-y-2">
        <p className="px-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Workspace
        </p>
        <div className="space-y-1">
          {MENUS.map((menu) => {
            const Icon = menu.icon;
            const isActive = pathname === menu.pathname;

            return (
              <Link
                key={menu.pathname}
                href={menu.pathname}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2.5 py-2 transition-all",
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-md",
                    isActive
                      ? "bg-white/15 text-white"
                      : "bg-slate-200 text-slate-600 group-hover:bg-slate-300"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>

                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-semibold">{menu.name}</span>
                  <span
                    className={cn(
                      "truncate text-[11px]",
                      isActive ? "text-slate-200" : "text-slate-500"
                    )}
                  >
                    {menu.hint}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
