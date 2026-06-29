"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, CreditCard, Receipt, User } from "lucide-react";

const NAV_ITEMS = [
  { label: "Wards", href: "/parent/dashboard", icon: Home },
  { label: "Invoices", href: "/parent/invoices", icon: FileText },
  { label: "Payments", href: "/parent/payments", icon: CreditCard },
  { label: "Receipts", href: "/parent/receipts", icon: Receipt },
  { label: "Profile", href: "/parent/profile", icon: User },
];

export default function ParentBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-[64px] bg-white border-t border-neutral-200/80 shadow-lg px-4 flex items-center justify-around md:hidden">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors ${
              isActive ? "text-primary font-bold" : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-primary" : "text-neutral-400"}`} aria-hidden="true" />
            <span className="text-[10px] tracking-wide">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
