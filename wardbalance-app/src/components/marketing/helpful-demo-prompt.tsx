"use client";

import React from "react";

export default function HelpfulDemoPrompt() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById("demo");
    if (el) {
      const offsetStr = getComputedStyle(document.documentElement).getPropertyValue("--marketing-header-offset").trim();
      const offset = offsetStr ? parseFloat(offsetStr) : 96;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
      const nameInput = document.getElementById("fullName");
      if (nameInput) nameInput.focus();
    }
  };

  return (
    <section className="py-16 bg-neutral-50 border-t border-b border-neutral-200/60 text-center">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h3 className="text-headline-small font-bold mb-3" style={{ color: "var(--color-on-surface)" }}>
          Still have questions?
        </h3>
        <p className="text-body-large mb-8 max-w-xl mx-auto" style={{ color: "var(--color-on-surface-variant)" }}>
          Let us show you how WardBalance can simplify fee billing, payment recording, and parent balance tracking for your school.
        </p>
        <a
          href="#demo"
          onClick={handleClick}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-label-large font-bold transition-all hover:bg-neutral-100 border-2 cursor-pointer"
          style={{
            borderColor: "var(--color-primary-500)",
            color: "var(--color-primary-600)",
          }}
        >
          Book a 1-on-1 Demo
        </a>
      </div>
    </section>
  );
}
