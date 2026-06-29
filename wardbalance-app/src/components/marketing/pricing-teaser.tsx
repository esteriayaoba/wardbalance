"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function PricingTeaser() {
  return (
    <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-white border-t border-neutral-200/60">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-label-large mb-3 font-bold" style={{ color: "var(--color-primary-500)" }}>
          PRICING
        </p>
        <h2 className="text-headline-small md:text-headline-large mb-4 font-bold" style={{ color: "var(--color-on-surface)" }}>
          Simple pricing for growing schools
        </h2>
        <p className="text-body-large mb-8" style={{ color: "var(--color-on-surface-variant)" }}>
          Choose a plan that fits your school today and upgrade as your fee operations grow.
        </p>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-label-large font-bold transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-on-primary)",
          }}
        >
          View Pricing
          <ArrowRight size={16} strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}
