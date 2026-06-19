"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, AlertCircle, CheckCircle, Search, Coins, XCircle, FileText, Calendar, User, Receipt, ShieldAlert } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import Input from "@/components/admin/shared/input";
import Select from "@/components/admin/shared/select";
import ConfirmationDialog from "@/components/admin/shared/confirmation-dialog";

interface Student {
  firstName: string;
  lastName: string;
  admissionNumber: string;
  classLevel: { name: string };
  classArm: { name: string };
}

interface PaymentReceipt {
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
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterStatus, setFilterStatus] = useState("recorded"); // Default to showing active payments

  // UI state overlays
  const [showRecordDrawer, setShowRecordDrawer] = useState(false);

  // Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "pos" | "cheque">("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");

  // Alerts
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Voiding State
  const [paymentToVoid, setPaymentToVoid] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/payments").then((r) => r.json()),
      fetch("/api/admin/invoices").then((r) => r.json()), // to find invoices to record payments against
    ])
      .then(([paymentRes, invoiceRes]) => {
        setPayments(paymentRes.data || []);
        
        // Find invoices that have remaining balance due and are not draft
        const allInvoices = invoiceRes.data || [];
        const billableInvoices = allInvoices.filter(
          (inv: any) => parseFloat(inv.balanceDue) > 0 && inv.status !== "draft"
        );
        setUnpaidInvoices(billableInvoices);

        setLoading(false);
      })
      .catch((err) => {
        console.error("Load payments page failed:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    const targetInvoice = unpaidInvoices.find((i) => i.id === selectedInvoiceId);
    if (!targetInvoice) {
      setError("Please select a valid student invoice.");
      setActionLoading(false);
      return;
    }

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number.");
      setActionLoading(false);
      return;
    }

    if (amountNum > parseFloat(targetInvoice.balanceDue)) {
      setError(`Amount cannot exceed the remaining balance due of ${formatNaira(targetInvoice.balanceDue)}.`);
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

      setSuccess(`Payment of ${formatNaira(amountNum)} successfully recorded. Receipt generated.`);
      setShowRecordDrawer(false);
      setSelectedInvoiceId("");
      setPaymentAmount("");
      setPaymentMethod("bank_transfer");
      setPaymentReference("");
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoidPayment = async (id: string) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/payments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "void" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to void payment");

      setSuccess("Payment has been voided. Invoice balance due has been adjusted.");
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const selectedInvoiceDetails = unpaidInvoices.find((i) => i.id === selectedInvoiceId);

  // Filter payments list
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      `${p.student.firstName} ${p.student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.receipts[0]?.receiptNumber && p.receipts[0].receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMethod = !filterMethod || p.method === filterMethod;
    const matchesStatus = !filterStatus || p.status === filterStatus;

    return matchesSearch && matchesMethod && matchesStatus;
  });

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
          onClick={() => setShowRecordDrawer(true)}
          className="px-4 py-2 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center gap-2 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-green-50 text-green-700 text-body-small border border-green-200">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
          <span>{success}</span>
        </div>
      )}

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

      {/* Payments Table */}
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
                <tr key={p.id} className={`text-body-medium text-neutral-800 hover:bg-neutral-50/50 ${isVoid ? "opacity-55 bg-neutral-50/50" : ""}`}>
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
                        onClick={() => setPaymentToVoid(p.id)}
                        disabled={actionLoading}
                        className="px-2.5 py-1.5 border border-red-200 hover:bg-red-50 text-error rounded-lg text-body-small font-bold transition inline-flex items-center gap-1"
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
            {filteredPayments.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-neutral-400">
                  No payments found matching the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer: Record Payment Form */}
      {showRecordDrawer && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-8 shadow-xl flex flex-col justify-between border-l border-neutral-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <h3 className="text-title-small text-neutral-900 font-bold">
                  Record Manual Payment
                </h3>
                <button
                  onClick={() => {
                    setShowRecordDrawer(false);
                    setSelectedInvoiceId("");
                    setPaymentAmount("");
                  }}
                  className="text-body-small text-neutral-500 hover:text-neutral-900 font-bold"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-5">
                {/* Select Invoice */}
                <Select
                  label="Select Student & Invoice *"
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value);
                    const inv = unpaidInvoices.find((i) => i.id === e.target.value);
                    setPaymentAmount(inv ? inv.balanceDue : "");
                  }}
                >
                  <option value="">Choose Student Invoice...</option>
                  {unpaidInvoices.map((inv) => (
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
