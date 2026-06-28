"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Briefcase, Users, CalendarDays, Sparkles,
  Settings, BotMessageSquare, FileText, Clock, BarChart3, LogOut,
  FileCheck, Search,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import apiClient from "@/api/client";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/20 text-red-300 border-red-500/30",
  hr: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  interviewer: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  candidate: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const ALL_NAV_ITEMS = [
  // ── Admin / HR / Interviewer ──
  { name: "Dashboard",     href: "/",                icon: LayoutDashboard, roles: ["admin", "hr", "interviewer", "candidate"] },
  { name: "Jobs",           href: "/jobs",            icon: Briefcase,       roles: ["admin", "hr"] },
  { name: "Candidates",     href: "/candidates",      icon: Users,           roles: ["admin", "hr"] },
  { name: "Interviews",     href: "/interviews",      icon: CalendarDays,    roles: ["admin", "hr", "interviewer"] },
  { name: "Scorecards",     href: "/scorecards",      icon: FileText,        roles: ["admin", "hr", "interviewer"] },
  { name: "Availability",   href: "/availability",    icon: Clock,           roles: ["admin", "hr", "interviewer"] },
  { name: "Templates",      href: "/templates",       icon: BarChart3,       roles: ["admin", "hr"] },
  { name: "AI Agent",       href: "/agent",           icon: BotMessageSquare, roles: ["admin", "hr", "interviewer", "candidate"], special: true },
  // ── Candidate-only ──
  { name: "My Applications", href: "/my-applications", icon: FileCheck,       roles: ["candidate"] },
  { name: "My Interviews",   href: "/my-interviews",   icon: CalendarDays,    roles: ["candidate"] },
  { name: "Browse Jobs",     href: "/browse-jobs",     icon: Search,          roles: ["candidate"] },
  // ── Shared ──
  { name: "Settings",       href: "/settings",        icon: Settings,        roles: ["admin", "candidate"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearSession } = useAuth();

  const role = user?.role ?? "hr";
  const navItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Ignore errors — clear local session regardless
    } finally {
      clearSession();
      toast.success("Signed out");
      router.push("/login");
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <aside className="w-64 h-full border-r border-[var(--color-border)] glass-panel flex flex-col z-20 shrink-0">
      {/* Logo */}
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-[0_0_15px_rgba(94,106,210,0.5)] group-hover:shadow-[0_0_25px_rgba(94,106,210,0.7)] transition-shadow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white group-hover:text-[var(--color-secondary)] transition-colors">
            IMS<span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]">.ai</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive
                  ? item.special
                    ? "bg-gradient-primary text-white shadow-lg shadow-primary/20 font-medium"
                    : "bg-[var(--color-surface-hover)] text-white font-medium border border-[var(--color-border)]"
                  : "text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-surface-hover)]"
              )}
            >
              <Icon className={clsx("w-5 h-5 shrink-0", isActive && !item.special ? "text-[var(--color-primary)]" : "")} />
              <span className="text-sm">{item.name}</span>
              {item.special && !isActive && (
                <span className="ml-auto w-2 h-2 rounded-full bg-[var(--color-secondary)] animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User profile + Logout */}
      <div className="p-4 mt-auto border-t border-[var(--color-border)]">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-lg shadow-primary/20">
            {initials}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium text-white truncate">{user?.name || "Loading..."}</span>
            <span className={clsx("text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border w-fit mt-0.5", ROLE_COLORS[role])}>
              {role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
