"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const LABEL_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  students: "Students",
  parents: "Parents",
  fees: "Fee Structure",
  discounts: "Discounts",
  invoices: "Invoices",
  payments: "Payments",
  verification: "Verification Queue",
  receipts: "Receipts",
  reports: "Reports",
  audit: "Audit Logs",
  settings: "Settings",
  academic: "Academic Setup",
  setup: "Setup",
  new: "New",
};

export default function AdminBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Only show breadcrumbs for admin routes with depth >= 2
  if (segments.length < 2) return null;

  const crumbs = segments.slice(1).map((seg, index) => {
    const href = "/" + segments.slice(0, index + 2).join("/");
    const label = LABEL_MAP[seg] || seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
    const isLast = index === segments.length - 2;
    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-body-small text-neutral-500">
        <li>
          <Link href="/admin/dashboard" className="hover:text-neutral-700 transition">Home</Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
            {crumb.isLast ? (
              <span className="text-neutral-800 font-medium">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-neutral-700 transition">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
