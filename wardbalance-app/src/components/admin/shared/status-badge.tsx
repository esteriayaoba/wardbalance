const STUDENT_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  inactive: "bg-neutral-50 text-neutral-500 border-neutral-200",
  graduated: "bg-blue-50 text-blue-700 border-blue-200",
  transferred: "bg-purple-50 text-purple-700 border-purple-200",
  suspended: "bg-amber-50 text-amber-700 border-amber-200",
  withdrawn: "bg-red-50 text-red-700 border-red-200",
  archived: "bg-neutral-100 text-neutral-400 border-neutral-300",
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  issued: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  partial: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
};

export function StudentStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2.5 py-1 rounded text-body-small font-bold border ${STUDENT_STATUS_COLORS[status] || STUDENT_STATUS_COLORS.inactive}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold border uppercase ${INVOICE_STATUS_COLORS[status] || INVOICE_STATUS_COLORS.draft}`}>
      {status}
    </span>
  );
}
