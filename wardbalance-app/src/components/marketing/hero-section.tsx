"use client";

import { useState } from "react";
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

export default function HeroSection() {
  const [demoState, setDemoState] = useState<"idle" | "verifying" | "verified">("idle");

  const handleVerify = () => {
    setDemoState("verifying");
    if (isCategoryAllowed("analytics")) {
      trackEvent({ event: "demo_verify_clicked" });
    }
    setTimeout(() => {
      setDemoState("verified");
      if (isCategoryAllowed("analytics")) {
        trackEvent({ event: "demo_verify_success" });
      }
    }, 1200);
  };

  const handleReset = () => {
    setDemoState("idle");
  };

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
      className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background */}
      <div className="absolute inset-0 gradient-hero" aria-hidden="true" />

      {/* Decorative shapes */}
      <div
        className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-30 blur-[100px] animate-float bg-primary-200"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 -left-32 w-[500px] h-[500px] rounded-full opacity-20 blur-[100px] animate-float animation-delay-300 bg-primary-300"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text content */}
          <div className="text-center lg:text-left">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-label-medium animate-fade-in-up bg-primary-light text-primary-dark border border-primary-200"
            >
              <span className="w-2 h-2 rounded-full bg-primary" />
              Now live — free plan, no credit card needed
            </div>

            <h1
              id="hero-heading"
              className="text-headline-large md:text-display-small lg:text-display-medium mb-6 animate-fade-in-up animation-delay-100 font-bold text-foreground"
            >
              Know who has paid, how much, and what&rsquo;s still owed &mdash; at WhatsApp-level simplicity.
            </h1>

            <p className="text-body-large md:text-title-medium mb-8 max-w-xl mx-auto lg:mx-0 animate-fade-in-up animation-delay-200 text-on-surface-variant">
              WardBalance replaces spreadsheets and WhatsApp receipts with structured invoices, parent balances, payment tracking, and instant receipts &mdash; purpose-built for Nigerian private schools.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up animation-delay-300">
              <Link
                href="/signup?plan=freemium&source=hero"
                onClick={() => {
                  if (isCategoryAllowed("analytics")) {
                    trackEvent({ event: "get_started_clicked", properties: { source: "hero" } });
                  }
                }}
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-lg text-label-large font-bold transition-all duration-200 hover:shadow-xl hover:opacity-90 cursor-pointer bg-primary text-on-primary"
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
                  const el = document.getElementById("demo");
                  if (el) {
                    const top = el.getBoundingClientRect().top + window.scrollY - 84;
                    window.scrollTo({ top, behavior: "smooth" });
                  }
                  window.dispatchEvent(
                    new CustomEvent("wb:prefill-demo", {
                      detail: {
                        message:
                          "Hi WardBalance team, I would like to book a demo to understand how WardBalance can help my school manage fees, invoices, payments, and parent balances.",
                      },
                    })
                  );
                }}
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-lg text-label-large font-bold transition-all duration-200 hover:shadow-md cursor-pointer bg-transparent text-primary border-2 border-primary"
              >
                Book a Demo
              </a>
            </div>

            {/* Trust Line */}
            <p className="text-body-small mt-6 text-center lg:text-left animate-fade-in-up animation-delay-400 font-medium text-on-surface-variant">
              Purpose-built for Nigerian private schools &mdash; from nursery to secondary.
            </p>
          </div>

          {/* Interactive Dashboard Mockup */}
          <div className="animate-fade-in-up animation-delay-400 lg:max-w-xl xl:max-w-2xl mx-auto w-full relative">
            {/* Receipt badge — bottom right only (single badge keeps layout clean) */}
            <div className="hidden lg:flex absolute -bottom-5 -right-8 z-20 items-center gap-2.5 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-lg max-w-[240px] animate-float animation-delay-300">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                <Check size={16} className="text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Receipt Generated</p>
                <p className="text-[12px] font-bold text-neutral-800 truncate">Receipt #WB-9821</p>
                <p className="text-[11px] font-bold text-green-600 font-sans tabular-nums mt-0.5">₦120,000</p>
              </div>
            </div>

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
                <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 bg-neutral-50/80 backdrop-blur-sm select-none">
                  {/* macOS window control dots */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 border border-red-500/20" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-500/20" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 border border-green-500/20" />
                  </div>
                  {/* Mock URL bar */}
                  <div className="flex-1 max-w-xs mx-auto flex items-center justify-center bg-white border border-neutral-200/80 rounded-md py-0.5 px-3 text-[11px] font-mono text-neutral-400 truncate shadow-sm">
                    <span className="text-neutral-300 mr-0.5 select-none">https://</span>
                    <span className="text-neutral-600 font-medium">app.wardbalance.com.ng</span>
                  </div>
                  {/* Live Preview badge */}
                  <div className="shrink-0 flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    <span className="text-[10px] font-bold text-green-700 whitespace-nowrap">Live preview</span>
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="p-5 md:p-6">
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
                <div className="grid grid-cols-2 gap-3">
                  {/* Expected Revenue */}
                  <div
                    className="rounded-lg p-3.5 transition-all duration-200 bg-surface-container-low border border-outline-variant"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center bg-primary-light">
                        <TrendingUp size={14} className="text-primary" />
                      </div>
                      <span className="text-label-small font-medium text-on-surface-variant">
                        Expected Revenue
                      </span>
                    </div>
                    <p className="text-title-medium font-bold tabular-nums text-on-surface">
                      {formatNairaVal(expectedRevenue)}
                    </p>
                  </div>

                  {/* Collected */}
                  <div
                    className="rounded-lg p-3.5 transition-all duration-300 bg-surface-container-low"
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
                      className={`text-title-medium font-bold tabular-nums transition-colors duration-300 ${demoState === "verified" ? "text-success-600" : ""}`} 
                      style={{ color: demoState === "verified" ? undefined : "var(--color-on-surface)" }}
                    >
                      {formatNairaVal(collectedRevenue)}
                    </p>
                  </div>

                  {/* Outstanding */}
                  <div
                    className="rounded-lg p-3.5 transition-all duration-200 bg-surface-container-low border border-outline-variant"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "rgba(245, 158, 11, 0.1)" }}>
                        <AlertTriangle size={14} className="text-warning-500" />
                      </div>
                      <span className="text-label-small font-medium text-on-surface-variant">
                        Outstanding
                      </span>
                    </div>
                    <p className="text-title-medium font-bold tabular-nums text-on-surface">
                      {formatNairaVal(outstandingRevenue)}
                    </p>
                  </div>

                  {/* Pending Verifications */}
                  <div
                    className="rounded-lg p-3.5 transition-all duration-300 bg-surface-container-low border border-outline-variant"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center bg-primary-light">
                        <Clock size={14} className="text-primary-600" />
                      </div>
                      <span className="text-label-small font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
                        Pending Verify
                      </span>
                    </div>
                    <p className="text-title-medium font-bold tabular-nums" style={{ color: "var(--color-on-surface)" }}>
                      {pendingVerifications}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between mb-1.5">
                    <span
                      className="text-label-small font-medium"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      Collection Progress
                    </span>
                    <span
                      className="text-label-small font-bold tabular-nums"
                      style={{
                        color: "var(--color-primary-600)",
                      }}
                    >
                      {progressPercent}%
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

                    <div className="flex items-start gap-3 bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/60 shadow-sm" style={{ background: "var(--color-surface-container-lowest)" }}>
                      <div className="w-11 h-11 rounded bg-gray-100 border border-gray-200 flex flex-col items-center justify-center text-gray-400 shrink-0 select-none">
                        <FileText size={18} />
                        <span className="text-[7px] font-bold mt-0.5 uppercase tracking-wider">PROOF</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="text-label-medium font-bold truncate" style={{ color: "var(--color-on-surface)" }}>
                            Tunde Johnson
                          </h4>
                          <span className="text-label-small font-bold font-mono tabular-nums text-primary-700">
                            ₦120,000
                          </span>
                        </div>
                        <p className="text-[11px] truncate" style={{ color: "var(--color-on-surface-variant)" }}>
                          JSS 2A • 1st Term Tuition
                        </p>
                        <p className="text-[9px] font-mono mt-0.5 truncate text-gray-500">
                          Ref: GTB-TRSF-8492019482
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 justify-end items-center relative">
                      {demoState === "idle" && (
                        <span 
                          className="absolute -top-9 right-2 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-md animate-bounce flex items-center gap-1 select-none pointer-events-none z-10"
                          style={{ background: "var(--color-primary-600)" }}
                        >
                          <span>👇 Try clicking this!</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        </span>
                      )}
                      <button disabled className="px-3 py-1.5 rounded text-[11px] font-medium border border-outline-variant text-gray-400 cursor-not-allowed">
                        Reject
                      </button>
                      <button
                        onClick={handleVerify}
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
                      onClick={handleReset}
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
        </div>
      </div>
    </section>
  );
}
