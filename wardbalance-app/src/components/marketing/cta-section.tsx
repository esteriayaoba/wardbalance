"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics/posthog";
import { isCategoryAllowed } from "@/lib/cookies/consent";
import { scrollToSection } from "@/lib/utils";

export default function CTASection() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 bg-white border-t border-neutral-200/60"
    >
      <div className="mx-auto max-w-6xl">
        <div className="gradient-cta rounded-3xl p-8 md:p-16 text-center relative overflow-hidden shadow-2xl">
          {/* Decorative glows */}
          <div
            className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full opacity-25 blur-[120px] pointer-events-none select-none"
            style={{ background: "var(--color-primary-400)" }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full opacity-30 blur-[100px] pointer-events-none select-none"
            style={{ background: "var(--color-secondary-400)" }}
          />

          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
            {/* Spark badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-label-medium mb-6 backdrop-blur-md">
              <Sparkles size={14} className="text-amber-300 animate-pulse" />
              <span>Get started in under 10 minutes</span>
            </div>

            <h2 id="cta-heading" className="text-headline-medium md:text-display-small text-white font-bold mb-6 leading-tight">
              Ready to bring clarity to your school fee operations?
            </h2>

            <p className="text-body-large text-blue-100 mb-10 max-w-xl">
              Create your WardBalance workspace and start organizing school fees, payments, receipts, and balances from one place.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
              <Link
                href="/signup?plan=freemium&source=cta_final"
                onClick={() => {
                  if (isCategoryAllowed("analytics")) {
                    trackEvent({ event: "get_started_clicked", properties: { source: "cta_final" } });
                  }
                }}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-label-large font-bold bg-white text-primary-900 transition-all hover:bg-neutral-50 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
              <a
                href="#demo"
                onClick={(e) => {
                  e.preventDefault();
                  if (isCategoryAllowed("analytics")) {
                    trackEvent({ event: "book_demo_clicked", properties: { source: "book_demo_final_cta" } });
                  }
                  scrollToSection("demo");
                  window.dispatchEvent(
                    new CustomEvent("wb:prefill-demo", {
                      detail: {
                        message:
                          "Hi WardBalance team, I would like to book a demo to understand how WardBalance can help my school manage fees, invoices, payments, and parent balances.",
                      },
                    })
                  );
                }}
                className="inline-flex items-center justify-center px-8 py-4 rounded-full text-label-large font-bold text-white border-2 border-white/30 hover:border-white/60 hover:bg-white/5 transition-all cursor-pointer"
              >
                Book a Demo
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
