import React from "react";
import ParentHeader from "./ParentHeader";
import ParentBottomNav from "./ParentBottomNav";

interface ParentShellProps {
  children: React.ReactNode;
  parentName?: string;
  schoolName?: string;
}

export default function ParentShell({ children, parentName, schoolName }: ParentShellProps) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col pb-[64px] md:pb-0">
      {/* Top Header */}
      <ParentHeader parentName={parentName} schoolName={schoolName} />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6 md:max-w-4xl md:px-8">
        {children}
      </main>

      {/* Bottom Nav on Mobile */}
      <ParentBottomNav />
    </div>
  );
}
