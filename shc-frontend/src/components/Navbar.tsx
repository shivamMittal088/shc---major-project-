"use client";

import { logout } from "@/server-actions/logout.action";
import { Button } from "./ui/button";
import Logo from "./ui/logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, BarChart3, FolderOpen, Wallet } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: BarChart3 },
  { href: "/files", label: "My Files", icon: FolderOpen },
  { href: "/subscription", label: "Subscription", icon: Wallet },
];

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/files")) {
    return "My Files";
  }
  if (pathname.startsWith("/subscription")) {
    return "Subscription";
  }

  return "Overview";
}

export default function Navbar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
      // Optionally, you can show a user-friendly error message here
    }
  };

  return (
    <nav className="sticky top-0 z-30 border-b border-white/10 bg-[#050916]/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-3 md:px-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="shrink-0">
            <Logo where="navbar" />
          </Link>
          <div className="hidden h-8 w-px bg-white/10 md:block" />
          <div className="hidden md:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Share Code Workspace
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-slate-50">
              {getPageTitle(pathname)}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-200 md:flex"
          >
            <Activity className="h-3.5 w-3.5" />
            Live developer workspace
          </motion.div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="h-9 rounded-full border-white/10 bg-white/[0.03] px-4 text-xs font-semibold text-slate-100 transition-all hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-100"
          >
            Logout
          </Button>
        </div>
      </div>

      <div className="border-t border-white/10 px-3 py-2 md:hidden">
        <div className="grid grid-cols-3 gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <motion.div key={item.href} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/15 hover:bg-white/[0.05] hover:text-slate-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
