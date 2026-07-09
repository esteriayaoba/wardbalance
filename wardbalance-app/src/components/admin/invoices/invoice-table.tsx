"use client";

import { FileText, CheckCircle2, Trash2, Loader2 } from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface InvoiceRow {
  id: string;
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    classLevel: { name: string };
    classArm: { name: string };
  };
  status: string;
  finalAmount: string;
  balanceDue: string;
}

interface InvoiceTableProps {
  invoices: InvoiceRow[];
  onInvoiceClick: (invoice: InvoiceRow) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onBulkIssue?: (ids: string[]) => void;
  onBulkDelete?: (ids: string[]) => void;
  bulkActionLoading?: boolean;
}

const statusStyles: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  partial: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
  issued: "bg-blue-100 text-blue-700",
  draft: "bg-neutral-100 text-neutral-600",
};

export default function InvoiceTable({
  invoices,
  onInvoiceClick,
  selectedIds = new Set(),
  onToggleSelect,
  onToggleSelectAll,
  onBulkIssue,
  onBulkDelete,
  bulkActionLoading,
}: InvoiceTableProps) {
  const hasSelection = selectedIds.size > 0;
  const bulkableInvoices = invoices.filter((inv) => inv.status === "draft" || inv.status === "issued");
  const allSelected = invoices.length > 0 && invoices.every((inv) => selectedIds.has(inv.id));

  return (
    <div className="space-y-3">
      {/* Bulk action toolbar */}
      {hasSelection && (
        <div className="flex items-center justify-between bg-primary-50/30 border border-primary/20 rounded-xl px-4 py-2.5">
          <span className="text-body-small font-bold text-primary">{selectedIds.size} invoice{selectedIds.size !== 1 ? "s" : ""} selected</span>
          <div className="flex items-center gap-2">
            {onBulkIssue && (
              <button
                onClick={() => onBulkIssue(Array.from(selectedIds))}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-body-small font-bold hover:bg-primary-dark transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {bulkActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Issue Selected
              </button>
            )}
            {onBulkDelete && (
              <button
                onClick={() => onBulkDelete(Array.from(selectedIds))}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 border border-red-300 text-red-650 rounded-lg text-body-small font-bold hover:bg-red-50/30 transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
            {onToggleSelect && (
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary"
                  aria-label="Select all invoices"
                />
              </th>
            )}
            <th className="px-6 py-3 font-semibold">Student Name</th>
            <th className="px-6 py-3 font-semibold">Admission No</th>
            <th className="px-6 py-3 font-semibold">Class Arm</th>
            <th className="px-6 py-3 font-semibold">Final Amount</th>
            <th className="px-6 py-3 font-semibold">Balance Due</th>
            <th className="px-6 py-3 font-semibold">Status</th>
            <th className="px-6 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {invoices.map((inv) => {
            const isOverdue = inv.status === "overdue";
            const isPaid = inv.status === "paid";
            return (
              <tr
                key={inv.id}
                className="text-body-medium text-neutral-800 hover:bg-neutral-50/50 cursor-pointer"
              >
                {onToggleSelect && (
                  <td className="px-4 py-4 w-10" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(inv.id)}
                      onChange={() => onToggleSelect(inv.id)}
                      className="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary"
                      aria-label={`Select invoice for ${inv.student.firstName} ${inv.student.lastName}`}
                    />
                  </td>
                )}
                <td
                  className="px-6 py-4 font-bold text-neutral-900"
                  onClick={() => onInvoiceClick(inv)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onInvoiceClick(inv);
                    }
                  }}
                >
                  {inv.student.lastName}, {inv.student.firstName}
                </td>
                <td className="px-6 py-4 font-mono text-neutral-500 tabular-nums">
                  {inv.student.admissionNumber}
                </td>
                <td className="px-6 py-4">
                  {inv.student.classLevel.name} — {inv.student.classArm.name}
                </td>
                <td className="px-6 py-4 font-semibold text-neutral-900 tabular-nums">
                  {formatNaira(inv.finalAmount)}
                </td>
                <td className={`px-6 py-4 font-bold tabular-nums ${isPaid ? "text-green-600" : isOverdue ? "text-red-600" : "text-amber-600"}`}>
                  {formatNaira(inv.balanceDue)}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusStyles[inv.status] || "bg-neutral-100 text-neutral-600"}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onInvoiceClick(inv);
                    }}
                    className="px-3 py-1.5 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded-lg text-body-small font-bold inline-flex items-center gap-1.5 transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Details
                  </button>
                </td>
              </tr>
            );
          })}

        </tbody>
      </table>
      </div>
    </div>
  );
}

