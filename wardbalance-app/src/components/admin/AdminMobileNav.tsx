"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap: keep focus within the panel when open
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      setTimeout(() => focusable[0].focus(), 50);
    }
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panel) return;
      const focusableElements = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleTab);
    return () => {
      window.removeEventListener("keydown", handleTab);
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        className="p-2 -ml-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition cursor-pointer"
        aria-label="Open menu"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-panel"
      >
        <Menu className="w-6 h-6" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 transition-opacity animate-fade-in"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <div
        id="mobile-nav-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation menu"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-neutral-900 flex flex-col transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-6 border-b border-neutral-800 flex items-center justify-between">
          <Link
            href="/admin/dashboard"
            onClick={close}
            className="flex items-center gap-2.5"
            tabIndex={isOpen ? 0 : -1}
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
            onClick={close}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            aria-label="Close menu"
            tabIndex={isOpen ? 0 : -1}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" onClick={close}>
          <AdminNav userRole={userRole} schoolStatus={schoolStatus} />
        </div>

        <div className="p-4 border-t border-neutral-800 flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <p className="text-body-small text-white font-bold truncate">
              {fullName || "User"}
            </p>
            <p className="text-[10px] text-neutral-500 font-medium truncate uppercase tracking-wider">
              {userRole.replace("SchoolOwner", "Owner")}
            </p>
          </div>
          <div onClick={close}>
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
