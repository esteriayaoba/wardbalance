"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, ArrowLeft, ShieldCheck, Sparkles, Landmark, Upload, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface InvoiceLineItem {
  id: string;
  name: string;
  amount: string;
  lineType: string;
}

interface InvoiceDetail {
  id: string;
  status: string;
  dueDate: string;
  totalAmount: string;
  discountAmount: string;
  finalAmount: string;
  amountPaid: string;
  balanceDue: string;
  student: {
    id: string;
    fullName: string;
    admissionNumber: string;
    className: string;
  };
  termName: string;
  sessionName: string;
  lineItems: InvoiceLineItem[];
  school: {
    name: string;
    bankDetails: {
      bankName: string;
      accountNumber: string;
      accountName: string;
    };
  };
}

export default function InvoiceCheckoutPage({ params }: { params: { invoiceId: string } }) {
  const router = useRouter();
  const invoiceId = params.invoiceId;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment states
  const [paymentTab, setPaymentTab] = useState<"online" | "bank">("online");
  const [initializingPayment, setInitializingPayment] = useState(false);

  // Manual payment form states
  const [manualAmount, setManualAmount] = useState("");
  const [manualRef, setManualRef] = useState("");
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofSubmitted, setProofSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/portal/invoices/${invoiceId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load invoice details.");
        return r.json();
      })
      .then((res) => {
        setInvoice(res.data);
        setManualAmount(res.data.balanceDue);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [invoiceId]);

  const handleOnlinePayment = async () => {
    if (!invoice) return;
    setInitializingPayment(true);
    setError(null);

    try {
      const res = await fetch("/api/portal/payments/flutterwave/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.balanceDue,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to initialize payment gateway.");

      // Redirect to Flutterwave checkout link (or mock URL in demo mode)
      router.push(body.data.link);
    } catch (err: any) {
      setError(err.message ?? "Online payment initiation failed.");
      setInitializingPayment(false);
    }
  };

  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    setSubmittingProof(true);
    setError(null);

    try {
      const res = await fetch("/api/portal/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: Number(manualAmount),
          reference: manualRef.trim(),
          proofImageKey: "receipts/proof_upload.png", // Mocked key
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to submit payment proof.");

      setProofSubmitted(true);
    } catch (err: any) {
      setError(err.message ?? "Failed to submit proof.");
    } finally {
      setSubmittingProof(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-body-medium text-neutral-600">Retrieving checkout session...</p>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
        <AlertCircle className="w-12 h-12 text-error mb-4" />
        <h3 className="text-title-medium text-neutral-900 font-bold mb-2">Checkout Error</h3>
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

  if (!invoice) return null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/parent/invoices"
          className="inline-flex items-center gap-1.5 text-body-small text-neutral-500 hover:text-neutral-900 font-bold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>
      </div>

      {/* Main summary grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Invoice Summary Card */}
        <div className="md:col-span-1 bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="text-label-medium text-neutral-900 font-bold uppercase tracking-wider block">Checkout Summary</h3>
            <span className="text-[11px] text-neutral-400">Student: {invoice.student.fullName}</span>
          </div>

          <div className="space-y-3 text-body-small">
            <div className="flex justify-between">
              <span className="text-neutral-500">Academic Term</span>
              <span className="font-bold text-neutral-800">{invoice.termName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">School</span>
              <span className="font-bold text-neutral-800">{invoice.school.name}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-100 pt-2.5">
              <span className="text-neutral-500">Amount Due</span>
              <span className="font-extrabold text-neutral-900 tabular-nums">{formatNaira(invoice.balanceDue)}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods Section */}
        <div className="md:col-span-2 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
              <span>{error}</span>
            </div>
          )}

          {proofSubmitted ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-sm text-center space-y-5">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-150">
                <CheckCircle2 className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-title-medium text-neutral-950 font-bold">Proof Uploaded Successfully</h3>
                <p className="text-body-small text-neutral-500 max-w-sm mx-auto">
                  Your direct bank transfer proof of <strong>{formatNaira(manualAmount)}</strong> has been uploaded and is marked as <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-extrabold text-[10px]">Pending Verification</span>.
                </p>
                <p className="text-[11px] text-neutral-400">
                  Transaction reference: {manualRef}. The bursar will review the transaction and notify you shortly.
                </p>
              </div>

              <div className="pt-2 flex gap-3 justify-center">
                <button
                  onClick={() => router.push("/parent/dashboard")}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 rounded-lg text-body-small font-bold transition cursor-pointer"
                >
                  Return to Dashboard
                </button>
                <button
                  onClick={() => router.push("/parent/payments")}
                  className="px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded-lg text-body-small font-bold transition cursor-pointer"
                >
                  View Payments Log
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
              {/* Payment toggle header */}
              <div className="flex border-b border-neutral-200">
                <button
                  onClick={() => setPaymentTab("online")}
                  className={`flex-1 py-3.5 text-body-small font-bold text-center border-b-2 transition cursor-pointer ${
                    paymentTab === "online"
                      ? "border-primary text-primary bg-primary-50/20"
                      : "border-transparent text-neutral-500 hover:text-neutral-900 bg-white"
                  }`}
                >
                  Online Payment (Card/USSD)
                </button>
                <button
                  onClick={() => setPaymentTab("bank")}
                  className={`flex-1 py-3.5 text-body-small font-bold text-center border-b-2 transition cursor-pointer ${
                    paymentTab === "bank"
                      ? "border-primary text-primary bg-primary-50/20"
                      : "border-transparent text-neutral-500 hover:text-neutral-900 bg-white"
                  }`}
                >
                  Direct Bank Transfer
                </button>
              </div>

              <div className="p-6">
                {paymentTab === "online" ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h4 className="text-body-medium font-bold text-neutral-950 flex items-center gap-1.5">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        Secure Checkout via Flutterwave
                      </h4>
                      <p className="text-body-small text-neutral-500 leading-relaxed">
                        Pay with debit cards, internet banking, or USSD code. Once completed successfully on Flutterwave, your invoice status is verified and updated automatically on WardBalance.
                      </p>
                    </div>

                    <div className="bg-neutral-50 p-4 border border-neutral-200 rounded-xl space-y-2">
                      <span className="text-[10px] text-neutral-400 font-bold block uppercase">Payable Total</span>
                      <span className="text-headline-medium font-extrabold text-neutral-950 tabular-nums">
                        {formatNaira(invoice.balanceDue)}
                      </span>
                    </div>

                    <button
                      onClick={handleOnlinePayment}
                      disabled={initializingPayment}
                      className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-label-large transition flex items-center justify-center gap-2 shadow cursor-pointer"
                    >
                      {initializingPayment ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Initializing checkout...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Continue to Payment
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h4 className="text-body-medium font-bold text-neutral-950 flex items-center gap-1.5">
                        <Landmark className="w-5 h-5 text-neutral-500" />
                        Direct Bank Transfer Instructions
                      </h4>
                      <p className="text-body-small text-neutral-500 leading-relaxed">
                        Make a bank transfer directly to the school account listed below, then enter your transaction reference and upload details to submit proof for bursar verification.
                      </p>
                    </div>

                    {/* Bank Details Box */}
                    <div className="bg-neutral-50 p-4 border border-neutral-200 rounded-xl space-y-3 text-body-small">
                      <div className="flex justify-between border-b border-neutral-200 pb-2">
                        <span className="text-neutral-500">Bank Name</span>
                        <span className="font-bold text-neutral-800">{invoice.school.bankDetails.bankName}</span>
                      </div>
                      <div className="flex justify-between border-b border-neutral-200 pb-2">
                        <span className="text-neutral-500">Account Number</span>
                        <span className="font-mono font-bold text-neutral-900 select-all tracking-wide">
                          {invoice.school.bankDetails.accountNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Account Name</span>
                        <span className="font-bold text-neutral-800">{invoice.school.bankDetails.accountName}</span>
                      </div>
                    </div>

                    {/* Proof Upload Form */}
                    <form onSubmit={handleManualPaymentSubmit} className="space-y-4 pt-4 border-t border-neutral-100">
                      <h5 className="text-label-medium text-neutral-900 font-bold uppercase tracking-wider block">Submit Payment Proof</h5>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Amount paid input */}
                        <div className="space-y-1.5">
                          <label className="text-label-medium text-neutral-700 block">Amount Paid (₦) *</label>
                          <input
                            type="number"
                            required
                            placeholder="e.g. 50000"
                            value={manualAmount}
                            onChange={(e) => setManualAmount(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-body-small focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none font-bold"
                          />
                        </div>

                        {/* Ref input */}
                        <div className="space-y-1.5">
                          <label className="text-label-medium text-neutral-700 block">Transaction Reference *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Session transfer reference"
                            value={manualRef}
                            onChange={(e) => setManualRef(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-body-small focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Mock File selector */}
                      <div className="border-2 border-dashed border-neutral-300 rounded-xl p-6 text-center hover:bg-neutral-50 transition cursor-pointer">
                        <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                        <span className="text-body-small font-bold text-neutral-600 block">Select Proof File (JPEG/PNG/PDF)</span>
                        <span className="text-[10px] text-neutral-400 block mt-1">Upload transfer snapshot/receipt proof under 10MB</span>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingProof || !manualAmount || !manualRef}
                        className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-label-large transition flex items-center justify-center gap-2 shadow cursor-pointer"
                      >
                        {submittingProof ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading proof...
                          </>
                        ) : (
                          "Upload Proof of Payment"
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
