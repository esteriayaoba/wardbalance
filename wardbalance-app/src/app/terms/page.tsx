import type { Metadata } from "next";
import MarketingHeader from "@/components/marketing/marketing-header";
import MarketingFooter from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  title: "Terms of Service — WardBalance",
  description: "WardBalance terms of service.",
};

export default function TermsPage() {
  return (
    <>
      <MarketingHeader />
      <main className="pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-headline-large mb-4" style={{ color: "var(--color-on-surface)" }}>
            Terms of Service
          </h1>
          <p className="text-body-large mb-8" style={{ color: "var(--color-on-surface-variant)" }}>
            Last updated: June 2026
          </p>

          <div className="space-y-6 text-body-large" style={{ color: "var(--color-on-surface-variant)" }}>
            <p>
              This is a placeholder terms of service page. WardBalance is currently in early access
              and this page will be updated with the full terms before public launch.
            </p>
            <h2 className="text-title-large" style={{ color: "var(--color-on-surface)" }}>
              Early Access
            </h2>
            <p>
              WardBalance is provided in early access form during the pilot phase. Features,
              pricing, and terms are subject to change. Pilot schools will receive advance
              notice of any material changes.
            </p>
            <h2 className="text-title-large" style={{ color: "var(--color-on-surface)" }}>
              Contact
            </h2>
            <p>
              For questions about these terms, contact{" "}
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
