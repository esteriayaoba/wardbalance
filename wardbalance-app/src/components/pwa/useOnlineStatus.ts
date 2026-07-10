import { useState, useEffect } from "react";

/**
 * useOnlineStatus
 *
 * Returns the current network connectivity status.
 * Subscribes to the window "online" and "offline" events to react
 * to connectivity changes without polling.
 *
 * Parent Portal only — not used in Admin Platform.
 */
export function useOnlineStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline };
}
