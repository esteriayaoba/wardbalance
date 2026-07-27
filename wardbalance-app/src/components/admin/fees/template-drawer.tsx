"use client";

import { Loader2 } from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface FeeItem {
  id: string;
  name: string;
  amount: string;
}

interface ClassLevel { id: string; name: string; }
interface AcademicTerm { id: string; name: string; isActive: boolean; session: { name: string }; }

interface TemplateDrawerProps {
  open: boolean;
  onClose: () => void;
  editingTemplate: boolean;
  classLevelId: string;
  onClassLevelChange: (value: string) => void;
  termId: string;
  onTermChange: (value: string) => void;
  status: "draft" | "published";
  onStatusChange: (value: "draft" | "published") => void;
  feeItems: FeeItem[];
  selectedItems: { feeItemId: string; amountOverride: string }[];
  onToggleFeeItem: (feeItemId: string) => void;
  onAmountOverrideChange: (feeItemId: string, value: string) => void;
  classLevels: ClassLevel[];
  terms: AcademicTerm[];
  actionLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function TemplateDrawer({
  open, onClose, editingTemplate,
  classLevelId, onClassLevelChange,
  termId, onTermChange,
  status, onStatusChange,
  feeItems, selectedItems,
  onToggleFeeItem, onAmountOverrideChange,
  classLevels, terms,
  actionLoading, onSubmit,
}: TemplateDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="template-drawer-title">
      <div className="bg-white w-full max-w-xl h-full overflow-y-auto p-8 shadow-xl flex flex-col justify-between border-l border-neutral-200">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <h3 id="template-drawer-title" className="text-title-small text-neutral-900 font-bold">
              {editingTemplate ? "Edit Class Fee Template" : "Assemble Class Fee Template"}
            </h3>
            <button onClick={onClose} className="min-h-[44px] min-w-[44px] px-3 text-body-small text-neutral-500 hover:text-neutral-900 font-bold">
              Close
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Class Level *</label>
                <select required disabled={editingTemplate} value={classLevelId}
                  onChange={(e) => onClassLevelChange(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium bg-white focus:outline-none disabled:opacity-50">
                  <option value="">Choose Class...</option>
                  {classLevels.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Academic Term *</label>
                <select required disabled={editingTemplate} value={termId}
                  onChange={(e) => onTermChange(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium bg-white focus:outline-none disabled:opacity-50">
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>{t.session.name} — {t.name} {t.isActive ? "(Active)" : ""}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">Template Status *</label>
              <select value={status} onChange={(e: any) => onStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium bg-white focus:outline-none">
                <option value="draft">Draft (Saved but not ready for billing)</option>
                <option value="published">Published (Ready for batch billing generation)</option>
              </select>
            </div>

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
                    const match = selectedItems.find((i) => i.feeItemId === item.id);
                    const isChecked = !!match;

                    return (
                      <div key={item.id} className={`p-3 rounded-lg border flex flex-col gap-2 transition ${
                        isChecked ? "border-primary bg-primary/5" : "border-neutral-200 bg-white"
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <input type="checkbox" id={`temp-check-${item.id}`}
                              checked={isChecked} onChange={() => onToggleFeeItem(item.id)}
                              className="w-4 h-4 border border-neutral-300 rounded text-primary focus:ring-primary focus:outline-none" />
                            <label htmlFor={`temp-check-${item.id}`}
                              className="text-body-medium text-neutral-800 font-bold select-none cursor-pointer">
                              {item.name}
                            </label>
                          </div>
                          <span className="text-body-small font-bold text-neutral-500">
                            Lib: {formatNaira(item.amount)}
                          </span>
                        </div>
                        {isChecked && (
                          <div className="pl-6 flex items-center justify-between gap-4">
                            <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Override Amount:</span>
                            <div className="relative w-40">
                              <span className="absolute left-3 top-1.5 text-neutral-500 text-body-small font-bold">₦</span>
                              <input type="number" min="0" step="0.01" placeholder={item.amount}
                                value={match.amountOverride}
                                onChange={(e) => onAmountOverrideChange(item.id, e.target.value)}
                                className="w-full pl-6 pr-2 py-1 border border-neutral-300 rounded text-body-small focus:outline-none font-bold" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button type="submit" disabled={actionLoading || feeItems.length === 0}
              className="w-full px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center justify-center gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingTemplate ? "Update Class Template" : "Save Class Template"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
