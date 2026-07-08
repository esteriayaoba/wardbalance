"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Calendar, Tag, Receipt, Coins } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import Input from "@/components/admin/shared/input";
import Select from "@/components/admin/shared/select";

interface LineItem {
  id: string;
  name: string;
  amount: string;
  lineType: "fee_item" | "carryover" | "discount" | "custom";
}

interface Payment {
  id: string;
  amount: string;
  method: string;
  createdAt: string;
  reference: string | null;
}

interface InvoiceDetail {
  id: string;
  status: "draft" | "issued" | "partial" | "paid" | "overdue";
  dueDate: string;
  totalAmount: string;
  discountAmount: string;
  finalAmount: string;
  amountPaid: string;
  balanceDue: string;
  term: { name: string; session: { name: string } };
  lineItems?: LineItem[];
  payments?: Payment[];
}

interface InvoiceDetailDrawerProps {
  invoice: {
    id: string;
    student: {
      firstName: string;
      lastName: string;
      admissionNumber: string;
    };
  } | null;
  details: InvoiceDetail | null;
  loading: boolean;
  actionLoading: boolean;
  emailVerified: boolean;
  onClose: () => void;
  onIssue: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateDueDate: (id: string, dueDate: string) => Promise<void>;
  onApplyDiscount: (id: string, type: "fixed" | "percentage" | "none", value: number) => Promise<void>;
}

