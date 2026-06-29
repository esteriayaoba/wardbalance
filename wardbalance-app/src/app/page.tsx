import MarketingHeader from "@/components/marketing/marketing-header";
import HeroSection from "@/components/marketing/hero-section";
import HowItWorksSection from "@/components/marketing/how-it-works-section";
import FeaturesSection from "@/components/marketing/features-section";
import SampleFeesCarousel from "@/components/marketing/sample-fees-carousel";
import WhoItIsForSection from "@/components/marketing/who-it-is-for-section";
import ProblemSection from "@/components/marketing/problem-section";
import PricingSection from "@/components/marketing/pricing-section";
import TrustSection from "@/components/marketing/trust-section";
import FAQSection from "@/components/marketing/faq-section";
import LeadCaptureForm from "@/components/marketing/lead-capture-form";
import CTASection from "@/components/marketing/cta-section";
import MarketingFooter from "@/components/marketing/marketing-footer";

export default function Home() {
  return (
    <>
      <MarketingHeader />
      <main id="main-content" className="focus:outline-none" tabIndex={-1}>
        {/* 1. Hero Section */}
        <HeroSection />

        {/* 2. Steps Section (How It Works) */}
        <HowItWorksSection />

        {/* 3. Features Grid */}
        <FeaturesSection />

        {/* 4. Sample Fees Slider (Carousel) */}
        <SampleFeesCarousel />

        {/* 5. Audience Section (Who It Is For) */}
        <WhoItIsForSection />

        {/* 6. Comparison Section (With vs Without WardBalance) */}
        <ProblemSection />

        {/* 7. Pricing Plans */}
        <PricingSection />

        {/* 8. Trust & Clarity Highlights */}
        <TrustSection />

        {/* 9. Frequently Asked Questions */}
        <FAQSection />

        {/* 10. Book a Demo Form */}
        <LeadCaptureForm />

        {/* 11. Final Conversion CTA */}
        <CTASection />
      </main>
      <MarketingFooter />
    </>
  );
}
