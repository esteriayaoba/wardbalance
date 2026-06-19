"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { ConsentPreferences } from "@/lib/cookies/consent";

interface CookieSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: ConsentPreferences) => void;
  initialPreferences: ConsentPreferences;
}

export default function CookieSettingsModal({
  isOpen,
  onClose,
  onSave,
  initialPreferences,
}: CookieSettingsModalProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setPreferences(initialPreferences);
  }, [initialPreferences]);

  // Focus trap and escape key
  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories: {
    key: keyof ConsentPreferences;
    label: string;
    description: string;
    locked: boolean;
  }[] = [
    {
      key: "necessary",
      label: "Necessary",
      description:
        "Required for the website to function. Cannot be turned off.",
      locked: true,
    },
    {
      key: "analytics",
      label: "Analytics",
      description:
        "Help us understand website usage so we can improve WardBalance.",
      locked: false,
    },
    {
      key: "marketing",
      label: "Marketing",
      description:
        "Enable marketing-related features (currently unused).",
      locked: false,
    },
  ];

  const handleSave = () => {
    onSave(preferences);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-2xl p-6 md:p-8 shadow-xl"
        style={{
          background: "var(--color-surface-container-lowest)",
          border: "1px solid var(--color-outline-variant)",
        }}
      >
        {/* Close button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg transition-colors focus:outline-2 focus:outline-primary focus:outline-offset-2"
          style={{ color: "var(--color-on-surface-variant)" }}
          aria-label="Close settings"
        >
          <X size={20} />
        </button>

        <h2
          id="cookie-modal-title"
          className="text-title-large mb-1"
          style={{ color: "var(--color-on-surface)" }}
        >
          Manage cookie preferences
        </h2>
        <p
          className="text-body-medium mb-6"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          Choose which cookies to allow. Your preferences will be saved.
        </p>

        <div className="space-y-4 mb-6">
          {categories.map((cat) => (
            <div
              key={cat.key}
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{
                background: "var(--color-surface-container-low)",
              }}
            >
              <div className="flex-1 min-w-0">
                <p
                  className="text-label-medium"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  {cat.label}
                </p>
                <p
                  className="text-body-small mt-0.5"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  {cat.description}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={preferences[cat.key]}
                  disabled={cat.locked}
                  onChange={() =>
                    setPreferences((prev) => ({
                      ...prev,
                      [cat.key]: !prev[cat.key],
                    }))
                  }
                  className="sr-only peer"
                />
                <div
                  className="w-10 h-6 rounded-full transition-colors peer-disabled:opacity-50 peer-focus-visible:outline-2 peer-focus-visible:outline-primary peer-focus-visible:outline-offset-2"
                  style={{
                    background: preferences[cat.key]
                      ? "var(--color-primary-500)"
                      : "var(--color-outline-variant)",
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                    style={{
                      transform: preferences[cat.key]
                        ? "translateX(20px)"
                        : "translateX(4px)",
                      marginTop: "4px",
                    }}
                  />
                </div>
              </label>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          className="w-full px-5 py-2.5 rounded-lg text-label-large transition-all hover:opacity-90 focus:outline-2 focus:outline-primary focus:outline-offset-2"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-on-primary)",
          }}
        >
          Save preferences
        </button>
      </div>
    </div>
  );
}
