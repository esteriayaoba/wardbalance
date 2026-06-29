import { ShieldAlert, Receipt, KeyRound, Clock, HeartHandshake, CreditCard } from "lucide-react";

const trustPoints = [
  {
    icon: KeyRound,
    title: "Role-aware access for school teams",
    description: "Grant specific permissions to owners, bursars, accountants, and administrators safely.",
  },
  {
    icon: Receipt,
    title: "Invoice-specific payment tracking",
    description: "Every payment is mapped directly to a line-item invoice, preventing calculation disputes.",
  },
  {
    icon: HeartHandshake,
    title: "Parent-to-ward balance visibility",
    description: "Keep parents informed of outstanding totals across all of their children in one dashboard.",
  },
  {
    icon: Clock,
    title: "Payment and receipt history",
    description: "View full chronological payment records and print or share digital receipts instantly on confirmation.",
  },
  {
    icon: ShieldAlert,
    title: "Audit trail for sensitive actions",
    description: "An immutable ledger tracks every edit, payment recorded, invoice generated, or discount applied.",
  },
  {
    icon: CreditCard,
    title: "Flutterwave payment readiness",
    description: "Enforces signature webhook hashes and verified statuses for automatic, secure settlement.",
  },
];

export default function TrustSection() {
  return (
    <section
      id="trust"
      className="py-24 md:py-32 lg:py-36 scroll-mt-[var(--marketing-header-offset)] border-b border-neutral-200/60"
      style={{ background: "var(--color-primary-container)" }}
      aria-labelledby="trust-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <p className="text-label-large mb-3 text-primary uppercase font-bold tracking-wider">
            Trust and clarity
          </p>
          <h2
            id="trust-heading"
            className="text-headline-medium md:text-display-small lg:text-display-medium mb-6 font-bold text-neutral-900 leading-tight"
          >
            Every naira is traceable. Every action is logged.
          </h2>
          <p className="text-body-large text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            WardBalance is designed around clear records, role-aware access, parent-to-ward visibility, invoice-specific payments, and financial activity history.
          </p>
        </div>

        {/* Trust Points Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {trustPoints.map((point, idx) => {
            const Icon = point.icon;
            return (
              <div
                key={idx}
                className="flex items-start gap-4 p-4 rounded-2xl transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-primary-200/50 flex items-center justify-center shrink-0 mt-0.5 shadow-sm text-primary">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="text-title-small text-neutral-950 font-extrabold mb-1">
                    {point.title}
                  </h3>
                  <p className="text-body-medium text-neutral-600 leading-relaxed">
                    {point.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
