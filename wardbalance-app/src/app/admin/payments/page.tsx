"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Search, Coins, XCircle, CheckCircle, FileText, Calendar, User, Receipt, ShieldAlert, Download, AlertCircle } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import Input from "@/components/admin/shared/input";
import Select from "@/components/admin/shared/select";
import ConfirmationDialog from "@/components/admin/shared/confirmation-dialog";
import PaginationBar from "@/components/admin/shared/pagination-bar";
import { useToast } from "@/components/admin/shared/toast-provider";

interface Student {
  firstName: string;
  lastName: string;
  admissionNumber: string;
  classLevel: { name: string };
  classArm: { name: string };
}

interface PaymentReceipt {
  id: string;
  receiptNumber: string;
}

interface Payment {
  id: string;
  schoolId: string;
  invoiceId: string;
  studentId: string;
  student: Student;
  amount: string;
  method: "cash" | "bank_transfer" | "pos" | "cheque";
  status: "recorded" | "void";
  reference: string | null;
  recordedBy: { fullName: string };
  receipts: PaymentReceipt[];
  createdAt: string;
  updatedAt: string;
}

interface UnpaidInvoice {
  id: string;
  studentId: string;
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    classLevel: { name: string };
    classArm: { name: string };
  };
  term: {
    name: string;
    session: { name: string };
  };
  balanceDue: string;
  finalAmount: string;
}

