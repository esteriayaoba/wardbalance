"use client";

import { Smartphone, X } from "lucide-react";
import Image from "next/image";
import { useInstallPrompt } from "@/components/pwa/useInstallPrompt";

/**
 * PWAInstallPrompt
 *
 * A dismissible card shown on the parent dashboard on first visit,
 * prompting parents to add WardBalance to their home screen.
 *
 * - Only shown when the browser fires the BeforeInstallPromptEvent
 * - Disappears after install or dismissal (stored in localStorage)
 * - Never shown when already in standalone (installed) mode
 *
 * Parent Portal only — not used in Admin Platform.
 */
export default function PWAInstallPrompt() {
  const { canInstall, install, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div
      role="complementary"
      aria-label="Add WardBalance to your home screen"
      className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5 flex gap-4 items-start shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500"
    >
      {/* Logo */}
      <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden shadow border border-primary/10">
        <Image
          src="/logo-v5.png"
          alt="WardBalance app icon"
          width={48}
          height={48}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-3">
        <div className="space-y-0.5">
          <p className="text-body-medium font-bold text-neutral-900">
            Add to your home screen
          </p>
          <p className="text-[12px] text-neutral-500 leading-snug">
            Access your ward&apos;s fee balance instantly — no browser needed.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={install}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-[12px] font-bold rounded-lg hover:bg-primary-dark transition shadow-sm cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Add to Home Screen
          </button>
          <button
            onClick={dismiss}
            className="px-3 py-2 text-[12px] font-bold text-neutral-500 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition cursor-pointer"
          >
            Not now
          </button>
        </div>
      </div>

      {/* Dismiss icon */}
      <button
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="shrink-0 p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
