"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const LOCKED_ROUTES = [
  "/admin/invoices",
  "/admin/payments",
  "/admin/reports",
  "/admin/audit",
];

interface RouteGuardProps {
  schoolStatus: string;
}

export function RouteGuard({ schoolStatus }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (schoolStatus !== "onboarding") return;

    const isLocked = LOCKED_ROUTES.some((route) =>
      pathname === route || pathname.startsWith(route + "/")
    );

    if (isLocked) {
      router.replace("/admin/setup");
    }
  }, [pathname, schoolStatus, router]);

  return null;
}
