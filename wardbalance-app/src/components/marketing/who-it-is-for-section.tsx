import { ShieldCheck, Receipt, Landmark, Users } from "lucide-react";

const audiences: { icon: typeof ShieldCheck; role: string; description: string; comingSoon?: boolean }[] = [
  {
    icon: ShieldCheck,
    role: "School Owners",
    description: "Get a clear, real-time view of expected revenue, collected payments, and outstanding balances across the entire school.",
  },
  {
    icon: Landmark,
    role: "Bursars",
    description: "Record payments, confirm balances, manage receipts, and eliminate manual Excel reconciliation headaches.",
  },
  {
    icon: Users,
    role: "Administrators",
    description: "Manage student enrolment records, parent accounts, classes, and fee setups without duplicate or disconnected data.",
  },
  {
    icon: Receipt,
    role: "Parents",
    description: "Access a dedicated portal to view invoices, track payment status, download receipts, and follow ward financial logs.",
    comingSoon: true,
  },
];

export default function WhoItIsForSection() {
  return (
    <section
      id="audience"
      className="py-24 md:py-32 lg:py-36 bg-white border-b border-neutral-200/60"
      aria-labelledby="audience-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <p className="text-label-large mb-3 text-primary uppercase font-bold tracking-wider">
            Built for school teams
          </p>
          <h2
            id="audience-heading"
            className="text-headline-medium md:text-display-small lg:text-display-medium mb-6 font-bold text-neutral-900 leading-tight"
          >
            Designed for the people who manage school finance every day.
          </h2>
        </div>

        {/* Audience Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
          {audiences.map((audience, idx) => {
            const Icon = audience.icon;
            return (
              <div
                key={idx}
                className="border border-neutral-200/60 rounded-3xl p-8 flex flex-col bg-white hover:-translate-y-1 hover:shadow-md hover:border-primary-200/60 transition-all duration-300 relative"
              >
                {audience.comingSoon && (
                  <span className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                    Portal Soon
                  </span>
                )}
                <div className="w-12 h-12 rounded-2xl bg-primary-container text-primary flex items-center justify-center mb-6 border border-primary-100/50">
                  <Icon size={24} />
                </div>
                <h3 className="text-title-medium text-neutral-900 font-extrabold mb-3">
                  {audience.role}
                </h3>
                <p className="text-body-medium text-neutral-600 leading-relaxed">
                  {audience.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

