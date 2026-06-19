"use client";

import { useState, useEffect } from "react";
import CookieSettingsModal from "./CookieSettingsModal";
import {
  getConsent,
  saveConsent,
  hasConsent,
  type ConsentPreferences,
} from "@/lib/cookies/consent";
import {
  setConsentState,
  initPostHog,
  resetPostHog,
  trackEvent,
} from "@/lib/analytics/posthog";

function defaultPreferences(): ConsentPreferences {
  return { necessary: true, analytics: false, marketing: false };
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingPrefs, setPendingPrefs] = useState<ConsentPreferences>(
    defaultPreferences(),
  );

  useEffect(() => {
    if (!hasConsent()) {
      setVisible(true);
    }
  }, []);

  const applyConsent = (preferences: ConsentPreferences) => {
    saveConsent(preferences);

    if (preferences.analytics) {
      setConsentState("accepted_all");
      initPostHog();
      trackEvent({ event: "cookie_consent_accepted" });
    } else {
      setConsentState("rejected_non_essential");
      resetPostHog();
      trackEvent({ event: "cookie_consent_rejected" });
    }
  };

  const handleAcceptAll = () => {
    const prefs: ConsentPreferences = {
      necessary: true,
      analytics: true,
      marketing: false,
    };
    applyConsent(prefs);
    setVisible(false);
  };

  const handleReject = () => {
    const prefs = defaultPreferences();
    applyConsent(prefs);
    setVisible(false);
  };

  const handleCustomize = () => {
    setPendingPrefs(getConsent() ?? defaultPreferences());
    setSettingsOpen(true);
  };

  const handleSaveSettings = (preferences: ConsentPreferences) => {
    saveConsent(preferences);

    if (preferences.analytics) {
      setConsentState("accepted_all");
      initPostHog();
      trackEvent({ event: "cookie_consent_customized" });
    } else {
      setConsentState("rejected_non_essential");
      resetPostHog();
      trackEvent({ event: "cookie_consent_customized" });
    }

    setSettingsOpen(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-[90] p-4 md:p-6"
        role="dialog"
        aria-label="Cookie consent"
      >
        <div
          className="mx-auto max-w-3xl rounded-2xl p-5 md:p-6 shadow-xl"
          style={{
            background: "var(--color-surface-container-lowest)",
            border: "1px solid var(--color-outline-variant)",
          }}
        >
          <p
            className="text-body-medium mb-4"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            We use necessary cookies to make WardBalance work. With your
            permission, we also use analytics cookies to understand how schools
            interact with our website and improve the product.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleAcceptAll}
                className="px-5 py-2.5 rounded-lg text-label-large transition-all hover:opacity-90 focus:outline-2 focus:outline-primary focus:outline-offset-2"
                style={{
                  background: "var(--color-primary)",
                  color: "var(--color-on-primary)",
                }}
              >
                Accept all
              </button>
              <button
                onClick={handleReject}
                className="px-5 py-2.5 rounded-lg text-label-large transition-all hover:opacity-90 focus:outline-2 focus:outline-primary focus:outline-offset-2"
                style={{
                  background: "transparent",
                  color: "var(--color-on-surface)",
                  border: "1px solid var(--color-outline-variant)",
                }}
              >
                Reject non-essential
              </button>
            </div>
            <button
              onClick={handleCustomize}
              className="px-5 py-2.5 rounded-lg text-label-medium transition-all hover:opacity-80 focus:outline-2 focus:outline-primary focus:outline-offset-2"
              style={{
                color: "var(--color-primary-600)",
              }}
            >
              Customize
            </button>
          </div>
        </div>
      </div>

      <CookieSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
        initialPreferences={pendingPrefs}
      />
    </>
  );
}
