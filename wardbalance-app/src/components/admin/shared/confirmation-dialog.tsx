import React, { useEffect, useRef } from "react";
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
  isOpen, onClose, onConfirm, title, description,
  confirmText = "Confirm", cancelText = "Cancel",
  variant = "default", isLoading = false,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setTimeout(() => dialogRef.current?.focus(), 0);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/40" onClick={isLoading ? undefined : onClose} aria-hidden="true" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-desc"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-neutral-200 z-10 space-y-4 outline-none">
        <div className="flex gap-3">
          {variant === "destructive" && (
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-650 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          <div className="space-y-1.5 flex-1 min-w-0">
            <h3 id="confirm-dialog-title" className="text-title-small text-neutral-900 font-bold leading-none">{title}</h3>
            <p id="confirm-dialog-desc" className="text-body-medium text-neutral-500 leading-normal">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-2">
          <button type="button" disabled={isLoading} onClick={onClose}
            className="px-4 py-2 border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 rounded-lg text-body-small font-bold transition disabled:opacity-55">
            {cancelText}
          </button>
          <button type="button" disabled={isLoading} onClick={onConfirm}
            className={`px-4 py-2 text-white font-bold rounded-lg text-body-small transition inline-flex items-center gap-1.5 shadow-sm disabled:opacity-55 ${variant === "destructive" ? "bg-error hover:opacity-90" : "bg-primary hover:bg-primary-dark"}`}>
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
