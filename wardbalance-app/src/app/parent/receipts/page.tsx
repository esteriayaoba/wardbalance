"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Receipt, X, Printer, Download, ChevronRight } from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface ReceiptLog {
  id: string;
  receiptNumber: string;
  createdAt: string;
  payment: {
    amount: string;
    method: string;
    reference: string | null;
    paymentDate: string;
  };
  studentName: string;
  termName: string;
  sessionName: string;
}

export default function ParentReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptLog[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/receipts")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load receipts.");
        return r.json();
      })
      .then((res) => {
        setReceipts(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-body-medium text-neutral-600">Retrieving payment receipts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
        <AlertCircle className="w-12 h-12 text-error mb-4" />
        <h3 className="text-title-medium text-neutral-900 font-bold mb-2">Could Not Load Receipts</h3>
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

  return (
    <div className="space-y-6 print:p-0">
      {/* Page Header */}
      <div className="space-y-1 print:hidden">
        <h1 className="text-headline-small text-neutral-900 font-bold">Wards Receipts</h1>
        <p className="text-body-small text-neutral-600">
          Download and print receipts of payments validated by the bursar.
        </p>
      </div>

      {/* Receipts list logs */}
      {receipts.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-3 print:hidden">
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-400">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-title-small text-neutral-900 font-bold">No receipts generated</h4>
            <p className="text-body-small text-neutral-500 max-w-xs mx-auto">
              Receipts are automatically generated as soon as your payment transaction is verified.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm divide-y divide-neutral-100 print:hidden">
          {receipts.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelectedReceipt(r)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedReceipt(r); }}
              role="button"
              tabIndex={0}
              aria-label={`View receipt ${r.receiptNumber}`}
              className="p-4 flex items-center justify-between hover:bg-neutral-50/50 transition-colors cursor-pointer group"
            >
              <div className="space-y-1 min-w-0 flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-body-small font-bold text-neutral-900 font-mono">
                    {r.receiptNumber}
                  </span>
                  <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded uppercase">
                    Paid
                  </span>
                </div>
                <div className="text-[11px] text-neutral-550">
                  For <strong className="text-neutral-750">{r.studentName}</strong> • {r.termName}
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-body-small font-bold text-neutral-900 tabular-nums">
                    {formatNaira(r.payment.amount)}
                  </span>
                  <span className="text-[10px] text-neutral-400 block font-medium">
                    {new Date(r.payment.paymentDate).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Printable Receipt Detail Popup overlay */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 print:relative print:inset-auto print:bg-white print:p-0">
          <div role="dialog" aria-modal="true" aria-label="Receipt detail" className="bg-white rounded-2xl border border-neutral-200 w-full max-w-md overflow-hidden shadow-2xl z-10 print:border-none print:shadow-none print:rounded-none motion-safe:animate-fade-in-up">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between print:hidden">
              <h3 className="text-title-small text-neutral-900 font-bold">View Receipt</h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                aria-label="Close receipt"
                className="p-1 text-neutral-400 hover:text-neutral-950 rounded-lg hover:bg-neutral-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Printable layout */}
            <div className="p-6 space-y-6 select-text" id="receipt-print-area">
              <div className="text-center space-y-2 border-b border-neutral-100 pb-4">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-1">
                  <Receipt className="w-5 h-5" />
                </div>
                <h2 className="text-title-medium text-neutral-950 font-bold uppercase tracking-tight">Payment Receipt</h2>
                <span className="text-body-medium font-mono text-neutral-500 font-bold block">{selectedReceipt.receiptNumber}</span>
              </div>

              <div className="space-y-4 text-body-small">
                <div className="flex justify-between border-b border-neutral-50 pb-2">
                  <span className="text-neutral-450">Student Name</span>
                  <span className="font-bold text-neutral-800">{selectedReceipt.studentName}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-50 pb-2">
                  <span className="text-neutral-450">Academic Session</span>
                  <span className="font-bold text-neutral-800">
                    {selectedReceipt.sessionName} • {selectedReceipt.termName}
                  </span>
                </div>
                <div className="flex justify-between border-b border-neutral-50 pb-2">
                  <span className="text-neutral-450">Payment Date</span>
                  <span className="font-bold text-neutral-800">
                    {new Date(selectedReceipt.payment.paymentDate).toLocaleDateString("en-NG", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between border-b border-neutral-50 pb-2">
                  <span className="text-neutral-450">Payment Method</span>
                  <span className="font-bold text-neutral-800 capitalize">
                    {selectedReceipt.payment.method.replace("_", " ")}
                  </span>
                </div>
                {selectedReceipt.payment.reference && (
                  <div className="flex justify-between border-b border-neutral-50 pb-2">
                    <span className="text-neutral-450">Transaction Reference</span>
                    <span className="font-mono font-bold text-neutral-700">{selectedReceipt.payment.reference}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2">
                  <span className="text-neutral-500 font-bold">Total Amount Paid</span>
                  <span className="text-title-medium font-extrabold text-green-600 tabular-nums">
                    {formatNaira(selectedReceipt.payment.amount)}
                  </span>
                </div>
              </div>

              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-center text-[10px] text-neutral-400">
                This document is a certified proof of transaction generated electronically by WardBalance OS.
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/80 flex gap-3 print:hidden">
              <button
                onClick={handlePrint}
                className="flex-1 py-2.5 border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg font-bold text-body-small flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
              <button
                disabled
                title="PDF download will be available in a future update"
                className="flex-1 py-2.5 bg-neutral-300 text-neutral-500 rounded-lg font-bold text-body-small flex items-center justify-center gap-1.5 cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
