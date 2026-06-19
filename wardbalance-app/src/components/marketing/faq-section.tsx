"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const faqs = [
  {
    question: "Can I start using WardBalance without booking a demo?",
    answer: "Yes, absolutely! WardBalance is now fully self-service. You can sign up, create your school workspace, and start configuring your class fee templates and student records immediately without any required calls.",
  },
  {
    question: "Is there a free plan?",
    answer: "Yes. Our Freemium plan is free forever and supports up to 50 students. It's perfect for small schools getting started with digital fee tracking.",
  },
  {
    question: "Do I need to pay before creating a school workspace?",
    answer: "No. You can create your workspace on the Freemium plan for ₦0 with no credit card required. You only pay if you choose to upgrade to the Business plan as your school grows.",
  },
  {
    question: "Can I upgrade from Freemium to Business later?",
    answer: "Yes, you can upgrade your workspace plan from your settings tab at any time to unlock larger student limits, class fee templates, custom discounts, and advanced reporting.",
  },
  {
    question: "Does WardBalance support Flutterwave payment links?",
    answer: "Yes. WardBalance integrates securely with Flutterwave. You can configure your payment keys to dispatch automated transaction links to parents so they pay online, and their balances update instantly.",
  },
  {
    question: "Can schools record cash, POS, cheque, and bank transfer payments?",
    answer: "Yes, WardBalance is built for reality. Bursars can easily record any offline payment. For bank transfers made outside the portal, parents can upload their receipt screenshot for bursar verification.",
  },
  {
    question: "Can one parent manage multiple wards?",
    answer: "Absolutely. Parents log in with their phone number or email and instantly see a combined dashboard showing all their children in the school, even if they are in different classes or divisions.",
  },
  {
    question: "Can I invite my bursar or administrator later?",
    answer: "Yes. Workspace owners can invite other staff members (bursars, accountants, administrators) to collaborate inside the dashboard based on their role permissions.",
  },
  {
    question: "Can I manage more than one school or branch?",
    answer: "Our Multi-School plan is designed specifically for school groups and branch operators. Because these setups require custom routing and branch consolidation, they need a guided setup — please book a branch demo to get started.",
  },
  {
    question: "Is WardBalance a full school management system?",
    answer: "No. WardBalance focuses 100% on financial operations—invoices, payments, receipts, and reporting. We do not build CBT, attendance, results, or timetables because we believe in doing one thing exceptionally well.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleOpen = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      id="faq"
      className="py-16 md:py-24 scroll-mt-24 relative overflow-hidden bg-background"
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
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
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
                  onClick={() => toggleOpen(index)}
                  className="w-full flex items-center justify-between p-5 text-left focus:outline-2 focus:outline-primary focus:outline-offset-2 rounded-xl hover:bg-surface-container-low transition-colors duration-200 cursor-pointer"
                  aria-expanded={isOpen}
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
                      color: isOpen ? "var(--color-primary-600)" : "var(--color-outline)",
                    }}
                  />
                </button>
                <div
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
