"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Edit2, Trash2, CheckCircle, AlertCircle, Search, CreditCard, ShieldAlert } from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface FeeItem {
  id: string;
  name: string;
  description: string | null;
  type: "mandatory" | "optional";
  billingFrequency: "per_term" | "per_session" | "one_off";
  amount: string;
  createdAt: string;
}

interface TemplateItem {
  id: string;
  feeItemId: string;
  amountOverride: string | null;
  feeItem: FeeItem;
}

interface ClassLevel {
  id: string;
  name: string;
}

interface AcademicTerm {
  id: string;
  name: string;
  isActive: boolean;
  session: {
    name: string;
  };
}

interface ClassFeeTemplate {
  id: string;
  classLevelId: string;
  classLevel: ClassLevel;
  termId: string;
  term: AcademicTerm;
  status: "draft" | "published";
  items: TemplateItem[];
}

export default function FeeStructurePage() {
  const [activeTab, setActiveTab] = useState<"library" | "templates">("library");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Data lists
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [templates, setTemplates] = useState<ClassFeeTemplate[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");

  // Library Drawer State
  const [showLibraryDrawer, setShowLibraryDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState<FeeItem | null>(null);
  const [libName, setLibName] = useState("");
  const [libDesc, setLibDesc] = useState("");
  const [libType, setLibType] = useState<"mandatory" | "optional">("mandatory");
  const [libFreq, setLibFreq] = useState<"per_term" | "per_session" | "one_off">("per_term");
  const [libAmount, setLibAmount] = useState("");

  // Template Drawer State
  const [showTemplateDrawer, setShowTemplateDrawer] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ClassFeeTemplate | null>(null);
  const [tempClassLevelId, setTempClassLevelId] = useState("");
  const [tempTermId, setTempTermId] = useState("");
  const [tempStatus, setTempStatus] = useState<"draft" | "published">("draft");
  
  // Array of items in the template wizard: { feeItemId: string, amountOverride: string }
  const [tempSelectedItems, setTempSelectedItems] = useState<{ feeItemId: string; amountOverride: string }[]>([]);

  // Status Alerts
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/fees/library").then((r) => r.json()),
      fetch("/api/admin/fees/templates").then((r) => r.json()),
      fetch("/api/admin/academic/classes").then((r) => r.json()),
      fetch("/api/admin/academic/terms").then((r) => r.json()),
    ])
      .then(([libRes, tempRes, classRes, termRes]) => {
        setFeeItems(libRes.data || []);
        setTemplates(tempRes.data || []);
        
        // Flatten class levels from divisions
        const divisions = classRes.data || [];
        const flatLevels = divisions.flatMap((d: any) =>
          d.classLevels.map((l: any) => ({ id: l.id, name: `${d.name} — ${l.name}` }))
        );
        setClassLevels(flatLevels);

        const termsList = termRes.data || [];
        setTerms(termsList);

        // Pre-select active term
        const activeTerm = termsList.find((t: any) => t.isActive);
        if (activeTerm) {
          setSelectedTermId(activeTerm.id);
        } else if (termsList.length > 0) {
          setSelectedTermId(termsList[0].id);
        }
        
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load fee structure data:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Show Library Edit Drawer
  const handleOpenLibraryDrawer = (item: FeeItem | null = null) => {
    setEditingItem(item);
    if (item) {
      setLibName(item.name);
      setLibDesc(item.description || "");
      setLibType(item.type);
      setLibFreq(item.billingFrequency);
      setLibAmount(item.amount);
    } else {
      setLibName("");
      setLibDesc("");
      setLibType("mandatory");
      setLibFreq("per_term");
      setLibAmount("");
    }
    setShowLibraryDrawer(true);
  };

  // Submit Library Item Form
  const handleLibrarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: libName.trim(),
      description: libDesc.trim() || undefined,
      type: libType,
      billingFrequency: libFreq,
      amount: parseFloat(libAmount),
    };

    try {
      const url = "/api/admin/fees/library";
      const method = editingItem ? "PUT" : "POST";
      const body = editingItem ? { id: editingItem.id, ...payload } : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save fee library item");

      setSuccess(editingItem ? "Fee item updated successfully." : "New fee item added to catalogue.");
      setShowLibraryDrawer(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Library Item
  const handleDeleteLibraryItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fee item from the library?")) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/fees/library?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete fee item");

      setSuccess("Fee item deleted successfully.");
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Show Template Edit Drawer
  const handleOpenTemplateDrawer = (template: ClassFeeTemplate | null = null) => {
    setEditingTemplate(template);
    if (template) {
      setTempClassLevelId(template.classLevelId);
      setTempTermId(template.termId);
      setTempStatus(template.status);
      
      const mappedItems = template.items.map((item) => ({
        feeItemId: item.feeItemId,
        amountOverride: item.amountOverride || "",
      }));
      setTempSelectedItems(mappedItems);
    } else {
      setTempClassLevelId("");
      // Default to active term
      const activeTerm = terms.find((t) => t.isActive);
      setTempTermId(activeTerm?.id || selectedTermId || "");
      setTempStatus("draft");
      setTempSelectedItems([]);
    }
    setShowTemplateDrawer(true);
  };

  // Toggle fee item inclusion in template list
  const handleToggleTemplateFeeItem = (feeItemId: string) => {
    const isSelected = tempSelectedItems.some((i) => i.feeItemId === feeItemId);
    if (isSelected) {
      setTempSelectedItems(tempSelectedItems.filter((i) => i.feeItemId !== feeItemId));
    } else {
      setTempSelectedItems([...tempSelectedItems, { feeItemId, amountOverride: "" }]);
    }
  };

  // Update amount override for a fee item in the template
  const handleAmountOverrideChange = (feeItemId: string, val: string) => {
    setTempSelectedItems(
      tempSelectedItems.map((item) =>
        item.feeItemId === feeItemId ? { ...item, amountOverride: val } : item
      )
    );
  };

  // Submit Template Form
  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    if (tempSelectedItems.length === 0) {
      setError("Please select at least one fee item to include in the template.");
      setActionLoading(false);
      return;
    }

    const payload = {
      classLevelId: tempClassLevelId,
      termId: tempTermId,
      status: tempStatus,
      items: tempSelectedItems.map((i) => ({
        feeItemId: i.feeItemId,
        amountOverride: i.amountOverride ? parseFloat(i.amountOverride) : null,
      })),
    };

    try {
      const url = "/api/admin/fees/templates";
      const method = editingTemplate ? "PUT" : "POST";
      const body = editingTemplate ? { id: editingTemplate.id, ...payload } : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save fee template");

      setSuccess(editingTemplate ? "Class fee template updated successfully." : "Class fee template created.");
      setShowTemplateDrawer(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this class fee template?")) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/fees/templates?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete template");

      setSuccess("Class fee template deleted successfully.");
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter templates list based on search/term filters
  const filteredTemplates = templates.filter((t) => {
    const matchesTerm = !selectedTermId || t.termId === selectedTermId;
    const matchesSearch = !searchQuery || t.classLevel.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTerm && matchesSearch;
  });

  // Filter library list based on search
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
      {/* Header block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-headline-small text-neutral-900 font-bold">Fee Structure</h1>
          <p className="text-body-medium text-neutral-600">
            Define structural school fees and assemble terms templates for batch invoice generation.
          </p>
        </div>

        <div>
          {activeTab === "library" ? (
            <button
              onClick={() => handleOpenLibraryDrawer(null)}
              className="px-4 py-2 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Fee Item
            </button>
          ) : (
            <button
              onClick={() => handleOpenTemplateDrawer(null)}
              className="px-4 py-2 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Class Template
            </button>
          )}
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="border-b border-neutral-200">
        <div className="flex gap-6 -mb-px">
          <button
            onClick={() => {
              setActiveTab("library");
              setSearchQuery("");
            }}
            className={`pb-4 text-label-large font-bold transition border-b-2 px-1 ${
              activeTab === "library"
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Fee Library Catalog ({feeItems.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("templates");
              setSearchQuery("");
            }}
            className={`pb-4 text-label-large font-bold transition border-b-2 px-1 ${
              activeTab === "templates"
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Class Fee Templates ({templates.length})
          </button>
        </div>
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
          <Search className="absolute w-4 h-4 text-neutral-400 left-3 top-3" />
          <input
            type="text"
            placeholder={
              activeTab === "library"
                ? "Search by fee name, description..."
                : "Search by class level name..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-none"
          />
        </div>

        {activeTab === "templates" && (
          <div className="flex gap-3 w-full md:w-auto shrink-0">
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-body-medium bg-white focus:outline-none"
            >
              <option value="">All Terms</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.session.name} — {t.name} {t.isActive ? "(Active)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab Contents: Fee Library Catalog */}
      {activeTab === "library" && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
                <th className="px-6 py-3 font-semibold">Fee Item Name</th>
                <th className="px-6 py-3 font-semibold">Billing Frequency</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold">Default Amount</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredLibrary.map((item) => (
                <tr key={item.id} className="text-body-medium text-neutral-800 hover:bg-neutral-50/50">
                  <td className="px-6 py-4">
                    <div className="font-bold text-neutral-900">{item.name}</div>
                    {item.description && (
                      <div className="text-body-small text-neutral-500 mt-0.5">{item.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 capitalize">
                    {item.billingFrequency.replace("_", " ")}
                  </td>
                  <td className="px-6 py-4">
                    {item.type === "mandatory" ? (
                      <span className="px-2 py-0.5 rounded bg-primary-light text-primary text-[10px] font-bold uppercase">
                        Mandatory
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[10px] font-bold uppercase">
                        Optional
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-neutral-950 tabular-nums">
                    {formatNaira(item.amount)}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenLibraryDrawer(item)}
                      className="p-1.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-lg inline-flex items-center transition"
                      title="Edit Item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDeleteLibraryItem(item.id)}
                      className="p-1.5 border border-neutral-200 hover:bg-red-50 text-error rounded-lg inline-flex items-center transition"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLibrary.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                    No fee items catalogued. Create a library item to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Contents: Class Fee Templates */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((temp) => {
            const totalTemplateAmount = temp.items.reduce((acc, curr) => {
              const amount = curr.amountOverride !== null ? curr.amountOverride : curr.feeItem.amount;
              return acc + parseFloat(amount);
            }, 0);

            return (
              <div
                key={temp.id}
                className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        temp.status === "published"
                          ? "bg-green-100 text-green-700"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {temp.status}
                    </span>
                    <span className="text-[11px] text-neutral-500 font-bold truncate max-w-[150px]">
                      {temp.term.name}
                    </span>
                  </div>

                  <h3 className="text-title-small text-neutral-900 font-bold">{temp.classLevel.name}</h3>

                  <div className="border-t border-neutral-100 pt-3 space-y-1.5">
                    <div className="text-body-small text-neutral-500 font-semibold uppercase tracking-wider">
                      Included Fees ({temp.items.length})
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {temp.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-body-small text-neutral-700">
                          <span className="truncate pr-4">{item.feeItem.name}</span>
                          <span className="font-semibold tabular-nums text-neutral-900">
                            {formatNaira(item.amountOverride ?? item.feeItem.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-100 pt-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">
                      Total Expected
                    </div>
                    <div className="text-title-small font-bold text-primary tabular-nums">
                      {formatNaira(totalTemplateAmount)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenTemplateDrawer(temp)}
                      className="p-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-lg transition"
                      title="Edit template"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDeleteTemplate(temp.id)}
                      className="p-2 border border-neutral-200 hover:bg-red-50 text-error rounded-lg transition"
                      title="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredTemplates.length === 0 && (
            <div className="col-span-full bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-400">
              No fee templates set up for the selected criteria. Set up class fee templates to automate student billing.
            </div>
          )}
        </div>
      )}

      {/* Drawer: Add / Edit Library Fee Item */}
      {showLibraryDrawer && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-8 shadow-xl flex flex-col justify-between border-l border-neutral-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <h3 className="text-title-small text-neutral-900 font-bold">
                  {editingItem ? "Edit Catalogued Fee" : "Add Fee to Library"}
                </h3>
                <button
                  onClick={() => setShowLibraryDrawer(false)}
                  className="text-body-small text-neutral-500 hover:text-neutral-900 font-bold"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleLibrarySubmit} className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-label-medium text-neutral-700 block">Fee Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tuition Fee"
                    value={libName}
                    onChange={(e) => setLibName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-label-medium text-neutral-700 block">Description</label>
                  <textarea
                    placeholder="Provide details about what this cover..."
                    value={libDesc}
                    onChange={(e) => setLibDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-none h-20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Fee Type */}
                  <div className="space-y-1.5">
                    <label className="text-label-medium text-neutral-700 block">Fee Type *</label>
                    <select
                      value={libType}
                      onChange={(e: any) => setLibType(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium bg-white focus:outline-none"
                    >
                      <option value="mandatory">Mandatory</option>
                      <option value="optional">Optional</option>
                    </select>
                  </div>

                  {/* Billing Frequency */}
                  <div className="space-y-1.5">
                    <label className="text-label-medium text-neutral-700 block">Frequency *</label>
                    <select
                      value={libFreq}
                      onChange={(e: any) => setLibFreq(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium bg-white focus:outline-none"
                    >
                      <option value="per_term">Per Term</option>
                      <option value="per_session">Per Session</option>
                      <option value="one_off">One-Off</option>
                    </select>
                  </div>
                </div>

                {/* Default Amount */}
                <div className="space-y-1.5">
                  <label className="text-label-medium text-neutral-700 block">Default Amount (₦) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-neutral-500 font-bold">₦</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="150,000"
                      value={libAmount}
                      onChange={(e) => setLibAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center justify-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingItem ? "Update Fee Item" : "Create Fee Item"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Add / Edit Class Template */}
      {showTemplateDrawer && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-full max-w-xl h-full overflow-y-auto p-8 shadow-xl flex flex-col justify-between border-l border-neutral-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <h3 className="text-title-small text-neutral-900 font-bold">
                  {editingTemplate ? "Edit Class Fee Template" : "Assemble Class Fee Template"}
                </h3>
                <button
                  onClick={() => setShowTemplateDrawer(false)}
                  className="text-body-small text-neutral-500 hover:text-neutral-900 font-bold"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleTemplateSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Select Class Level */}
                  <div className="space-y-1.5">
                    <label className="text-label-medium text-neutral-700 block">Class Level *</label>
                    <select
                      required
                      disabled={!!editingTemplate}
                      value={tempClassLevelId}
                      onChange={(e) => setTempClassLevelId(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium bg-white focus:outline-none disabled:opacity-50"
                    >
                      <option value="">Choose Class...</option>
                      {classLevels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Term */}
                  <div className="space-y-1.5">
                    <label className="text-label-medium text-neutral-700 block">Academic Term *</label>
                    <select
                      required
                      disabled={!!editingTemplate}
                      value={tempTermId}
                      onChange={(e) => setTempTermId(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium bg-white focus:outline-none disabled:opacity-50"
                    >
                      {terms.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.session.name} — {t.name} {t.isActive ? "(Active)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status Selection */}
                <div className="space-y-1.5">
                  <label className="text-label-medium text-neutral-700 block">Template Status *</label>
                  <select
                    value={tempStatus}
                    onChange={(e: any) => setTempStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium bg-white focus:outline-none"
                  >
                    <option value="draft">Draft (Saved but not ready for billing)</option>
                    <option value="published">Published (Ready for batch billing generation)</option>
                  </select>
                </div>

                {/* Library Fee Selection Catalogue */}
                <div className="space-y-3">
                  <div className="text-label-medium text-neutral-900 font-bold block border-b border-neutral-100 pb-2">
                    Select Fee Items & Customize Amounts
                  </div>

                  {feeItems.length === 0 ? (
                    <div className="p-4 rounded-lg bg-neutral-50 text-center text-body-small text-neutral-500">
                      No fee library items. Create library items first before template composition.
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                      {feeItems.map((item) => {
                        const tempItemMatch = tempSelectedItems.find((i) => i.feeItemId === item.id);
                        const isChecked = !!tempItemMatch;

                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-lg border flex flex-col gap-2 transition ${
                              isChecked ? "border-primary bg-primary/5" : "border-neutral-200 bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  id={`temp-check-${item.id}`}
                                  checked={isChecked}
                                  onChange={() => handleToggleTemplateFeeItem(item.id)}
                                  className="w-4 h-4 border border-neutral-300 rounded text-primary focus:ring-primary focus:outline-none"
                                />
                                <label
                                  htmlFor={`temp-check-${item.id}`}
                                  className="text-body-medium text-neutral-800 font-bold select-none cursor-pointer"
                                >
                                  {item.name}
                                </label>
                              </div>
                              <span className="text-body-small font-bold text-neutral-500">
                                Lib: {formatNaira(item.amount)}
                              </span>
                            </div>

                            {/* Amount override input if checked */}
                            {isChecked && (
                              <div className="pl-6 flex items-center justify-between gap-4">
                                <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">
                                  Override Amount:
                                </span>
                                <div className="relative w-40">
                                  <span className="absolute left-3 top-1.5 text-neutral-500 text-body-small font-bold">
                                    ₦
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder={item.amount}
                                    value={tempItemMatch.amountOverride}
                                    onChange={(e) => handleAmountOverrideChange(item.id, e.target.value)}
                                    className="w-full pl-6 pr-2 py-1 border border-neutral-300 rounded text-body-small focus:outline-none font-bold"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || feeItems.length === 0}
                  className="w-full px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center justify-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingTemplate ? "Update Class Template" : "Save Class Template"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
