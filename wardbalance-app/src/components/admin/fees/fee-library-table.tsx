"use client";

import { Edit2, Trash2 } from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface FeeItem {
  id: string;
  name: string;
  description: string | null;
  type: "mandatory" | "optional";
  billingFrequency: "per_term" | "per_session" | "one_off";
  amount: string;
}

interface FeeLibraryTableProps {
  items: FeeItem[];
  onEdit: (item: FeeItem | null) => void;
  onDelete: (id: string) => void;
  emailVerified: boolean;
  actionLoading: boolean;
}

export default function FeeLibraryTable({
  items,
  onEdit,
  onDelete,
  emailVerified,
  actionLoading,
}: FeeLibraryTableProps) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
            <th className="px-6 py-3 font-semibold">Fee Item Name</th>
            <th className="px-6 py-3 font-semibold">Billing Frequency</th>
            <th className="px-6 py-3 font-semibold">Type</th>
            <th className="px-6 py-3 font-semibold">Default Amount</th>
            <th className="px-6 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {items.map((item) => (
            <tr key={item.id} className="text-body-medium text-neutral-800 hover:bg-neutral-50/50">
              <td className="px-6 py-4">
                <div className="font-bold text-neutral-900">{item.name}</div>
                {item.description && (
                  <div className="text-body-small text-neutral-500 mt-0.5">{item.description}</div>
                )}
              </td>
              <td className="px-6 py-4 capitalize">{item.billingFrequency.replace("_", " ")}</td>
              <td className="px-6 py-4">
                {item.type === "mandatory" ? (
                  <span className="px-2 py-0.5 rounded bg-primary-light text-primary text-[10px] font-bold uppercase">Mandatory</span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[10px] font-bold uppercase">Optional</span>
                )}
              </td>
              <td className="px-6 py-4 font-bold text-neutral-950 tabular-nums">{formatNaira(item.amount)}</td>
              <td className="px-6 py-4 text-right space-x-2">
                <button
                  onClick={() => onEdit(item)}
                  disabled={!emailVerified}
                  className="p-1.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-lg inline-flex items-center transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={actionLoading || !emailVerified}
                  onClick={() => onDelete(item.id)}
                  className="p-1.5 border border-neutral-200 hover:bg-red-50 text-error rounded-lg inline-flex items-center transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                No fee items catalogued. Create a library item to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
