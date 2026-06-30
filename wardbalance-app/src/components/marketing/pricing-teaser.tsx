import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function PricingTeaser() {
  return (
    <section className="py-14 md:py-28 px-4 sm:px-6 lg:px-8 bg-white border-t border-neutral-200/60">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-label-large mb-3 text-primary uppercase font-bold tracking-wider">
          PRICING
        </p>
        <h2 className="text-headline-small md:text-headline-large mb-4 font-bold text-neutral-900">
          Simple pricing for growing schools
        </h2>
        <p className="text-body-large text-neutral-600 mb-8 max-w-2xl mx-auto">
          Start free and upgrade as your school grows. No credit card required.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10">
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6 w-full sm:w-56">
            <p className="text-label-medium text-neutral-500 uppercase tracking-wider font-bold mb-1">Starter</p>
            <p className="text-display-small font-black text-neutral-900 font-sans tabular-nums">₦0</p>
            <p className="text-body-small text-neutral-500">Free forever</p>
          </div>
          <div className="bg-primary-50 border border-primary-200 rounded-2xl p-6 w-full sm:w-56 relative">
            <span className="absolute -top-2.5 right-4 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-white">Popular</span>
            <p className="text-label-medium text-primary-700 uppercase tracking-wider font-bold mb-1">Pro</p>
            <p className="text-display-small font-black text-primary-900 font-sans tabular-nums">₦50K</p>
            <p className="text-body-small text-primary-700">per term</p>
          </div>
        </div>

        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-label-large font-bold transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-primary text-on-primary"
        >
          See full plans
          <ArrowRight size={16} strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}
