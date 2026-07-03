"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Wallet,
  AlertTriangle,
  Clock,
  Check,
  Loader2,
  RefreshCw,
  FileText,
  Sparkles,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics/posthog";
import { isCategoryAllowed } from "@/lib/cookies/consent";
import { scrollToSection } from "@/lib/utils";

export default function HeroSection() {
  const [demoState, setDemoState] = useState<"idle" | "verifying" | "verified">("idle");
  const [isManual, setIsManual] = useState(false);

  const handleVerify = useCallback((manual = false) => {
    if (manual) {
      setIsManual(true);
    }
    setDemoState("verifying");
    if (isCategoryAllowed("analytics")) {
      trackEvent({ 
        event: "demo_verify_clicked", 
        properties: { interaction: manual ? "manual" : "auto" } 
      });
    }
    setTimeout(() => {
      setDemoState("verified");
      if (isCategoryAllowed("analytics")) {
        trackEvent({ 
          event: "demo_verify_success", 
          properties: { interaction: manual ? "manual" : "auto" } 
        });
      }
    }, 1200);
  }, []);

  const handleReset = useCallback((manual = false) => {
    if (manual) {
      setIsManual(true);
    }
    setDemoState("idle");
  }, []);

  // Auto-animate the demo loop on mount, unless user manually interacts
  useEffect(() => {
    if (isManual) return;
    
    let timer: ReturnType<typeof setTimeout>;
    if (demoState === "idle") {
      timer = setTimeout(() => handleVerify(false), 12000); // 12 seconds idle
    } else if (demoState === "verified") {
      timer = setTimeout(() => handleReset(false), 7000); // 7 seconds verified
    }
    return () => clearTimeout(timer);
  }, [demoState, handleVerify, handleReset, isManual]);



  // Dynamically calculate metrics based on demo verification state
  const expectedRevenue = 12500000;
  const collectedRevenue = demoState === "verified" ? 8870000 : 8750000;
  const outstandingRevenue = demoState === "verified" ? 3630000 : 3750000;
  const pendingVerifications = demoState === "verified" ? 11 : 12;
  const progressPercent = Math.round((collectedRevenue / expectedRevenue) * 100);

  const formatNairaVal = (num: number) => {
    return `₦${num.toLocaleString("en-NG")}`;
  };

  return (
    <section
      className="relative pt-28 pb-0 md:pt-48 md:pb-0 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <style>{`
        @keyframes scroll-vertical {
          0%, 16% { transform: translateY(0); }
          20%, 36% { transform: translateY(-20%); }
          40%, 56% { transform: translateY(-40%); }
          60%, 76% { transform: translateY(-60%); }
          80%, 96% { transform: translateY(-80%); }
          100% { transform: translateY(-100%); }
        }
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll-vertical {
          animation: scroll-vertical 15s cubic-bezier(0.76, 0, 0.24, 1) infinite;
        }
        .animate-marquee {
          animation: marquee-scroll 30s linear infinite;
        }
      `}</style>

      {/* Background */}
      <div className="absolute inset-0 gradient-hero" aria-hidden="true" />

      {/* Decorative shapes */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-35 bg-[radial-gradient(circle,var(--color-primary-200)_0%,transparent_70%)] pointer-events-none select-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full opacity-20 bg-[radial-gradient(circle,var(--color-primary-300)_0%,transparent_70%)] pointer-events-none select-none"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Centralized Text Content */}
        <div className="mx-auto max-w-4xl text-center flex flex-col items-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-label-medium animate-fade-in-up bg-primary-light text-primary-dark border border-primary-200"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Stop juggling spreadsheets and WhatsApp
          </div>

          <h1
            id="hero-heading"
            className="text-display-small md:text-display-medium lg:text-display-large font-black text-neutral-900 mb-6 animate-fade-in-up animation-delay-100 tracking-tight leading-tight max-w-3xl"
          >
            Manage school fees and <br className="sm:hidden" />
            <span className="relative inline-flex flex-col justify-center overflow-hidden h-[1.2em] text-primary font-black align-top w-full">
              <span className="absolute inset-x-0 top-0 flex flex-col animate-scroll-vertical">
                <span className="h-[1.2em] flex items-center justify-center">parent balances</span>
                <span className="h-[1.2em] flex items-center justify-center">term invoices</span>
                <span className="h-[1.2em] flex items-center justify-center">expected revenue</span>
                <span className="h-[1.2em] flex items-center justify-center">class collections</span>
                <span className="h-[1.2em] flex items-center justify-center">parent balances</span>
              </span>
            </span>
            from one simple workspace.
          </h1>

          <p className="text-body-large md:text-title-medium mb-0 max-w-2xl animate-fade-in-up animation-delay-200 text-on-surface-variant leading-relaxed">
            WardBalance helps private schools replace scattered spreadsheets, bank alerts, WhatsApp messages, and manual records with one organized finance workspace.
          </p>
        </div>

        {/* Centralized & Expanded Interactive Dashboard Mockup */}
        <div className="animate-fade-in-up animation-delay-400 max-w-4xl mx-auto w-full relative mt-8 md:mt-12">

          <div
            className="relative rounded-2xl p-1 transition-shadow duration-300 hover:shadow-2xl shadow-xl overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary-200), var(--color-primary-400), var(--color-primary-200))",
            }}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "var(--color-surface-container-lowest)",
              }}
            >
               {/* Browser Header Bar */}
              <div className="flex items-center gap-2 px-3 sm:px-4 py-3 border-b border-neutral-100 bg-neutral-50/80 backdrop-blur-sm select-none">
                {/* macOS window control dots (hidden on mobile to make room) */}
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 border border-red-500/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-500/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 border border-green-500/20" />
                </div>
                {/* Mock URL bar */}
                <div className="flex-1 max-w-[180px] sm:max-w-xs mx-auto flex items-center justify-center bg-white border border-neutral-200/80 rounded-md py-0.5 px-2 sm:px-3 text-[10px] sm:text-[11px] font-mono text-neutral-400 truncate shadow-sm">
                  <span className="text-neutral-300 mr-0.5 select-none hidden md:inline">https://</span>
                  <span className="text-neutral-600 font-medium truncate">app.wardbalance.com.ng</span>
                </div>
                {/* Live Preview badge */}
                <div className="shrink-0 flex items-center gap-1 sm:gap-1.5 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1">
                  <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-green-500" />
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-green-700 whitespace-nowrap">
                    <span className="hidden sm:inline">Live finance dashboard</span>
                    <span className="sm:hidden">Live</span>
                  </span>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-5 md:p-6 bg-white">
                {/* Mock top bar */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-label-medium text-on-surface-variant">
                      Bursar Workspace
                    </p>
                    <p className="text-title-medium font-bold text-on-surface">
                      Term 2, 2025/2026
                    </p>
                  </div>
                </div>

                {/* KPI Cards Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Expected Revenue */}
                  <div
                    className="rounded-lg p-3.5 transition-all duration-200 bg-neutral-50/50 border border-neutral-200/60"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center bg-primary-light">
                        <TrendingUp size={14} className="text-primary" />
                      </div>
                      <span className="text-label-small font-medium text-on-surface-variant">
                        Expected Revenue
                      </span>
                    </div>
                    <p className="text-body-large md:text-title-medium font-bold tabular-nums text-on-surface">
                      {formatNairaVal(expectedRevenue)}
                    </p>
                  </div>

                  {/* Collected */}
                  <div
                    className="rounded-lg p-3.5 transition-all duration-300 bg-neutral-50/50"
                    style={{
                      border: demoState === "verified" ? "1px solid var(--color-success-500)" : "1px solid var(--color-outline-variant)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "rgba(22, 163, 74, 0.1)" }}>
                        <Wallet size={14} className="text-success-500" />
                      </div>
                      <span className="text-label-small font-medium text-on-surface-variant">
                        Collected
                      </span>
                    </div>
                    <p 
                      className={`text-body-large md:text-title-medium font-bold tabular-nums transition-colors duration-300 ${demoState === "verified" ? "text-success-600 font-extrabold" : ""}`} 
                      style={{ color: demoState === "verified" ? undefined : "var(--color-on-surface)" }}
                    >
                      {formatNairaVal(collectedRevenue)}
                    </p>
                  </div>

                  {/* Outstanding */}
                  <div
                    className="rounded-lg p-3.5 transition-all duration-200 bg-neutral-50/50 border border-neutral-200/60"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "rgba(245, 158, 11, 0.1)" }}>
                        <AlertTriangle size={14} className="text-warning-500" />
                      </div>
                      <span className="text-label-small font-medium text-on-surface-variant">
                        Outstanding
                      </span>
                    </div>
                    <p className="text-body-large md:text-title-medium font-bold tabular-nums text-on-surface">
                      {formatNairaVal(outstandingRevenue)}
                    </p>
                  </div>

                  {/* Pending Verifications */}
                  <div
                    className="rounded-lg p-3.5 transition-all duration-300 bg-neutral-50/50 border border-neutral-200/60"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center bg-primary-light">
                        <Clock size={14} className="text-primary-600" />
                      </div>
                      <span className="text-label-small font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
                        Pending Verify
                      </span>
                    </div>
                    <p className="text-body-large md:text-title-medium font-bold tabular-nums" style={{ color: "var(--color-on-surface)" }}>
                      {pendingVerifications}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between mb-1.5">
                    <span
                      className="text-label-small font-medium text-neutral-500"
                    >
                      Collection Progress
                    </span>
                    <span
                      className="text-label-small font-bold tabular-nums"
                      style={{
                        color: "var(--color-primary-600)",
                      }}
                    >
                      <span className="tabular-nums">{progressPercent}%</span>
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{
                      background: "var(--color-surface-container-high)",
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progressPercent}%`,
                        background:
                          "linear-gradient(90deg, var(--color-primary-500), var(--color-primary-400))",
                      }}
                    />
                  </div>
                </div>

                {/* Interactive Action Workspace */}
                {demoState !== "verified" ? (
                  <div
                    className="mt-5 p-4 rounded-xl border transition-all duration-300"
                    style={{
                      background: "var(--color-surface-container-low)",
                      borderColor: "var(--color-outline-variant)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={14} className="text-primary-500 animate-pulse" />
                        <span className="text-label-medium font-bold text-primary-600">Verification Queue</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                        1 pending approval
                      </span>
                    </div>

                    <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-neutral-200/60 shadow-sm">
                      <div className="w-11 h-11 rounded bg-gray-100 border border-gray-200 flex flex-col items-center justify-center text-gray-400 shrink-0 select-none">
                        <FileText size={18} />
                        <span className="text-[7px] font-bold mt-0.5 uppercase tracking-wider">PROOF</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="text-label-medium font-bold truncate text-neutral-800">
                            Tunde Johnson
                          </h4>
                          <span className="text-label-small font-bold font-mono tabular-nums text-primary-700">
                            ₦120,000
                          </span>
                        </div>
                        <p className="text-[11px] truncate text-neutral-500">
                          JSS 2A • 1st Term Tuition
                        </p>
                        <p className="text-[9px] font-mono mt-0.5 truncate text-gray-400">
                          Ref: GTB-TRSF-8492019482
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 justify-end items-center">
                      <button disabled className="px-3 py-1.5 rounded text-[11px] font-medium border border-neutral-200 text-gray-400 cursor-not-allowed">
                        Reject
                      </button>
                       <button
                        onClick={() => handleVerify(true)}
                        disabled={demoState === "verifying"}
                        className={`px-4 py-1.5 rounded text-[11px] font-bold text-white transition-all duration-150 flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-85 ${demoState === "idle" ? "animate-pulse" : ""}`}
                        style={{
                          background: "var(--color-primary-500)",
                        }}
                      >
                        {demoState === "verifying" ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <Check size={12} strokeWidth={2.5} />
                            Approve Payment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="mt-5 p-4 rounded-xl border transition-all duration-300 text-center flex flex-col items-center justify-center min-h-[148px]"
                    style={{
                      background: "rgba(22, 163, 74, 0.03)",
                      borderColor: "rgba(22, 163, 74, 0.2)",
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-success-500 mb-2 border border-green-200 animate-bounce">
                      <Check size={20} strokeWidth={3} className="text-green-600" />
                    </div>
                    <h4 className="text-label-large font-bold text-green-700">Payment Approved!</h4>
                    <p className="text-[11px] text-green-600 mt-1 max-w-[270px]">
                      Ledger updated, receipt sent to parent, and verification queue cleared.
                    </p>

                     <button
                      onClick={() => handleReset(true)}
                      className="mt-3 text-[10px] text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1 font-bold underline"
                    >
                      <RefreshCw size={9} />
                      Reset Demo View
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Proof + CTA section — stats, trust bar, then buttons */}
        <div className="mx-auto max-w-4xl text-center flex flex-col items-center mt-10 md:mt-16">

          {/* Credibility Stats */}
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 animate-fade-in-up animation-delay-300">
            <div className="text-center md:text-left">
              <span className="block text-title-medium font-bold text-primary-700">120+ Schools</span>
              <span className="text-[11px] text-on-surface-variant font-medium">Onboarded & Active</span>
            </div>
            <div className="h-8 w-px bg-neutral-200 hidden md:block" />
            <div className="text-center md:text-left">
              <span className="block text-title-medium font-bold text-primary-700">₦85M+</span>
              <span className="text-[11px] text-on-surface-variant font-medium">Fees Tracked</span>
            </div>
            <div className="h-8 w-px bg-neutral-200 hidden md:block" />
            <div className="text-center md:text-left">
              <span className="block text-title-medium font-bold text-primary-700">99.8%</span>
              <span className="text-[11px] text-on-surface-variant font-medium">Reconciliation Accuracy</span>
            </div>
          </div>

          {/* Trust bar — consolidated, single instance */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-body-small text-on-surface-variant/70 animate-fade-in-up animation-delay-400">
            <span className="font-semibold text-[10px] uppercase tracking-wider text-neutral-500">Trusted by private schools in Lagos & Abuja:</span>
            <div className="flex gap-2.5 text-neutral-600 font-extrabold text-[11px] tracking-wide select-none">
              <span>Grace Heights Academy</span>
              <span className="text-neutral-300 font-normal">•</span>
              <span>Pinnacle International</span>
              <span className="text-neutral-300 font-normal">•</span>
              <span>Standard Academy</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col md:flex-row gap-4 justify-center animate-fade-in-up animation-delay-300 w-full md:w-auto mt-10">
            <Link
              href="/signup?plan=freemium&source=hero"
              onClick={() => {
                if (isCategoryAllowed("analytics")) {
                  trackEvent({ event: "get_started_clicked", properties: { source: "hero" } });
                }
              }}
              className="w-full md:w-auto inline-flex items-center justify-center px-8 py-4 rounded-lg text-label-large font-bold transition-all duration-200 hover:shadow-xl hover:opacity-90 cursor-pointer bg-primary text-on-primary"
            >
              Get Started
            </Link>
            <a
              href="#demo"
              onClick={(e) => {
                e.preventDefault();
                if (isCategoryAllowed("analytics")) {
                  trackEvent({ event: "book_demo_clicked", properties: { source: "book_demo_hero" } });
                }
                scrollToSection("demo");
                window.dispatchEvent(
                  new CustomEvent("wb:prefill-demo", {
                    detail: {
                      message:
                        "Hi WardBalance team, I would like to book a demo to understand how WardBalance can help my school manage fees, invoices, payments, and parent balances.",
                    },
                  })
                );
              }}
              className="w-full md:w-auto inline-flex items-center justify-center px-8 py-4 rounded-lg text-label-large font-bold transition-all duration-200 hover:shadow-md cursor-pointer bg-transparent text-primary border-2 border-primary"
            >
              Book a Demo
            </a>
          </div>
        </div>
      </div>

      {/* Horizontal Feature Ticker Marquee */}
      <div className="w-full overflow-hidden relative py-8 mt-20 border-t border-neutral-200/50 bg-neutral-50/20 select-none">
        <div className="flex gap-8 animate-marquee whitespace-nowrap">
          {/* Set 1 */}
          {[
            "Fee Item Catalogue",
            "Class Fee Templates",
            "Automatic Invoices",
            "Naira Currency Formatting",
            "Manual Payment Recording",
            "Audit Log Recording",
            "Discount Application",
            "Bursar Audit Logs",
            "Bursar & Owner Roles",
            "Session & Term Locking",
          ].map((f, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-2 bg-white border border-neutral-200/60 rounded-full px-5 py-2.5 shadow-sm text-body-medium font-bold text-neutral-700"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {f}
            </div>
          ))}
          {/* Set 2 */}
          {[
            "Fee Item Catalogue",
            "Class Fee Templates",
            "Automatic Invoices",
            "Naira Currency Formatting",
            "Manual Payment Recording",
            "Audit Log Recording",
            "Discount Application",
            "Bursar Audit Logs",
            "Bursar & Owner Roles",
            "Session & Term Locking",
          ].map((f, i) => (
            <div
              key={`dup-${i}`}
              className="inline-flex items-center gap-2 bg-white border border-neutral-200/60 rounded-full px-5 py-2.5 shadow-sm text-body-medium font-bold text-neutral-700"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {f}
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
