/**
 * Funnel analytics for auth & onboarding flows.
 *
 * Rules:
 *  1. Every call is guarded by isCategoryAllowed("analytics") — never fire without consent.
 *  2. Never include PII: no name, email, phone, school name.
 *  3. schoolId is acceptable as a pseudonymous tenant identifier.
 *  4. All helpers silently no-op when PostHog is unavailable.
 */

import { trackEvent } from "./posthog";
import { isCategoryAllowed } from "@/lib/cookies/consent";

function fire(event: string, properties?: Record<string, string | number | boolean | undefined>) {
  if (!isCategoryAllowed("analytics")) return;
  trackEvent({ event, properties });
}

/** Read signup timestamp from localStorage for elapsed-time calculations */
function getSignupTimestamp(): number | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = localStorage.getItem("wb_signup_timestamp");
  return raw ? Number(raw) : undefined;
}

function elapsedMinutes(): number | undefined {
  const ts = getSignupTimestamp();
  if (!ts) return undefined;
  return Math.round((Date.now() - ts) / 60000);
}

// ─────────────────────────────────────────────
// Parent Login Funnel
// ─────────────────────────────────────────────

/** Parent opened the login page */
export function trackParentLoginPageView() {
  fire("parent_login_page_view");
}

/**
 * Parent submitted their phone/email to receive an OTP.
 * @param method "phone" | "email" — which identifier type was used
 */
export function trackOtpRequested(method: "phone" | "email") {
  fire("parent_otp_requested", { identifier_type: method });
}

/** OTP was sent successfully by the server */
export function trackOtpSent(method: "phone" | "email") {
  fire("parent_otp_sent", { identifier_type: method });
}

/** Parent failed to receive or request an OTP */
export function trackOtpSendFailed(reason: string) {
  fire("parent_otp_send_failed", { reason });
}

/**
 * Parent submitted an OTP code for verification.
 * Fired on each attempt — not just successful ones.
 */
export function trackOtpSubmitted() {
  fire("parent_otp_submitted");
}

/** Parent successfully authenticated */
export function trackParentLoginSuccess() {
  fire("parent_login_success");
}

/** Parent failed to authenticate (wrong code, expired, etc.) */
export function trackParentLoginFailed(reason: string) {
  fire("parent_login_failed", { reason });
}

/** Parent hit the lockout threshold */
export function trackOtpLockout() {
  fire("parent_otp_locked_out");
}

/** Parent clicked "Resend Code" */
export function trackOtpResendRequested() {
  fire("parent_otp_resend_requested");
}

/** Resend succeeded */
export function trackOtpResendSuccess() {
  fire("parent_otp_resend_success");
}

// ─────────────────────────────────────────────
// Admin Signup Funnel
// ─────────────────────────────────────────────

/** Signup page loaded. Call on mount with the acquisition source. */
export function trackSignupStarted(source?: string) {
  // Record timestamp at the true start of the funnel — all elapsed_min
  // measurements downstream are relative to this moment.
  if (typeof window !== "undefined") {
    localStorage.setItem("wb_signup_timestamp", String(Date.now()));
  }
  fire("signup_started", { source: source || "direct" });
}

/** Signup completed — school + user created. */
export function trackSignupCompleted(schoolId: string, schoolType?: string, plan?: string) {
  const elapsed = elapsedMinutes();
  fire("signup_completed", {
    school_id: schoolId,
    school_type: schoolType || "unknown",
    plan: plan || "freemium",
    elapsed_min: elapsed ?? -1,
  });
}

/** Admin signed up successfully and is viewing the dashboard preview (signup step 4). */
export function trackPreviewDashboardViewed() {
  fire("preview_dashboard_viewed");
}

/** Admin clicked "Explore Demo" on the signup confirmation page. */
export function trackDemoModeEntered() {
  fire("demo_mode_entered");
}

// ─────────────────────────────────────────────
// Email Verification Funnel
// ─────────────────────────────────────────────

/** Admin successfully verified their email address. */
export function trackEmailVerified() {
  const elapsed = elapsedMinutes();
  fire("email_verified", { time_since_signup_min: elapsed ?? -1 });
}

// ─────────────────────────────────────────────
// Admin Onboarding / Setup Funnel
// ─────────────────────────────────────────────

/** Admin viewed the setup wizard page for the first time (session-scoped). */
export function trackSetupStarted() {
  const elapsed = elapsedMinutes();
  fire("setup_started", { elapsed_min: elapsed ?? -1 });
}

/** Admin navigated to a specific phase in the setup wizard. */
export function trackPhaseStarted(phase: number, phaseTitle: string) {
  fire("phase_started", { phase, phase_title: phaseTitle });
}

/**
 * An entire phase's steps are now complete.
 * @param phase  Phase number (1, 2, or 3)
 * @param phaseTitle  Human-readable phase title
 * @param completionPercentage  Overall progress at the time of completion
 */
export function trackSetupPhaseCompleted(phase: number, phaseTitle: string, completionPercentage: number) {
  const elapsed = elapsedMinutes();
  fire("setup_phase_completed", {
    phase,
    phase_title: phaseTitle,
    completion_percentage: completionPercentage,
    elapsed_min: elapsed ?? -1,
  });
}

/** Invoices were generated for a class group. Fired client-side after API success. */
export function trackInvoiceGenerated(count: number) {
  const elapsed = elapsedMinutes();
  fire("invoice_generated", { count, elapsed_min: elapsed ?? -1 });
}

/** Admin completed all 12 steps — school moved to active. */
export function trackSetupCompleted() {
  const elapsed = elapsedMinutes();
  fire("setup_completed", { elapsed_min: elapsed ?? -1 });
}

/**
 * Admin clicked a step CTA button.
 * @param stepId  Numeric step ID (1–12)
 * @param stepTitle  Short label for the step (e.g. "School Profile")
 */
export function trackSetupStepClicked(stepId: number, stepTitle: string) {
  fire("setup_step_clicked", { step_id: stepId, step_title: stepTitle });
}

/**
 * A setup step transitioned to "completed" or "needs_attention".
 * Fired by the phase detection effect, not by the click handler.
 */
export function trackSetupStepCompleted(stepId: number, stepTitle: string) {
  fire("setup_step_completed", { step_id: stepId, step_title: stepTitle });
}
