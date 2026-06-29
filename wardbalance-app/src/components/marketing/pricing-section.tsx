"use client";

import { Check, Info, Sparkles, Layers, Globe } from "lucide-react";
import Link from "next/link";
import { PRICING_PLANS } from "@/constants/pricing";
import { trackEvent } from "@/lib/analytics/posthog";
import { isCategoryAllowed } from "@/lib/cookies/consent";

export default function PricingSection() {
  return (
    <section
      id="pricing"
      className="py-24 md:py-32 lg:py-36 scroll-mt-[var(--marketing-header-offset)] border-t border-b border-neutral-200/60"
      style={{ background: "var(--color-surface-container-low)" }}
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <p
            className="text-label-large mb-3 font-bold"
            style={{ color: "var(--color-primary-500)" }}
          >
            PRICING
          </p>
          <h2
            id="pricing-heading"
            className="text-headline-small md:text-headline-large mb-4 font-bold"
            style={{ color: "var(--color-on-surface)" }}
          >
            Simple, predictable plans for every school
          </h2>
          <p
            className="text-body-large"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Start for free and scale as your school grows. No credit card required.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {PRICING_PLANS.map((plan) => {
            const isCustom = plan.priceDisplay === "Custom";
            const isFree = plan.priceDisplay === "₦0";
            const isPopular = plan.isPopular;

            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-2xl p-6 md:p-8 relative overflow-hidden transition-all duration-300 border ${
                  isPopular
                    ? "bg-white border-2 border-[var(--color-primary-200)] shadow-xl scale-105"
                    : "bg-neutral-50/70 border-neutral-200/80 shadow-sm hover:shadow-md hover:border-neutral-300"
                }`}
              >
                {/* Top Row: Icon & Badge */}
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    plan.id === "freemium"
                      ? "bg-amber-50 border border-amber-200/50"
                      : plan.id === "business"
                      ? "bg-primary-50 border border-primary-200/50"
                      : "bg-teal-50 border border-teal-200/50"
                  }`}>
                    {plan.id === "freemium" && <Sparkles className="w-5 h-5 text-amber-500" />}
                    {plan.id === "business" && <Layers className="w-5 h-5 text-primary-600" />}
                    {plan.id === "multi_school" && <Globe className="w-5 h-5 text-teal-600" />}
                  </div>

                  {isPopular && (
                    <span
                      className="text-[11px] font-bold uppercase tracking-wider"
                      style={{
                        color: "var(--color-primary-500)",
                      }}
                    >
                      Recommended
                    </span>
                  )}
                </div>

                {/* Plan Name & Target User */}
                <div className="mb-4">
                  <h3 className="text-title-large text-neutral-900 font-bold mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-body-small text-neutral-600 min-h-[36px]">
                    {plan.targetUser}
                  </p>
                </div>

                {/* Price Display */}
                <div className="mb-6 flex items-baseline">
                  <span className="text-headline-large text-neutral-900 font-bold tracking-tight font-sans tabular-nums">
                    {plan.priceDisplay}
                  </span>
                  <span className="text-body-medium font-normal text-neutral-600 ml-1">
                    {plan.billingLabel}
                  </span>
                </div>

                {/* CTA Button (above features, consistent height/radius across all cards) */}
                <div className="mb-6">
                  {plan.id === "multi_school" ? (
                    <a
                      href="#demo"
                      onClick={(e) => {
                        e.preventDefault();
                        if (isCategoryAllowed("analytics")) {
                          trackEvent({
                            event: "book_demo_clicked",
                            properties: { source: "book_demo_pricing_multi_school" },
                          });
                        }
                        const el = document.getElementById("demo");
                        if (el) {
                          const offsetStr = getComputedStyle(document.documentElement).getPropertyValue("--marketing-header-offset").trim();
                          const offset = offsetStr ? parseFloat(offsetStr) : 96;
                          const top = el.getBoundingClientRect().top + window.scrollY - offset;
                          window.scrollTo({ top, behavior: "smooth" });
                        }
                        window.dispatchEvent(
                          new CustomEvent("wb:prefill-demo", {
                            detail: {
                              message:
                                "Hi WardBalance team, I would like to book a demo for a multi-school or multi-branch setup.",
                            },
                          })
                        );
                      }}
                      className="w-full flex items-center justify-center px-5 py-2.5 rounded-full text-label-large font-bold border-2 transition-all cursor-pointer hover:bg-neutral-50/50 hover:border-neutral-300"
                      style={{
                        borderColor: "var(--color-neutral-200)",
                        color: "var(--color-neutral-700)",
                        background: "transparent",
                      }}
                    >
                      Book a Demo
                    </a>
                  ) : (
                    <Link
                      href={`/signup?plan=${plan.id}&source=pricing`}
                      onClick={() => {
                        if (isCategoryAllowed("analytics")) {
                          trackEvent({
                            event: `${plan.id}_plan_clicked`,
                            properties: { source: "pricing" },
                          });
                        }
                      }}
                      className={`w-full flex items-center justify-center px-5 py-2.5 rounded-full text-label-large font-bold transition-all cursor-pointer text-center ${
                        isPopular ? "hover:opacity-90" : "hover:bg-neutral-50/50 hover:border-neutral-300"
                      }`}
                      style={{
                        background: isPopular ? "var(--color-primary)" : "transparent",
                        color: isPopular ? "var(--color-on-primary)" : "var(--color-neutral-700)",
                        border: isPopular ? "2px solid transparent" : "2px solid var(--color-neutral-200)",
                      }}
                    >
                      {plan.id === "freemium" ? "Start Free" : "Get Started"}
                    </Link>
                  )}
                </div>

                {/* Section Divider */}
                <div className="border-t border-neutral-100 my-2" />

                {/* Features Heading */}
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 mt-4 mb-3">
                  Key Features
                </div>

                {/* Features List */}
                <ul className="space-y-3.5 mb-4 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-body-medium">
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" 
                        style={{ 
                          background: isPopular ? "var(--color-primary-100)" : "var(--color-neutral-100)" 
                        }}
                      >
                        <Check 
                          size={11} 
                          className="stroke-[3]" 
                          style={{ 
                            color: isPopular ? "var(--color-primary-600)" : "var(--color-neutral-600)" 
                          }} 
                        />
                      </div>
                      <span className="text-neutral-700 font-medium">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Limit Notification Footer */}
        <div className="mt-12 text-center max-w-xl mx-auto flex items-start gap-2 p-4 rounded-xl bg-white/40 border border-neutral-200">
          <Info size={18} className="text-primary-500 shrink-0 mt-0.5" />
          <p className="text-body-small text-left text-neutral-600">
            <strong>Note on plan limits:</strong> Freemium supports up to 50 students, and Business supports up to 500 students. Paid plans are currently waived during our launch phase — pricing will be activated as we grow.
          </p>
        </div>
        <p className="text-center mt-6 text-body-small text-neutral-500">
          Have questions about pricing?{" "}
          <a
            href="#faq"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById("faq");
              if (el) {
                const offsetStr = getComputedStyle(document.documentElement).getPropertyValue("--marketing-header-offset").trim();
                const offset = offsetStr ? parseFloat(offsetStr) : 96;
                window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
              }
            }}
            className="text-primary font-semibold hover:underline"
          >
            See our FAQ
          </a>
        </p>
      </div>
    </section>
  );
}
