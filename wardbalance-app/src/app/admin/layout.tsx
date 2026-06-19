import React from "react";
import AdminLayout from "@/components/admin/admin-layout";

export const dynamic = "force-dynamic";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return <AdminLayout>{children}</AdminLayout>;
}
