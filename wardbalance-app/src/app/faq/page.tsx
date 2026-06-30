import type { Metadata } from "next";
import MarketingHeader from "@/components/marketing/marketing-header";
import FAQSection from "@/components/marketing/faq-section";
import HelpfulDemoPrompt from "@/components/marketing/helpful-demo-prompt";
import BookDemoSection from "@/components/marketing/book-demo-section";
import FinalCtaBanner from "@/components/marketing/final-cta-banner";
import MarketingFooter from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  title: "FAQ — WardBalance",
  description: "Find answers about setting up WardBalance, managing fees, recording payments, parent access, receipts, and multi-school support.",
  openGraph: {
    title: "FAQ — WardBalance",
    description: "Questions schools usually ask about school fee management, payments, and parent portals.",
  },
};

export default function FAQPage() {
  return (
    <>
      <MarketingHeader />
      <main id="main-content" className="focus:outline-none" tabIndex={-1}>
        {/* FAQ Hero */}
        <section className="pt-32 pb-12 md:pt-40 md:pb-16 px-4 sm:px-6 lg:px-8 text-center bg-white border-b border-neutral-200/60">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-headline-medium md:text-display-small font-bold mb-4" style={{ color: "var(--color-on-surface)" }}>
              Questions schools usually ask.
            </h1>
            <p className="text-body-large" style={{ color: "var(--color-on-surface-variant)" }}>
              Find answers about setting up WardBalance, managing fees, recording payments, parent access, receipts, and multi-school support.
            </p>
          </div>
        </section>

        {/* Full FAQ Section */}
        <FAQSection />

        {/* Helpful Demo Prompt */}
        <HelpfulDemoPrompt />

        {/* Book a Demo */}
        <BookDemoSection />

        {/* Final CTA */}
        <FinalCtaBanner />
      </main>
      <MarketingFooter />
    </>
  );
}
