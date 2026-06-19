import {
  FileText,
  KeyRound,
  HandCoins,
  Wallet,
  Users,
  FileSearch,
} from "lucide-react";
import FeatureCard from "./feature-card";

const features = [
  {
    icon: FileText,
    title: "Invoice Generation",
    description:
      "Generate clear, line-item invoices for entire classes in bulk. Parents know exactly what they are paying for.",
  },
  {
    icon: KeyRound,
    title: "Role-Based Staff Access",
    description:
      "Invite your bursar, accountant, and administrator. Each role sees only what they need — owners get full financial oversight.",
  },
  {
    icon: HandCoins,
    title: "Manual Payment Fallback",
    description:
      "Easily record manual bank transfers, POS payments, cheques, and cash. Never lose track of offline payments.",
  },
  {
    icon: Wallet,
    title: "Parent Balance Tracking",
    description:
      "Real-time tracking of outstanding balances per student, including carryovers from previous terms.",
  },
  {
    icon: Users,
    title: "Multi-Ward Parent Portal",
    description:
      "A mobile-friendly portal where parents can view invoices, upload proofs, and download receipts for all their children in one place.",
  },
  {
    icon: FileSearch,
    title: "Audit Logs",
    description:
      "Immutable, read-only audit logs track every financial mutation. Know exactly who recorded or approved a payment and when.",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-16 md:py-24 scroll-mt-24 bg-background"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <p className="text-label-large mb-3 text-primary">
            FEATURES
          </p>
          <h2
            id="features-heading"
            className="text-headline-small md:text-headline-large mb-4 text-on-surface"
          >
            Everything you need to manage school fees
          </h2>
          <p className="text-body-large animate-fade-in-up text-on-surface-variant">
            WardBalance brings invoices, parent balances, payment records, receipts, and reports into one school finance workspace.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
