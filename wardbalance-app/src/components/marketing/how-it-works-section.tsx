import { Building2, Users, FileText, Coins, ChevronRight } from "lucide-react";

const steps = [
  {
    icon: Building2,
    title: "Create your workspace",
    description: "Sign up, choose a plan, and set up your school profile.",
  },
  {
    icon: Users,
    title: "Add your school structure",
    description: "Set up classes, students, parents, and parent-to-ward links.",
  },
  {
    icon: FileText,
    title: "Build fees and invoices",
    description: "Create fee templates and generate invoices for the right students, classes, terms, or sessions.",
  },
  {
    icon: Coins,
    title: "Track payments clearly",
    description: "Record payments, issue receipts, monitor outstanding balances, and view reports.",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-24 md:py-32 lg:py-36 scroll-mt-[var(--marketing-header-offset)] bg-neutral-50/40 border-y border-neutral-200/50"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <p className="text-label-large mb-3 flex items-center justify-center gap-2 text-primary uppercase font-bold tracking-wider">
            <span className="w-8 h-px bg-current opacity-30 hidden sm:block"></span>
            HOW IT WORKS
            <span className="w-8 h-px bg-current opacity-30 hidden sm:block"></span>
          </p>
          <h2
            id="how-it-works-heading"
            className="text-headline-small md:text-headline-large mb-4 text-neutral-900 font-bold"
          >
            Start managing school fees in four simple steps.
          </h2>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="border border-neutral-200/60 rounded-3xl p-8 text-center relative z-10 flex flex-col items-center bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary-200/60"
              >
                {/* Step Number Badge */}
                <div className="absolute top-4 right-6 text-label-large font-black text-neutral-300 select-none">
                  0{index + 1}
                </div>

                {/* Right Connector Arrow (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -translate-y-1/2 -right-4 translate-x-1/2 z-20 w-8 h-8 rounded-full border border-neutral-200 bg-white shadow-sm items-center justify-center text-neutral-400">
                    <ChevronRight size={14} className="stroke-[3]" />
                  </div>
                )}

                <div className="flex flex-col items-center h-full">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-primary-container text-primary shadow-sm border border-primary-100/50"
                  >
                    <Icon size={30} />
                  </div>
                  <h3 className="text-title-large mb-3 text-neutral-900 font-bold">
                    {step.title}
                  </h3>
                  <p className="text-body-medium text-neutral-600 leading-relaxed">
                    {step.description}
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
