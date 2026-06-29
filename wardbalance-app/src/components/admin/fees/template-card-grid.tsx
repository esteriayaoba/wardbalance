"use client";

import { Edit2, Trash2 } from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface FeeItem {
  id: string;
  name: string;
  amount: string;
}

interface TemplateItem {
  id: string;
  feeItemId: string;
  amountOverride: string | null;
  feeItem: FeeItem;
}

interface Template {
  id: string;
  classLevel: { name: string };
  term: { name: string };
  status: "draft" | "published";
  items: TemplateItem[];
}

interface TemplateCardGridProps {
  templates: Template[];
  onEdit: (template: Template | null) => void;
  onDelete: (id: string) => void;
  emailVerified: boolean;
  actionLoading: boolean;
}

export default function TemplateCardGrid({
  templates,
  onEdit,
  onDelete,
  emailVerified,
  actionLoading,
}: TemplateCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((temp) => {
        const total = temp.items.reduce((acc, curr) => {
          const amount = curr.amountOverride !== null ? curr.amountOverride : curr.feeItem.amount;
          return acc + parseFloat(amount);
        }, 0);

        return (
          <div key={temp.id} className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  temp.status === "published" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"
                }`}>
                  {temp.status}
                </span>
                <span className="text-[11px] text-neutral-500 font-bold truncate max-w-[150px]">{temp.term.name}</span>
              </div>
              <h3 className="text-title-small text-neutral-900 font-bold">{temp.classLevel.name}</h3>
              <div className="border-t border-neutral-100 pt-3 space-y-1.5">
                <div className="text-body-small text-neutral-500 font-semibold uppercase tracking-wider">Included Fees ({temp.items.length})</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {temp.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-body-small text-neutral-700">
                      <span className="truncate pr-4">{item.feeItem.name}</span>
                      <span className="font-semibold tabular-nums text-neutral-900">
                        {formatNaira(item.amountOverride ?? item.feeItem.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-neutral-100 pt-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Total Expected</div>
                <div className="text-title-small font-bold text-primary tabular-nums">{formatNaira(total)}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(temp)}
                  disabled={!emailVerified}
                  className="p-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-lg transition disabled:opacity-50"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={actionLoading || !emailVerified}
                  onClick={() => onDelete(temp.id)}
                  className="p-2 border border-neutral-200 hover:bg-red-50 text-error rounded-lg transition disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {templates.length === 0 && (
        <div className="col-span-full bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-400">
          No fee templates set up for the selected criteria. Set up class fee templates to automate student billing.
        </div>
      )}
    </div>
  );
}
