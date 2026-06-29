"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, FileText, ChevronRight, X, Sparkles, AlertTriangle } from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface InvoiceLineItem {
  id: string;
  name: string;
  amount: string;
  lineType: string;
}

interface PaymentRecord {
  id: string;
  amount: string;
  method: string;
  createdAt: string;
  reference: string | null;
}

interface Invoice {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  termName: string;
  sessionName: string;
  status: "draft" | "issued" | "partial" | "paid" | "overdue";
  dueDate: string;
  totalAmount: string;
  discountAmount: string;
  finalAmount: string;
  amountPaid: string;
  balanceDue: string;
}

interface InvoiceDetail extends Invoice {
  lineItems: InvoiceLineItem[];
  payments: PaymentRecord[];
  school: {
    name: string;
    bankDetails: {
      bankName: string;
      accountNumber: string;
      accountName: string;
    };
  };
}

function InvoicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterStudentId = searchParams.get("studentId") || "";

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState(filterStudentId);

  // Load invoices list
  useEffect(() => {
    setLoadingList(true);
    fetch("/api/portal/invoices")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to retrieve invoices.");
        return r.json();
      })
      .then((res) => {
        setInvoices(res.data || []);
        setLoadingList(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoadingList(false);
      });
  }, []);

  // Fetch invoice details
  const handleOpenBreakdown = (invoiceId: string) => {
    setLoadingDetail(true);
    fetch(`/api/portal/invoices/${invoiceId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Could not retrieve invoice breakdown.");
        return r.json();
      })
      .then((res) => {
        setSelectedInvoice(res.data);
        setLoadingDetail(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoadingDetail(false);
      });
  };

  if (loadingList) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-body-medium text-neutral-600">Retrieving academic invoices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
        <AlertCircle className="w-12 h-12 text-error mb-4" />
        <h3 className="text-title-medium text-neutral-900 font-bold mb-2">Could Not Load Invoices</h3>
        <p className="text-body-medium text-neutral-600 mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white font-bold rounded-lg text-body-small hover:bg-primary-dark transition cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  // Get unique wards list from invoices to populate selector
  const uniqueWards = Array.from(
    new Map(invoices.map((inv) => [inv.studentId, { id: inv.studentId, name: inv.studentName }])).values()
  );

  // Filter invoices based on selected student
  const filteredInvoices = selectedStudentId
    ? invoices.filter((inv) => inv.studentId === selectedStudentId)
    : invoices;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700 border-green-200";
      case "partial":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "overdue":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h1 className="text-headline-small text-neutral-900 font-bold">Wards Invoices</h1>
          <p className="text-body-small text-neutral-600">
            View term invoices, breakdowns, carryovers, and payment receipts.
          </p>
        </div>

        {/* Student filter pills */}
        {uniqueWards.length > 1 && (
          <div className="flex gap-2 items-center overflow-x-auto pb-1.5 scrollbar-thin">
            <button
              onClick={() => setSelectedStudentId("")}
              className={`px-3.5 py-1.5 rounded-full text-body-small font-bold transition whitespace-nowrap cursor-pointer ${
                selectedStudentId === ""
                  ? "bg-primary text-white"
                  : "bg-white text-neutral-600 border border-neutral-250 hover:bg-neutral-50"
              }`}
            >
              All Wards
            </button>
            {uniqueWards.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedStudentId(w.id)}
                className={`px-3.5 py-1.5 rounded-full text-body-small font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedStudentId === w.id
                    ? "bg-primary text-white"
                    : "bg-white text-neutral-600 border border-neutral-250 hover:bg-neutral-50"
                }`}
              >
                {w.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Invoice list cards */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-400">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-title-small text-neutral-900 font-bold">No invoices generated</h4>
            <p className="text-body-small text-neutral-500 max-w-xs mx-auto">
              Your wards have no invoices generated for active academic terms yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredInvoices.map((inv) => {
            const hasBalance = Number(inv.balanceDue) > 0;
            return (
              <div
                key={inv.id}
                onClick={() => handleOpenBreakdown(inv.id)}
                className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-primary/45 transition shadow-sm cursor-pointer flex justify-between items-center group relative overflow-hidden"
              >
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-neutral-400 font-bold block uppercase">
                      {inv.termName} • {inv.sessionName}
                    </span>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${getStatusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-body-medium font-bold text-neutral-900 truncate">
                      {inv.studentName}
                    </h3>
                    <p className="text-[11px] text-neutral-500">{inv.className}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-neutral-50 pt-2.5">
                    <div>
                      <span className="text-[9px] text-neutral-400 uppercase font-bold block">Invoice Final Amount</span>
                      <span className="text-body-small font-bold text-neutral-800 tabular-nums">
                        {formatNaira(inv.finalAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-400 uppercase font-bold block">Balance Outstanding</span>
                      <span className={`text-body-small font-extrabold tabular-nums ${hasBalance ? "text-amber-600" : "text-green-600"}`}>
                        {formatNaira(inv.balanceDue)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ml-4 shrink-0 flex items-center">
                  <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-primary transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Breakdown sheet dialog popup */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center sm:items-center p-4">
          <div role="dialog" aria-modal="true" aria-label="Invoice breakdown" className="bg-white rounded-t-2xl sm:rounded-2xl border border-neutral-200 w-full max-w-lg overflow-hidden shadow-2xl z-10 max-h-[85vh] flex flex-col motion-safe:animate-fade-in-up">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-title-small text-neutral-900 font-bold">Invoice Breakdown</h3>
                <p className="text-[11px] text-neutral-500">
                  {selectedInvoice.studentName} • {selectedInvoice.className}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                aria-label="Close breakdown"
                className="p-1 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable contents */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Term context */}
              <div className="bg-neutral-50 p-4 border border-neutral-150 rounded-xl flex justify-between items-center text-body-small">
                <div>
                  <span className="text-[9px] text-neutral-400 uppercase block font-bold">Academic Session</span>
                  <span className="font-bold text-neutral-800">{selectedInvoice.sessionName} • {selectedInvoice.termName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-neutral-400 uppercase block font-bold">Payment Due Date</span>
                  <span className="font-bold text-neutral-850">
                    {new Date(selectedInvoice.dueDate).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Line items list */}
              <div className="space-y-3">
                <h4 className="text-label-small text-neutral-500 font-bold uppercase tracking-wider block">Billing Summary</h4>
                <div className="divide-y divide-neutral-100 border border-neutral-200/80 rounded-xl overflow-hidden bg-white">
                  {selectedInvoice.lineItems.map((item) => {
                    const isDiscount = item.lineType === "discount";
                    const isCarryover = item.lineType === "carryover";
                    const amountVal = Number(item.amount);

                    return (
                      <div key={item.id} className="flex justify-between items-center px-4 py-3.5 text-body-small">
                        <div>
                          <span className={`font-bold block ${isDiscount ? "text-green-600" : isCarryover ? "text-amber-700" : "text-neutral-800"}`}>
                            {item.name}
                          </span>
                          <span className="text-[9px] text-neutral-400 uppercase font-medium">{item.lineType.replace("_", " ")}</span>
                        </div>
                        <span className={`font-bold tabular-nums ${isDiscount ? "text-green-600" : isCarryover ? "text-amber-700" : "text-neutral-850"}`}>
                          {isDiscount ? "-" : ""}{formatNaira(amountVal)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-neutral-50 p-4 border border-neutral-200 rounded-xl space-y-2 text-body-small">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Gross Total Amount</span>
                  <span className="font-bold tabular-nums text-neutral-800">{formatNaira(selectedInvoice.totalAmount)}</span>
                </div>
                {Number(selectedInvoice.discountAmount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Applied Discounts</span>
                    <span className="font-bold tabular-nums">-{formatNaira(selectedInvoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-neutral-200 pt-2 font-bold text-body-medium">
                  <span className="text-neutral-800">Final Invoice Amount</span>
                  <span className="text-neutral-900 tabular-nums">{formatNaira(selectedInvoice.finalAmount)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Total Amount Paid</span>
                  <span className="font-bold tabular-nums">{formatNaira(selectedInvoice.amountPaid)}</span>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-2 font-extrabold text-body-medium text-neutral-900">
                  <span>Balance Outstanding</span>
                  <span className={`tabular-nums ${Number(selectedInvoice.balanceDue) > 0 ? "text-amber-600" : "text-green-600"}`}>
                    {formatNaira(selectedInvoice.balanceDue)}
                  </span>
                </div>
              </div>

              {/* Payments History log */}
              {selectedInvoice.payments.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-label-small text-neutral-500 font-bold uppercase tracking-wider block">Payments Log</h4>
                  <div className="space-y-2">
                    {selectedInvoice.payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center p-3.5 bg-green-50/40 border border-green-100 rounded-xl text-body-small text-neutral-700"
                      >
                        <div>
                          <div className="font-bold">Received {formatNaira(p.amount)}</div>
                          <div className="text-[10px] text-neutral-400 font-medium">
                            {p.method.replace("_", " ")} {p.reference ? `• Ref: ${p.reference}` : ""}
                          </div>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-bold uppercase">
                          {new Date(p.createdAt).toLocaleDateString("en-NG", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer CTAs */}
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/80 flex gap-3 shrink-0">
              {Number(selectedInvoice.balanceDue) > 0 ? (
                <>
                  <button
                    onClick={() => {
                      router.push(`/parent/invoices/${selectedInvoice.id}`);
                      setSelectedInvoice(null);
                    }}
                    className="flex-1 py-3 bg-primary text-white hover:bg-primary-dark rounded-lg font-bold text-label-large text-center shadow-sm transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Pay Invoice Now
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    router.push("/parent/receipts");
                    setSelectedInvoice(null);
                  }}
                  className="flex-1 py-3 border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg font-bold text-label-large text-center transition cursor-pointer"
                >
                  View Payment Receipts
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParentInvoicesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-body-medium text-neutral-600">Retrieving academic invoices...</p>
      </div>
    }>
      <InvoicesContent />
    </Suspense>
  );
}
