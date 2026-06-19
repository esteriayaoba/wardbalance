"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, AlertCircle, CheckCircle, Search, FileText, Calendar, Trash2, Tag, Percent, Receipt, AlertTriangle } from "lucide-react";
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

interface Term {
  name: string;
  session: { name: string };
}

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

interface Invoice {
  id: string;
  studentId: string;
  student: Student;
  termId: string;
  term: Term;
  status: "draft" | "issued" | "partial" | "paid" | "overdue";
  dueDate: string;
  totalAmount: string;
  discountAmount: string;
  finalAmount: string;
  amountPaid: string;
  balanceDue: string;
  lineItems?: LineItem[];
  payments?: Payment[];
}

interface ClassLevel {
  id: string;
  name: string;
}

interface AcademicTerm {
  id: string;
  name: string;
  isActive: boolean;
  session: { name: string };
}

interface GenerationPreview {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  classArm: string;
  feesAmount: string;
  carryoverAmount: string;
  totalExpected: string;
  alreadyHasInvoice: boolean;
}

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClassLevelId, setFilterClassLevelId] = useState("");
  const [filterTermId, setFilterTermId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // UI state overlays
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<Invoice | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizClassLevelId, setWizClassLevelId] = useState("");
  const [wizTermId, setWizTermId] = useState("");
  const [wizDueDate, setWizDueDate] = useState("");
  const [previews, setPreviews] = useState<GenerationPreview[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [previewWarning, setPreviewWarning] = useState<string | null>(null);

  // Discount Form State
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [discountType, setDiscountType] = useState<"fixed" | "percentage" | "none">("none");
  const [discountValue, setDiscountValue] = useState("");

  // Edit Due Date State
  const [editDueDate, setEditDueDate] = useState(false);
  const [newDueDate, setNewDueDate] = useState("");

  // Alerts
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Deletion State
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/invoices").then((r) => r.json()),
      fetch("/api/admin/academic/classes").then((r) => r.json()),
      fetch("/api/admin/academic/terms").then((r) => r.json()),
    ])
      .then(([invoiceRes, classRes, termRes]) => {
        setInvoices(invoiceRes.data || []);
        
        const divisions = classRes.data || [];
        const flatLevels = divisions.flatMap((d: any) =>
          d.classLevels.map((l: any) => ({ id: l.id, name: `${d.name} — ${l.name}` }))
        );
        setClassLevels(flatLevels);

        const termsList = termRes.data || [];
        setTerms(termsList);

        const activeTerm = termsList.find((t: any) => t.isActive);
        if (activeTerm) {
          setFilterTermId(activeTerm.id);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error("Load invoices failed:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadInvoiceDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch invoice details");
      setInvoiceDetails(data.data);
      setNewDueDate(data.data.dueDate.substring(0, 10));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDiscountForm(false);
    setEditDueDate(false);
    loadInvoiceDetails(invoice.id);
  };

  // Status transitions: Issue draft invoice
  const handleIssueInvoice = async (id: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "issued" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to issue invoice");
      
      setSuccess("Invoice issued successfully.");
      loadInvoiceDetails(id);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Update Due Date
  const handleUpdateDueDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceDetails) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/invoices/${invoiceDetails.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: newDueDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update due date");

      setSuccess("Invoice due date updated.");
      setEditDueDate(false);
      loadInvoiceDetails(invoiceDetails.id);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Discount
  const handleDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceDetails) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/invoices/${invoiceDetails.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountType,
          discountValue: discountType === "none" ? 0 : parseFloat(discountValue),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to apply discount");

      setSuccess("Discount successfully applied to invoice.");
      setShowDiscountForm(false);
      setDiscountValue("");
      loadInvoiceDetails(invoiceDetails.id);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async (id: string) => {
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/invoices/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete invoice");

      setSuccess("Invoice deleted successfully.");
      setSelectedInvoice(null);
      setInvoiceDetails(null);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Wizard
  const handleOpenWizard = () => {
    setWizardStep(1);
    setWizClassLevelId("");
    // Pre-select active term
    const activeTerm = terms.find((t) => t.isActive);
    setWizTermId(activeTerm?.id || filterTermId || "");
    // Default due date to 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setWizDueDate(d.toISOString().substring(0, 10));
    setPreviews([]);
    setSelectedStudentIds([]);
    setPreviewWarning(null);
    setShowWizard(true);
  };

  // Fetch Preview for Wizard
  const handleFetchWizardPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setPreviewWarning(null);

    try {
      const res = await fetch(`/api/admin/invoices/generate?classLevelId=${wizClassLevelId}&termId=${wizTermId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to retrieve batch previews");

      const previewsList = data.data || [];
      setPreviews(previewsList);
      setPreviewWarning(data.warning || null);

      // Default select all students who do not already have an invoice
      const targetIds = previewsList
        .filter((p: any) => !p.alreadyHasInvoice)
        .map((p: any) => p.studentId);
      setSelectedStudentIds(targetIds);

      setWizardStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Invoice Generation in Wizard
  const handleGenerateInvoices = async () => {
    if (selectedStudentIds.length === 0) {
      setError("Please select at least one student to generate invoices for.");
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classLevelId: wizClassLevelId,
          termId: wizTermId,
          dueDate: wizDueDate,
          studentIds: selectedStudentIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate invoices");

      setSuccess(`Invoices successfully generated for ${data.count} students.`);
      setShowWizard(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Checkbox select toggle
  const toggleStudentSelection = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((sid) => sid !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  // Toggle select all in wizard preview
  const toggleSelectAllWiz = () => {
    const billableStudents = previews.filter((p) => !p.alreadyHasInvoice);
    if (selectedStudentIds.length === billableStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(billableStudents.map((p) => p.studentId));
    }
  };

  // Filter main invoices list
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      `${inv.student.firstName} ${inv.student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass = !filterClassLevelId || inv.student.classLevel.name.includes(classLevels.find((c) => c.id === filterClassLevelId)?.name.split(" — ")[1] || "");
    const matchesTerm = !filterTermId || inv.termId === filterTermId;
    const matchesStatus = !filterStatus || inv.status === filterStatus;

    return matchesSearch && matchesClass && matchesTerm && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-body-large text-neutral-600">Retrieving invoices ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header and CTAs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-headline-small text-neutral-900 font-bold">Invoices Registry</h1>
          <p className="text-body-medium text-neutral-600">
            Generate, issue, and manage invoices and student discounts per academic term.
          </p>
        </div>

        <button
          onClick={handleOpenWizard}
          className="px-4 py-2 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center gap-2 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Generate Invoices
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
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:w-80">
          <Search className="absolute w-4 h-4 text-neutral-400 left-3 top-3.5 z-10" />
          <Input
            type="text"
            placeholder="Search student or admission no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          {/* Term Filter */}
          <div className="w-48">
            <Select
              value={filterTermId}
              onChange={(e) => setFilterTermId(e.target.value)}
              className="py-2.5"
            >
              <option value="">All Terms</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.session.name} — {t.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Class Level Filter */}
          <div className="w-48">
            <Select
              value={filterClassLevelId}
              onChange={(e) => setFilterClassLevelId(e.target.value)}
              className="py-2.5"
            >
              <option value="">All Classes</option>
              {classLevels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
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
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
              <th className="px-6 py-3 font-semibold">Student Name</th>
              <th className="px-6 py-3 font-semibold">Admission No</th>
              <th className="px-6 py-3 font-semibold">Class Arm</th>
              <th className="px-6 py-3 font-semibold">Final Amount</th>
              <th className="px-6 py-3 font-semibold">Balance Due</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filteredInvoices.map((inv) => {
              const isOverdue = inv.status === "overdue";
              const isPaid = inv.status === "paid";
              return (
                <tr key={inv.id} className="text-body-medium text-neutral-800 hover:bg-neutral-50/50">
                  <td className="px-6 py-4 font-bold text-neutral-900">
                    {inv.student.lastName}, {inv.student.firstName}
                  </td>
                  <td className="px-6 py-4 font-mono text-neutral-500 tabular-nums">
                    {inv.student.admissionNumber}
                  </td>
                  <td className="px-6 py-4">
                    {inv.student.classLevel.name} — {inv.student.classArm.name}
                  </td>
                  <td className="px-6 py-4 font-semibold text-neutral-900 tabular-nums">
                    {formatNaira(inv.finalAmount)}
                  </td>
                  <td
                    className={`px-6 py-4 font-bold tabular-nums ${
                      isPaid ? "text-green-600" : isOverdue ? "text-red-600" : "text-amber-600"
                    }`}
                  >
                    {formatNaira(inv.balanceDue)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        inv.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : inv.status === "partial"
                          ? "bg-amber-100 text-amber-700"
                          : inv.status === "overdue"
                          ? "bg-red-100 text-red-700"
                          : inv.status === "issued"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleInvoiceClick(inv)}
                      className="px-3 py-1.5 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded-lg text-body-small font-bold inline-flex items-center gap-1.5 transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Details
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">
                  No invoices found matching selected parameters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-over Drawer: Invoice Details */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-full max-w-xl h-full overflow-y-auto p-8 shadow-xl flex flex-col justify-between border-l border-neutral-200">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <div>
                  <h3 className="text-title-medium text-neutral-900 font-bold">
                    Invoice Details
                  </h3>
                  <p className="text-body-small text-neutral-500 font-medium">
                    {selectedInvoice.student.lastName}, {selectedInvoice.student.firstName} ({selectedInvoice.student.admissionNumber})
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedInvoice(null);
                    setInvoiceDetails(null);
                  }}
                  className="text-body-small text-neutral-500 hover:text-neutral-900 font-bold"
                >
                  Close
                </button>
              </div>

              {detailsLoading || !invoiceDetails ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Status & Quick action bar */}
                  <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 font-semibold block uppercase">
                        Current Status
                      </span>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 ${
                          invoiceDetails.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : invoiceDetails.status === "partial"
                            ? "bg-amber-100 text-amber-700"
                            : invoiceDetails.status === "overdue"
                            ? "bg-red-100 text-red-700"
                            : invoiceDetails.status === "issued"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {invoiceDetails.status}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {invoiceDetails.status === "draft" && (
                        <button
                          onClick={() => handleIssueInvoice(invoiceDetails.id)}
                          disabled={actionLoading}
                          className="px-3.5 py-1.5 bg-primary text-white hover:bg-primary-dark font-bold text-body-small rounded-lg shadow-sm transition"
                        >
                          Issue Invoice
                        </button>
                      )}
                      
                      {/* Only allow deletion of draft/issued with no payments */}
                      {(invoiceDetails.status === "draft" || invoiceDetails.status === "issued") && (
                        <button
                          onClick={() => setInvoiceToDelete(invoiceDetails.id)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 border border-red-200 text-error hover:bg-red-50 font-bold text-body-small rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Due Date Details Block */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-label-medium text-neutral-800 font-bold block">
                        Invoice Term & Timestamps
                      </span>
                      {!editDueDate && (invoiceDetails.status === "draft" || invoiceDetails.status === "issued") && (
                        <button
                          onClick={() => setEditDueDate(true)}
                          className="text-body-small text-primary hover:underline font-bold"
                        >
                          Edit Due Date
                        </button>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-neutral-100 space-y-2.5 text-body-medium">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Academic Term:</span>
                        <span className="font-bold text-neutral-800">
                          {invoiceDetails.term.session.name} — {invoiceDetails.term.name}
                        </span>
                      </div>

                      {editDueDate ? (
                        <form onSubmit={handleUpdateDueDate} className="flex gap-2 items-center justify-between pt-2">
                          <div className="flex-1">
                            <Input
                              type="date"
                              required
                              value={newDueDate}
                              onChange={(e) => setNewDueDate(e.target.value)}
                              className="py-1.5"
                            />
                          </div>
                          <div className="flex gap-1 self-end pb-1.5">
                            <button
                              type="submit"
                              disabled={actionLoading}
                              className="px-3 py-2 bg-green-600 text-white font-bold rounded-lg text-body-small hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditDueDate(false)}
                              className="px-3 py-2 border border-neutral-300 text-neutral-600 font-bold rounded-lg text-body-small hover:bg-neutral-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Payment Due Date:</span>
                          <span className="font-bold text-neutral-850 inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                            {new Date(invoiceDetails.dueDate).toLocaleDateString("en-NG", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Line Items breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-label-medium text-neutral-800 font-bold block">
                        Line Items Breakdown
                      </span>
                      {!showDiscountForm && (
                        <button
                          onClick={() => {
                            setDiscountType(invoiceDetails.discountAmount !== "0" ? "fixed" : "none");
                            setShowDiscountForm(true);
                          }}
                          className="text-body-small text-primary hover:underline font-bold inline-flex items-center gap-1"
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
                          <div>
                            <Select
                              label="Discount Type"
                              value={discountType}
                              onChange={(e: any) => setDiscountType(e.target.value)}
                              className="py-1.5 text-body-small"
                            >
                              <option value="none">No Discount</option>
                              <option value="fixed">Fixed Amount (₦)</option>
                              <option value="percentage">Percentage (%)</option>
                            </Select>
                          </div>

                          {discountType !== "none" && (
                            <div>
                              <Input
                                label={discountType === "fixed" ? "Value (₦)" : "Rate (%)"}
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                placeholder={discountType === "fixed" ? "5,000" : "10"}
                                value={discountValue}
                                onChange={(e) => setDiscountValue(e.target.value)}
                                className="py-1.5 text-body-small font-bold"
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="submit"
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-primary text-white font-bold rounded-lg text-body-small hover:bg-primary-dark"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDiscountForm(false)}
                            className="px-3 py-1.5 border border-neutral-300 text-neutral-600 font-bold rounded-lg text-body-small hover:bg-neutral-50"
                          >
                            Cancel
                          </button>
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
                          {invoiceDetails.lineItems?.map((item) => {
                            const isDiscount = item.lineType === "discount";
                            const isCarryover = item.lineType === "carryover";

                            return (
                              <tr key={item.id} className="text-neutral-800">
                                <td className="px-4 py-2.5">
                                  <span>{item.name}</span>
                                  {isCarryover && (
                                    <span className="ml-2 inline-flex px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase">
                                      Carryover
                                    </span>
                                  )}
                                </td>
                                <td
                                  className={`px-4 py-2.5 text-right font-semibold tabular-nums ${
                                    isDiscount ? "text-green-600" : "text-neutral-900"
                                  }`}
                                >
                                  {formatNaira(item.amount)}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Aggregate Totals */}
                          <tr className="bg-neutral-50/50">
                            <td className="px-4 py-2.5 font-bold text-neutral-900">Total Bill</td>
                            <td className="px-4 py-2.5 text-right font-bold text-neutral-900 tabular-nums">
                              {formatNaira(invoiceDetails.totalAmount)}
                            </td>
                          </tr>
                          {parseFloat(invoiceDetails.discountAmount) > 0 && (
                            <tr className="bg-green-50/20">
                              <td className="px-4 py-2.5 font-bold text-green-700">Total Discounts</td>
                              <td className="px-4 py-2.5 text-right font-bold text-green-700 tabular-nums">
                                -{formatNaira(invoiceDetails.discountAmount)}
                              </td>
                            </tr>
                          )}
                          <tr className="border-t-2 border-neutral-300 bg-neutral-100/40">
                            <td className="px-4 py-3 font-bold text-primary">Final Amount Due</td>
                            <td className="px-4 py-3 text-right font-bold text-primary text-title-small tabular-nums">
                              {formatNaira(invoiceDetails.finalAmount)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payments Log */}
                  <div className="space-y-2">
                    <span className="text-label-medium text-neutral-800 font-bold block">
                      Payments Recorded
                    </span>
                    <div className="p-4 rounded-xl border border-neutral-150 space-y-2 bg-neutral-50/40">
                      <div className="flex justify-between text-body-medium">
                        <span className="text-neutral-500">Amount Paid:</span>
                        <span className="font-bold text-green-600 tabular-nums">
                          {formatNaira(invoiceDetails.amountPaid)}
                        </span>
                      </div>
                      <div className="flex justify-between text-body-medium pt-1 border-t border-neutral-100">
                        <span className="text-neutral-500">Remaining Balance:</span>
                        <span className={`font-extrabold tabular-nums ${parseFloat(invoiceDetails.balanceDue) === 0 ? "text-green-600" : "text-amber-600"}`}>
                          {formatNaira(invoiceDetails.balanceDue)}
                        </span>
                      </div>

                      {/* Individual payments breakdown */}
                      {invoiceDetails.payments && invoiceDetails.payments.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-neutral-200 space-y-2">
                          <div className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">
                            Payment Log
                          </div>
                          {invoiceDetails.payments.map((p) => (
                            <div key={p.id} className="flex justify-between items-center text-body-small bg-white p-2 rounded border border-neutral-200">
                              <div>
                                <span className="font-bold text-neutral-800 uppercase shrink-0 inline-flex items-center gap-1">
                                  <Receipt className="w-3.5 h-3.5 text-neutral-400" />
                                  {p.method.replace("_", " ")}
                                </span>
                                {p.reference && (
                                  <span className="text-neutral-400 ml-2 font-mono">Ref: {p.reference}</span>
                                )}
                              </div>
                              <span className="font-bold text-neutral-900 tabular-nums">
                                {formatNaira(p.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog: Invoice Generation Wizard */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col justify-between max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-title-small text-neutral-900 font-bold">
                  Bulk Invoice Generation Wizard
                </h3>
                <p className="text-body-small text-neutral-500">
                  Step {wizardStep} of 2 — {wizardStep === 1 ? "Select target criteria" : "Preview student batch invoices"}
                </p>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="text-body-small text-neutral-500 hover:text-neutral-900 font-bold"
              >
                Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {wizardStep === 1 ? (
                <form onSubmit={handleFetchWizardPreview} className="space-y-4 max-w-md mx-auto py-4">
                  {/* Select Class */}
                  <Select
                    label="Target Class Level *"
                    required
                    value={wizClassLevelId}
                    onChange={(e) => setWizClassLevelId(e.target.value)}
                  >
                    <option value="">Choose Class Level...</option>
                    {classLevels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>

                  {/* Select Term */}
                  <Select
                    label="Academic Billing Term *"
                    required
                    value={wizTermId}
                    onChange={(e) => setWizTermId(e.target.value)}
                  >
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.session.name} — {t.name} {t.isActive ? "(Active)" : ""}
                      </option>
                    ))}
                  </Select>

                  {/* Due Date */}
                  <Input
                    label="Payment Due Date *"
                    type="date"
                    required
                    value={wizDueDate}
                    onChange={(e) => setWizDueDate(e.target.value)}
                    className="font-semibold text-neutral-800"
                  />

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full mt-4 px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center justify-center gap-2 shadow"
                  >
                    {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Continue to Preview
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  {/* Warning Alerts */}
                  {previewWarning && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-amber-50 text-amber-800 text-body-small border border-amber-200">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                      <span>{previewWarning}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center bg-neutral-50 p-3 rounded-lg border border-neutral-250">
                    <div className="text-body-small text-neutral-600 font-medium">
                      Select students to bill. Duplicates are pre-identified and excluded automatically.
                    </div>
                    <button
                      onClick={toggleSelectAllWiz}
                      className="text-body-small text-primary hover:underline font-bold"
                    >
                      {selectedStudentIds.length === previews.filter((p) => !p.alreadyHasInvoice).length
                        ? "Deselect All"
                        : "Select All Billable"}
                    </button>
                  </div>

                  {/* Previews Table */}
                  <div className="border border-neutral-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-body-medium">
                      <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-205 text-label-medium text-neutral-500">
                          <th className="px-4 py-2 font-semibold w-10"></th>
                          <th className="px-4 py-2 font-semibold">Student Name (Class Arm)</th>
                          <th className="px-4 py-2 font-semibold text-right">Base Fees</th>
                          <th className="px-4 py-2 font-semibold text-right">Carryover</th>
                          <th className="px-4 py-2 font-semibold text-right">Total expected</th>
                          <th className="px-4 py-2 font-semibold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {previews.map((p) => (
                          <tr key={p.studentId} className={`hover:bg-neutral-50/50 ${p.alreadyHasInvoice ? "opacity-60 bg-neutral-50" : ""}`}>
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                disabled={p.alreadyHasInvoice}
                                checked={selectedStudentIds.includes(p.studentId)}
                                onChange={() => toggleStudentSelection(p.studentId)}
                                className="w-4 h-4 border border-neutral-300 rounded text-primary focus:ring-primary focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="px-4 py-3 font-bold text-neutral-900">
                              {p.lastName}, {p.firstName} ({p.classArm})
                              <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{p.admissionNumber}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-neutral-700">
                              {formatNaira(p.feesAmount)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-amber-700">
                              {formatNaira(p.carryoverAmount)}
                            </td>
                            <td className="px-4 py-3 text-right font-extrabold tabular-nums text-neutral-950">
                              {formatNaira(p.totalExpected)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {p.alreadyHasInvoice ? (
                                <span className="inline-flex px-2 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-bold uppercase">
                                  Already Invoiced
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded bg-green-100 text-green-700 text-[9px] font-bold uppercase">
                                  Ready
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {previews.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-neutral-400">
                              No active students found in this class level to generate invoices for.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
              {wizardStep === 2 ? (
                <>
                  <button
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 border border-neutral-300 text-neutral-700 bg-white rounded-lg text-body-medium font-bold hover:bg-neutral-50 transition"
                  >
                    Back
                  </button>
                  
                  <div className="flex gap-2 items-center">
                    <span className="text-body-small text-neutral-500 font-medium">
                      Selected: <strong>{selectedStudentIds.length}</strong> students
                    </span>
                    <button
                      onClick={handleGenerateInvoices}
                      disabled={actionLoading || selectedStudentIds.length === 0}
                      className="px-4 py-2 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg shadow-sm transition"
                    >
                      {actionLoading ? "Generating..." : "Generate Invoices"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex justify-end w-full">
                  <button
                    onClick={() => setShowWizard(false)}
                    className="px-4 py-2 border border-neutral-300 text-neutral-700 bg-white rounded-lg text-body-medium font-bold hover:bg-neutral-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Dialog for Delete Invoice */}
      <ConfirmationDialog
        isOpen={invoiceToDelete !== null}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={async () => {
          if (!invoiceToDelete) return;
          const id = invoiceToDelete;
          setInvoiceToDelete(null);
          await handleDeleteInvoice(id);
        }}
        title="Delete Invoice"
        description="Are you sure you want to delete this invoice? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={actionLoading}
      />
    </div>
  );
}
