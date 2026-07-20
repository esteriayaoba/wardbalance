"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

interface CelebrationProps {
  phase: number;
  phaseTitle: string;
  summaryItems: string[];
  onContinue: () => void;
  onDashboard?: () => void;
  isLast: boolean;
}

const CONFETTI_COLORS = [
  "var(--color-primary-500)",
  "var(--color-success-500)",
  "var(--color-warning-500)",
  "var(--color-secondary-500)",
  "var(--color-primary-300)",
];

interface ConfettiPiece {
  id: number;
  color: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

export default function PhaseCelebration({ phase, phaseTitle, summaryItems, onContinue, onDashboard, isLast }: CelebrationProps) {
  const [pieces] = useState<ConfettiPiece[]>(() =>
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 1.2 + Math.random() * 0.8,
      size: 6 + Math.random() * 6,
      rotation: Math.random() * 360,
    }))
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap and Escape handler
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      setTimeout(() => focusable[0].focus(), 50);
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onContinue();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      previousFocusRef.current?.focus();
    };
  }, [onContinue]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="presentation">
      {/* Confetti Layer — disabled when user prefers reduced motion */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none motion-reduce:hidden" aria-hidden="true">
        {pieces.map((p) => (
          <div
            key={p.id}
            className="absolute top-0"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.6,
              backgroundColor: p.color,
              borderRadius: "2px",
              animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
              transform: `rotate(${p.rotation}deg)`,
            }}
          />
        ))}
      </div>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onContinue} aria-hidden="true" />

      {/* Card */}
      <div
        ref={dialogRef}
        className="relative bg-white rounded-2xl shadow-2xl border border-neutral-200 p-8 md:p-10 max-w-lg mx-4 text-center space-y-6 motion-reduce:animate-none"
        style={{ animation: "fade-in-up 0.5s ease-out forwards" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebration-title"
        aria-live="assertive"
      >
        <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto border border-success-100">
          <Sparkles className="w-8 h-8 text-success-500" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-50 text-primary text-label-small font-bold">
            Phase {phase} Complete
          </span>
          <h2 id="celebration-title" className="text-headline-small text-neutral-900 font-bold">{phaseTitle}</h2>
        </div>

        <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200 text-left space-y-2" aria-label="Summary of completed items">
          {summaryItems.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-success-500 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-body-medium text-neutral-700">{item}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 min-h-[52px] px-6 py-3 bg-primary text-white rounded-xl text-label-large font-bold hover:bg-primary-dark transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={isLast ? "Go to Dashboard" : "Continue to next phase"}
          >
            {isLast ? "Go to Dashboard" : "Continue to Next Phase"}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
          {onDashboard && (
            <button
              onClick={onDashboard}
              className="w-full min-h-[44px] py-2.5 text-body-medium text-neutral-600 hover:text-neutral-900 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
