"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function FAQTeaser() {
  return (
    <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 border-t border-neutral-200/60" style={{ background: "var(--color-surface-container-low)" }}>
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-label-large mb-3 font-bold" style={{ color: "var(--color-primary-500)" }}>
          FAQ
        </p>
        <h2 className="text-headline-small md:text-headline-large mb-4 font-bold" style={{ color: "var(--color-on-surface)" }}>
          Have questions before getting started?
        </h2>
        <p className="text-body-large mb-8" style={{ color: "var(--color-on-surface-variant)" }}>
          Find answers about school setup, parent access, payments, receipts, and multi-branch support.
        </p>
        <Link
          href="/faq"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-label-large font-bold transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-on-primary)",
          }}
        >
          Read FAQs
          <ArrowRight size={16} strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}
