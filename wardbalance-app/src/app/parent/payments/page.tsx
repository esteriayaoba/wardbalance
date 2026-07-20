"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Loader2, 
  AlertCircle, 
  CreditCard, 
  ChevronRight, 
  Upload, 
  CheckCircle2, 
  ChevronLeft, 
  Landmark, 
  FileText, 
  Check, 
  Copy 
} from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface PaymentLog {
  id: string;
  amount: string;
  method: string;
  status: string;
  reference: string | null;
  createdAt: string;
  studentName: string;
  termName: string;
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
  school: {
    name: string;
    bankDetails: {
      bankName: string;
      accountNumber: string;
      accountName: string;
    } | null;
  };
}

export default function ParentPaymentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "upload" ? "upload" : "history";

  const [activeTab, setActiveTab] = useState<"history" | "upload">(initialTab);
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetail | null>(null);
  
  // Loading states
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submittingProof, setSubmittingProof] = useState(false);
  
  // Error states
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Upload flow states
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3>(1);
  const [manualAmount, setManualAmount] = useState("");
  const [manualRef, setManualRef] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Payment Logs
  const fetchPayments = useCallback(async () => {
    setLoadingPayments(true);
    setPaymentsError(null);
    try {
      const r = await fetch("/api/portal/payments");
      if (!r.ok) throw new Error("Failed to load payment logs.");
      const res = await r.json();
      setPayments(res.data || []);
    } catch (err: any) {
      setPaymentsError(err.message);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  // Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    setInvoicesError(null);
    try {
      const r = await fetch("/api/portal/invoices");
      if (!r.ok) throw new Error("Failed to load outstanding invoices.");
      const res = await r.json();
      // Only keep invoices that are not fully paid
      const unpaid = (res.data || []).filter((inv: Invoice) => Number(inv.balanceDue) > 0);
      setInvoices(unpaid);
    } catch (err: any) {
      setInvoicesError(err.message);
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  // Fetch Single Invoice Detail (for bank info)
  const fetchInvoiceDetail = async (id: string) => {
    setLoadingDetail(true);
    setUploadError(null);
    try {
      const r = await fetch(`/api/portal/invoices/${id}`);
      if (!r.ok) throw new Error("Could not fetch bank transfer instructions.");
      const res = await r.json();
      setInvoiceDetail(res.data);
      setManualAmount(res.data.balanceDue);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    if (activeTab === "upload") {
      fetchInvoices();
    }
  }, [activeTab, fetchInvoices]);

  const handleSelectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    fetchInvoiceDetail(invoice.id);
    setUploadStep(2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds the 10MB limit.");
      return;
    }

    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
      setUploadError("Only JPEG, PNG, and PDF files are allowed.");
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
  };

  const copyAccountNumber = (accNo: string) => {
    navigator.clipboard.writeText(accNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !selectedFile) {
      setUploadError("Please select a proof of payment file.");
      return;
    }

    setSubmittingProof(true);
    setUploadError(null);

    try {
      // Step 1: Request presigned upload URL
      const urlRes = await fetch("/api/portal/payments/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
        }),
      });

      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error ?? "Failed to configure storage connection.");

      const { uploadUrl, key } = urlData.data;

      // Step 2: Upload directly to key (or mock simulator)
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload receipt snapshot to storage.");

      // Step 3: Create verification submission request
      const res = await fetch("/api/portal/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: Number(manualAmount),
          reference: manualRef.trim(),
          proofFileKey: key,
          proofFileName: selectedFile.name,
          proofFileType: selectedFile.type,
          proofFileSize: selectedFile.size,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to submit payment proof.");

      setUploadStep(3);
      fetchPayments(); // Refresh history
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setSubmittingProof(false);
    }
  };

  const resetUploadForm = () => {
    setSelectedInvoice(null);
    setInvoiceDetail(null);
    setSelectedFile(null);
    setManualAmount("");
    setManualRef("");
    setUploadError(null);
    setUploadStep(1);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-headline-small text-neutral-900 font-bold">Payments</h1>
        <p className="text-body-small text-neutral-600">
          Upload direct transfer proof files or review your past transactions.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => { setActiveTab("history"); resetUploadForm(); }}
          className={`flex-1 py-3 text-body-small font-bold text-center border-b-2 transition cursor-pointer ${
            activeTab === "history"
              ? "border-primary text-primary font-extrabold"
              : "border-transparent text-neutral-500 hover:text-neutral-950"
          }`}
        >
          Payment History
        </button>
        <button
          onClick={() => { setActiveTab("upload"); resetUploadForm(); }}
          className={`flex-1 py-3 text-body-small font-bold text-center border-b-2 transition cursor-pointer ${
            activeTab === "upload"
              ? "border-primary text-primary font-extrabold"
              : "border-transparent text-neutral-500 hover:text-neutral-950"
          }`}
        >
          Upload Payment Proof
        </button>
      </div>

      {/* Tab Panel 1: History */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {loadingPayments ? (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-body-medium text-neutral-600">Retrieving payment history...</p>
            </div>
          ) : paymentsError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center min-h-[250px]">
              <AlertCircle className="w-12 h-12 text-error mb-4" />
              <h3 className="text-title-medium text-neutral-900 font-bold mb-2">Error Loading History</h3>
              <p className="text-body-medium text-neutral-600 mb-6">{paymentsError}</p>
              <button
                onClick={fetchPayments}
                className="px-4 py-2 bg-primary text-white font-bold rounded-lg text-body-small hover:bg-primary-dark transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : payments.length === 0 ? (
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
              <button
                onClick={() => setActiveTab("upload")}
                className="mt-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-body-small hover:bg-primary-dark transition"
              >
                Upload Your First Proof
              </button>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm divide-y divide-neutral-100">
              {payments.map((p) => {
                const isVoid = p.status === "void" || p.status === "rejected";
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
                          p.status === "void" || p.status === "rejected"
                            ? "bg-red-50 text-red-650 border-red-100" 
                            : p.status === "recorded" || p.status === "approved"
                            ? "bg-green-50 text-green-750 border-green-150"
                            : p.status === "pending" || p.status === "reupload requested"
                            ? "bg-amber-50 text-amber-700 border-amber-150"
                            : "bg-neutral-50 text-neutral-600 border-neutral-200"
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
      )}

      {/* Tab Panel 2: Upload Proof Wizard */}
      {activeTab === "upload" && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
          {/* Step 1: Select Invoice */}
          {uploadStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-body-medium font-bold text-neutral-900">Step 1: Select Outstanding Invoice</h3>
                <p className="text-body-small text-neutral-500">Choose the unpaid invoice you want to submit proof for.</p>
              </div>

              {loadingInvoices ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                  <p className="text-body-small text-neutral-500">Checking for outstanding balances...</p>
                </div>
              ) : invoicesError ? (
                <div className="p-4 bg-red-50 text-red-800 rounded-lg text-body-small flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-650" />
                  <span>{invoicesError}</span>
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                  <h4 className="text-title-small font-bold text-neutral-900">All Wards are Fully Settled!</h4>
                  <p className="text-body-small text-neutral-500 max-w-xs mx-auto">
                    No outstanding term balances or due bills found for your linked accounts.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => handleSelectInvoice(inv)}
                      className="border border-neutral-200 rounded-xl p-4 hover:border-primary transition cursor-pointer flex justify-between items-center group bg-neutral-50/30"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] text-neutral-400 font-bold block uppercase">{inv.termName}</span>
                          <span className="text-body-small font-extrabold text-amber-600 tabular-nums">
                            Due: {formatNaira(inv.balanceDue)}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-body-medium font-bold text-neutral-900 truncate">{inv.studentName}</h4>
                          <span className="text-[11px] text-neutral-500">{inv.className}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-primary transition-colors ml-4 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Bank details and Form Upload */}
          {uploadStep === 2 && selectedInvoice && (
            <div className="space-y-6">
              {/* Back Button */}
              <button
                onClick={() => setUploadStep(1)}
                className="inline-flex items-center gap-1 text-body-small text-neutral-500 hover:text-neutral-900 font-bold cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Change Invoice
              </button>

              <div className="space-y-1">
                <h3 className="text-body-medium font-bold text-neutral-900">Step 2: Transfer and Upload Proof</h3>
                <p className="text-body-small text-neutral-500">
                  Transfer to the school's account and upload the receipt proof below.
                </p>
              </div>

              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                  <p className="text-body-small text-neutral-500">Loading instructions...</p>
                </div>
              ) : uploadError ? (
                <div className="p-4 bg-red-50 text-red-800 rounded-lg text-body-small flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-650" />
                  <span>{uploadError}</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Bank Details Card */}
                  {invoiceDetail?.school.bankDetails ? (
                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3 text-body-small">
                      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2 text-neutral-600">
                        <Landmark className="w-4 h-4" />
                        <span className="font-bold uppercase tracking-wider text-[10px]">School Payment Info</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-neutral-500">Bank Name</span>
                        <span className="font-bold text-neutral-800">{invoiceDetail.school.bankDetails.bankName}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-neutral-500">Account Number</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-neutral-950 tracking-wider">
                            {invoiceDetail.school.bankDetails.accountNumber}
                          </span>
                          <button
                            onClick={() => copyAccountNumber(invoiceDetail.school.bankDetails!.accountNumber)}
                            className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-neutral-700 transition"
                            title="Copy Account Number"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-neutral-500">Account Name</span>
                        <span className="font-bold text-neutral-800 text-right">{invoiceDetail.school.bankDetails.accountName}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-center text-body-small font-bold">
                      Direct bank transfer account settings have not been configured by the school. Please reach out to administrative support.
                    </div>
                  )}

                  {/* Form Submission */}
                  <form onSubmit={handleManualPaymentSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Amount */}
                      <div className="space-y-1.5">
                        <label className="text-label-medium text-neutral-700 block">Amount Sent (₦) *</label>
                        <input
                          type="number"
                          required
                          placeholder="e.g. 120000"
                          value={manualAmount}
                          onChange={(e) => setManualAmount(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-small focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none font-bold"
                        />
                      </div>

                      {/* Reference */}
                      <div className="space-y-1.5">
                        <label className="text-label-medium text-neutral-700 block">Transaction Reference / Sender Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Bank transfer ref"
                          value={manualRef}
                          onChange={(e) => setManualRef(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-small focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Hidden File Picker */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/png,application/pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {/* Custom File Box Container */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                      role="button"
                      tabIndex={0}
                      className={`border-2 border-dashed rounded-xl p-6 text-center hover:bg-neutral-50/50 transition cursor-pointer ${
                        selectedFile ? "border-primary bg-primary-50/5" : "border-neutral-300"
                      }`}
                    >
                      {selectedFile ? (
                        <div className="space-y-1">
                          <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                          <span className="text-body-small font-bold text-neutral-850 block truncate max-w-xs mx-auto">
                            {selectedFile.name}
                          </span>
                          <span className="text-[10px] text-neutral-500 block">
                            File loaded successfully ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Upload className="w-8 h-8 text-neutral-450 mx-auto mb-2" />
                          <span className="text-body-small font-bold text-neutral-700 block">Select Receipt File</span>
                          <span className="text-[10px] text-neutral-450 block">Only JPEG, PNG, and PDF format under 10MB</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submittingProof || !manualAmount || !manualRef || !selectedFile || !invoiceDetail?.school.bankDetails}
                      className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-label-large transition flex items-center justify-center gap-2 shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingProof ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading proof to storage...
                        </>
                      ) : (
                        "Submit Proof for Verification"
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Success Confirmation Screen */}
          {uploadStep === 3 && (
            <div className="text-center py-8 space-y-6">
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-150 shadow-sm">
                <CheckCircle2 className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-title-medium text-neutral-950 font-bold">Proof Uploaded Successfully</h3>
                <p className="text-body-small text-neutral-600 max-w-sm mx-auto">
                  Your direct bank transfer proof of <strong className="text-neutral-900 font-extrabold">{formatNaira(manualAmount)}</strong> has been uploaded and is marked as <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-extrabold text-[10px]">Pending Verification</span>.
                </p>
                <p className="text-[11px] text-neutral-400">
                  Reference code: {manualRef}. The bursar will review the transaction and notify you shortly.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto">
                <button
                  onClick={() => { setActiveTab("history"); resetUploadForm(); }}
                  className="w-full py-2.5 border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 rounded-lg text-body-small font-bold transition cursor-pointer"
                >
                  View Payments Log
                </button>
                <button
                  onClick={() => router.push("/parent/dashboard")}
                  className="w-full py-2.5 bg-primary text-white hover:bg-primary-dark rounded-lg text-body-small font-bold transition cursor-pointer"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

