import React from "react";
import { getSession } from "@/lib/auth/session";
import ParentShell from "@/components/parent/ParentShell";

export const dynamic = "force-dynamic";

interface LayoutProps {
  children: React.ReactNode;
}

export default async function ParentLayout({ children }: LayoutProps) {
  const session = await getSession();

  // If there's no session or it's not a parent (e.g., login screen, or bypassed admin),
  // just render the children directly without the shell layout.
  if (!session || session.role !== "Parent") {
    return <div className="min-h-screen bg-neutral-50">{children}</div>;
  }

  return (
    <ParentShell parentName={session.fullName} schoolName={session.schoolName}>
      {children}
    </ParentShell>
  );
}
