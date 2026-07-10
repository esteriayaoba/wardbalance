"use client";

import Link from "next/link";
import Image from "next/image";
import { Bell, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOnlineStatus } from "@/components/pwa/useOnlineStatus";

interface ParentHeaderProps {
  parentName?: string;
  schoolName?: string;
}

export default function ParentHeader({ parentName, schoolName }: ParentHeaderProps) {
  const router = useRouter();
  const { isOnline } = useOnlineStatus();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/parent/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full h-14 bg-white border-b border-neutral-200/80 px-4 md:px-8 flex items-center justify-between shadow-sm">
      <Link href="/parent/dashboard" className="flex items-center gap-2 font-bold text-primary">
        <Image
          src="/logo-v5.png"
          alt="WardBalance logo"
          width={32}
          height={32}
        />
        <span className="text-title-small tracking-tight">WardBalance</span>
      </Link>

      <div className="flex items-center gap-3">
        {/* Online / offline status dot — subtle visual cue */}
        <span
          title={isOnline ? "Online" : "Offline"}
          aria-label={isOnline ? "Online" : "Offline — data may be outdated"}
          className={`hidden sm:block w-2 h-2 rounded-full shrink-0 transition-colors ${
            isOnline ? "bg-success" : "bg-warning"
          }`}
        />

        {schoolName && (
          <span className="hidden sm:inline-block px-2.5 py-1 bg-neutral-100 border border-neutral-200 rounded-full text-[11px] font-bold text-neutral-600">
            {schoolName}
          </span>
        )}

        {parentName && (
          <span className="text-body-small font-bold text-neutral-700 hidden md:inline-block">
            {parentName}
          </span>
        )}

        <button className="relative min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-error rounded-full" aria-hidden="true" />
        </button>

        <button
          onClick={handleLogout}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

