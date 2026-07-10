"use client";

import { RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/components/pwa/useOnlineStatus";

interface SyncIndicatorProps {
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  onRefresh: () => void;
}

function formatSyncTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin === 1) return "1 min ago";
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return "1 hr ago";
  return `${diffHr} hrs ago`;
}

/**
 * SyncIndicator
 *
 * Displays the last data sync time with an online/offline dot indicator.
 * Tapping the refresh icon triggers a manual data refresh.
 *
 * Parent Portal only — used inside ParentHeader.
 */
export default function SyncIndicator({ lastSyncedAt, isSyncing, onRefresh }: SyncIndicatorProps) {
  const { isOnline } = useOnlineStatus();

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium">
      {/* Online/offline status dot */}
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnline ? "bg-green-500" : "bg-neutral-400"}`}
        aria-hidden="true"
      />

      {isSyncing ? (
        <span className="text-neutral-400">Syncing…</span>
      ) : lastSyncedAt ? (
        <span>{formatSyncTime(lastSyncedAt)}</span>
      ) : isOnline ? (
        <span>Loading…</span>
      ) : (
        <span>Offline</span>
      )}

      {isOnline && !isSyncing && (
        <button
          onClick={onRefresh}
          aria-label="Refresh data"
          className="p-0.5 rounded hover:bg-neutral-100 transition text-neutral-400 hover:text-neutral-600 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
