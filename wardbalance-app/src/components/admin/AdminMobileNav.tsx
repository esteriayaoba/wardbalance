"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import AdminNav from "./admin-nav";
import LogoutButton from "./logout-button";

interface AdminMobileNavProps {
  userRole: string;
  schoolStatus: string;
  fullName?: string | null;
}

export default function AdminMobileNav({ userRole, schoolStatus, fullName }: AdminMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Hamburger Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 -ml-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition cursor-pointer"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 transition-opacity animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Sidebar Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-neutral-900 flex flex-col transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Brand Header */}
        <div className="h-16 px-6 border-b border-neutral-800 flex items-center justify-between">
          <Link
            href="/admin/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5"
          >
            <Image
              src="/logo-v5.png"
              alt="WardBalance logo"
              width={32}
              height={32}
            />
            <span className="text-title-small text-white font-bold tracking-tight">
              WardBalance
            </span>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto" onClick={() => setIsOpen(false)}>
          <AdminNav userRole={userRole} schoolStatus={schoolStatus} />
        </div>

        {/* User Profile / Logout */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <p className="text-body-small text-white font-bold truncate">
              {fullName || "User"}
            </p>
            <p className="text-[10px] text-neutral-500 font-medium truncate uppercase tracking-wider">
              {userRole.replace("SchoolOwner", "Owner")}
            </p>
          </div>
          <div onClick={() => setIsOpen(false)}>
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
