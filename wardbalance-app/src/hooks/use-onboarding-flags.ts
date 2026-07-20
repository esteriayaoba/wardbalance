/**
 * useOnboardingFlags — PostHog feature flag hook for onboarding gates.
 *
 * Reads flags directly from the posthog-js client to stay consistent with the
 * existing imperative PostHog setup (no PostHogProvider in this codebase).
 *
 * All flags default to TRUE so the new onboarding flow is used when PostHog
 * is unavailable (no consent, not initialised, network error). Setting a flag
 * to false in PostHog is the kill-switch that restores the legacy flow.
 *
 * Flag names (create these in PostHog → Feature Flags before launch):
 *   onboarding_v2_signup           — multi-step signup + step-4 preview
 *   onboarding_v2_setup_wizard     — phase wizard + celebration overlay
 *   onboarding_v2_dashboard_preview — step-4 dashboard preview cards
 *   parent_otp_auth                — OTP-based parent portal login
 */

"use client";

import { useEffect, useState } from "react";

export interface OnboardingFlags {
  /** New multi-step signup flow. False = legacy single-form. */
  signupV2: boolean;
  /** Phase wizard + celebration overlay. False = legacy flat checklist. */
  setupWizardV2: boolean;
  /** Step-4 dashboard preview on signup. False = skip directly to setup. */
  dashboardPreview: boolean;
  /** OTP-based parent portal auth. False = legacy password auth. */
  parentOtpAuth: boolean;
  /** True while flags are still loading from PostHog. */
  loading: boolean;
}

const DEFAULTS: Omit<OnboardingFlags, "loading"> = {
  signupV2: true,
  setupWizardV2: true,
  dashboardPreview: true,
  parentOtpAuth: true,
};

function getPostHogClient(): { getFeatureFlag?: (key: string) => boolean | string | undefined } | null {
  if (typeof window === "undefined") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ph = require("posthog-js");
    return ph.default ?? ph;
  } catch {
    return null;
  }
}

function readFlag(key: string, defaultValue: boolean): boolean {
  const client = getPostHogClient();
  if (!client?.getFeatureFlag) return defaultValue;
  try {
    const value = client.getFeatureFlag(key);
    // PostHog returns undefined when flag is not loaded yet, or the raw value
    if (value === undefined) return defaultValue;
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    // Multivariate flags: treat any truthy string as enabled
    return Boolean(value);
  } catch {
    return defaultValue;
  }
}

export function useOnboardingFlags(): OnboardingFlags {
  const [flags, setFlags] = useState<Omit<OnboardingFlags, "loading">>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read flags immediately — may return defaults if PostHog hasn't loaded yet
    setFlags({
      signupV2: readFlag("onboarding_v2_signup", DEFAULTS.signupV2),
      setupWizardV2: readFlag("onboarding_v2_setup_wizard", DEFAULTS.setupWizardV2),
      dashboardPreview: readFlag("onboarding_v2_dashboard_preview", DEFAULTS.dashboardPreview),
      parentOtpAuth: readFlag("parent_otp_auth", DEFAULTS.parentOtpAuth),
    });
    setLoading(false);

    // Re-read once PostHog finishes loading remote flags (fires when flags are received)
    const client = getPostHogClient();
    if (!client) return;

    try {
      // posthog-js exposes `onFeatureFlags` to notify when remote flags arrive
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ph = client as any;
      if (typeof ph.onFeatureFlags === "function") {
        const unsubscribe = ph.onFeatureFlags(() => {
          setFlags({
            signupV2: readFlag("onboarding_v2_signup", DEFAULTS.signupV2),
            setupWizardV2: readFlag("onboarding_v2_setup_wizard", DEFAULTS.setupWizardV2),
            dashboardPreview: readFlag("onboarding_v2_dashboard_preview", DEFAULTS.dashboardPreview),
            parentOtpAuth: readFlag("parent_otp_auth", DEFAULTS.parentOtpAuth),
          });
        });
        // posthog-js returns a cleanup fn from onFeatureFlags in newer versions
        return () => {
          if (typeof unsubscribe === "function") unsubscribe();
        };
      }
    } catch {
      // silently fail — flags already defaulted above
    }
  }, []);

  return { ...flags, loading };
}
