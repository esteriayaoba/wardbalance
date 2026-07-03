import React from "react";
import { auth } from "@/lib/nextauth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { Monitor, Sparkle } from "lucide-react";
import LogoutButton from "./logout-button";
import AdminNav from "./admin-nav";
import AdminPageTitle from "./admin-page-title";
import { RouteGuard } from "./route-guard";
import AdminMobileNav from "./AdminMobileNav";
import AdminBreadcrumbs from "./admin-breadcrumbs";
import AdminToastWrapper from "./admin-toast-wrapper";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;

  // Fetch active term info
  const activeTerm = await prisma.academicTerm.findFirst({
    where: {
      schoolId: user.schoolId,
      isActive: true,
    },
    include: {
      session: true,
    },
  });

  // Fetch school details
  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
    select: { name: true, status: true },
  });

  // Fetch user details for email verification check
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true },
  });

  const isDemo = user.isDemo === true;
  const schoolStatus = school?.status ?? "onboarding";
  const emailVerified = isDemo ? true : (dbUser?.emailVerified ?? false);

  return (
    <>
      <RouteGuard schoolStatus={schoolStatus} />
      <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="bg-gradient-to-r from-primary-700 to-primary shrink-0 px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Monitor className="w-4 h-4 text-white shrink-0" />
            <p className="text-body-small text-white font-medium truncate">
              You&apos;re exploring a demo school. No data is real.
            </p>
          </div>
          <Link
            href="/signup"
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-primary text-label-small font-bold hover:bg-primary-50 transition whitespace-nowrap"
          >
            <Sparkle className="w-3.5 h-3.5" />
            Sign Up Free
          </Link>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Sidebar Navigation */}
        <aside className="hidden md:flex md:w-16 lg:w-60 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0 transition-all duration-300">
          {/* Brand Header */}
          <Link
            href="/admin/dashboard"
            className="h-16 px-4 lg:px-6 border-b border-neutral-800 flex items-center justify-center lg:justify-start gap-2.5 hover:bg-neutral-800/50 transition-colors"
            aria-label="WardBalance — go to dashboard"
          >
            <Image
              src="/logo-v5.png"
              alt="WardBalance logo"
              width={32}
              height={32}
              className="shrink-0"
            />
            <span className="text-title-medium text-white font-bold tracking-tight lg:block hidden">
              WardBalance
            </span>
          </Link>

          {/* Client-side Navigation (active state + onboarding lock) */}
          <AdminNav
            userRole={user.role}
            schoolStatus={schoolStatus}
          />

          {/* User Footer Profile */}
          <div className="p-2 lg:p-4 border-t border-neutral-800 flex flex-col lg:flex-row items-center justify-between gap-2.5">
            <div className="min-w-0 lg:block hidden">
              <p className="text-body-small text-white font-bold truncate">
                {user.name}
              </p>
              <p className="text-[10px] text-neutral-500 font-medium truncate uppercase tracking-wider">
                {user.role.replace("SchoolOwner", "Owner")}
              </p>
            </div>
            <LogoutButton />
          </div>
        </aside>

        {/* Main Workspace Panels */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header Navigation */}
          <header className="h-16 bg-white border-b border-neutral-200 px-4 md:px-8 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <AdminMobileNav
                userRole={user.role}
                schoolStatus={schoolStatus}
                fullName={user.name}
              />
              <AdminPageTitle />
            </div>

            {/* Active Session & Term Tracker */}
            <div className="flex items-center gap-3">
              {activeTerm ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-800 text-body-small font-bold">
                  <span className="w-2 h-2 rounded-full bg-success"></span>
                  {activeTerm.session.name} — {activeTerm.name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-body-small font-bold border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-warning"></span>
                  No Active Academic Term
                </span>
              )}
            </div>
          </header>

          {/* Email Verification Banner */}
          {!emailVerified && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 md:px-8 py-3 flex items-center justify-between gap-4 shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse"></span>
                <p className="text-body-small text-amber-900 leading-normal">
                  <strong>Email verification is pending.</strong> Sensitive financial actions (generating invoices, recording manual payments, creating fees, and publishing templates) are restricted.
                </p>
              </div>
              <Link
                href="/admin/verify-email"
                className="shrink-0 text-label-small font-bold text-amber-700 hover:text-amber-800 bg-amber-100/60 hover:bg-amber-100 px-3.5 py-1.5 rounded-lg transition"
              >
                Verify Email Now →
              </Link>
            </div>
          )}

          {/* Scrollable Main View Area */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-8">
              <AdminBreadcrumbs />
              <AdminToastWrapper>{children}</AdminToastWrapper>
            </div>
          </main>
        </div>
      </div>
    </div>
    </>
  );
}
