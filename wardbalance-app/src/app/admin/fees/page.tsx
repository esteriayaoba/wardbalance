"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, AlertCircle, CheckCircle, Search, ShieldAlert } from "lucide-react";
import FeeLibraryTable from "@/components/admin/fees/fee-library-table";
import TemplateCardGrid from "@/components/admin/fees/template-card-grid";
import FeeItemDrawer from "@/components/admin/fees/fee-item-drawer";
import TemplateDrawer from "@/components/admin/fees/template-drawer";

interface FeeItem {
  id: string; name: string; description: string | null;
  type: "mandatory" | "optional";
  billingFrequency: "per_term" | "per_session" | "one_off";
  amount: string; createdAt: string;
}

interface TemplateItem {
  id: string; feeItemId: string; amountOverride: string | null; feeItem: FeeItem;
}

interface ClassLevel { id: string; name: string; }

interface AcademicTerm { id: string; name: string; isActive: boolean; session: { name: string }; }

interface ClassFeeTemplate {
  id: string; classLevelId: string; classLevel: ClassLevel;
  termId: string; term: AcademicTerm;
  status: "draft" | "published"; items: TemplateItem[];
}

export default function FeeStructurePage() {
  const [activeTab, setActiveTab] = useState<"library" | "templates">("library");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(true);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [templates, setTemplates] = useState<ClassFeeTemplate[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");

  const [showLibraryDrawer, setShowLibraryDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState<FeeItem | null>(null);
  const [libName, setLibName] = useState("");
  const [libDesc, setLibDesc] = useState("");
  const [libType, setLibType] = useState<"mandatory" | "optional">("mandatory");
  const [libFreq, setLibFreq] = useState<"per_term" | "per_session" | "one_off">("per_term");
  const [libAmount, setLibAmount] = useState("");

  const [showTemplateDrawer, setShowTemplateDrawer] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ClassFeeTemplate | null>(null);
  const [tempClassLevelId, setTempClassLevelId] = useState("");
  const [tempTermId, setTempTermId] = useState("");
  const [tempStatus, setTempStatus] = useState<"draft" | "published">("draft");
  const [tempSelectedItems, setTempSelectedItems] = useState<{ feeItemId: string; amountOverride: string }[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/fees/library").then((r) => r.json()),
      fetch("/api/admin/fees/templates").then((r) => r.json()),
      fetch("/api/admin/academic/classes").then((r) => r.json()),
      fetch("/api/admin/academic/terms").then((r) => r.json()),
      fetch("/api/admin/verify-email").then((r) => r.json()).catch(() => ({ emailVerified: true })),
    ]).then(([libRes, tempRes, classRes, termRes, verifyRes]) => {
      setFeeItems(libRes.data || []);
      setTemplates(tempRes.data || []);
      setEmailVerified(verifyRes.emailVerified ?? true);
      const divisions = classRes.data || [];
      setClassLevels(divisions.flatMap((d: any) => d.classLevels.map((l: any) => ({ id: l.id, name: `${d.name} — ${l.name}` }))));
      const termsList = termRes.data || [];
      setTerms(termsList);
      const activeTerm = termsList.find((t: any) => t.isActive);
      if (activeTerm) setSelectedTermId(activeTerm.id);
      else if (termsList.length > 0) setSelectedTermId(termsList[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenLibraryDrawer = (item: any = null) => {
    setEditingItem(item);
    setLibName(item?.name ?? "");
    setLibDesc(item?.description ?? "");
    setLibType(item?.type ?? "mandatory");
    setLibFreq(item?.billingFrequency ?? "per_term");
    setLibAmount(item?.amount ?? "");
    setShowLibraryDrawer(true);
  };

  const handleLibrarySubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true); setError(null); setSuccess(null);
    const payload = { name: libName.trim(), description: libDesc.trim() || undefined, type: libType, billingFrequency: libFreq, amount: parseFloat(libAmount) };
    try {
      const method = editingItem ? "PUT" : "POST";
      const body = editingItem ? { id: editingItem.id, ...payload } : payload;
      const res = await fetch("/api/admin/fees/library", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save fee item");
      setSuccess(editingItem ? "Fee item updated." : "New fee item added.");
      setShowLibraryDrawer(false); loadData();
    } catch (err: any) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleDeleteLibraryItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fee item?")) return;
    setActionLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`/api/admin/fees/library?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      setSuccess("Fee item deleted."); loadData();
    } catch (err: any) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleOpenTemplateDrawer = (template: any = null) => {
    setEditingTemplate(template);
    if (template) {
      setTempClassLevelId(template.classLevelId);
      setTempTermId(template.termId);
      setTempStatus(template.status);
      setTempSelectedItems(template.items.map((i: TemplateItem) => ({ feeItemId: i.feeItemId, amountOverride: i.amountOverride || "" })));
    } else {
      setTempClassLevelId("");
      const activeTerm = terms.find((t) => t.isActive);
      setTempTermId(activeTerm?.id || selectedTermId || "");
      setTempStatus("draft");
      setTempSelectedItems([]);
    }
    setShowTemplateDrawer(true);
  };

  const handleToggleTemplateFeeItem = (feeItemId: string) => {
    setTempSelectedItems((prev) =>
      prev.some((i) => i.feeItemId === feeItemId)
        ? prev.filter((i) => i.feeItemId !== feeItemId)
        : [...prev, { feeItemId, amountOverride: "" }]
    );
  };

  const handleAmountOverrideChange = (feeItemId: string, val: string) => {
    setTempSelectedItems((prev) => prev.map((i) => i.feeItemId === feeItemId ? { ...i, amountOverride: val } : i));
  };

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true); setError(null); setSuccess(null);
    if (tempSelectedItems.length === 0) { setError("Select at least one fee item."); setActionLoading(false); return; }
    try {
      const method = editingTemplate ? "PUT" : "POST";
      const payload = { classLevelId: tempClassLevelId, termId: tempTermId, status: tempStatus, items: tempSelectedItems.map((i) => ({ feeItemId: i.feeItemId, amountOverride: i.amountOverride ? parseFloat(i.amountOverride) : null })) };
      const body = editingTemplate ? { id: editingTemplate.id, ...payload } : payload;
      const res = await fetch("/api/admin/fees/templates", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save template");
      setSuccess(editingTemplate ? "Template updated." : "Template created.");
      setShowTemplateDrawer(false); loadData();
    } catch (err: any) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    setActionLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`/api/admin/fees/templates?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      setSuccess("Template deleted."); loadData();
    } catch (err: any) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesTerm = !selectedTermId || t.termId === selectedTermId;
    const matchesSearch = !searchQuery || t.classLevel.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTerm && matchesSearch;
  });

  const filteredLibrary = feeItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-body-large text-neutral-600">Retrieving financial configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-headline-small text-neutral-900 font-bold">Fee Structure</h1>
          <p className="text-body-medium text-neutral-600">Define structural school fees and assemble terms templates for batch invoice generation.</p>
        </div>
        <div>
          {activeTab === "library" ? (
            <button onClick={() => handleOpenLibraryDrawer(null)} disabled={!emailVerified}
              className="px-4 py-2 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center gap-2 shadow-sm disabled:opacity-50">
              <Plus className="w-4 h-4" /> Add Fee Item
            </button>
          ) : (
            <button onClick={() => handleOpenTemplateDrawer(null)} disabled={!emailVerified}
              className="px-4 py-2 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center gap-2 shadow-sm disabled:opacity-50">
              <Plus className="w-4 h-4" /> Create Class Template
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-neutral-200">
        <div className="flex gap-6 -mb-px">
          <button onClick={() => { setActiveTab("library"); setSearchQuery(""); }}
            className={`pb-4 text-label-large font-bold transition border-b-2 px-1 ${activeTab === "library" ? "border-primary text-primary" : "border-transparent text-neutral-500 hover:text-neutral-900"}`}>
            Fee Library Catalog ({feeItems.length})
          </button>
          <button onClick={() => { setActiveTab("templates"); setSearchQuery(""); }}
            className={`pb-4 text-label-large font-bold transition border-b-2 px-1 ${activeTab === "templates" ? "border-primary text-primary" : "border-transparent text-neutral-500 hover:text-neutral-900"}`}>
            Class Fee Templates ({templates.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" /> <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-green-50 text-green-700 text-body-small border border-green-200">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-green-600" /> <span>{success}</span>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute w-4 h-4 text-neutral-400 left-3 top-3" />
          <input type="text" placeholder={activeTab === "library" ? "Search by fee name..." : "Search by class level..."}
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-none" />
        </div>
        {activeTab === "templates" && (
          <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-body-medium bg-white focus:outline-none">
            <option value="">All Terms</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>{t.session.name} — {t.name} {t.isActive ? "(Active)" : ""}</option>
            ))}
          </select>
        )}
      </div>

      {activeTab === "library" ? (
        <FeeLibraryTable items={filteredLibrary} onEdit={handleOpenLibraryDrawer}
          onDelete={handleDeleteLibraryItem} emailVerified={emailVerified} actionLoading={actionLoading} />
      ) : (
        <TemplateCardGrid templates={filteredTemplates} onEdit={handleOpenTemplateDrawer}
          onDelete={handleDeleteTemplate} emailVerified={emailVerified} actionLoading={actionLoading} />
      )}

      <FeeItemDrawer open={showLibraryDrawer} onClose={() => setShowLibraryDrawer(false)}
        editingItem={!!editingItem} name={libName} onNameChange={setLibName}
        description={libDesc} onDescriptionChange={setLibDesc}
        type={libType} onTypeChange={setLibType}
        frequency={libFreq} onFrequencyChange={setLibFreq}
        amount={libAmount} onAmountChange={setLibAmount}
        actionLoading={actionLoading} onSubmit={handleLibrarySubmit} />

      <TemplateDrawer open={showTemplateDrawer} onClose={() => setShowTemplateDrawer(false)}
        editingTemplate={!!editingTemplate}
        classLevelId={tempClassLevelId} onClassLevelChange={setTempClassLevelId}
        termId={tempTermId} onTermChange={setTempTermId}
        status={tempStatus} onStatusChange={setTempStatus}
        feeItems={feeItems} selectedItems={tempSelectedItems}
        onToggleFeeItem={handleToggleTemplateFeeItem}
        onAmountOverrideChange={handleAmountOverrideChange}
        classLevels={classLevels} terms={terms}
        actionLoading={actionLoading} onSubmit={handleTemplateSubmit} />
    </div>
  );
}
