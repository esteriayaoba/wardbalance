import type { Metadata } from "next";
import MarketingHeader from "@/components/marketing/marketing-header";
import HeroSection from "@/components/marketing/hero-section";
import HowItWorksSection from "@/components/marketing/how-it-works-section";
import FeaturesSection from "@/components/marketing/features-section";
import SampleFeesCarousel from "@/components/marketing/sample-fees-carousel";
import WhoItIsForSection from "@/components/marketing/who-it-is-for-section";
import ProblemSection from "@/components/marketing/problem-section";
import TrustSection from "@/components/marketing/trust-section";
import PricingTeaser from "@/components/marketing/pricing-teaser";
import FAQTeaser from "@/components/marketing/faq-teaser";
import BookDemoSection from "@/components/marketing/book-demo-section";
import FinalCtaBanner from "@/components/marketing/final-cta-banner";
import MarketingFooter from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  title: "WardBalance — School Fee Management Made Clearer",
  description: "WardBalance helps private schools organize billing, parent balances, payments, receipts, and reports from one workspace.",
  openGraph: {
    title: "WardBalance — School Fee Management Made Clearer",
    description: "Track who has paid, how much, and what is still owed — at WhatsApp-level simplicity.",
  },
};

export default function Home() {
  return (
    <>
      <MarketingHeader />
      <main id="main-content" className="focus:outline-none" tabIndex={-1}>
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <SampleFeesCarousel />
        <HowItWorksSection />
        <TrustSection />
        <WhoItIsForSection />
        <PricingTeaser />
        <FAQTeaser />
        <BookDemoSection />
        <FinalCtaBanner />
      </main>
      <MarketingFooter />
    </>
  );
}
