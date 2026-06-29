"use client";

import { FileText } from "lucide-react";
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
}

const statusStyles: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  partial: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
  issued: "bg-blue-100 text-blue-700",
  draft: "bg-gray-100 text-gray-600",
};

export default function InvoiceTable({ invoices, onInvoiceClick }: InvoiceTableProps) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
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
              <tr key={inv.id} className="text-body-medium text-neutral-800 hover:bg-neutral-50/50">
                <td className="px-6 py-4 font-bold text-neutral-900">
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
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusStyles[inv.status] || "bg-gray-100 text-gray-600"}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onInvoiceClick(inv)}
                    className="px-3 py-1.5 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded-lg text-body-small font-bold inline-flex items-center gap-1.5 transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Details
                  </button>
                </td>
              </tr>
            );
          })}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">
                No invoices found matching selected parameters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
