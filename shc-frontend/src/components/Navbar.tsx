"use client";

import { logout } from "@/server-actions/logout.action";
import { Button } from "./ui/button";
import Logo from "./ui/logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FolderOpen, Wallet } from "lucide-react";

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
    <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-3 md:px-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="shrink-0">
            <Logo where="navbar" />
          </Link>
          <div className="hidden h-8 w-px bg-slate-200 md:block" />
          <h1 className="hidden text-xl font-semibold tracking-tight text-slate-900 md:block">
            {getPageTitle(pathname)}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleLogout} variant="outline" className="font-semibold">
            Logout
          </Button>
        </div>
      </div>

      <div className="border-t border-slate-100 px-3 py-2 md:hidden">
        <div className="grid grid-cols-3 gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