export default function InvoiceDetailDrawer({
  invoice,
  details,
  loading,
  actionLoading,
  emailVerified,
  onClose,
  onIssue,
  onDelete,
  onUpdateDueDate,
  onApplyDiscount,
}: InvoiceDetailDrawerProps) {
  const router = useRouter();
  const [editDueDate, setEditDueDate] = useState(false);
  const [newDueDate, setNewDueDate] = useState("");
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [discountType, setDiscountType] = useState<"fixed" | "percentage" | "none">("none");
  const [discountValue, setDiscountValue] = useState("");

  if (!invoice) return null;

  const handleDueDateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details) return;
    await onUpdateDueDate(details.id, newDueDate);
    setEditDueDate(false);
  };

  const handleDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details) return;
    await onApplyDiscount(
      details.id,
      discountType,
      discountType === "none" ? 0 : parseFloat(discountValue)
    );
    setShowDiscountForm(false);
    setDiscountValue("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
      <div className="bg-white w-full max-w-xl h-full overflow-y-auto p-8 shadow-xl flex flex-col justify-between border-l border-neutral-200">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <div>
              <h3 className="text-title-medium text-neutral-900 font-bold">Invoice Details</h3>
              <p className="text-body-small text-neutral-500 font-medium">
                {invoice.student.lastName}, {invoice.student.firstName} ({invoice.student.admissionNumber})
              </p>
            </div>
            <button onClick={onClose} className="text-body-small text-neutral-500 hover:text-neutral-900 font-bold">
              Close
            </button>
          </div>

          {loading || !details ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-500 font-semibold block uppercase">Current Status</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 ${
                    details.status === "paid" ? "bg-green-100 text-green-700"
                    : details.status === "partial" ? "bg-amber-100 text-amber-700"
                    : details.status === "overdue" ? "bg-red-100 text-red-700"
                    : details.status === "issued" ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                  }`}>
                    {details.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  {details.status === "draft" && (
                    <button
                      onClick={() => onIssue(details.id)}
                      disabled={actionLoading || !emailVerified}
                      className="px-3.5 py-1.5 bg-primary text-white hover:bg-primary-dark font-bold text-body-small rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Issue Invoice
                    </button>
                  )}
                  {(details.status === "draft" || details.status === "issued") && (
                    <button
                      onClick={() => onDelete(details.id)}
                      disabled={actionLoading || !emailVerified}
                      className="px-3 py-1.5 border border-red-200 text-error hover:bg-red-50 font-bold text-body-small rounded-lg transition inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-label-medium text-neutral-800 font-bold block">Invoice Term & Timestamps</span>
                  {!editDueDate && (details.status === "draft" || details.status === "issued") && (
                    <button
                      onClick={() => { if (emailVerified) { setEditDueDate(true); setNewDueDate(details.dueDate.substring(0, 10)); } }}
                      disabled={!emailVerified}
                      className="text-body-small text-primary hover:underline font-bold disabled:opacity-50"
                    >
                      Edit Due Date
                    </button>
                  )}
                </div>
                <div className="p-4 rounded-xl border border-neutral-100 space-y-2.5 text-body-medium">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Academic Term:</span>
                    <span className="font-bold text-neutral-800">{details.term.session.name} — {details.term.name}</span>
                  </div>
                  {editDueDate ? (
                    <form onSubmit={handleDueDateSubmit} className="flex gap-2 items-center justify-between pt-2">
                      <div className="flex-1">
                        <Input type="date" required value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="py-1.5" />
                      </div>
                      <div className="flex gap-1 self-end pb-1.5">
                        <button type="submit" disabled={actionLoading} className="px-3 py-2 bg-green-600 text-white font-bold rounded-lg text-body-small hover:bg-green-700">Save</button>
                        <button type="button" onClick={() => setEditDueDate(false)} className="px-3 py-2 border border-neutral-300 text-neutral-600 font-bold rounded-lg text-body-small hover:bg-neutral-50">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Payment Due Date:</span>
                      <span className="font-bold text-neutral-850 inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        {new Date(details.dueDate).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-label-medium text-neutral-800 font-bold block">Line Items Breakdown</span>
                  {!showDiscountForm && (
                    <button
                      onClick={() => { if (emailVerified) { setDiscountType(details.discountAmount !== "0" ? "fixed" : "none"); setShowDiscountForm(true); } }}
                      disabled={!emailVerified}
                      className="text-body-small text-primary hover:underline font-bold inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Apply Discount
                    </button>
                  )}
                </div>

                {showDiscountForm && (
                  <form onSubmit={handleDiscountSubmit} className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                    <div className="text-body-small text-neutral-800 font-bold">Apply Discount Rule</div>
                    <div className="grid grid-cols-2 gap-3">
                      <Select label="Discount Type" value={discountType} onChange={(e: any) => setDiscountType(e.target.value)} className="py-1.5 text-body-small">
                        <option value="none">No Discount</option>
                        <option value="fixed">Fixed Amount (₦)</option>
                        <option value="percentage">Percentage (%)</option>
                      </Select>
                      {discountType !== "none" && (
                        <Input label={discountType === "fixed" ? "Value (₦)" : "Rate (%)"} type="number" required min="0" step="0.01"
                          placeholder={discountType === "fixed" ? "5,000" : "10"}
                          value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="py-1.5 text-body-small font-bold" />
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button type="submit" disabled={actionLoading} className="px-3 py-1.5 bg-primary text-white font-bold rounded-lg text-body-small hover:bg-primary-dark">Save</button>
                      <button type="button" onClick={() => setShowDiscountForm(false)} className="px-3 py-1.5 border border-neutral-300 text-neutral-600 font-bold rounded-lg text-body-small hover:bg-neutral-50">Cancel</button>
                    </div>
                  </form>
                )}

                <div className="border border-neutral-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-body-medium">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
                        <th className="px-4 py-2 font-semibold">Description</th>
                        <th className="px-4 py-2 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-150">
                      {details.lineItems?.map((item) => (
                        <tr key={item.id} className="text-neutral-800">
                          <td className="px-4 py-2.5">
                            <span>{item.name}</span>
                            {item.lineType === "carryover" && (
                              <span className="ml-2 inline-flex px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase">Carryover</span>
                            )}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${item.lineType === "discount" ? "text-green-600" : "text-neutral-900"}`}>
                            {formatNaira(item.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-neutral-50/50">
                        <td className="px-4 py-2.5 font-bold text-neutral-900">Total Bill</td>
                        <td className="px-4 py-2.5 text-right font-bold text-neutral-900 tabular-nums">{formatNaira(details.totalAmount)}</td>
                      </tr>
                      {parseFloat(details.discountAmount) > 0 && (
                        <tr className="bg-green-50/20">
                          <td className="px-4 py-2.5 font-bold text-green-700">Total Discounts</td>
                          <td className="px-4 py-2.5 text-right font-bold text-green-700 tabular-nums">-{formatNaira(details.discountAmount)}</td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-neutral-300 bg-neutral-100/40">
                        <td className="px-4 py-3 font-bold text-primary">Final Amount Due</td>
                        <td className="px-4 py-3 text-right font-bold text-primary text-title-small tabular-nums">{formatNaira(details.finalAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-label-medium text-neutral-800 font-bold block">Payments Recorded</span>
                <div className="p-4 rounded-xl border border-neutral-150 space-y-2 bg-neutral-50/40">
                  <div className="flex justify-between text-body-medium">
                    <span className="text-neutral-500">Amount Paid:</span>
                    <span className="font-bold text-green-600 tabular-nums">{formatNaira(details.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between text-body-medium pt-1 border-t border-neutral-100">
                    <span className="text-neutral-500">Remaining Balance:</span>
                    <span className={`font-extrabold tabular-nums ${parseFloat(details.balanceDue) === 0 ? "text-green-600" : "text-amber-600"}`}>
                      {formatNaira(details.balanceDue)}
                    </span>
                  </div>
                  {details.payments && details.payments.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-neutral-200 space-y-2">
                      <div className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Payment Log</div>
                      {details.payments.map((p) => (
                        <div key={p.id} className="flex justify-between items-center text-body-small bg-white p-2 rounded border border-neutral-200">
                          <div>
                            <span className="font-bold text-neutral-800 uppercase inline-flex items-center gap-1">
                              <Receipt className="w-3.5 h-3.5 text-neutral-400" />
                              {p.method.replace("_", " ")}
                            </span>
                            {p.reference && <span className="text-neutral-400 ml-2 font-mono">Ref: {p.reference}</span>}
                          </div>
                          <span className="font-bold text-neutral-900 tabular-nums">{formatNaira(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {parseFloat(details.balanceDue) > 0 && (
                    <button
                      onClick={() => router.push(`/admin/payments?invoiceId=${invoice.id}`)}
                      className="w-full mt-3 py-2.5 bg-primary text-white hover:bg-primary-dark rounded-lg font-bold text-label-medium transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Coins className="w-4 h-4" />
                      Record Payment
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
