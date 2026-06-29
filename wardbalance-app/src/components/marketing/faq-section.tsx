"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

const faqs = [
  {
    question: "Can I start using WardBalance without booking a demo?",
    answer: "Yes. You can create a school workspace and start with the Starter plan. Schools that need guided setup or multi-branch support can book a demo.",
  },
  {
    question: "Is WardBalance a full school management system?",
    answer: "No. WardBalance focuses on school fee operations. It does not handle CBT, attendance, results, timetable, payroll, LMS, hostel, inventory, or AI features.",
  },
  {
    question: "Can one parent manage more than one child?",
    answer: "Yes. A parent can be linked to multiple wards and can view invoices, balances, payment status, and receipts for each child separately.",
  },
  {
    question: "Can schools record offline payments?",
    answer: "Yes. Schools can record cash, POS, cheque, and bank transfer payments so bursars can track payments even when parents pay outside online checkout.",
  },
  {
    question: "Does WardBalance support online payment?",
    answer: "WardBalance is designed with Flutterwave payment readiness. Online payment flows can be enabled where payment setup is configured.",
  },
  {
    question: "Can WardBalance support multiple branches?",
    answer: "Yes. Multi-school or multi-branch setup is available through the Group plan. We recommend booking a demo so the structure can be configured properly.",
  },
  {
    question: "Can I upgrade later?",
    answer: "Yes. Schools can start with a simple plan and upgrade as their student population, staff team, and reporting needs grow.",
  },
  {
    question: "Can I invite my bursar or administrator?",
    answer: "Yes. Depending on your plan, you can add school staff and assign access based on their responsibilities.",
  },
];

export default function FAQSection() {
  const pathname = usePathname();
  const isFAQPage = pathname === "/faq";
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleOpen = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      id={isFAQPage ? undefined : "faq"}
      className={`py-24 md:py-32 lg:py-36 ${isFAQPage ? "" : "scroll-mt-[var(--marketing-header-offset)]"} relative overflow-hidden bg-white border-b border-neutral-200/60`}
      aria-labelledby="faq-heading"
    >
      {/* Subtle blurred background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute -top-32 -left-48 w-[600px] h-[600px] rounded-full opacity-40 blur-[140px] bg-primary-200"
        />
        <div
          className="absolute -bottom-32 -right-48 w-[550px] h-[550px] rounded-full opacity-35 blur-[130px]"
          style={{ background: "hsl(176, 50%, 80%)" }}
        />
        <div
          className="absolute top-1/2 left-1/3 w-[400px] h-[400px] rounded-full opacity-25 blur-[120px] bg-primary-100"
        />
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2
            id="faq-heading"
            className="text-headline-small md:text-headline-large mb-4 text-on-surface"
          >
            Frequently Asked Questions
          </h2>
          <p className="text-body-large text-on-surface-variant max-w-xl mx-auto">
            Can&apos;t find your answer?{" "}
            <Link
              href={isFAQPage ? "/faq#demo" : "/#demo"}
              onClick={(e) => {
                if (!isFAQPage) {
                  e.preventDefault();
                  const el = document.getElementById("demo");
                  if (el) {
                    const offsetStr = getComputedStyle(document.documentElement).getPropertyValue("--marketing-header-offset").trim();
                    const offset = offsetStr ? parseFloat(offsetStr) : 96;
                    el.scrollIntoView();
                    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
                  }
                }
              }}
              className="text-primary font-semibold hover:underline"
            >
              Book a demo
            </Link>{" "}
            and we&apos;ll walk you through it.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
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
                    className="text-title-medium pr-8"
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
                    isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="p-5 pt-0 text-body-large text-on-surface-variant">
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
