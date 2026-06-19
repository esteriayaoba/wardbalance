"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CreditCard,
  FileSpreadsheet,
  Coins,
  TrendingUp,
  Settings,
  History,
  AlertCircle,
  ClipboardList,
} from "lucide-react";

interface AdminNavProps {
  userRole: string;
  schoolStatus: string;
  schoolName: string;
}

const NAV_LINKS = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    roles: ["SchoolOwner", "Principal", "Bursar", "Admin"],
    requiresActive: false,
  },
  {
    name: "Setup Checklist",
    href: "/admin/setup",
    icon: ClipboardList,
    roles: ["SchoolOwner", "Principal", "Bursar", "Admin"],
    requiresActive: false,
    onboardingOnly: true, // only show during onboarding
  },
  {
    name: "Students",
    href: "/admin/students",
    icon: Users,
    roles: ["SchoolOwner", "Principal", "Bursar", "Admin"],
    requiresActive: true,
  },
  {
    name: "Parents",
    href: "/admin/parents",
    icon: UserCheck,
    roles: ["SchoolOwner", "Principal", "Bursar", "Admin"],
    requiresActive: true,
  },
  {
    name: "Fee Structure",
    href: "/admin/fees",
    icon: CreditCard,
    roles: ["SchoolOwner", "Principal", "Bursar"],
    requiresActive: true,
  },
  {
    name: "Invoices",
    href: "/admin/invoices",
    icon: FileSpreadsheet,
    roles: ["SchoolOwner", "Principal", "Bursar", "Admin"],
    requiresActive: true,
  },
  {
    name: "Payments",
    href: "/admin/payments",
    icon: Coins,
    roles: ["SchoolOwner", "Principal", "Bursar", "Admin"],
    requiresActive: true,
  },
  {
    name: "Reports",
    href: "/admin/reports",
    icon: TrendingUp,
    roles: ["SchoolOwner", "Principal", "Bursar"],
    requiresActive: true,
  },
  {
    name: "Audit Logs",
    href: "/admin/audit",
    icon: History,
    roles: ["SchoolOwner"],
    requiresActive: true,
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
    roles: ["SchoolOwner", "Principal", "Bursar", "Admin"],
    requiresActive: false,
  },
];

export default function AdminNav({ userRole, schoolStatus, schoolName }: AdminNavProps) {
  const pathname = usePathname();
  const isOnboarding = schoolStatus === "onboarding";

  const visibleLinks = NAV_LINKS.filter((link) => {
    if (!link.roles.includes(userRole)) return false;
    // "Setup Checklist" nav item: only show when onboarding
    if (link.onboardingOnly && !isOnboarding) return false;
    // If item is hidden during onboarding, still show it but dimmed
    return true;
  });

  return (
    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
      {visibleLinks.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
        const isLocked = isOnboarding && link.requiresActive;

        if (isLocked) {
          return (
            <div
              key={link.href}
              title={`Complete setup to access ${link.name}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-medium font-medium text-neutral-600 opacity-40 cursor-not-allowed select-none"
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{link.name}</span>
            </div>
          );
        }

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-medium font-medium transition-colors ${
              isActive
                ? "bg-primary text-white"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span>{link.name}</span>
          </Link>
        );
      })}

      {/* Onboarding reminder — shown below nav when setup is incomplete */}
      {isOnboarding && (
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-body-small text-white font-bold leading-tight">Setup Incomplete</p>
              <p className="text-[11px] text-neutral-400 mt-0.5 leading-normal">
                Most features are locked until the setup checklist is done.
              </p>
              <Link
                href="/admin/setup"
                className="text-[11px] text-amber-400 hover:underline font-bold mt-1.5 block"
              >
                Continue Setup →
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
