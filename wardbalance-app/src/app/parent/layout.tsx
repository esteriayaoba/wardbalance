import React from "react";
import type { Metadata, Viewport } from "next";
import { auth } from "@/lib/nextauth";
import ParentShell from "@/components/parent/ParentShell";

export const dynamic = "force-dynamic";

// PWA meta — parent portal only
export const metadata: Metadata = {
  title: {
    default: "My Wards — WardBalance",
    template: "%s — WardBalance",
  },
  description: "View your ward's school fee invoices, track payments, and check outstanding balances.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WardBalance",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#155EEF",
  width: "device-width",
  initialScale: 1,
  userScalable: true,
};

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

