import React from "react";
import ParentHeader from "./ParentHeader";
import ParentBottomNav from "./ParentBottomNav";
import OfflineBanner from "./OfflineBanner";
import RegisterSW from "./RegisterSW";


interface ParentShellProps {
  children: React.ReactNode;
  parentName?: string;
  schoolName?: string;
}

export default function ParentShell({ children, parentName, schoolName }: ParentShellProps) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col pb-[64px] md:pb-0">
      <RegisterSW />
      <a href="#parent-main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-primary focus:rounded-lg focus:shadow-lg focus:border focus:border-primary focus:font-bold">
        Skip to main content
      </a>
      <ParentHeader parentName={parentName} schoolName={schoolName} />
      <main id="parent-main-content" className="flex-1 w-full max-w-lg mx-auto px-4 py-6 md:max-w-4xl md:px-8">
        {children}
      </main>
      {/* Offline status banner — appears above bottom nav when connectivity is lost */}
      <OfflineBanner />
      <ParentBottomNav />
    </div>
  );
}

