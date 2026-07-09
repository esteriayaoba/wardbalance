"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import Input from "@/components/admin/shared/input";
import Select from "@/components/admin/shared/select";

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

interface GenerateWizardProps {
  open: boolean;
  onClose: () => void;
  classLevels: ClassLevel[];
  terms: AcademicTerm[];
  actionLoading: boolean;
  onSubmitPreview: (classLevelId: string, termId: string, dueDate: string) => Promise<void>;
  onSubmitGenerate: (studentIds: string[]) => Promise<void>;
  wizardStep: number;
  wizClassLevelId: string;
  wizTermId: string;
  wizDueDate: string;
  previews: GenerationPreview[];
  selectedStudentIds: string[];
  previewWarning: string | null;
  onBack: () => void;
  onClassLevelChange: (value: string) => void;
  onTermChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onToggleStudent: (id: string) => void;
  onToggleSelectAll: () => void;
  generateCount?: number;
}

export default function GenerateWizard({
  open,
  onClose,
  classLevels,
  terms,
  actionLoading,
  onSubmitPreview,
  onSubmitGenerate,
  wizardStep,
  wizClassLevelId,
  wizTermId,
  wizDueDate,
  previews,
  selectedStudentIds,
  previewWarning,
  onBack,
  onClassLevelChange,
  onTermChange,
  onDueDateChange,
  onToggleStudent,
  onToggleSelectAll,
  generateCount,
}: GenerateWizardProps) {
  const [confirming, setConfirming] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (confirming) {
        setConfirming(false);
        return;
      }
      onClose();
      return;
    }
    if (e.key === "Tab") {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
  };

  if (!open) return null;

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitPreview(wizClassLevelId, wizTermId, wizDueDate);
  };

  const handleGenerateClick = () => {
    setConfirming(true);
  };

  const handleConfirmGenerate = () => {
    setConfirming(false);
    onSubmitGenerate(selectedStudentIds);
  };

  const totalExpected = previews
    .filter((p) => selectedStudentIds.includes(p.studentId))
    .reduce((sum, p) => sum + parseFloat(p.totalExpected), 0);

  const generateLabel = generateCount
    ? `Generating ${generateCount} invoice${generateCount !== 1 ? "s" : ""}...`
    : "Generating...";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="generate-wizard-title" tabIndex={-1} ref={dialogRef} onKeyDown={handleKeyDown}>
      <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col justify-between max-h-[85vh]">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h3 id="generate-wizard-title" className="text-title-small text-neutral-900 font-bold">
              Bulk Invoice Generation Wizard
            </h3>
            <p className="text-body-small text-neutral-500">
              Step {wizardStep} of 2 — {wizardStep === 1 ? "Select target criteria" : "Preview student batch invoices"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] px-3 text-body-small text-neutral-500 hover:text-neutral-900 font-bold"
          >
            Close
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {wizardStep === 1 ? (
            <form onSubmit={handlePreview} className="space-y-4 max-w-md mx-auto py-4">
              <Select
                label="Target Class Level *"
                required
                value={wizClassLevelId}
                onChange={(e) => onClassLevelChange(e.target.value)}
              >
                <option value="">Choose Class Level...</option>
                {classLevels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>

              <Select
                label="Academic Billing Term *"
                required
                value={wizTermId}
                onChange={(e) => onTermChange(e.target.value)}
              >
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.session.name} — {t.name} {t.isActive ? "(Active)" : ""}
                  </option>
                ))}
              </Select>

              <Input
                label="Payment Due Date *"
                type="date"
                required
                value={wizDueDate}
                onChange={(e) => onDueDateChange(e.target.value)}
                className="font-semibold text-neutral-800"
              />

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full mt-4 min-h-[44px] px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center justify-center gap-2 shadow"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Continue to Preview
              </button>
            </form>
          ) : (
            <div className="space-y-4">
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
                  onClick={onToggleSelectAll}
                  className="text-body-small text-primary hover:underline font-bold"
                >
                  {selectedStudentIds.length === previews.filter((p) => !p.alreadyHasInvoice).length
                    ? "Deselect All"
                    : "Select All Billable"}
                </button>
              </div>

              <div className="border border-neutral-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-left text-body-medium">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-205 text-label-medium text-neutral-500">
                      <th className="px-4 py-2 font-semibold w-10" />
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
                            onChange={() => onToggleStudent(p.studentId)}
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

        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          {wizardStep === 2 ? (
            <>
              <button
                onClick={onBack}
                className="min-h-[44px] px-4 py-2 border border-neutral-300 text-neutral-700 bg-white rounded-lg text-body-medium font-bold hover:bg-neutral-50 transition"
                type="button"
              >
                Back
              </button>
              <div className="flex gap-2 items-center">
                <span className="text-body-small text-neutral-500 font-medium">
                  Selected: <strong>{selectedStudentIds.length}</strong> students
                </span>
                {confirming ? (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-body-small text-amber-900">
                      Generate invoices for <strong>{selectedStudentIds.length}</strong> student{selectedStudentIds.length !== 1 ? "s" : ""}?<br />
                      Total: <strong>{formatNaira(String(totalExpected))}</strong>
                    </div>
                    <button
                      onClick={handleConfirmGenerate}
                      disabled={actionLoading}
                      className="min-h-[44px] px-3 py-2 bg-amber-600 text-white hover:bg-amber-700 font-bold text-label-small rounded-lg transition"
                    >
                      {actionLoading ? generateLabel : "Confirm & Generate"}
                    </button>
                    <button
                      onClick={() => setConfirming(false)}
                      disabled={actionLoading}
                      className="min-h-[44px] px-3 py-2 border border-neutral-300 text-neutral-700 bg-white rounded-lg text-body-small font-bold hover:bg-neutral-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateClick}
                    disabled={actionLoading || selectedStudentIds.length === 0}
                    className="min-h-[44px] px-4 py-2 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg shadow-sm transition"
                  >
                    {actionLoading ? generateLabel : "Generate Invoices"}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <button
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 border border-neutral-300 text-neutral-700 bg-white rounded-lg text-body-medium font-bold hover:bg-neutral-50 transition"
                type="button"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
