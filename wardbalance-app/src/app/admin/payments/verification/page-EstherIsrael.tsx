"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Loader2, 
  AlertCircle, 
  Check, 
  X, 
  RefreshCw, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  TrendingUp, 
  ExternalLink,
  Search,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { formatNaira } from "@/lib/utils";
import ConfirmationDialog from "@/components/admin/shared/confirmation-dialog";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  classLevel: { name: string };
  classArm: { name: string };
}

interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}

interface Invoice {
  id: string;
  status: string;
  dueDate: string;
  finalAmount: string;
  amountPaid: string;
  balanceDue: string;
  term: { name: string };
}

interface ManualSubmission {
  id: string;
  schoolId: string;
  invoiceId: string;
  studentId: string;
  student: Student;
  parentId: string;
  parent: Parent;
  submittedById: string;
  amount: string;
  paymentMethod: string;
  reference: string;
  proofFileKey: string | null;
  proofFileName: string | null;
  proofFileType: string | null;
  proofFileSize: number | null;
  status: "Pending" | "Approved" | "Rejected" | "ReuploadRequested" | "Cancelled";
  rejectionReason: string | null;
  reuploadReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedById: string | null;
  proofUrl: string | null;
  invoice: Invoice;
}

export default function VerificationQueuePage() {
  const [selectedStatus, setSelectedStatus] = useState<string>("Pending");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Review action states
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Dialog states
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isReuploadOpen, setIsReuploadOpen] = useState(false);
  const [isBulkApproveOpen, setIsBulkApproveOpen] = useState(false);
  
  // Dialog fields
  const [rejectReason, setRejectReason] = useState("");
  const [reuploadReason, setReuploadReason] = useState("");

  const { data: submissionsData, isLoading: loading, error, refetch } = useQuery({
    queryKey: ["admin", "payments", "verification", selectedStatus],
    queryFn: async () => {
      const res = await fetch(`/api/admin/payments/verification?status=${selectedStatus}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to retrieve verification queue.");
      return body.data as ManualSubmission[];
    },
  });

  const submissions = submissionsData || [];

  // Reset selected index when status changes
  useEffect(() => { setSelectedIndex(0); }, [selectedStatus]);

  const filteredSubmissions = submissions.filter((sub) => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${sub.student.firstName} ${sub.student.lastName}`.toLowerCase();
    const admissionNumber = sub.student.admissionNumber.toLowerCase();
    const reference = sub.reference.toLowerCase();
    return fullName.includes(searchLower) || admissionNumber.includes(searchLower) || reference.includes(searchLower);
  });

  const activeSubmission = filteredSubmissions[selectedIndex] || null;

  const handleAction = async (
    action: "approve" | "reject" | "request_reupload", 
    payload: { reason?: string } = {}
  ) => {
    if (!activeSubmission) return;
    
    setActionLoading(true);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/admin/payments/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: activeSubmission.id,
          action,
          reason: payload.reason,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Failed to perform action: ${action}`);

      setSuccessMessage(body.message ?? `Successfully performed action: ${action}`);
      
      // Close all dialogs
      setIsApproveOpen(false);
      setIsRejectOpen(false);
      setIsReuploadOpen(false);
      setRejectReason("");
      setReuploadReason("");

      // Refetch to get updated queue
      const updatedLen = submissions.length - 1;
      if (selectedIndex >= updatedLen) {
        setSelectedIndex(Math.max(0, updatedLen - 1));
      }
      refetch();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSubmissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSubmissions.map((s) => s.id)));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    setActionLoading(true);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/admin/payments/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulkAction: true,
          submissionIds: Array.from(selectedIds),
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Bulk approve failed");

      setSuccessMessage(body.message);
      setSelectedIds(new Set());
      setIsBulkApproveOpen(false);

      // Refetch to get updated queue
      refetch();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-6rem)] flex flex-col h-full font-sans">
      {/* Top action block */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
        <div className="space-y-1">
          <h1 className="text-headline-small text-neutral-900 font-bold">Verification Queue</h1>
          <p className="text-body-medium text-neutral-600">
            Review parent-submitted bank transfer proofs and record them to the ledger.
          </p>
        </div>

        {/* Status filtering pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {["Pending", "Approved", "Rejected", "ReuploadRequested"].map((status) => {
            const isActive = selectedStatus === status;
            return (
              <button
                key={status}
                onClick={() => {
                  setSelectedStatus(status);
                  setSearchQuery("");
                }}
                className={`px-4 py-2 rounded-full text-body-small font-bold transition whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-neutral-600 border-neutral-250 hover:bg-neutral-50"
                }`}
              >
                {status.replace("Requested", " Requested")}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center flex-1">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-body-large text-neutral-600">Loading payment proofs queue...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-8 text-center flex-1">
          <AlertCircle className="w-12 h-12 text-error mb-4" />
          <h3 className="text-title-medium text-neutral-900 font-bold mb-2">Error Loading Queue</h3>
            <p className="text-body-medium text-neutral-600 mb-6">{error instanceof Error ? error.message : "An error occurred"}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary text-white font-bold rounded-lg text-body-small hover:bg-primary-dark transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white border border-neutral-250 rounded-2xl p-12 text-center space-y-4 flex-1 flex flex-col items-center justify-center">
          <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center border border-green-150">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="text-title-medium text-neutral-950 font-bold">Queue is empty</h4>
            <p className="text-body-medium text-neutral-500 max-w-sm mx-auto">
              There are no submissions currently marked as {selectedStatus.toLowerCase().replace("requested", " requested")}.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden items-stretch">
          {/* List panel (Left 3 columns) */}
          <div className="xl:col-span-3 bg-white border border-neutral-200 rounded-xl flex flex-col overflow-hidden max-h-[600px] xl:max-h-full">
            {/* Search + Bulk actions */}
            <div className="p-3.5 border-b border-neutral-100 space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student or ref..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-neutral-300 text-body-small focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none"
                />
              </div>
              {selectedIds.size > 0 && selectedStatus === "Pending" && (
                <div className="flex items-center justify-between bg-primary-50/30 px-3 py-2 rounded-lg border border-primary/20">
                  <span className="text-body-small font-bold text-primary">{selectedIds.size} selected</span>
                  <button
                    onClick={() => setIsBulkApproveOpen(true)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-primary text-white rounded-lg text-body-small font-bold hover:bg-primary-dark transition cursor-pointer disabled:opacity-50"
                  >
                    Approve All
                  </button>
                </div>
              )}
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
              <div className="sticky top-0 bg-neutral-50/80 backdrop-blur-sm border-b border-neutral-100 px-3 py-2 flex items-center gap-2 text-body-small text-neutral-500">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary shrink-0"
                  aria-label="Select all"
                />
                <span className="font-medium">
                  {selectedIds.size > 0 ? `${selectedIds.size} of ${filteredSubmissions.length} selected` : "Select all"}
                </span>
              </div>
              {filteredSubmissions.map((sub, idx) => {
                const isSelected = activeSubmission?.id === sub.id;
                return (
                  <div
                    key={sub.id}
                    className={`flex items-start p-3 cursor-pointer transition text-body-small space-y-0 gap-2 select-none ${
                      isSelected ? "bg-primary-50/20 border-r-4 border-primary" : "hover:bg-neutral-50/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(sub.id)}
                      onChange={(e) => { e.stopPropagation(); toggleSelectId(sub.id); }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 mt-1 rounded border-neutral-300 text-primary focus:ring-primary shrink-0"
                      aria-label={`Select ${sub.student.firstName} ${sub.student.lastName}`}
                    />
                    <div
                      onClick={() => {
                        const actualIdx = submissions.findIndex((s) => s.id === sub.id);
                        if (actualIdx !== -1) setSelectedIndex(actualIdx);
                        setActionError(null);
                        setSuccessMessage(null);
                      }}
                      className="flex-1 space-y-1"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-bold text-neutral-900 truncate">
                          {sub.student.firstName} {sub.student.lastName}
                        </span>
                        <span className="font-extrabold text-neutral-950 shrink-0 tabular-nums">
                          {formatNaira(sub.amount)}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 truncate flex justify-between">
                        <span>{sub.student.classLevel.name}-{sub.student.classArm.name}</span>
                        <span>
                          {new Date(sub.submittedAt).toLocaleDateString("en-NG", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono truncate">Ref: {sub.reference}</div>
                    </div>
                  </div>
                );
              })}
              {filteredSubmissions.length === 0 && (
                <div className="p-8 text-center text-neutral-400 text-body-small">
                  No matches found for "{searchQuery}"
                </div>
              )}
            </div>

            {/* Pagination helper at the bottom */}
            {filteredSubmissions.length > 0 && (
              <div className="p-3 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between text-body-small text-neutral-500 shrink-0">
                <button
                  disabled={selectedIndex === 0}
                  onClick={() => {
                    setSelectedIndex((prev) => Math.max(0, prev - 1));
                    setActionError(null);
                    setSuccessMessage(null);
                  }}
                  className="p-1 hover:bg-neutral-200 rounded disabled:opacity-40 cursor-pointer"
                  aria-label="Previous submission"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold">
                  {selectedIndex + 1} of {filteredSubmissions.length}
                </span>
                <button
                  disabled={selectedIndex === filteredSubmissions.length - 1}
                  onClick={() => {
                    setSelectedIndex((prev) => Math.min(filteredSubmissions.length - 1, prev + 1));
                    setActionError(null);
                    setSuccessMessage(null);
                  }}
                  className="p-1 hover:bg-neutral-200 rounded disabled:opacity-40 cursor-pointer"
                  aria-label="Next submission"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Proof Viewer Panel (Middle 5 columns) */}
          <div className="xl:col-span-5 bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col min-h-[400px] xl:min-h-0">
            {/* Panel header */}
            <div className="px-5 py-3.5 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center shrink-0">
              <span className="text-label-medium text-neutral-900 font-bold uppercase tracking-wider block">
                Proof Document
              </span>
              {activeSubmission?.proofUrl && (
                <a
                  href={activeSubmission.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-bold"
                >
                  Open Original <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Embed container */}
            <div className="flex-1 bg-neutral-100 flex items-center justify-center p-4 relative overflow-auto min-h-0">
              {activeSubmission?.proofUrl ? (
                activeSubmission.proofFileType === "application/pdf" ? (
                  <div className="w-full h-full flex flex-col items-stretch relative">
                    <iframe
                      src={activeSubmission.proofUrl}
                      className="w-full h-full border-0 rounded shadow"
                      title="PDF proof document"
                    />
                  </div>
                ) : (
                  // Image
                  <img
                    src={activeSubmission.proofUrl}
                    alt="Proof of payment"
                    className="max-w-full max-h-full object-contain rounded shadow border border-neutral-200"
                  />
                )
              ) : (
                <div className="text-center text-neutral-400 text-body-small space-y-2">
                  <AlertCircle className="w-8 h-8 mx-auto text-neutral-300" />
                  <span>No proof file uploaded with this submission</span>
                </div>
              )}
            </div>
          </div>

          {/* Details & Actions Panel (Right 4 columns) */}
          <div className="xl:col-span-4 bg-white border border-neutral-200 rounded-xl flex flex-col overflow-y-auto max-h-[600px] xl:max-h-full p-6 space-y-6">
            <div>
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">
                Selected Submission
              </span>
              <h2 className="text-title-medium text-neutral-950 font-bold leading-none">
                {activeSubmission?.student.firstName} {activeSubmission?.student.lastName}
              </h2>
              <span className="text-body-small text-neutral-500">
                Class: {activeSubmission?.student.classLevel.name} - {activeSubmission?.student.classArm.name}
              </span>
            </div>

            {/* Action feedbacks banner */}
            {successMessage && (
              <div className="p-3.5 bg-green-50 border border-green-150 rounded-lg text-green-800 text-body-small font-bold flex items-start gap-2 animate-fade-in">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}
            {actionError && (
              <div className="p-3.5 bg-red-50 border border-red-150 rounded-lg text-red-800 text-body-small font-bold flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Metadata Info Boxes */}
            <div className="space-y-4">
              <h3 className="text-label-small text-neutral-500 font-bold uppercase tracking-wider block">
                Transfer Details
              </h3>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 divide-y divide-neutral-200/60 text-body-small space-y-3">
                <div className="flex justify-between pb-3 items-center">
                  <span className="text-neutral-500 font-medium">Submitted Amount</span>
                  <span className="text-body-large font-extrabold text-neutral-900 tabular-nums">
                    {formatNaira(activeSubmission?.amount ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between py-3 items-center">
                  <span className="text-neutral-500 font-medium">Reference Code</span>
                  <span className="font-mono font-bold text-neutral-800 tracking-wide">
                    {activeSubmission?.reference}
                  </span>
                </div>
                <div className="flex justify-between py-3 items-center">
                  <span className="text-neutral-500 font-medium">Submission Date</span>
                  <span className="font-bold text-neutral-700">
                    {activeSubmission && new Date(activeSubmission.submittedAt).toLocaleString("en-NG", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex justify-between pt-3 items-center">
                  <span className="text-neutral-500 font-medium">Parent Contact</span>
                  <span className="font-bold text-neutral-800 truncate max-w-[180px]">
                    {activeSubmission?.parent.firstName} {activeSubmission?.parent.lastName}
                  </span>
                </div>
              </div>
            </div>

            {/* Invoice Context Info Box */}
            <div className="space-y-4">
              <h3 className="text-label-small text-neutral-500 font-bold uppercase tracking-wider block">
                Invoice Balance Context
              </h3>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 divide-y divide-neutral-200/60 text-body-small space-y-3">
                <div className="flex justify-between pb-3 items-center">
                  <span className="text-neutral-500 font-medium">Term Period</span>
                  <span className="font-bold text-neutral-850">
                    {activeSubmission?.invoice.term.name}
                  </span>
                </div>
                <div className="flex justify-between py-3 items-center">
                  <span className="text-neutral-500 font-medium">Invoice Total</span>
                  <span className="font-bold text-neutral-750 tabular-nums">
                    {formatNaira(activeSubmission?.invoice.finalAmount ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between py-3 items-center">
                  <span className="text-neutral-500 font-medium">Collected Prior</span>
                  <span className="font-bold text-green-650 tabular-nums">
                    {formatNaira(activeSubmission?.invoice.amountPaid ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between pt-3 items-center">
                  <span className="text-neutral-500 font-medium">Remaining Due</span>
                  <span className="font-extrabold text-amber-600 tabular-nums">
                    {formatNaira(activeSubmission?.invoice.balanceDue ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Display Rejection/Reupload details if viewing resolved status items */}
            {selectedStatus !== "Pending" && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-body-small space-y-2">
                <span className="text-[10px] text-neutral-450 font-bold uppercase block">
                  Review Log Details
                </span>
                {activeSubmission?.rejectionReason && (
                  <p className="text-red-750">
                    <strong>Rejection Reason:</strong> {activeSubmission.rejectionReason}
                  </p>
                )}
                {activeSubmission?.reuploadReason && (
                  <p className="text-amber-700">
                    <strong>Reupload Note:</strong> {activeSubmission.reuploadReason}
                  </p>
                )}
                <p className="text-neutral-500 text-[11px]">
                  Reviewed At: {activeSubmission?.reviewedAt ? new Date(activeSubmission.reviewedAt).toLocaleString() : "N/A"}
                </p>
              </div>
            )}

            {/* Action buttons (only displayed for Pending state review) */}
            {selectedStatus === "Pending" && (
              <div className="space-y-3 pt-4 border-t border-neutral-100 shrink-0">
                <button
                  onClick={() => setIsApproveOpen(true)}
                  disabled={actionLoading}
                  className="w-full py-3 bg-success-500 hover:bg-success-600 text-white rounded-lg font-bold text-label-large transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-5 h-5" />
                  Approve Transaction
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setIsReuploadOpen(true)}
                    disabled={actionLoading}
                    className="py-2.5 border border-neutral-350 text-neutral-700 hover:bg-neutral-50 rounded-lg font-bold text-label-medium transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="w-4 h-4 text-neutral-500 animate-hover-spin" />
                    Request Re-upload
                  </button>
                  <button
                    onClick={() => setIsRejectOpen(true)}
                    disabled={actionLoading}
                    className="py-2.5 border border-red-300 text-red-650 hover:bg-red-50/30 rounded-lg font-bold text-label-medium transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4 text-red-500" />
                    Reject Transfer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation dialogues */}
      {activeSubmission && (
        <>
          {/* 1. Approve modal */}
          <ConfirmationDialog
            isOpen={isApproveOpen}
            onClose={() => setIsApproveOpen(false)}
            onConfirm={() => handleAction("approve")}
            isLoading={actionLoading}
            title="Approve Transaction Ledger"
            description={`Are you sure you want to approve this direct transfer of ${formatNaira(activeSubmission.amount)} for student ${activeSubmission.student.firstName} ${activeSubmission.student.lastName}? This will permanently credit their invoice balance.`}
            confirmText="Approve & Credit Invoice"
          />

          {/* 2. Reject modal with input */}
          {isRejectOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" onClick={() => !actionLoading && setIsRejectOpen(false)} />
              <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-neutral-200 z-10 space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-650 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h3 className="text-title-small text-neutral-900 font-bold">Reject Transfer Proof</h3>
                    <p className="text-body-medium text-neutral-500">
                      Please enter the rejection reason. This reason will be shown to the parent so they understand why it was rejected.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-label-medium text-neutral-700 block">Rejection Reason *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Reference code mismatch, or payment snapshot doesn't contain matching transaction details."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-body-small focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => setIsRejectOpen(false)}
                    className="px-4 py-2 border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 rounded-lg text-body-small font-bold transition disabled:opacity-55"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={actionLoading || !rejectReason.trim()}
                    onClick={() => handleAction("reject", { reason: rejectReason })}
                    className="px-4 py-2 bg-error text-white hover:bg-error/90 font-bold rounded-lg text-body-small transition inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Re-upload modal with input */}
          {isReuploadOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" onClick={() => !actionLoading && setIsReuploadOpen(false)} />
              <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-neutral-200 z-10 space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h3 className="text-title-small text-neutral-900 font-bold">Request Proof Re-upload</h3>
                    <p className="text-body-medium text-neutral-500">
                      Explain why the parent needs to re-upload. This could be because the image is blurry, cropped, or not loading.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-label-medium text-neutral-700 block">Explanation / Note *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Uploaded snapshot is too blurry to read. Please upload a clear receipt image."
                    value={reuploadReason}
                    onChange={(e) => setReuploadReason(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-body-small focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => setIsReuploadOpen(false)}
                    className="px-4 py-2 border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 rounded-lg text-body-small font-bold transition disabled:opacity-55"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={actionLoading || !reuploadReason.trim()}
                    onClick={() => handleAction("request_reupload", { reason: reuploadReason })}
                    className="px-4 py-2 bg-primary text-white hover:bg-primary-dark font-bold rounded-lg text-body-small transition inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Request Re-upload
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 4. Bulk approve modal (independent of activeSubmission) */}
      {isBulkApproveOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !actionLoading && setIsBulkApproveOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-neutral-200 z-10 space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-title-small text-neutral-900 font-bold">Bulk Approve Payments</h3>
                <p className="text-body-medium text-neutral-500">
                  You are about to approve <strong>{selectedIds.size} payment submission{selectedIds.size !== 1 ? "s" : ""}</strong>. Each will be credited to the respective invoice and a receipt will be generated.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-body-small text-amber-800">
              <strong>Note:</strong> This action cannot be undone. Verify that all selected submissions have valid proof documents before proceeding.
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => setIsBulkApproveOpen(false)}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 rounded-lg text-body-small font-bold transition disabled:opacity-55"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleBulkApprove}
                className="px-4 py-2 bg-success-500 hover:bg-success-600 text-white font-bold rounded-lg text-body-small transition inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Approve {selectedIds.size} Payment{selectedIds.size !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
