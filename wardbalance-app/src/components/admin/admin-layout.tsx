import React from "react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ShieldCheck, Monitor, Sparkle } from "lucide-react";
import LogoutButton from "./logout-button";
import AdminNav from "./admin-nav";
import AdminPageTitle from "./admin-page-title";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch active term info
  const activeTerm = await prisma.academicTerm.findFirst({
    where: {
      schoolId: session.schoolId,
      isActive: true,
    },
    include: {
      session: true,
    },
  });

  // Fetch school details
  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { name: true, status: true },
  });

  const isDemo = session.isDemo === true;
  const schoolStatus = school?.status ?? "onboarding";

  return (
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
        <aside className="w-60 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0">
          {/* Brand Header */}
          <div className="h-16 px-6 border-b border-neutral-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <span className="text-title-medium text-white font-bold tracking-tight">
              WardBalance
            </span>
          </div>

          {/* Client-side Navigation (active state + onboarding lock) */}
          <AdminNav
            userRole={session.role}
            schoolStatus={schoolStatus}
            schoolName={school?.name ?? session.schoolName}
          />

          {/* User Footer Profile */}
          <div className="p-4 border-t border-neutral-800 flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <p className="text-body-small text-white font-bold truncate">
                {session.fullName}
              </p>
              <p className="text-[10px] text-neutral-500 font-medium truncate uppercase tracking-wider">
                {session.role.replace("SchoolOwner", "Owner")}
              </p>
            </div>
            <LogoutButton />
          </div>
        </aside>

        {/* Main Workspace Panels */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header Navigation */}
          <header className="h-16 bg-white border-b border-neutral-200 px-8 flex items-center justify-between shrink-0">
            {/* Client component reads pathname to show current page title */}
            <AdminPageTitle />

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

          {/* Scrollable Main View Area */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-8 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
