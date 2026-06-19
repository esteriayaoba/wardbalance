export default function SocialProofSection() {
  const stats = [
    { label: "Invoices", description: "Per student, per term" },
    { label: "Payments", description: "Cash, transfer, POS, cheque" },
    { label: "Receipts", description: "Instant on approval" },
    { label: "Audit Trail", description: "Every action logged" },
  ];

  return (
    <section
      className="py-12"
      style={{ background: "var(--color-primary-container)" }}
      aria-labelledby="social-proof-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="social-proof-heading" className="sr-only">
          What WardBalance tracks
        </h2>

        <p className="text-center text-label-medium text-primary mb-6">
          Built for Nigerian private schools to track fees, payments, and receipts
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
          {stats.map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-6 sm:gap-12">
              <div className="text-center">
                <p className="text-title-large font-bold text-primary">
                  {stat.label}
                </p>
                <p className="text-body-small text-on-surface-variant mt-0.5">
                  {stat.description}
                </p>
              </div>
              {i < stats.length - 1 && (
                <div className="hidden sm:block w-px h-8 bg-outline-variant" />
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-body-medium text-on-surface-variant mt-6 max-w-xl mx-auto">
          One workspace. No spreadsheets. Every naira traceable.
        </p>
      </div>
    </section>
  );
}
