import MarketingHeader from "@/components/marketing/marketing-header";
import HeroSection from "@/components/marketing/hero-section";
import ProblemSection from "@/components/marketing/problem-section";
import SocialProofSection from "@/components/marketing/social-proof-section";
import FeaturesSection from "@/components/marketing/features-section";
import HowItWorksSection from "@/components/marketing/how-it-works-section";
import PricingSection from "@/components/marketing/pricing-section";
import CTASection from "@/components/marketing/cta-section";
import LeadCaptureForm from "@/components/marketing/lead-capture-form";
import FAQSection from "@/components/marketing/faq-section";
import MarketingFooter from "@/components/marketing/marketing-footer";

export default function Home() {
  return (
    <>
      <MarketingHeader />
      <main>
        {/* 1. Hero — value prop, primary CTA */}
        <HeroSection />
        {/* 2. Problem — establish the pain points */}
        <ProblemSection />
        {/* 3. Trust strip — credibility bridge after pain, before solution */}
        <SocialProofSection />
        {/* 4. Features — what WardBalance does (nav: Features) */}
        <FeaturesSection />
        {/* 5. How It Works — ease of setup (nav: How It Works) */}
        <HowItWorksSection />
        {/* 6. Pricing — plans and pricing (nav: Pricing) */}
        <PricingSection />
        {/* 7. CTA blue banner — conversion moment right after pricing decision */}
        <CTASection />
        {/* 8. Demo Form — for visitors who clicked "Book a Demo" in the CTA above */}
        <LeadCaptureForm />
        {/* 9. FAQ — resolve lingering doubts (nav: FAQ) */}
        <FAQSection />
      </main>
      <MarketingFooter />
    </>
  );
}
