import {
  Sliders,
  FileText,
  Wallet,
  Coins,
  Receipt,
  BarChart3,
  Users,
  FileSearch,
} from "lucide-react";
import FeatureCard from "./feature-card";

const features = [
  {
    icon: Sliders,
    title: "Fee Setup",
    description: "Create tuition fees, PTA fees, transport fees, discounts, and class-based templates.",
  },
  {
    icon: FileText,
    title: "Invoice Management",
    description: "Generate clear student invoices with fee breakdowns, due dates, payment status, and balances.",
  },
  {
    icon: Wallet,
    title: "Parent Balance Tracking",
    description: "See what each parent owes, which child the balance belongs to, and what has already been paid.",
  },
  {
    icon: Coins,
    title: "Payment Recording",
    description: "Record offline payments such as cash, POS, cheque, and bank transfer without losing traceability.",
  },
  {
    icon: Receipt,
    title: "Receipts and Payment History",
    description: "Keep a clear record of confirmed payments and receipts for students, parents, and school teams.",
  },
  {
    icon: BarChart3,
    title: "Reports and Visibility",
    description: "View revenue summaries, outstanding balances, debtors, class collections, and payment activity.",
  },
  {
    icon: Users,
    title: "Parent Portal",
    description: "Give parents a simple way to view wards, invoices, payment status, and receipts.",
    comingSoon: true,
  },
  {
    icon: FileSearch,
    title: "Audit Trail",
    description: "Track important financial actions such as invoice generation, payment recording, fee changes, and receipt creation.",
    comingSoon: false,
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-24 md:py-32 lg:py-36 scroll-mt-[var(--marketing-header-offset)] bg-white border-t border-neutral-200/60"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <p className="text-label-large mb-3 text-primary uppercase font-bold tracking-wider">
            Features
          </p>
          <h2
            id="features-heading"
            className="text-headline-medium md:text-display-small lg:text-display-medium mb-4 font-bold text-neutral-900 leading-tight"
          >
            Everything your school needs to manage fees with confidence.
          </h2>
          <p className="text-body-large text-neutral-600 leading-relaxed">
            From fee setup to receipts and reports — every tool your bursar, owner, and administrator needs, in one connected workspace.
          </p>
        </div>

        {/* Feature Grid (4 columns at lg/xl to accommodate 8 items cleanly) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
          {features.map((feature) => (
            <div key={feature.title} className="relative">
              {feature.comingSoon && (
                <span className="absolute top-3 right-3 z-10 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                  Coming Soon
                </span>
              )}
              <FeatureCard
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
