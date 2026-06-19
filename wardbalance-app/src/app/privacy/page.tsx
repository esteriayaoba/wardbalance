import type { Metadata } from "next";
import MarketingHeader from "@/components/marketing/marketing-header";
import MarketingFooter from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  title: "Privacy Policy — WardBalance",
  description: "WardBalance privacy policy.",
};

export default function PrivacyPage() {
  return (
    <>
      <MarketingHeader />
      <main className="pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-headline-large mb-4" style={{ color: "var(--color-on-surface)" }}>
            Privacy Policy
          </h1>
          <p className="text-body-large mb-8" style={{ color: "var(--color-on-surface-variant)" }}>
            Last updated: June 2026
          </p>

          <div className="space-y-6 text-body-large" style={{ color: "var(--color-on-surface-variant)" }}>
            <p>
              This is a placeholder privacy policy. WardBalance is currently in early access
              and this page will be updated with the full privacy policy before public launch.
            </p>
            <h2 className="text-title-large" style={{ color: "var(--color-on-surface)" }}>
              Information We Collect
            </h2>
            <p>
              When you submit the early access form, we collect your name, school name, role,
              email address, phone number, and details about your school. We use this
              information to contact you about WardBalance early access, demos, and product updates.
            </p>
            <h2 className="text-title-large" style={{ color: "var(--color-on-surface)" }}>
              Contact
            </h2>
            <p>
              If you have questions about this policy, contact us at{" "}
              <a href="mailto:hello@wardbalance.com.ng" className="underline" style={{ color: "var(--color-primary-600)" }}>
                hello@wardbalance.com.ng
              </a>.
            </p>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
