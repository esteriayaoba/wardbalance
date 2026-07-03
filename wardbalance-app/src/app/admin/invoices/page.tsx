"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, AlertCircle, CheckCircle } from "lucide-react";
import InvoiceFilters from "@/components/admin/invoices/invoice-filters";
import InvoiceTable from "@/components/admin/invoices/invoice-table";
import PaginationBar from "@/components/admin/shared/pagination-bar";
import InvoiceDetailDrawer from "@/components/admin/invoices/invoice-detail-drawer";
import GenerateWizard from "@/components/admin/invoices/generate-wizard";
import ConfirmationDialog from "@/components/admin/shared/confirmation-dialog";

interface Student {
  firstName: string;
  lastName: string;
  admissionNumber: string;
  classLevel: { name: string };
  classArm: { name: string };
}

interface LineItem {
  id: string; name: string; amount: string; lineType: "fee_item" | "carryover" | "discount" | "custom";
}

interface Payment {
  id: string; amount: string; method: string; createdAt: string; reference: string | null;
}

interface Invoice {
  id: string; studentId: string; student: Student; termId: string;
  term: { name: string; session: { name: string } };
  status: "draft" | "issued" | "partial" | "paid" | "overdue";
  dueDate: string; totalAmount: string; discountAmount: string;
  finalAmount: string; amountPaid: string; balanceDue: string;
  lineItems?: LineItem[]; payments?: Payment[];
}

interface ClassLevel { id: string; name: string; }

interface AcademicTerm { id: string; name: string; isActive: boolean; session: { name: string }; }

