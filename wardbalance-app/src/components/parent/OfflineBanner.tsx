"use client";

import { useOnlineStatus } from "@/components/pwa/useOnlineStatus";

/**
 * OfflineBanner
 *
 * Appears above the bottom nav when the device loses network connectivity.
 * Disappears automatically when connectivity returns.
 *
 * Parent Portal only — not used in Admin Platform.
 */
export default function OfflineBanner() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="You are currently offline"
      className="fixed bottom-[64px] left-0 right-0 z-40 px-4 py-2 flex items-center justify-center gap-2
                 bg-amber-50 border-t border-amber-200 shadow-sm
                 animate-in slide-in-from-bottom-2 duration-300"
    >
      {/* Offline dot indicator */}
      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
      <p className="text-[12px] font-bold text-amber-800 text-center leading-tight">
        You&apos;re offline — some features are temporarily unavailable
      </p>
    </div>
  );
}
