"use client";

import { ToastProvider } from "@/components/admin/shared/toast-provider";

export default function AdminToastWrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
