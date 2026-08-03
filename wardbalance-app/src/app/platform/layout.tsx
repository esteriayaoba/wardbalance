import React from "react";
import { auth } from "@/lib/nextauth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Users, Mail, ShieldAlert, GitBranch } from "lucide-react";
import LogoutButton from "@/components/admin/logout-button";
import AdminToastWrapper from "@/components/admin/admin-toast-wrapper";

interface PlatformLayoutProps {
  children: React.ReactNode;
}

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: PlatformLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch db user record to double check platform status
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPlatformAdmin: true, platformRole: true },
  });

  if (!dbUser?.isPlatformAdmin) {
    // Show a clean forbidden page or redirect
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-headline-small text-neutral-900 font-bold mb-2">Access Denied</h1>
          <p className="text-body-medium text-neutral-600 mb-6">
            Your account does not have permission to access the internal WardBalance Platform dashboard.
          </p>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-lg transition"
          >
            Go to School Admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar Nav */}
      <aside className="w-64 bg-neutral-900 flex flex-col shrink-0 border-r border-neutral-800">
        {/* Header */}
        <div className="h-16 px-6 border-b border-neutral-800 flex items-center gap-3">
          <Image
            src="/logo-v5.png"
            alt="WardBalance logo"
            width={32}
            height={32}
            className="shrink-0"
          />
          <div className="flex flex-col">
            <span className="text-title-medium text-white font-bold tracking-tight leading-none">
              WardPlatform
            </span>
            <span className="text-[10px] text-primary-400 font-bold uppercase tracking-wider mt-1">
              Internal Console
            </span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link
            href="/platform"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 font-medium transition"
          >
            <LayoutDashboard className="w-5 h-5 shrink-0 text-neutral-400" />
            Overview
          </Link>
          <Link
            href="/platform/leads"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 font-medium transition"
          >
            <Users className="w-5 h-5 shrink-0 text-neutral-400" />
            CRM Leads List
          </Link>
          <Link
            href="/platform/campaigns"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 font-medium transition"
          >
            <Mail className="w-5 h-5 shrink-0 text-neutral-400" />
            Campaigns Composer
          </Link>
          <Link
            href="/platform/journeys"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 font-medium transition"
          >
            <GitBranch className="w-5 h-5 shrink-0 text-neutral-400" />
            Journeys Engine
          </Link>
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body-small text-white font-bold truncate">
              {session.user.name}
            </p>
            <p className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider truncate">
              {dbUser.platformRole || "Platform Admin"}
            </p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-neutral-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-title-medium text-neutral-800 font-bold">
              Platform Administration
            </h2>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">
            <AdminToastWrapper>{children}</AdminToastWrapper>
          </div>
        </main>
      </div>
    </div>
  );
}
