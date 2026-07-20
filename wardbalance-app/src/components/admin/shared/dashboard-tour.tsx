"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, ArrowRight, ArrowLeft, Check } from "lucide-react";

interface TourStep {
  targetId: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "nav-Dashboard",
    title: "Admin Navigation Sidebar",
    content: "Easily navigate between Students, Parents, Fee structures, Invoice lists, and Reports from this side menu.",
    position: "right",
  },
  {
    targetId: "active-term-tracker",
    title: "Academic Term Filter",
    content: "All calculations, invoices, and payment collections are automatically scoped to the active academic session and term displayed here.",
    position: "bottom",
  },
  {
    targetId: "dashboard-kpi-cards",
    title: "Financial Metrics",
    content: "Monitor expected revenue, verified collections, and outstanding parent balances at a single glance.",
    position: "bottom",
  },
  {
    targetId: "quick-billing-actions",
    title: "Quick Action Desk",
    content: "Launch the invoice wizard, record bank transfers/cash collections manually, or enroll new students quickly.",
    position: "left",
  },
];

export default function DashboardTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const popoverRef = useRef<HTMLDivElement>(null);

  // Check if tour should auto-start
  useEffect(() => {
    const isCompleted = localStorage.getItem("wb_dashboard_tour_completed");
    if (!isCompleted) {
      // Delay slightly to let page render
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const updateCoordinates = () => {
    if (!isOpen) return;

    const step = TOUR_STEPS[currentStep];
    if (!step) return;

    const targetEl = document.getElementById(step.targetId);
    if (!targetEl) {
      // Element not found - render in the center of the screen
      setHighlightStyle({ display: "none" });
      setPopoverStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 9999,
      });
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

    // Set highlight overlay positioning with padding
    const padding = 6;
    setHighlightStyle({
      position: "absolute",
      top: `${rect.top + scrollTop - padding}px`,
      left: `${rect.left + scrollLeft - padding}px`,
      width: `${rect.width + padding * 2}px`,
      height: `${rect.height + padding * 2}px`,
      borderRadius: "10px",
      boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 15px rgba(21, 94, 239, 0.6)",
      border: "2.5px solid var(--color-primary-500)",
      zIndex: 9998,
      pointerEvents: "none",
      transition: "all 0.3s ease-in-out",
    });

    // Calculate popover coordinates
    const popoverPadding = 12;
    let popoverTop = 0;
    let popoverLeft = 0;

    const popoverWidth = 320;
    const popoverHeight = 160;

    switch (step.position) {
      case "right":
        popoverTop = rect.top + scrollTop + rect.height / 2 - popoverHeight / 2;
        popoverLeft = rect.right + scrollLeft + popoverPadding;
        break;
      case "bottom":
        popoverTop = rect.bottom + scrollTop + popoverPadding;
        popoverLeft = rect.left + scrollLeft + rect.width / 2 - popoverWidth / 2;
        break;
      case "left":
        popoverTop = rect.top + scrollTop + rect.height / 2 - popoverHeight / 2;
        popoverLeft = rect.left + scrollLeft - popoverWidth - popoverPadding;
        break;
      case "top":
      default:
        popoverTop = rect.top + scrollTop - popoverHeight - popoverPadding;
        popoverLeft = rect.left + scrollLeft + rect.width / 2 - popoverWidth / 2;
        break;
    }

    // Keep within window bounds
    const viewportWidth = window.innerWidth;
    if (popoverLeft + popoverWidth > viewportWidth) {
      popoverLeft = viewportWidth - popoverWidth - 20;
    }
    if (popoverLeft < 10) {
      popoverLeft = 10;
    }

    setPopoverStyle({
      position: "absolute",
      top: `${popoverTop}px`,
      left: `${popoverLeft}px`,
      width: `${popoverWidth}px`,
      zIndex: 9999,
      transition: "all 0.3s ease-in-out",
    });

    // Smoothly scroll target into view if needed
    targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  useEffect(() => {
    updateCoordinates();
    window.addEventListener("resize", updateCoordinates);
    window.addEventListener("scroll", updateCoordinates);

    return () => {
      window.removeEventListener("resize", updateCoordinates);
      window.removeEventListener("scroll", updateCoordinates);
    };
  }, [isOpen, currentStep]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem("wb_dashboard_tour_completed", "true");
    setIsOpen(false);
  };

  // Render a manual trigger button on the page that admins can use anytime
  const restartTour = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  if (!isOpen) {
    return (
      <button
        onClick={restartTour}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-200 hover:border-primary/40 text-neutral-700 hover:text-primary font-bold text-label-medium rounded-full shadow-md hover:shadow-lg transition-all duration-300 z-40 cursor-pointer"
        title="Walkthrough Tour Guide"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
        Quick Tour
      </button>
    );
  }

  const step = TOUR_STEPS[currentStep];
  if (!step) return null;

  return (
    <>
      {/* Dimmed Overlay Block */}
      <div 
        className="fixed inset-0 bg-transparent transition-opacity duration-300" 
        style={{ zIndex: 9997 }} 
        onClick={handleSkip}
      />

      {/* Target Highlight Ring */}
      <div style={highlightStyle} />

      {/* Popover Bubble */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="bg-white border border-neutral-200 shadow-2xl rounded-xl p-5 md:p-6 space-y-4 focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-[10px] text-primary bg-primary-50 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Step {currentStep + 1} of {TOUR_STEPS.length}
          </span>
          <button
            onClick={handleSkip}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            title="Skip Tour"
          >
            <X size={16} />
          </button>
        </div>

        {/* Title & Body */}
        <div className="space-y-1.5">
          <h4 className="text-title-small text-neutral-900 font-extrabold leading-snug">
            {step.title}
          </h4>
          <p className="text-body-medium text-neutral-600 leading-normal">
            {step.content}
          </p>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <button
            onClick={handleSkip}
            className="text-body-small text-neutral-400 hover:text-neutral-600 font-bold transition-colors cursor-pointer"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-label-medium rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-dark text-white font-bold text-label-medium rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {currentStep === TOUR_STEPS.length - 1 ? (
                <>
                  Finish
                  <Check size={14} />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
