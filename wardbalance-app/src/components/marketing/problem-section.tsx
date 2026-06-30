import { X, Check, ArrowRight } from "lucide-react";
import Link from "next/link";

const pains = [
  {
    title: "Scattered records",
    description: "Payment information sits in too many places, making reconciliation slow and stressful.",
  },
  {
    title: "Unclear balances",
    description: "Bursars and school owners struggle to see accurate balances per student, parent, class, or term.",
  },
  {
    title: "Manual follow-up",
    description: "Receipts, reminders, and payment confirmation often take too much administrative time.",
  },
  {
    title: "Limited visibility",
    description: "School leaders need a clearer view of expected revenue, collected revenue, and outstanding balances.",
  },
];

const solutions = [
  {
    title: "Class-Based Fee Templates",
    description: "Set up class-based fees and optional charges once per term.",
  },
  {
    title: "Automated Invoices",
    description: "Generate student invoices for each term or session in a single click.",
  },
  {
    title: "Manual & Online Payments",
    description: "Record cash, POS, cheque, and bank transfer payments dynamically.",
  },
  {
    title: "Real-Time Balance Tracking",
    description: "Track balances by student, parent, class, and school instantly.",
  },
  {
    title: "Instant Digital Receipts",
    description: "Create receipt records for confirmed payments automatically.",
  },
  {
    title: "Immutable Audit Trail",
    description: "Track every invoice change, discount application, and payment with an unalterable history log.",
  },
];

export default function ProblemSection() {
  return (
    <section
      id="problem"
      className="py-16 md:py-32 lg:py-36 scroll-mt-[var(--marketing-header-offset)] bg-white border-b border-neutral-200/60"
      aria-labelledby="comparison-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-24">
          <p className="text-label-large mb-3 text-primary uppercase font-bold tracking-wider">
            The Difference is Clear
          </p>
          <h2
            id="comparison-heading"
            className="text-headline-medium md:text-display-small lg:text-display-medium mb-6 font-bold text-neutral-900 leading-tight"
          >
            School fee tracking should not feel this scattered.
          </h2>
          <p className="text-body-large text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            Many schools still manage fee records across notebooks, Excel sheets, payment screenshots, bank alerts, and WhatsApp follow-ups. This makes it difficult to know who has paid, who still owes, and which child each payment belongs to.
          </p>
        </div>

        {/* Comparative Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 max-w-6xl mx-auto items-stretch">
          
          {/* Left Column — Without WardBalance */}
          <div className="border border-neutral-200/60 bg-neutral-50/40 rounded-3xl p-8 md:p-10 flex flex-col justify-between">
            <div>
              <h3 className="text-title-large text-neutral-800 font-bold mb-8 flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center border border-neutral-200">
                  <X size={13} className="text-neutral-500 stroke-[3]" />
                </div>
                Without WardBalance
              </h3>
              
              <ul className="space-y-8">
                {pains.map((pain, idx) => (
                  <li key={idx} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5 border border-red-100">
                      <X size={12} className="text-red-500 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-title-small text-neutral-800 font-bold mb-1">
                        {pain.title}
                      </h4>
                      <p className="text-body-medium text-neutral-600 leading-relaxed">
                        {pain.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <p className="text-body-small text-neutral-400 mt-12 font-medium">
              Result: Slow administrative processes, payment disputes, and manual reconciliation stress.
            </p>
          </div>

          {/* Right Column — With WardBalance */}
          <div className="border-2 border-[var(--color-primary-200)] bg-[var(--color-primary-container)]/30 rounded-3xl p-8 md:p-10 flex flex-col justify-between relative overflow-hidden shadow-sm">
            {/* Background decorative glow */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary-200/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
            
            <div>
              <h3 className="text-title-large text-primary font-bold mb-8 flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center border border-primary-200">
                  <Check size={13} className="text-primary stroke-[3]" />
                </div>
                With WardBalance
              </h3>

              <ul className="space-y-8">
                {solutions.map((sol, idx) => (
                  <li key={idx} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5 border border-primary-200">
                      <Check size={12} className="text-primary-600 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-title-small text-neutral-900 font-bold mb-1">
                        {sol.title}
                      </h4>
                      <p className="text-body-medium text-neutral-700 leading-relaxed font-medium">
                        {sol.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-body-small text-primary-700/80 mt-12 font-semibold">
              Result: Fully traceable school revenue, instant confirmations, and smooth financial management.
            </p>
          </div>
        </div>

        {/* Post-comparison CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/signup?plan=freemium&source=comparison"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-label-large font-bold transition-all duration-200 hover:shadow-xl hover:opacity-90 bg-primary text-on-primary"
          >
            Start with WardBalance
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
          <p className="text-body-small text-neutral-500 mt-3">Free to start. No credit card required.</p>
        </div>
      </div>
    </section>
  );
}
