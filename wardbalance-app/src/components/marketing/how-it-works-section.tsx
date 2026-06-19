import { Building2, Send, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: Building2,
    title: "Create your school workspace",
    description: "Sign up in seconds and build a dedicated billing environment tailored to your school's profile.",
  },
  {
    icon: Send,
    title: "Set up classes, students, parents, and fees",
    description: "Configure divisions, class arms, parent contacts, and fee templates for the active term.",
  },
  {
    icon: CheckCircle2,
    title: "Generate invoices and track payments",
    description: "Bulk-issue term invoices, record manual payments (cash, transfer, POS), and verify parent bank transfers.",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-16 md:py-24 scroll-mt-24 bg-surface-container-low"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-label-large mb-3 flex items-center justify-center gap-2 text-primary">
            <span className="w-8 h-px bg-current opacity-50 hidden sm:block"></span>
            HOW IT WORKS
            <span className="w-8 h-px bg-current opacity-50 hidden sm:block"></span>
          </p>
          <h2
            id="how-it-works-heading"
            className="text-headline-small md:text-headline-large mb-4 text-on-surface"
          >
            From setup to payment in 3 steps
          </h2>
          <p className="text-body-large text-on-surface-variant">
            We've streamlined the entire financial workflow so your school can focus on education, not Excel sheets.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Subtle connecting line behind cards (desktop only) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px border-t-2 border-dashed border-outline-variant opacity-50 z-0" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="card-elevated p-8 text-center relative z-10 flex flex-col items-center group overflow-hidden transition-all duration-500 bg-surface-container-lowest"
              >
                {/* Expandable Wave Circle Overlay - Solid Brand Color */}
                <div
                  className="absolute bottom-0 right-0 translate-x-[40%] translate-y-[40%] w-[320px] h-[320px] rounded-full transition-all duration-700 ease-out group-hover:scale-[2.8] pointer-events-none z-0 opacity-0 group-hover:opacity-100 bg-primary"
                />

                {/* Content wrapper with z-index to stay above background wave */}
                <div className="relative z-10 flex flex-col items-center h-full pointer-events-none">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 card-icon-bg bg-surface-bright group-hover:bg-white shadow-sm"
                  >
                    <Icon 
                      size={32} 
                      className="transition-colors duration-300 text-primary" 
                    />
                  </div>
                  <h3 
                    className="text-title-large mb-3 transition-colors duration-300 text-on-surface group-hover:text-white"
                  >
                    {step.title}
                  </h3>
                  <p 
                    className="text-body-medium transition-colors duration-300 text-on-surface-variant group-hover:text-white/90"
                  >
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
