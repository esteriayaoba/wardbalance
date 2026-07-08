"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Lock, ArrowRight, Sparkles, Check, Zap, AlertCircle } from "lucide-react";

interface Step {
  id: number;
  title: string;
  description: string;
  status: "completed" | "not_started" | "blocked" | "in_progress" | "needs_attention";
  blocked: boolean;
  blockedBy: string[];
  cta: string;
  href: string;
}

interface Progress {
  completed: number;
  total: number;
  percentage: number;
}

const SVG_RADIUS = 28;
const SVG_CIRCUMFERENCE = 2 * Math.PI * SVG_RADIUS;

export default function SetupChecklistPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<Step[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [schoolStatus, setSchoolStatus] = useState<string>("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/setup/status");
      const body = await res.json();
      if (res.ok) {
        setSteps(body.data.steps);
        setProgress(body.data.progress);
        const newStatus = body.data.schoolStatus;
        setSchoolStatus(newStatus);

        if (body.data.progress.completed === body.data.progress.total && newStatus === "onboarding") {
          await fetch("/api/admin/setup/complete", { method: "POST" });
          setSchoolStatus("active");
        }
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const handleFocus = () => fetchStatus();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-body-large text-neutral-600">Evaluating setup progress...</p>
      </div>
    );
  }

  const nextStepId = steps.find((s) => s.status === "not_started" && !s.blocked)?.id ?? null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Intro Header */}
      <div className="bg-white p-8 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-light text-primary text-body-small font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Pilot Mode Onboarding
            </span>
          </div>
          <h1 className="text-headline-small text-neutral-900 font-bold">
            School Setup Checklist
          </h1>
          <p className="text-body-medium text-neutral-600 max-w-xl">
            Complete the 12 required tasks below to configure your academic structure, upload student profiles, define fee templates, and issue your first batch of invoices.
          </p>
          <p className="text-body-small text-neutral-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Est. 15–20 minutes to complete
          </p>
        </div>

        {/* Progress Circle */}
        {progress && (
          <div className="flex items-center gap-4 shrink-0 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="absolute w-full h-full transform -rotate-90" aria-hidden="true">
                <circle cx="32" cy="32" r={SVG_RADIUS} className="stroke-neutral-200" strokeWidth="4" fill="transparent" />
                <circle
                  cx="32" cy="32" r={SVG_RADIUS}
                  className="stroke-primary transition-all duration-500"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={SVG_CIRCUMFERENCE}
                  strokeDashoffset={SVG_CIRCUMFERENCE - (SVG_CIRCUMFERENCE * progress.percentage) / 100}
                />
              </svg>
              <span className="text-title-medium text-neutral-950 font-bold">{progress.percentage}%</span>
            </div>
            <div>
              <p className="text-body-small text-neutral-500 font-medium">Setup Progress</p>
              <p className="text-title-small text-neutral-900 font-bold">
                {progress.completed} of {progress.total} Steps
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Checklist List */}
      <div className="space-y-3">
        {steps.map((step) => {
          const isCompleted = step.status === "completed";
          const isBlocked = step.status === "blocked";
          const isNext = step.id === nextStepId;

          const needsAttention = step.status === "needs_attention";

          return (
            <div
              key={step.id}
              className={`p-6 bg-white rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                isCompleted && !needsAttention
                  ? "border-green-200 bg-green-50/20"
                  : needsAttention
                  ? "border-amber-200 bg-amber-50/20 ring-1 ring-amber-200"
                  : isNext
                  ? "border-primary shadow-md ring-1 ring-primary/20"
                  : isBlocked
                  ? "border-neutral-200 bg-neutral-50/50"
                  : "border-neutral-200 shadow-sm hover:border-neutral-300"
              }`}
            >
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-body-small font-bold shrink-0 ${
                      isCompleted && !needsAttention
                        ? "bg-green-100 text-green-700"
                        : needsAttention
                        ? "bg-amber-100 text-amber-700"
                        : isBlocked
                        ? "bg-neutral-200 text-neutral-500"
                        : isNext
                        ? "bg-primary text-white"
                        : "bg-primary-light text-primary"
                    }`}
                  >
                    {isCompleted && !needsAttention ? <Check className="w-4 h-4" /> : needsAttention ? <AlertCircle className="w-4 h-4" /> : step.id}
                  </span>

                  <h3 className={`text-title-small font-bold ${isCompleted && !needsAttention ? "text-green-950" : needsAttention ? "text-amber-900" : isBlocked ? "text-neutral-500" : "text-neutral-900"}`}>
                    {step.title}
                  </h3>

                  {isCompleted && !needsAttention && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                      Done
                    </span>
                  )}
                  {needsAttention && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                      <AlertCircle className="w-3 h-3" />
                      Needs Attention
                    </span>
                  )}
                  {isNext && !needsAttention && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
                      <Zap className="w-2.5 h-2.5" />
                      Start Here
                    </span>
                  )}
                  {isBlocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">
                      <Lock className="w-3 h-3" />
                      Locked
                    </span>
                  )}
                </div>

                <p className={`text-body-medium leading-normal ${isBlocked ? "text-neutral-500" : needsAttention ? "text-amber-800" : "text-neutral-600"}`}>
                  {step.description}
                </p>

                {needsAttention && (
                  <p className="text-body-small text-amber-700 mt-1 font-medium">
                    This step was completed but may need review based on your current data.
                  </p>
                )}

                {isBlocked && step.blockedBy.length > 0 && (
                  <p className="text-body-small text-neutral-500 mt-1 font-medium">
                    Complete first:{" "}
                    <span className="font-bold text-neutral-600">{step.blockedBy.join(", ")}</span>
                  </p>
                )}
              </div>

              {/* CTAs */}
              <div className="shrink-0">
                {isCompleted && !needsAttention ? (
                  <button
                    onClick={() => router.push(step.href)}
                    className="px-4 py-2 border border-green-200 text-green-700 rounded-lg text-body-small font-bold bg-green-50 hover:bg-green-100 transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    View / Edit
                  </button>
                ) : isBlocked ? (
                  <button
                    disabled
                    className="px-4 py-2 bg-neutral-100 border border-neutral-200 text-neutral-400 rounded-lg text-body-small font-bold cursor-not-allowed inline-flex items-center gap-1.5"
                  >
                    <Lock className="w-4 h-4" />
                    Locked
                  </button>
                ) : (
                  <button
                    onClick={() => router.push(step.href)}
                    className={`px-4 py-2 rounded-lg text-body-small font-bold transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer ${
                      needsAttention
                        ? "bg-amber-500 text-white hover:bg-amber-600 ring-2 ring-amber-300"
                        : isNext
                        ? "bg-primary text-white hover:bg-primary-dark ring-2 ring-primary/30"
                        : "bg-primary text-white hover:bg-primary-dark"
                    }`}
                  >
                    {needsAttention ? "Review" : step.cta}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion Banner */}
      {schoolStatus === "active" && (
        <div className="p-6 bg-green-500 rounded-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-title-large font-bold">Workspace Fully Active!</h3>
            </div>
            <p className="text-body-medium text-green-100">
              Your setup checklist is complete. You can now access the full dashboard and start managing fees and payments.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="px-6 py-3 bg-white text-green-700 font-bold rounded-lg text-label-large hover:bg-green-50 transition shadow shrink-0 cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
