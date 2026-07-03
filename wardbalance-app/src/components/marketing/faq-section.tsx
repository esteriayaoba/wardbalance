"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

const categories = [
  "All",
  "Getting Started",
  "Fees and Invoices",
  "Payments and Receipts",
  "Parent Portal",
  "Plans and Multi-School Setup",
];

const faqs = [
  {
    category: "Getting Started",
    question: "Can I start using WardBalance without booking a demo?",
    answer: "Yes. You can create a school workspace and start with the Starter plan. Schools that need guided setup or multi-branch support can book a demo.",
  },
  {
    category: "Getting Started",
    question: "Is WardBalance a full school management system?",
    answer: "No. WardBalance focuses on school fee operations. It does not handle CBT, attendance, results, timetable, payroll, LMS, hostel, inventory, or AI features.",
  },
  {
    category: "Getting Started",
    question: "Can I invite my bursar or administrator?",
    answer: "Yes. Depending on your plan, you can add school staff and assign access based on their responsibilities.",
  },
  {
    category: "Fees and Invoices",
    question: "Can I create custom fee structures?",
    answer: "Yes. You can set up custom fees in your Fee Library (like tuition, PTA, transport, uniform, etc.) and assign them using class fee templates.",
  },
  {
    category: "Fees and Invoices",
    question: "Does the invoice system prevent duplicates?",
    answer: "Yes. WardBalance has built-in checks to prevent duplicate invoice generation for the same student and term.",
  },
  {
    category: "Payments and Receipts",
    question: "Can schools record offline payments?",
    answer: "Yes. Schools can record cash, POS, cheque, and bank transfer payments manually, which instantly updates the invoice balance and records the actor.",
  },
  {
    category: "Payments and Receipts",
    question: "Does WardBalance generate receipts?",
    answer: "Yes. Digital receipt records are generated on payment confirmation, showing a clear trace of the billing and payment history.",
  },
  {
    category: "Parent Portal",
    question: "Can one parent manage more than one child?",
    answer: "Yes. A parent can be linked to multiple wards and can view invoices, balances, payment status, and receipts for each child in a mobile-first dashboard.",
  },
  {
    category: "Parent Portal",
    question: "What happens if a student has no linked parent?",
    answer: "The school will see a clear warning in the dashboard/student profile, alerting the team that no parent is available for automatic communication until one is linked.",
  },
  {
    category: "Plans and Multi-School Setup",
    question: "Can WardBalance support multiple branches?",
    answer: "Yes. Multi-school or multi-branch setup is supported through the Group plan. We recommend booking a demo so the structure can be configured properly.",
  },
  {
    category: "Plans and Multi-School Setup",
    question: "Can I upgrade later?",
    answer: "Yes. Schools can start with a simple plan and upgrade as their student population, staff team, and reporting needs grow.",
  },
];

export default function FAQSection() {
  const pathname = usePathname();
  const isFAQPage = pathname === "/faq";
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleOpen = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setOpenIndex(null);
  };

  const filteredFaqs = selectedCategory === "All"
    ? faqs
    : faqs.filter((faq) => faq.category === selectedCategory);

  return (
    <section
      id={isFAQPage ? undefined : "faq"}
      className={`py-20 md:py-28 ${isFAQPage ? "" : "scroll-mt-[var(--marketing-header-offset)]"} relative overflow-hidden bg-white border-b border-neutral-200/60`}
      aria-labelledby="faq-heading"
    >
      {/* Subtle blurred background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute -top-32 -left-48 w-[600px] h-[600px] rounded-full opacity-40 pointer-events-none select-none bg-[radial-gradient(circle,var(--color-primary-200)_0%,transparent_70%)]"
        />
        <div
          className="absolute -bottom-32 -right-48 w-[550px] h-[550px] rounded-full opacity-35 pointer-events-none select-none bg-[radial-gradient(circle,hsl(176,50%,80%)_0%,transparent_70%)]"
        />
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-10">
          <h2
            id="faq-heading"
            className="text-headline-small md:text-headline-large mb-4 text-on-surface font-bold"
          >
            Frequently Asked Questions
          </h2>
          <p className="text-body-large text-on-surface-variant max-w-xl mx-auto">
            Can&apos;t find your answer?{" "}
            <Link
              href={isFAQPage ? "/faq#demo" : "/#demo"}
              onClick={(e) => {
                const el = document.getElementById("demo");
                if (el) {
                  e.preventDefault();
                  const offsetStr = getComputedStyle(document.documentElement).getPropertyValue("--marketing-header-offset").trim();
                  const offset = offsetStr ? parseFloat(offsetStr) : 96;
                  const top = el.getBoundingClientRect().top + window.scrollY - offset;
                  window.scrollTo({ top, behavior: "smooth" });
                  const nameInput = document.getElementById("fullName");
                  if (nameInput) nameInput.focus();
                }
              }}
              className="text-primary font-semibold hover:underline"
            >
              Book a demo
            </Link>{" "}
            and we&apos;ll walk you through it.
          </p>
        </div>

        {/* Category Pills/Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-4 py-2 rounded-full text-label-medium whitespace-nowrap transition-all duration-200 border cursor-pointer ${
                  isActive
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border-neutral-200"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Accordions */}
        <div className="space-y-4 min-h-[300px]">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => {
              const isOpen = openIndex === index;
              const panelId = `faq-panel-${index}`;
              const buttonId = `faq-btn-${index}`;
              return (
                <div
                  key={index}
                  className="rounded-xl overflow-hidden transition-all duration-200 border bg-surface-container-lowest"
                  style={{
                    borderColor: isOpen
                      ? "var(--color-primary-200)"
                      : "var(--color-outline-variant)",
                    boxShadow: isOpen ? "0 4px 12px hsla(220, 87%, 51%, 0.05)" : "none",
                  }}
                >
                  <button
                    id={buttonId}
                    onClick={() => toggleOpen(index)}
                    className="w-full flex items-center justify-between p-5 text-left focus:outline-2 focus:outline-primary focus:outline-offset-2 rounded-xl hover:bg-surface-container-low transition-colors duration-200 cursor-pointer"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                  >
                    <span
                      className="text-title-medium pr-8 font-bold"
                      style={{
                        color: isOpen ? "var(--color-primary-700)" : "var(--color-on-surface)",
                      }}
                    >
                      {faq.question}
                    </span>
                    <Plus
                      size={24}
                      className={`shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-45" : ""
                      }`}
                      style={{
                        color: isOpen ? "var(--color-primary-600)" : "var(--color-on-surface-variant)",
                      }}
                    />
                  </button>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="p-5 pt-0 text-body-large text-on-surface-variant leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center py-12 text-on-surface-variant">No questions found in this category.</p>
          )}
        </div>
      </div>
    </section>
  );
}
