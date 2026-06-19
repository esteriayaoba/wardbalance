/**
 * PostHog analytics for the marketing page.
 *
 * PostHog is only initialized after the user grants analytics consent.
 * Do NOT send personally identifiable information (name, email, phone, school) to PostHog.
 */

type ConsentState = "accepted_all" | "rejected_non_essential" | "customized" | null;

let consentState: ConsentState = null;
let posthogInitialized = false;

export function setConsentState(state: ConsentState) {
  consentState = state;
}

export function getConsentState(): ConsentState {
  return consentState;
}

function getPostHog() {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const posthog = require("posthog-js");
  return posthog;
}

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (posthogInitialized) return;
  if (consentState !== "accepted_all") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key || !host) {
    console.warn("[posthog] NEXT_PUBLIC_POSTHOG_KEY or NEXT_PUBLIC_POSTHOG_HOST not set");
    return;
  }

  try {
    const posthog = getPostHog();
    posthog.init(key, {
      api_host: host,
      loaded: () => posthogInitialized = true,
      // TODO: configure person profiles to be identified only when appropriate
      // TODO: add session recording opt-in when needed
    });
  } catch {
    console.warn("[posthog] Failed to initialize");
  }
}

export function resetPostHog() {
  if (typeof window === "undefined") return;
  try {
    const posthog = getPostHog();
    posthog.reset();
  } catch {
    // silently fail
  }
  posthogInitialized = false;
}

interface TrackEvent {
  event: string;
  properties?: Record<string, string | number | boolean | undefined>;
}

/**
 * Track a marketing event.
 * Only fires if PostHog is initialized and analytics consent was granted.
 * Does NOT send PII.
 */
export function trackEvent({ event, properties }: TrackEvent) {
  if (typeof window === "undefined") return;
  if (!posthogInitialized) return;

  try {
    const posthog = getPostHog();
    posthog.capture(event, {
      page: "marketing",
      ...properties,
    });
  } catch {
    // silently fail
  }
}

/**
 * Track a marketing page view.
 * Call after route change or on initial page load.
 */
export function trackPageView() {
  if (typeof window === "undefined") return;
  if (!posthogInitialized) return;

  try {
    const posthog = getPostHog();
    posthog.capture("$pageview", {
      page: "marketing",
    });
  } catch {
    // silently fail
  }
}
