"use client";

import { Loader2 } from "lucide-react";

interface FeeItemDrawerProps {
  open: boolean;
  onClose: () => void;
  editingItem: boolean;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  type: "mandatory" | "optional";
  onTypeChange: (value: "mandatory" | "optional") => void;
  frequency: "per_term" | "per_session" | "one_off";
  onFrequencyChange: (value: "per_term" | "per_session" | "one_off") => void;
  amount: string;
  onAmountChange: (value: string) => void;
  actionLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function FeeItemDrawer({
  open,
  onClose,
  editingItem,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  type,
  onTypeChange,
  frequency,
  onFrequencyChange,
  amount,
  onAmountChange,
  actionLoading,
  onSubmit,
}: FeeItemDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="fee-item-drawer-title">
      <div className="bg-white w-full max-w-md h-full overflow-y-auto p-8 shadow-xl flex flex-col justify-between border-l border-neutral-200">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <h3 id="fee-item-drawer-title" className="text-title-small text-neutral-900 font-bold">
              {editingItem ? "Edit Catalogued Fee" : "Add Fee to Library"}
            </h3>
            <button onClick={onClose} className="min-h-[44px] min-w-[44px] px-3 text-body-small text-neutral-500 hover:text-neutral-900 font-bold">
              Close
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">Fee Item Name *</label>
              <input type="text" required placeholder="e.g. Tuition Fee" value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">Description</label>
              <textarea placeholder="Provide details about what this covers..."
                value={description} onChange={(e) => onDescriptionChange(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-none h-20 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Fee Type *</label>
                <select value={type} onChange={(e: any) => onTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium bg-white focus:outline-none">
                  <option value="mandatory">Mandatory</option>
                  <option value="optional">Optional</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Frequency *</label>
                <select value={frequency} onChange={(e: any) => onFrequencyChange(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium bg-white focus:outline-none">
                  <option value="per_term">Per Term</option>
                  <option value="per_session">Per Session</option>
                  <option value="one_off">One-Off</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">Default Amount (₦) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-neutral-500 font-bold">₦</span>
                <input type="number" required min="0" step="0.01" placeholder="150,000"
                  value={amount} onChange={(e) => onAmountChange(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-none font-bold" />
              </div>
            </div>

            <button type="submit" disabled={actionLoading}
              className="w-full px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center justify-center gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingItem ? "Update Fee Item" : "Create Fee Item"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
