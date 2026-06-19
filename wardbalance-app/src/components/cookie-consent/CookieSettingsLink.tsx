"use client";

import { useState } from "react";
import CookieSettingsModal from "./CookieSettingsModal";
import {
  getConsent,
  saveConsent,
  type ConsentPreferences,
} from "@/lib/cookies/consent";
import { setConsentState, initPostHog, resetPostHog } from "@/lib/analytics/posthog";

function defaultPreferences(): ConsentPreferences {
  return { necessary: true, analytics: false, marketing: false };
}

export default function CookieSettingsLink() {
  const [open, setOpen] = useState(false);

  const handleSave = (preferences: ConsentPreferences) => {
    saveConsent(preferences);

    if (preferences.analytics) {
      setConsentState("accepted_all");
      initPostHog();
    } else {
      setConsentState("rejected_non_essential");
      resetPostHog();
    }

    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-body-medium hover:underline cursor-pointer"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        Cookie Settings
      </button>
      <CookieSettingsModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSave={handleSave}
        initialPreferences={getConsent() ?? defaultPreferences()}
      />
    </>
  );
}
