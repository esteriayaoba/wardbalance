"use client";

import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics/posthog";
import { isCategoryAllowed } from "@/lib/cookies/consent";

const formSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(120, "Full name is too long"),
  schoolName: z
    .string()
    .min(1, "School name is required")
    .max(160, "School name is too long"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  consentToContact: z.boolean().refine((v) => v === true, {
    message: "You must agree to be contacted",
  }),
  message: z.string().max(1000, "Message is too long").optional(),
  website: z.string().optional(),
});

export default function LeadCaptureForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [apiError, setApiError] = useState("");
  const [source, setSource] = useState("demo_request");
  const formRef = useRef<HTMLFormElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const isLoading = status === "loading";

  // Parse UTM params and source on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const utmSource = params.get("utm_source");
      const utmMedium = params.get("utm_medium");
      const utmCampaign = params.get("utm_campaign");
      const utmTerm = params.get("utm_term");
      const utmContent = params.get("utm_content");
      
      const sourceParam = params.get("source");
      if (sourceParam === "multi_school_demo" || params.get("plan") === "multi_school") {
        setTimeout(() => setSource("multi_school_demo"), 0);
      } else {
        setTimeout(() => setSource("demo_request"), 0);
      }

      const prefill = params.get("prefill");
      if (prefill && messageRef.current && messageRef.current.value.trim() === "") {
        messageRef.current.value = prefill;
      }

      if (utmSource || utmMedium || utmCampaign) {
        sessionStorage.setItem("wb_utm_source", utmSource ?? "");
        sessionStorage.setItem("wb_utm_medium", utmMedium ?? "");
        sessionStorage.setItem("wb_utm_campaign", utmCampaign ?? "");
        sessionStorage.setItem("wb_utm_term", utmTerm ?? "");
        sessionStorage.setItem("wb_utm_content", utmContent ?? "");
      }

      if (!sessionStorage.getItem("wb_referrer")) {
        sessionStorage.setItem("wb_referrer", document.referrer ?? "");
      }

      if (!sessionStorage.getItem("wb_landing_page")) {
        sessionStorage.setItem("wb_landing_page", window.location.href);
      }
    } catch {
      // silently fail
    }
  }, []);

  // Listen for Book a Demo CTA prefill events dispatched by other components
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      if (messageRef.current && detail?.message && messageRef.current.value.trim() === "") {
        messageRef.current.value = detail.message;
      }
    };
    window.addEventListener("wb:prefill-demo", handler);
    return () => window.removeEventListener("wb:prefill-demo", handler);
  }, []);

  const buildAttributionPayload = () => {
    try {
      return {
        utmSource: sessionStorage.getItem("wb_utm_source") || undefined,
        utmMedium: sessionStorage.getItem("wb_utm_medium") || undefined,
        utmCampaign: sessionStorage.getItem("wb_utm_campaign") || undefined,
        utmTerm: sessionStorage.getItem("wb_utm_term") || undefined,
        utmContent: sessionStorage.getItem("wb_utm_content") || undefined,
        referrer: sessionStorage.getItem("wb_referrer") || undefined,
        landingPage: sessionStorage.getItem("wb_landing_page") || undefined,
      };
    } catch {
      return {};
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setApiError("");

    const formData = new FormData(e.currentTarget);
    const raw = Object.fromEntries(formData.entries()) as Record<string, string>;

    // Parse known fields from the form
    const payload = {
      fullName: raw.fullName ?? "",
      schoolName: raw.schoolName ?? "",
      email: raw.email ?? "",
      consentToContact: raw.consentToContact === "on",
      message: raw.message ?? "",
      website: raw.website ?? "",
    };

    // Validate
    const parsed = formSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0]) {
          fieldErrors[String(issue.path[0])] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setStatus("loading");

    if (isCategoryAllowed("analytics")) {
      try {
        trackEvent({ event: "demo_request_started", properties: { source } });
      } catch {
        // silently fail
      }
    }

    try {
      const attribution = buildAttributionPayload();
      const consentTimestamp = new Date().toISOString();
      const values = parsed.data;

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName,
          schoolName: values.schoolName,
          role: "other",
          email: values.email,
          consentToContact: values.consentToContact,
          message: values.message || undefined,
          source,
          consentTimestamp,
          consentVersion: "lead-contact-consent-v1",
          ...attribution,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setApiError(body.error ?? "Something went wrong. Please try again.");
        setStatus("error");

        if (isCategoryAllowed("analytics")) {
          trackEvent({ event: "demo_request_failed", properties: { source } });
        }
        return;
      }

      setStatus("success");
      e.currentTarget.reset();

      if (isCategoryAllowed("analytics")) {
        trackEvent({ event: "demo_request_submitted", properties: { source } });
      }
    } catch {
      setApiError("Something went wrong. Please try again.");
      setStatus("error");

      if (isCategoryAllowed("analytics")) {
        trackEvent({ event: "demo_request_failed", properties: { source } });
      }
    }
  };

  if (status === "success") {
    return (
      <section id="demo" className="py-16 md:py-24 scroll-mt-24 gradient-grid-mesh border-t border-neutral-200/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="card-elevated p-10 md:p-16 flex flex-col items-center">
            <CheckCircle2 size={64} className="mb-6" style={{ color: "var(--color-tertiary)" }} />
            <h2 className="text-headline-medium mb-4" style={{ color: "var(--color-on-surface)" }}>
              Thank you!
            </h2>
            <p className="text-body-large max-w-md mx-auto" style={{ color: "var(--color-on-surface-variant)" }}>
              Your demo request has been received. We&rsquo;ll reach out within 48 hours to schedule a guided walkthrough of WardBalance for your school.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-8 text-label-medium hover:underline"
              style={{ color: "var(--color-primary-600)" }}
            >
              Submit another request
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="demo" className="py-16 md:py-24 scroll-mt-24 gradient-grid-mesh border-t border-neutral-200/60">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-label-large mb-3 font-bold" style={{ color: "var(--color-primary-500)" }}>
            BOOK A DEMO
          </p>
          <h2 className="text-headline-small md:text-headline-large mb-4 font-bold" style={{ color: "var(--color-on-surface)" }}>
            Want to see WardBalance in action?
          </h2>
          <p className="text-body-large" style={{ color: "var(--color-on-surface-variant)" }}>
            Fill in your details and we&rsquo;ll schedule a personalised walkthrough of WardBalance for your school — at a time that works for you.
          </p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="card-elevated p-6 md:p-8 space-y-6 bg-[var(--color-surface-container-lowest)]">
          {status === "error" && apiError && (
            <div className="p-4 rounded-lg flex items-start gap-3" style={{ background: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-body-medium">{apiError}</p>
            </div>
          )}

          {/* Honeypot — hidden from real users */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-label-medium block" style={{ color: "var(--color-on-surface)" }}>
                Full Name <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 transition-colors focus:outline-2 focus:outline-primary/50 focus:outline-offset-1"
                style={{
                  background: "var(--color-surface-container-lowest)",
                  borderColor: errors.fullName ? "var(--color-error)" : "var(--color-outline-variant)",
                  color: "var(--color-on-surface)",
                }}
              />
              {errors.fullName && <p className="text-label-small" style={{ color: "var(--color-error)" }}>{errors.fullName}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="schoolName" className="text-label-medium block" style={{ color: "var(--color-on-surface)" }}>
                School Name <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <input
                id="schoolName"
                name="schoolName"
                type="text"
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 transition-colors focus:outline-2 focus:outline-primary/50 focus:outline-offset-1"
                style={{
                  background: "var(--color-surface-container-lowest)",
                  borderColor: errors.schoolName ? "var(--color-error)" : "var(--color-outline-variant)",
                  color: "var(--color-on-surface)",
                }}
              />
              {errors.schoolName && <p className="text-label-small" style={{ color: "var(--color-error)" }}>{errors.schoolName}</p>}
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="email" className="text-label-medium block" style={{ color: "var(--color-on-surface)" }}>
                Email Address <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 transition-colors focus:outline-2 focus:outline-primary/50 focus:outline-offset-1 font-sans"
                style={{
                  background: "var(--color-surface-container-lowest)",
                  borderColor: errors.email ? "var(--color-error)" : "var(--color-outline-variant)",
                  color: "var(--color-on-surface)",
                }}
              />
              {errors.email && <p className="text-label-small" style={{ color: "var(--color-error)" }}>{errors.email}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="message" className="text-label-medium block" style={{ color: "var(--color-on-surface)" }}>
              Message / Special Requirements (optional)
            </label>
            <textarea
              id="message"
              name="message"
              ref={messageRef}
              rows={3}
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 transition-colors focus:outline-2 focus:outline-primary/50 focus:outline-offset-1 resize-y"
              style={{
                background: "var(--color-surface-container-lowest)",
                borderColor: errors.message ? "var(--color-error)" : "var(--color-outline-variant)",
                color: "var(--color-on-surface)",
              }}
            />
            {errors.message && <p className="text-label-small" style={{ color: "var(--color-error)" }}>{errors.message}</p>}
          </div>

          {/* Consent checkbox */}
          <div className="space-y-1.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="consentToContact"
                disabled={isLoading}
                className="mt-1 accent-primary-500 shrink-0"
              />
              <span className="text-body-medium" style={{ color: "var(--color-on-surface-variant)" }}>
                I agree to be contacted about WardBalance. <span style={{ color: "var(--color-error)" }}>*</span>
              </span>
            </label>
            {errors.consentToContact && <p className="text-label-small" style={{ color: "var(--color-error)" }}>{errors.consentToContact}</p>}
          </div>

          {/* Privacy notice */}
          <p className="text-body-small" style={{ color: "var(--color-on-surface-variant)" }}>
            By submitting this form, you agree that WardBalance may contact you about early access,
            demos, and product updates. We will not sell your information. See our{" "}
            <a href="/privacy" className="underline" style={{ color: "var(--color-primary-600)" }}>Privacy Policy</a>.
          </p>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white rounded-lg text-label-large transition-all hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-2 focus:outline-primary focus:outline-offset-2 cursor-pointer font-bold"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                "Book a Demo"
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
