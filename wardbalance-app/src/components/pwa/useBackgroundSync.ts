import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useBackgroundSync
 *
 * When the network reconnects after an offline period, automatically
 * triggers a refresh of parent portal read endpoints (dashboard, invoices,
 * receipts). Does NOT auto-retry payments — financial retries require
 * explicit user confirmation.
 *
 * Parent Portal only — not used in Admin Platform.
 */
export function useBackgroundSync(onSync: () => void | Promise<void>): {
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  manualRefresh: () => void;
} {
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const wasOfflineRef = useRef(false);

  const runSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await onSync();
      setLastSyncedAt(new Date());
    } catch {
      // Sync failure is silent — the component should handle stale state display
    } finally {
      setIsSyncing(false);
    }
  }, [onSync]);

  useEffect(() => {
    const handleOnline = () => {
      // Only trigger background sync if we were previously offline
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        runSync();
      }
    };

    const handleOffline = () => {
      wasOfflineRef.current = true;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [runSync]);

  return {
    lastSyncedAt,
    isSyncing,
    manualRefresh: runSync,
  };
}
