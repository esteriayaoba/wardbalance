"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/setup": "Setup Checklist",
  "/admin/students": "Students",
  "/admin/parents": "Parents",
  "/admin/fees": "Fee Structure",
  "/admin/invoices": "Invoices",
  "/admin/payments": "Payments",
  "/admin/reports": "Reports",
  "/admin/audit": "Audit Log",
  "/admin/settings": "Settings",
  "/admin/academic": "Academic Structure",
};

export default function AdminPageTitle() {
  const pathname = usePathname();

  // Match longest prefix
  const title = Object.entries(PAGE_TITLES)
    .filter(([key]) => pathname === key || pathname.startsWith(key + "/") || pathname.startsWith(key + "?"))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? "Admin";

  return (
    <h2 className="text-title-medium text-neutral-900 font-bold">{title}</h2>
  );
}
