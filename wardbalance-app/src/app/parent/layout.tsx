import React from "react";
import { auth } from "@/lib/nextauth";
import ParentShell from "@/components/parent/ParentShell";

export const dynamic = "force-dynamic";

interface LayoutProps {
  children: React.ReactNode;
}

export default async function ParentLayout({ children }: LayoutProps) {
  const session = await auth();

  // If there's no session or it's not a parent (e.g., login screen, or bypassed admin),
  // just render the children directly without the shell layout.
  if (!session?.user || session.user.role !== "Parent") {
    return <div className="min-h-screen bg-neutral-50">{children}</div>;
  }

  return (
    <ParentShell parentName={session.user.name ?? ""} schoolName={session.user.schoolName ?? ""}>
      {children}
    </ParentShell>
  );
}
