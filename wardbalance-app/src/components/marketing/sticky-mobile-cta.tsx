"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { scrollToSection } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics/posthog";
import { isCategoryAllowed } from "@/lib/cookies/consent";

export default function StickyMobileCta() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const demo = document.getElementById("demo");
      if (!demo) return;
      const rect = demo.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        setVisible(false);
      } else {
        setVisible(true);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md border-t border-neutral-200/60 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-3">
        <Link
          href="/signup?plan=freemium&source=sticky_cta"
          onClick={() => {
            if (isCategoryAllowed("analytics")) {
              trackEvent({ event: "get_started_clicked", properties: { source: "sticky_cta" } });
            }
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-label-large font-bold bg-primary text-on-primary cursor-pointer"
        >
          Get Started
          <ArrowRight size={16} strokeWidth={2.5} />
        </Link>
        <a
          href="#demo"
          onClick={(e) => {
            e.preventDefault();
            if (isCategoryAllowed("analytics")) {
              trackEvent({ event: "book_demo_clicked", properties: { source: "sticky_cta" } });
            }
            scrollToSection("demo");
          }}
          className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-lg text-label-large font-bold border-2 border-primary text-primary cursor-pointer"
        >
          Book a Demo
        </a>
      </div>
    </div>
  );
}
