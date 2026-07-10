import { useState, useEffect, useCallback } from "react";

// Extend Window to include the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "wb_pwa_install_dismissed";

/**
 * useInstallPrompt
 *
 * Captures the browser's BeforeInstallPromptEvent and exposes
 * an install() function to trigger the native install dialog.
 *
 * Shows on first visit. Remembers dismissal in localStorage.
 * Parent Portal only — not used in Admin Platform.
 */
export function useInstallPrompt(): {
  canInstall: boolean;
  install: () => Promise<void>;
  dismiss: () => void;
} {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // If already dismissed, don't show again
    if (typeof localStorage !== "undefined" && localStorage.getItem(DISMISSED_KEY)) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // If already installed (standalone mode), don't show prompt
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setCanInstall(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setCanInstall(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
    setCanInstall(false);
    setDeferredPrompt(null);
  }, []);

  return { canInstall, install, dismiss };
}
