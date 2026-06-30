"use client";

import { Quote } from "lucide-react";

export default function TestimonialsSection() {
  return (
    <section 
      id="testimonials" 
      className="py-16 md:py-24 bg-neutral-50/50 border-t border-b border-neutral-200/60"
      aria-labelledby="testimonials-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-label-large mb-3 text-primary uppercase font-bold tracking-wider">
            TRUSTED BY BURSARS & DIRECTORS
          </p>
          <h2 id="testimonials-heading" className="text-headline-medium md:text-headline-large font-bold text-neutral-900 leading-tight">
            Loved by schools managing real fee operations.
          </h2>
          <p className="text-body-large text-neutral-600 mt-4 leading-relaxed">
            See how private school administrators are bringing clarity to billing, payment reconciliation, and parent balances.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* Testimonial 1 */}
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-primary-200/50 transition-all duration-300 relative overflow-hidden">
            <div className="absolute -top-3 -right-3 text-neutral-100 pointer-events-none select-none">
              <Quote size={120} className="opacity-40" />
            </div>
            <div className="relative z-10">
              <p className="text-body-large text-neutral-700 italic mb-8 leading-relaxed">
                &ldquo;We used to spend over two weeks at the start of every term reconciling bank transfers on WhatsApp. With WardBalance, our bursar tracks balances and records POS or transfer payments in real time. Every naira is mapped to the student invoice instantly.&rdquo;
              </p>
            </div>
            <div className="border-t border-neutral-100 pt-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary text-label-large">
                MA
              </div>
              <div>
                <p className="text-title-small text-neutral-900 font-bold">Mrs. Adebayo</p>
                <p className="text-body-small text-on-surface-variant">Director, Grace Heights Academy</p>
              </div>
            </div>
          </div>

          {/* Testimonial 2 */}
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-primary-200/50 transition-all duration-300 relative overflow-hidden">
            <div className="absolute -top-3 -right-3 text-neutral-100 pointer-events-none select-none">
              <Quote size={120} className="opacity-40" />
            </div>
            <div className="relative z-10">
              <p className="text-body-large text-neutral-700 italic mb-8 leading-relaxed">
                &ldquo;Managing fees across multiple classes was a nightmare of duplicate spreadsheets. Setting up templates once in WardBalance and bulk generating invoices saved us hours of data entry. The automatic audit trail gives me complete financial peace of mind.&rdquo;
              </p>
            </div>
            <div className="border-t border-neutral-100 pt-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center font-bold text-teal-700 text-label-large">
                MI
              </div>
              <div>
                <p className="text-title-small text-neutral-900 font-bold">Mr. Ibrahim</p>
                <p className="text-body-small text-on-surface-variant">Bursar, Standard Academy</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
