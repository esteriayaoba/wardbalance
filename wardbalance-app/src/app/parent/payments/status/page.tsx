"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, XCircle } from "lucide-react";
import { formatNaira } from "@/lib/utils";

function PaymentStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Flutterwave redirect params
  const statusParam = searchParams.get("status") || searchParams.get("tx_status");
  const txRef = searchParams.get("tx_ref");
  const transactionId = searchParams.get("transaction_id") || searchParams.get("id");
  const amountParam = searchParams.get("amount");
  const invoiceIdParam = searchParams.get("invoiceId");

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!txRef) {
      setError("Missing transaction reference.");
      setVerifying(false);
      return;
    }

    setVerifying(true);
    setError(null);

    // Call verify endpoint
    fetch("/api/portal/payments/flutterwave/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        txRef,
        transactionId,
        status: statusParam,
        amount: amountParam ? Number(amountParam) : undefined,
        invoiceId: invoiceIdParam || undefined,
      }),
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Failed to verify transaction.");
        return body;
      })
      .then((res) => {
        setSuccess(true);
        setReceiptNumber(res.data.receiptNumber || null);
        setVerifying(false);
      })
      .catch((err) => {
        setError(err.message ?? "Transaction verification failed.");
        setVerifying(false);
      });
  }, [txRef, transactionId, statusParam, amountParam, invoiceIdParam]);

  if (verifying) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-10 max-w-md mx-auto text-center space-y-6 shadow-sm" aria-live="polite" role="status">
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-title-medium text-neutral-900 font-bold">Verifying Payment Status</h2>
          <p className="text-body-small text-neutral-500 max-w-xs mx-auto">
            We are confirming your payment transaction with Flutterwave. This may take a few moments. Please do not refresh.
          </p>
        </div>
      </div>
    );
  }

  if (error || !success) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-10 max-w-md mx-auto text-center space-y-6 shadow-sm">
        <div className="w-16 h-16 bg-red-50 text-error rounded-full flex items-center justify-center mx-auto border border-red-100">
          <XCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-title-medium text-neutral-900 font-bold">Payment Verification Failed</h2>
          <p className="text-body-small text-neutral-500 max-w-xs mx-auto">
            {error ?? "We could not verify this transaction. Please try again or contact the school bursar."}
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2.5">
          <Link
            href="/parent/invoices"
            className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-body-small text-center transition"
          >
            Go to Invoices
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 rounded-lg font-bold text-body-small transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Verification
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-10 max-w-md mx-auto text-center space-y-6 shadow-sm">
      <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-150">
        <CheckCircle2 className="w-8 h-8 motion-safe:animate-bounce" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-title-medium text-neutral-950 font-bold">Payment Confirmed</h2>
        <p className="text-body-small text-neutral-500 max-w-xs mx-auto">
          Thank you! Your payment has been securely verified and credited. Your invoice has been updated.
        </p>
        {amountParam && (
          <div className="text-headline-small font-extrabold text-neutral-900 tabular-nums pt-2">
            {formatNaira(amountParam)}
          </div>
        )}
        {receiptNumber && (
          <span className="text-[10px] text-neutral-400 font-mono block">
            Receipt Reference: {receiptNumber}
          </span>
        )}
      </div>

      <div className="pt-2 flex flex-col gap-2.5">
        <Link
          href="/parent/receipts"
          className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-body-small text-center transition"
        >
          View Receipt
        </Link>
        <Link
          href="/parent/dashboard"
          className="w-full py-2.5 border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 rounded-lg font-bold text-body-small text-center transition"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function ParentPaymentStatusPage() {
  return (
    <Suspense fallback={
      <div className="bg-white border border-neutral-200 rounded-2xl p-10 max-w-md mx-auto text-center space-y-6 shadow-sm">
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-title-medium text-neutral-900 font-bold">Loading Verification Details...</h2>
        </div>
      </div>
    }>
      <PaymentStatusContent />
    </Suspense>
  );
}
