import {
  FileSpreadsheet,
  MessageSquare,
  Calculator,
  Eye,
  Users,
  Percent,
} from "lucide-react";

const problems = [
  {
    icon: FileSpreadsheet,
    title: "Payments tracked across Excel, paper, and WhatsApp",
    description:
      "School finances are scattered across different tools with no single source of truth.",
  },
  {
    icon: MessageSquare,
    title: "Parents send screenshots manually",
    description:
      "Bank transfer proof arrives as WhatsApp images — easy to miss, hard to reconcile.",
  },
  {
    icon: Calculator,
    title: "Bursars struggle with reconciliation",
    description:
      "Matching payments to invoices manually is slow, error-prone, and causes disputes.",
  },
  {
    icon: Eye,
    title: "School owners lack real-time financial visibility",
    description:
      "Proprietors have no live view of expected vs collected revenue for the term.",
  },
  {
    icon: Users,
    title: "Parents can't easily track balances for multiple wards",
    description:
      "Parents with 2–3 children in the school have no central place to see what's owed.",
  },
  {
    icon: Percent,
    title: "Discounts and partial payments are hard to manage",
    description:
      "Sibling discounts, instalment plans, and carryover balances create tracking nightmares.",
  },
];

export default function ProblemSection() {
  return (
    <section
      id="problem"
      className="py-16 md:py-24 scroll-mt-24 bg-background"
      aria-labelledby="problem-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <p className="text-label-large mb-3 text-primary">
            THE PROBLEM
          </p>
          <h2
            id="problem-heading"
            className="text-headline-small md:text-headline-large mb-4 text-on-surface"
          >
            School fee management is broken
          </h2>
          <p className="text-body-large animate-fade-in-up text-on-surface-variant">
            School fee records should not live across notebooks, spreadsheets, WhatsApp screenshots, and bank alerts.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {problems.map((problem) => {
            const Icon = problem.icon;
            return (
              <div
                key={problem.title}
                className="card-elevated p-6 flex flex-col group relative overflow-hidden transition-all duration-500 bg-surface-container-lowest"
              >
                {/* Expandable Wave Circle Overlay - Solid Secondary Color */}
                <div
                  className="absolute bottom-0 right-0 translate-x-[40%] translate-y-[40%] w-[280px] h-[280px] rounded-full transition-all duration-700 ease-out group-hover:scale-[2.8] pointer-events-none z-0 opacity-0 group-hover:opacity-100"
                  style={{
                    background: "var(--color-secondary)",
                  }}
                />

                {/* Content wrapper with z-index to stay above background wave */}
                <div className="relative z-10 flex flex-col h-full pointer-events-none">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 card-icon-bg bg-[hsl(173, 50%, 95%)] group-hover:bg-white"
                  >
                    <Icon
                      size={20}
                      className="transition-colors duration-300 text-[var(--color-secondary)]"
                    />
                  </div>
                  <h3
                    className="text-title-small mb-2 transition-colors duration-300 text-on-surface group-hover:text-white"
                  >
                    {problem.title}
                  </h3>
                  <p
                    className="text-body-medium transition-colors duration-300 text-on-surface-variant group-hover:text-white/90"
                  >
                    {problem.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bridge to solution */}
        <p className="text-center text-body-large mt-12 font-medium text-on-surface-variant">
          WardBalance replaces every one of these gaps with a single, structured workspace.
        </p>
      </div>
    </section>
  );
}
