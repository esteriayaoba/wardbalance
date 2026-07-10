const STUDENT_STATUS_COLORS: Record<string, string> = {
  active: "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20",
  inactive: "bg-[var(--color-outline-variant)]/30 text-neutral-500 border-[var(--color-outline-variant)]",
  graduated: "bg-[var(--color-info)]/10 text-[var(--color-info)] border-[var(--color-info)]/20",
  transferred: "bg-purple-50 text-purple-700 border-purple-200",
  suspended: "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20",
  withdrawn: "bg-[var(--color-error)]/10 text-[var(--color-error)] border-[var(--color-error)]/20",
  archived: "bg-neutral-100 text-neutral-400 border-neutral-300",
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  issued: "bg-[var(--color-info)]/10 text-[var(--color-info)]",
  paid: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
  partial: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  overdue: "bg-[var(--color-error)]/10 text-[var(--color-error)]",
};

export function StudentStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2.5 py-1 rounded text-body-small font-bold border ${STUDENT_STATUS_COLORS[status] || STUDENT_STATUS_COLORS.inactive}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold border ${INVOICE_STATUS_COLORS[status] || INVOICE_STATUS_COLORS.draft}`}>
      {label}
    </span>
  );
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  recorded: "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20",
  void: "bg-[var(--color-error)]/10 text-[var(--color-error)] border-[var(--color-error)]/20",
};

export function PaymentStatusBadge({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold border ${PAYMENT_STATUS_COLORS[status] || "bg-neutral-100 text-neutral-600 border-neutral-200"}`}>
      {label}
    </span>
  );
}
