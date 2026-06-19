import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  isLoading?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={isLoading ? undefined : onClose}
      />

      {/* Dialog content */}
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-neutral-200 z-10 space-y-4">
        <div className="flex gap-3">
          {variant === "destructive" && (
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-650 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          <div className="space-y-1.5 flex-1 min-w-0">
            <h3 className="text-title-small text-neutral-900 font-bold leading-none">
              {title}
            </h3>
            <p className="text-body-medium text-neutral-500 leading-normal">
              {description}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 rounded-lg text-body-small font-bold transition disabled:opacity-55"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-4 py-2 text-white font-bold rounded-lg text-body-small transition inline-flex items-center gap-1.5 shadow-sm disabled:opacity-55 ${
              variant === "destructive"
                ? "bg-error hover:opacity-90"
                : "bg-primary hover:bg-primary-dark"
            }`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
