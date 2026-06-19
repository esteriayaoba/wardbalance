/**
 * Cookie consent management.
 *
 * Categories:
 *  - necessary: always enabled, required for site operation
 *  - analytics: controls PostHog
 *  - marketing: future use, disabled by default
 *
 * Consent is stored in localStorage key "wb-consent".
 */

export interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export type ConsentCategory = keyof ConsentPreferences;

const STORAGE_KEY = "wb-consent";
const CONSENT_VERSION = 1;

function defaultPreferences(): ConsentPreferences {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
  };
}

export function getConsent(): ConsentPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version === CONSENT_VERSION && parsed?.preferences) {
      return parsed.preferences as ConsentPreferences;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveConsent(preferences: ConsentPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: CONSENT_VERSION,
      preferences,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function hasConsent(): boolean {
  return getConsent() !== null;
}

export function isCategoryAllowed(category: ConsentCategory): boolean {
  const consent = getConsent();
  if (!consent) return false;
  if (category === "necessary") return true;
  return consent[category] === true;
}

export function clearConsent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