export default function PaymentsPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Auto-select invoice from URL param (e.g., navigated from invoice drawer)
  const urlInvoiceId = searchParams.get("invoiceId");
  const [actionLoading, setActionLoading] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const [emailVerified, setEmailVerified] = useState(true);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterStatus, setFilterStatus] = useState("recorded");

  // UI state overlays
  const [showRecordDrawer, setShowRecordDrawer] = useState(false);

  // Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "pos" | "cheque">("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");

  // Voiding State
  const [paymentToVoid, setPaymentToVoid] = useState<string | null>(null);

  // Drawer Detail State
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 20;

  // Close any open drawer on Escape key
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (showRecordDrawer) {
        setShowRecordDrawer(false);
        setSelectedInvoiceId("");
        setPaymentAmount("");
      }
      if (selectedPayment) {
        setSelectedPayment(null);
      }
    }
  }, [showRecordDrawer, selectedPayment]);

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  useEffect(() => { setPage(1); }, [searchQuery, filterMethod, filterStatus]);

  const offset = (page - 1) * pageSize;
  const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
  if (searchQuery) params.set("search", searchQuery);
  if (filterMethod) params.set("method", filterMethod);
  if (filterStatus) params.set("status", filterStatus);
  const paymentUrl = `/api/admin/payments?${params.toString()}`;

  const paymentsQuery = useQuery({
    queryKey: ["admin", "payments", params.toString()],
    queryFn: async ({ signal }) => {
      const [paymentRes, verifyRes] = await Promise.all([
        fetch(paymentUrl, { signal }).then((r) => r.json()),
        fetch("/api/admin/verify-email", { signal }).then((r) => r.json()).catch(() => ({ emailVerified: true })),
      ]);
      return { paymentRes, verifyRes };
    },
  });

  const { data: queryResult, isLoading: loading, error: loadError } = paymentsQuery;
  const payments = (queryResult?.paymentRes?.data || []) as Payment[];

  useEffect(() => {
    if (queryResult) {
      setTotalRecords(queryResult.paymentRes.meta?.total ?? 0);
      setEmailVerified(queryResult.verifyRes.emailVerified ?? true);
    }
  }, [queryResult]);

  const fetchUnpaidInvoices = async (search = "") => {
    setLoadingInvoices(true);
    setInvoiceError(null);
    try {
      const url = search
        ? `/api/admin/invoices?limit=50&search=${encodeURIComponent(search)}`
        : `/api/admin/invoices?limit=100`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch invoices");
      const allInvoices = json.data || [];
      const billableInvoices = allInvoices.filter(
        (inv: any) => parseFloat(inv.balanceDue) > 0 && inv.status !== "draft"
      );
      setUnpaidInvoices(billableInvoices);
    } catch (err: unknown) {
      console.error("Failed to load unpaid invoices:", err);
      setInvoiceError(err instanceof Error ? err.message : "Failed to load unpaid invoices.");
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    if (showRecordDrawer) {
      const delayDebounceFn = setTimeout(() => {
        fetchUnpaidInvoices(invoiceSearchQuery);
      }, 400);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [invoiceSearchQuery, showRecordDrawer]);

  // Auto-open record drawer with pre-selected invoice from URL param
  useEffect(() => {
    if (urlInvoiceId && unpaidInvoices.length > 0) {
      const match = unpaidInvoices.find((i) => i.id === urlInvoiceId);
      if (match) {
        setSelectedInvoiceId(urlInvoiceId);
        setShowRecordDrawer(true);
        // Clear the URL param to prevent re-triggering
        window.history.replaceState({}, "", "/admin/payments");
      }
    }
  }, [urlInvoiceId, unpaidInvoices]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    const targetInvoice = unpaidInvoices.find((i) => i.id === selectedInvoiceId);
    if (!targetInvoice) {
      toast("error", "Please select a valid student invoice.");
      setActionLoading(false);
      return;
    }

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast("error", "Amount must be a positive number.");
      setActionLoading(false);
      return;
    }

    if (amountNum > parseFloat(targetInvoice.balanceDue)) {
      toast("error", `Amount cannot exceed the remaining balance due of ${formatNaira(targetInvoice.balanceDue)}.`);
      setActionLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          amount: amountNum,
          method: paymentMethod,
          reference: paymentReference.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to record payment");

      toast("success", `Payment of ${formatNaira(amountNum)} successfully recorded. Receipt generated.`);
      setShowRecordDrawer(false);
      setSelectedInvoiceId("");
      setPaymentAmount("");
      setPaymentMethod("bank_transfer");
      setPaymentReference("");
      paymentsQuery.refetch();
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoidPayment = async (id: string) => {
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/payments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "void" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to void payment");

      toast("success", "Payment has been voided. Invoice balance due has been adjusted.");
      paymentsQuery.refetch();
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Failed to void payment.");
    } finally {
      setActionLoading(false);
    }
  };

  const selectedInvoiceDetails = unpaidInvoices.find((i) => i.id === selectedInvoiceId);

  // API handles search/filter; payments array is already filtered and paginated
  const filteredPayments = payments;

  if (loadError) {
    return (
      <div className="space-y-8">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl flex flex-col items-center text-center gap-4">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <div>
            <h2 className="text-title-medium text-red-900 font-bold mb-1">Failed to load payments</h2>
            <p className="text-body-medium text-red-700">{loadError instanceof Error ? loadError.message : "Failed to load payments"}</p>
          </div>
          <button
            onClick={() => paymentsQuery.refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-label-large font-bold hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-body-large text-neutral-600">Retrieving payments logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-headline-small text-neutral-900 font-bold">Payments Ledger</h1>
          <p className="text-body-medium text-neutral-600">
            Record manual fee collections, view issued receipts, and manage voided transactions.
          </p>
        </div>

        <button
          onClick={() => {
            setInvoiceSearchQuery("");
            setUnpaidInvoices([]);
            setShowRecordDrawer(true);
            fetchUnpaidInvoices("");
          }}
          disabled={!emailVerified}
          title={!emailVerified ? "Verify your email to use this action." : undefined}
          className="px-4 py-2 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center gap-2 shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Messages handled via toast — see useToast() calls in handlers */}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute w-4 h-4 text-neutral-400 left-3 top-3.5 z-10" />
          <Input
            type="text"
            placeholder="Search student, receipt no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-3 w-full md:w-auto shrink-0">
          {/* Method Filter */}
          <div className="w-48">
            <Select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="py-2.5"
            >
              <option value="">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="pos">POS</option>
              <option value="cheque">Cheque</option>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="w-48">
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="py-2.5"
            >
              <option value="">All Statuses</option>
              <option value="recorded">Recorded</option>
              <option value="void">Void</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Payments Table / Empty State */}
      {filteredPayments.length === 0 ? (
        <div className="text-center py-16">
          <Coins className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-body-large text-neutral-500 font-medium">
            {searchQuery || filterMethod ? "No payments match your filters." : "No payments recorded yet."}
          </p>
          <p className="text-body-small text-neutral-400 mt-1">
            {searchQuery || filterMethod
              ? "Try adjusting your search or filter criteria."
              : "Record your first payment to get started."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
                <th className="px-6 py-3 font-semibold">Student Name</th>
                <th className="px-6 py-3 font-semibold">Receipt Number</th>
                <th className="px-6 py-3 font-semibold">Method</th>
                <th className="px-6 py-3 font-semibold">Amount Paid</th>
                <th className="px-6 py-3 font-semibold">Reference</th>
                <th className="px-6 py-3 font-semibold">Date Recorded</th>
                <th className="px-6 py-3 font-semibold">Recorder</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredPayments.map((p) => {
                const isVoid = p.status === "void";
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPayment(p)}
                    role="row"
                    tabIndex={0}
                    aria-label={`Payment by ${p.student.lastName} ${p.student.firstName} — ${formatNaira(p.amount)}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPayment(p);
                      }
                    }}
                    className={`text-body-medium text-neutral-800 hover:bg-neutral-50/50 cursor-pointer focus:outline-none focus:bg-primary-50 focus:ring-2 focus:ring-inset focus:ring-primary-300 ${isVoid ? "opacity-55 bg-neutral-50/50" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-neutral-900">
                        {p.student.lastName}, {p.student.firstName}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{p.student.admissionNumber}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-neutral-600 font-semibold inline-flex items-center gap-1 mt-3.5">
                      <Receipt className="w-3.5 h-3.5 text-neutral-400" />
                      {p.receipts[0]?.receiptNumber || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100 text-neutral-700">
                        {p.method.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-neutral-950 tabular-nums">
                      {formatNaira(p.amount)}
                    </td>
                    <td className="px-6 py-4 font-mono text-body-small text-neutral-500 truncate max-w-[120px]">
                      {p.reference || "—"}
                    </td>
                    <td className="px-6 py-4 text-neutral-600 text-body-small">
                      {new Date(p.createdAt).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-neutral-600 text-body-small">
                      {p.recordedBy?.fullName}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isVoid ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPaymentToVoid(p.id); }}
                          disabled={actionLoading || !emailVerified}
                          title={!emailVerified ? "Verify your email to use this action." : undefined}
                          className="px-2.5 py-1.5 border border-red-200 hover:bg-red-50 text-error rounded-lg text-body-small font-bold transition inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Void
                        </button>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold uppercase">
                          Voided
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar
        currentPage={page}
        pageSize={pageSize}
        total={totalRecords}
        loading={loading}
        onPageChange={setPage}
      />

      {/* Drawer: Record Payment Form */}
      {showRecordDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-payment-drawer-title"
        >
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-8 shadow-xl flex flex-col justify-between border-l border-neutral-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <h3 id="record-payment-drawer-title" className="text-title-small text-neutral-900 font-bold">
                  Record Manual Payment
                </h3>
                <button
                  onClick={() => {
                    setShowRecordDrawer(false);
                    setSelectedInvoiceId("");
                    setPaymentAmount("");
                  }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-body-small text-neutral-500 hover:text-neutral-900 font-bold"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-5">
                {/* Search Invoices */}
                <div className="space-y-1">
                  <label className="text-label-medium text-neutral-600 block">Search Student or Admission Number</label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Type student name or admission no..."
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-450 pointer-events-none">
                      {loadingInvoices ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Select Invoice */}
                {invoiceError && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 text-red-900 border border-red-200 text-body-small">
                    <span className="truncate">{invoiceError}</span>
                    <button
                      type="button"
                      onClick={() => fetchUnpaidInvoices(invoiceSearchQuery)}
                      className="text-primary hover:underline font-bold shrink-0 ml-2 cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}

                <Select
                  label="Select Student & Invoice *"
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value);
                    const inv = unpaidInvoices.find((i) => i.id === e.target.value);
                    setPaymentAmount(inv ? inv.balanceDue : "");
                  }}
                  disabled={loadingInvoices || !!invoiceError}
                >
                  <option value="">
                    {loadingInvoices ? "Loading invoices..." : invoiceError ? "Error loading invoices" : "Choose Student Invoice..."}
                  </option>
                  {!loadingInvoices && !invoiceError && unpaidInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.student.lastName}, {inv.student.firstName} ({inv.student.classArm.name}) — {inv.term.name} [Bal: {formatNaira(inv.balanceDue)}]
                    </option>
                  ))}
                </Select>

                {/* Selected Invoice summary card */}
                {selectedInvoiceDetails && (
                  <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2 text-body-medium text-neutral-700">
                    <div className="flex justify-between">
                      <span>Admission Number:</span>
                      <span className="font-bold text-neutral-800 font-mono">
                        {selectedInvoiceDetails.student.admissionNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Academic Term:</span>
                      <span className="font-bold text-neutral-850">
                        {selectedInvoiceDetails.term.session.name} — {selectedInvoiceDetails.term.name}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-neutral-200/60 pt-2 text-primary font-bold">
                      <span>Remaining Balance Due:</span>
                      <span className="text-title-small tabular-nums">
                        {formatNaira(selectedInvoiceDetails.balanceDue)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Amount to Pay */}
                <div className="space-y-1.5">
                  <label className="text-label-medium text-neutral-700 block">Payment Amount (₦) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-neutral-500 font-bold z-10">₦</span>
                    <Input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      max={selectedInvoiceDetails ? parseFloat(selectedInvoiceDetails.balanceDue) : undefined}
                      placeholder="e.g. 50,000"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="pl-7 font-bold"
                    />
                  </div>
                  {selectedInvoiceDetails && (
                    <div className="text-[11px] text-neutral-500 flex justify-between px-1">
                      <span>Part payment allowed</span>
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(selectedInvoiceDetails.balanceDue)}
                        className="text-primary hover:underline font-bold"
                      >
                        Set Full Amount
                      </button>
                    </div>
                  )}
                </div>

                {/* Payment Method */}
                <Select
                  label="Payment Method *"
                  required
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="pos">POS</option>
                  <option value="cheque">Cheque</option>
                </Select>

                {/* Reference */}
                <Input
                  label="Transaction Reference"
                  type="text"
                  placeholder="e.g. Transfer Ref, Cheque No, POS Receipt ID"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="font-mono"
                />

                <button
                  type="submit"
                  disabled={actionLoading || unpaidInvoices.length === 0}
                  className="w-full px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center justify-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Record Manual Payment
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Slide-over Drawer: Payment Details */}
      {selectedPayment && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-detail-drawer-title"
        >
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-8 shadow-xl flex flex-col border-l border-neutral-200">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <div>
                  <h3 id="payment-detail-drawer-title" className="text-title-small text-neutral-900 font-bold">
                    Payment Details
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-body-small text-neutral-500 hover:text-neutral-900 font-bold"
                >
                  Close
                </button>
              </div>

              <div className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500 font-semibold uppercase">Status</span>
                  {selectedPayment.status === "void" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                      <XCircle className="w-3 h-3" />
                      Voided
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                      <CheckCircle className="w-3 h-3" />
                      Recorded
                    </span>
                  )}
                </div>

                {/* Payment Summary Card */}
                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-3">
                  <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">
                    Payment Summary
                  </span>
                  <div className="space-y-2.5 text-body-medium">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-neutral-400" />
                        Amount
                      </span>
                      <span className="font-bold text-neutral-950 text-title-small tabular-nums">
                        {formatNaira(selectedPayment.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Method</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100 text-neutral-700">
                        {selectedPayment.method.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Reference</span>
                      <span className="font-mono text-body-small text-neutral-700 font-bold truncate max-w-[200px]">
                        {selectedPayment.reference || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Student Info */}
                <div className="p-4 rounded-xl border border-neutral-200 space-y-3">
                  <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Student Information
                  </span>
                  <div className="space-y-2.5 text-body-medium">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Name</span>
                      <span className="font-bold text-neutral-800">
                        {selectedPayment.student.lastName}, {selectedPayment.student.firstName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Admission No.</span>
                      <span className="font-mono font-bold text-neutral-800">
                        {selectedPayment.student.admissionNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Class</span>
                      <span className="font-bold text-neutral-800">
                        {selectedPayment.student.classLevel.name} — {selectedPayment.student.classArm.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Receipt & Recorder Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-neutral-200 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Receipt className="w-3 h-3" />
                        Receipt
                      </span>
                      <p className="font-mono font-bold text-neutral-800 text-body-medium break-all mt-1">
                        {selectedPayment.receipts[0]?.receiptNumber || "N/A"}
                      </p>
                    </div>
                    {selectedPayment.receipts[0]?.id && (
                      <a
                        href={`/api/receipts/${selectedPayment.receipts[0].id}/download`}
                        download
                        className="mt-2 text-[11px] text-primary hover:underline font-bold flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PDF
                      </a>
                    )}
                  </div>
                  <div className="p-4 rounded-xl border border-neutral-200 space-y-2">
                    <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Invoice
                    </span>
                    <p className="font-mono font-bold text-neutral-800 text-body-medium break-all">
                      {selectedPayment.invoiceId.slice(0, 8)}...
                    </p>
                  </div>
                </div>

                {/* Recorder Info */}
                <div className="p-4 rounded-xl border border-neutral-200 space-y-3">
                  <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    Recorded By
                  </span>
                  <div className="space-y-2.5 text-body-medium">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Name</span>
                      <span className="font-bold text-neutral-800">
                        {selectedPayment.recordedBy?.fullName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Date</span>
                      <span className="font-bold text-neutral-800 inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        {new Date(selectedPayment.createdAt).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Voided Info */}
                {selectedPayment.status === "void" && (
                  <div className="p-4 rounded-xl border border-red-200 bg-red-50/30 space-y-2">
                    <span className="text-[10px] text-red-600 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Voided Details
                    </span>
                    <div className="flex justify-between text-body-medium">
                      <span className="text-red-600">Voided at</span>
                      <span className="font-bold text-red-700 inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(selectedPayment.updatedAt).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Dialog for Voiding Payment */}
      <ConfirmationDialog
        isOpen={paymentToVoid !== null}
        onClose={() => setPaymentToVoid(null)}
        onConfirm={async () => {
          if (!paymentToVoid) return;
          const id = paymentToVoid;
          setPaymentToVoid(null);
          await handleVoidPayment(id);
        }}
        title="Void Payment"
        description="Are you sure you want to void this payment? This will update the invoice balance due and log the action. This cannot be undone."
        confirmText="Void"
        cancelText="Cancel"
        variant="destructive"
        isLoading={actionLoading}
      />
    </div>
  );
}