interface GenerationPreview {
  studentId: string; firstName: string; lastName: string;
  admissionNumber: string; classArm: string;
  feesAmount: string; carryoverAmount: string; totalExpected: string;
  alreadyHasInvoice: boolean;
}

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [emailVerified, setEmailVerified] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterClassLevelId, setFilterClassLevelId] = useState("");
  const [filterTermId, setFilterTermId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<Invoice | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizClassLevelId, setWizClassLevelId] = useState("");
  const [wizTermId, setWizTermId] = useState("");
  const [wizDueDate, setWizDueDate] = useState("");
  const [previews, setPreviews] = useState<GenerationPreview[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [previewWarning, setPreviewWarning] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 20;

  useEffect(() => { setPage(1); }, [filterClassLevelId, filterTermId, filterStatus, searchQuery]);

  const loadData = () => {
    setLoading(true);
    const offset = (page - 1) * pageSize;
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
    if (filterTermId) params.set("termId", filterTermId);
    if (filterClassLevelId) params.set("classLevelId", filterClassLevelId);
    if (filterStatus) params.set("status", filterStatus);
    const invoiceUrl = `/api/admin/invoices?${params.toString()}`;
    Promise.all([
      fetch(invoiceUrl).then((r) => r.json()),
      fetch("/api/admin/academic/classes").then((r) => r.json()),
      fetch("/api/admin/academic/terms").then((r) => r.json()),
      fetch("/api/admin/verify-email").then((r) => r.json()).catch(() => ({ emailVerified: true })),
    ])
      .then(([invoiceRes, classRes, termRes, verifyRes]) => {
        setInvoices(invoiceRes.data || []);
        setTotalRecords(invoiceRes.meta?.total ?? 0);
        setEmailVerified(verifyRes.emailVerified ?? true);
        const divisions = classRes.data || [];
        setClassLevels(divisions.flatMap((d: any) =>
          d.classLevels.map((l: any) => ({ id: l.id, name: `${d.name} — ${l.name}` }))
        ));
        const termsList = termRes.data || [];
        setTerms(termsList);
        const activeTerm = termsList.find((t: any) => t.isActive);
        if (activeTerm) setFilterTermId(activeTerm.id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [page, filterClassLevelId, filterTermId, filterStatus, searchQuery]);

  useEffect(() => { loadData(); }, []);

  const loadInvoiceDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch invoice details");
      setInvoiceDetails(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally { setDetailsLoading(false); }
  };

  const handleInvoiceClick = (invoice: any) => {
    setSelectedInvoice(invoice as Invoice);
    loadInvoiceDetails(invoice.id);
  };

  const handleIssueInvoice = async (id: string) => {
    setActionLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "issued" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to issue invoice");
      setSuccess("Invoice issued successfully.");
      loadInvoiceDetails(id); loadData();
    } catch (err: any) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleUpdateDueDate = async (id: string, dueDate: string) => {
    setActionLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update due date");
      setSuccess("Invoice due date updated.");
      loadInvoiceDetails(id); loadData();
    } catch (err: any) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleDiscountSubmit = async (id: string, discountType: "fixed" | "percentage" | "none", discountValue: number) => {
    setActionLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountType, discountValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to apply discount");
      setSuccess("Discount applied.");
      loadInvoiceDetails(id); loadData();
    } catch (err: any) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleDeleteInvoice = async (id: string) => {
    setActionLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete invoice");
      setSuccess("Invoice deleted.");
      setSelectedInvoice(null); setInvoiceDetails(null); loadData();
    } catch (err: any) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleOpenWizard = () => {
    setWizardStep(1); setWizClassLevelId("");
    const activeTerm = terms.find((t) => t.isActive);
    setWizTermId(activeTerm?.id || filterTermId || "");
    const d = new Date(); d.setDate(d.getDate() + 30);
    setWizDueDate(d.toISOString().substring(0, 10));
    setPreviews([]); setSelectedStudentIds([]); setPreviewWarning(null);
    setShowWizard(true);
  };

  const handleFetchWizardPreview = async (classLevelId: string, termId: string, dueDate: string) => {
    setActionLoading(true); setError(null); setPreviewWarning(null);
    try {
      const res = await fetch(`/api/admin/invoices/generate?classLevelId=${classLevelId}&termId=${termId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to retrieve preview");
      const list = data.data || [];
      setPreviews(list);
      setPreviewWarning(data.warning || null);
      setSelectedStudentIds(list.filter((p: any) => !p.alreadyHasInvoice).map((p: any) => p.studentId));
      setWizardStep(2);
    } catch (err: any) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleGenerateInvoices = async (studentIds: string[]) => {
    if (studentIds.length === 0) { setError("Select at least one student."); return; }
    setActionLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classLevelId: wizClassLevelId, termId: wizTermId,
          dueDate: wizDueDate, studentIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate invoices");
      setSuccess(`Generated ${data.count} invoices.`);
      setShowWizard(false); loadData();
    } catch (err: any) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const toggleSelectAllWiz = () => {
    const billable = previews.filter((p) => !p.alreadyHasInvoice);
    setSelectedStudentIds((prev) =>
      prev.length === billable.length ? [] : billable.map((p) => p.studentId)
    );
  };

  const filteredInvoices = invoices.filter((inv) => {
    const name = `${inv.student.firstName} ${inv.student.lastName}`.toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase()) || inv.student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-headline-small text-neutral-900 font-bold">Invoices Registry</h1>
          <p className="text-body-medium text-neutral-600">Generate, issue, and manage invoices and student discounts per academic term.</p>
        </div>
        <button
          onClick={handleOpenWizard}
          disabled={!emailVerified}
          title={!emailVerified ? "Verify your email to use this action." : undefined}
          className="px-4 py-2 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center gap-2 shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Generate Invoices
        </button>
      </div>

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

      <InvoiceFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterTermId={filterTermId}
        onTermChange={setFilterTermId}
        filterClassLevelId={filterClassLevelId}
        onClassLevelChange={setFilterClassLevelId}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        terms={terms}
        classLevels={classLevels}
      />

      <InvoiceTable invoices={filteredInvoices} onInvoiceClick={(inv) => handleInvoiceClick(inv as Invoice)} />

      <PaginationBar
        currentPage={page}
        pageSize={pageSize}
        total={totalRecords}
        loading={loading}
        onPageChange={setPage}
      />

      <InvoiceDetailDrawer
        invoice={selectedInvoice}
        details={invoiceDetails}
        loading={detailsLoading}
        actionLoading={actionLoading}
        emailVerified={emailVerified}
        onClose={() => { setSelectedInvoice(null); setInvoiceDetails(null); }}
        onIssue={handleIssueInvoice}
        onDelete={(id) => setInvoiceToDelete(id)}
        onUpdateDueDate={handleUpdateDueDate}
        onApplyDiscount={handleDiscountSubmit}
      />

      <GenerateWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        classLevels={classLevels}
        terms={terms}
        actionLoading={actionLoading}
        onSubmitPreview={handleFetchWizardPreview}
        onSubmitGenerate={handleGenerateInvoices}
        wizardStep={wizardStep}
        onBack={() => setWizardStep(1)}
        wizClassLevelId={wizClassLevelId}
        wizTermId={wizTermId}
        wizDueDate={wizDueDate}
        previews={previews}
        selectedStudentIds={selectedStudentIds}
        previewWarning={previewWarning}
        onClassLevelChange={setWizClassLevelId}
        onTermChange={setWizTermId}
        onDueDateChange={setWizDueDate}
        onToggleStudent={toggleStudentSelection}
        onToggleSelectAll={toggleSelectAllWiz}
      />

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
        variant="destructive"
        isLoading={actionLoading}
      />
    </div>
  );
}
