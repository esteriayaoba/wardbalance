"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

export default function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed or prompt was dismissed
    const alreadyDismissed = sessionStorage.getItem("pwa-prompt-dismissed");
    if (alreadyDismissed || window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt on second visit (check localStorage)
      const visitCount = parseInt(localStorage.getItem("pwa-visit-count") || "0", 10);
      if (visitCount >= 1) {
        setShowPrompt(true);
      }
      localStorage.setItem("pwa-visit-count", String(visitCount + 1));
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (!showPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-8 md:left-auto md:right-8 md:w-80">
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl p-5 space-y-4 animate-slide-up">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-body-small font-bold text-neutral-900">Install WardBalance</h4>
              <p className="text-[10px] text-neutral-500">Quick access to fee invoices</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-neutral-100 rounded-full transition cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>
        <button
          onClick={handleInstall}
          className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-body-small hover:bg-primary-dark transition shadow-sm cursor-pointer"
        >
          Add to Home Screen
        </button>
        <p className="text-[10px] text-neutral-400 text-center">
          Open WardBalance like an app. No download from store needed.
        </p>
      </div>
    </div>
  );
}
