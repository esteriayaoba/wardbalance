"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, CreditCard, ChevronRight } from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface PaymentLog {
  id: string;
  amount: string;
  method: string;
  status: "recorded" | "void";
  reference: string | null;
  createdAt: string;
  studentName: string;
  termName: string;
}

export default function ParentPaymentsPage() {
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/payments")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load payment logs.");
        return r.json();
      })
      .then((res) => {
        setPayments(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-body-medium text-neutral-600">Retrieving collection logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
        <AlertCircle className="w-12 h-12 text-error mb-4" />
        <h3 className="text-title-medium text-neutral-900 font-bold mb-2">Could Not Load History</h3>
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
    <div className="space-y-6 font-sans">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-headline-small text-neutral-900 font-bold">Payments History</h1>
        <p className="text-body-small text-neutral-600">
          History log of all fee payments made for linked wards.
        </p>
      </div>

      {/* Payments list logs */}
      {payments.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-title-small text-neutral-900 font-bold">No payments recorded</h4>
            <p className="text-body-small text-neutral-500 max-w-xs mx-auto">
              Your payments log will show all approved online checkouts or verified manual transfers.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm divide-y divide-neutral-100">
          {payments.map((p) => {
            const isVoid = p.status === "void";
            return (
              <div
                key={p.id}
                className={`p-4 flex items-center justify-between hover:bg-neutral-50/50 transition-colors ${
                  isVoid ? "opacity-60" : ""
                }`}
              >
                <div className="space-y-1.5 min-w-0 flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-body-medium font-bold tabular-nums ${isVoid ? "line-through text-neutral-450" : "text-neutral-900"}`}>
                      {formatNaira(p.amount)}
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                      isVoid 
                        ? "bg-red-50 text-red-650 border-red-100" 
                        : "bg-green-50 text-green-750 border-green-150"
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate">
                    For <strong className="text-neutral-700">{p.studentName}</strong> • {p.termName}
                  </div>
                  {p.reference && (
                    <div className="text-[10px] text-neutral-450 font-mono">Ref: {p.reference}</div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-neutral-450 block font-bold">
                    {new Date(p.createdAt).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-[10px] text-neutral-400 capitalize block mt-0.5">
                    {p.method.replace("_", " ")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
