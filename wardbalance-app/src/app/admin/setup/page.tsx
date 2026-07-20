"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles, Zap, AlertCircle, RefreshCw } from "lucide-react";
import { isCategoryAllowed } from "@/lib/cookies/consent";
import PhaseWizard, { PhaseData, StepData } from "@/components/admin/setup/phase-wizard";
import PhaseCelebration from "@/components/admin/setup/phase-celebration";
import {
  trackSetupStarted,
  trackPhaseStarted,
  trackSetupPhaseCompleted,
  trackSetupCompleted,
} from "@/lib/analytics/funnel";
import { useOnboardingFlags } from "@/hooks/use-onboarding-flags";

interface SetupStatusResponse {
  steps: StepData[];
  phases: PhaseData[];
  activePhase: number;
  progress: { completed: number; total: number; percentage: number };
  schoolStatus: string;
}

const PHASE_LABELS: Record<number, string> = {
  1: "Set Up Your School",
  2: "Add Your Community",
  3: "Start Collecting Fees",
};

const PHASE_SUMMARIES: Record<number, (counts: Record<string, number>) => string[]> = {
  1: (c) => [
    c.schoolProfile ? "School Profile configured" : "School Profile configuration pending",
    `${c.academicSession} Academic Session created`,
    `${c.academicTerm} Term created`,
    `${c.division} Division${c.division !== 1 ? "s" : ""} created`,
    `${c.classLevel} Class Level${c.classLevel !== 1 ? "s" : ""} created`,
    `${c.classArm} Class Arm${c.classArm !== 1 ? "s" : ""} created`,
    `${c.student} Student${c.student !== 1 ? "s" : ""} added`,
  ],
  2: (c) => [
    `${c.parent} Parent${c.parent !== 1 ? "s" : ""} registered`,
    `${c.parentWardLink} Parent-ward link${c.parentWardLink !== 1 ? "s" : ""} created`,
  ],
  3: (c) => [
    `${c.feeItem} Fee Item${c.feeItem !== 1 ? "s" : ""} created`,
    `${c.classFeeTemplate} Fee Template${c.classFeeTemplate !== 1 ? "s" : ""} created`,
    `${c.invoice} Invoice${c.invoice !== 1 ? "s" : ""} generated`,
  ],
};

const SVG_RADIUS = 28;
const SVG_CIRCUMFERENCE = 2 * Math.PI * SVG_RADIUS;

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setupWizardV2, loading: flagsLoading } = useOnboardingFlags();

  // Feature flag: if phase wizard is disabled, redirect to dashboard immediately.
  // Show a brief loading screen while flags resolve so there's no flash.
  useEffect(() => {
    if (!flagsLoading && !setupWizardV2) {
      router.replace("/admin/dashboard");
    }
  }, [flagsLoading, setupWizardV2, router]);

  const [activePhase, setActivePhase] = useState<number>(1);
  const [showCelebration, setShowCelebration] = useState<number | null>(null);
  const [celebrationCounts, setCelebrationCounts] = useState<Record<string, number>>({});
  const [isCompleting, setIsCompleting] = useState(false);
  const celebratedRef = useRef<Set<number>>(new Set());

  const statusQuery = useQuery<SetupStatusResponse>({
    queryKey: ["admin", "setup", "status"],
    queryFn: async () => {
      const res = await fetch("/api/admin/setup/status");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to retrieve onboarding configuration.");
      return body.data;
    },
    // Poll every 5 seconds while onboarding is active so the wizard
    // reflects completions made in other tabs without a manual refresh.
    // Polling pauses automatically once school goes active (status !== 'onboarding').
    refetchInterval: (query) => {
      const data = query.state.data as SetupStatusResponse | undefined;
      return data?.schoolStatus === "onboarding" ? 5_000 : false;
    },
    // Do not poll when the browser tab is hidden — saves bandwidth
    refetchIntervalInBackground: false,
    // Always re-fetch when the user returns to the window
    refetchOnWindowFocus: true,
    // 30s stale window prevents redundant refetches while the admin navigates
    // between step pages; the 5s poll ensures progress updates within the wizard.
    staleTime: 30_000,
    // Retry transient network failures with exponential backoff
    retry: 2,
  });

  const phases = statusQuery.data?.phases ?? [];
  const steps = statusQuery.data?.steps ?? [];
  const progress = statusQuery.data?.progress ?? null;
  const schoolStatus = statusQuery.data?.schoolStatus ?? "";
  const loading = statusQuery.isLoading && !statusQuery.data;
  const error = statusQuery.error instanceof Error ? statusQuery.error.message : null;

  // Track page view on mount
  useEffect(() => {
    trackSetupStarted();
  }, []);

  // Track phase navigation
  useEffect(() => {
    if (phases.length > 0) {
      const phase = phases.find((p) => p.id === activePhase);
      if (phase) trackPhaseStarted(phase.id, phase.title);
    }
  }, [activePhase, phases]);

  // Check for URL param to navigate to a specific phase
  useEffect(() => {
    const phaseParam = searchParams.get("phase");
    if (phaseParam) {
      const phaseNum = parseInt(phaseParam, 10);
      if (phaseNum >= 1 && phaseNum <= 3) {
        setActivePhase(phaseNum);
      }
    }
  }, [searchParams]);

  // Detect phase completions and show celebrations
  useEffect(() => {
    if (!phases.length || !steps.length || loading) return;

    for (const phase of phases) {
      const phaseSteps = steps.filter((s) => phase.stepIds.includes(s.id));
      const actualCompleted = phaseSteps.filter((s) => s.status === "completed" || s.status === "needs_attention").length;
      const isNowComplete = actualCompleted >= phase.total;

      // Mark already-completed phases as celebrated on initial data load
      if (isNowComplete && !celebratedRef.current.has(phase.id)) {
        // Only trigger celebration if this phase wasn't already complete when data first loaded
        if (celebratedRef.current.size === 0) {
          // First load: mark all already-complete phases as celebrated, don't trigger
          celebratedRef.current.add(phase.id);
          continue;
        }

        // Newly completed phase — show celebration
        celebratedRef.current.add(phase.id);

        // Track phase completion analytics
        const pct = progress?.percentage ?? Math.round(actualCompleted / 12 * 100);
        trackSetupPhaseCompleted(phase.id, phase.title, pct);

        const stepDone = (id: number) => {
          const s = steps.find((st) => st.id === id);
          return s?.status === "completed" || s?.status === "needs_attention";
        };
        const counts: Record<string, number> = {
          schoolProfile: stepDone(1) ? 1 : 0,
          academicSession: stepDone(2) ? 1 : 0,
          academicTerm: stepDone(3) ? 1 : 0,
          division: stepDone(4) ? 1 : 0,
          classLevel: stepDone(5) ? 1 : 0,
          classArm: stepDone(6) ? 1 : 0,
          student: stepDone(7) ? 1 : 0,
          parent: stepDone(8) ? 1 : 0,
          parentWardLink: stepDone(9) ? 1 : 0,
          feeItem: stepDone(10) ? 1 : 0,
          classFeeTemplate: stepDone(11) ? 1 : 0,
          invoice: stepDone(12) ? 1 : 0,
        };
        setCelebrationCounts(counts);
        setShowCelebration(phase.id);
      }
    }

    // Auto-complete setup when all 12 steps are functionally done
    // "needs_attention" steps are counted as complete — the backend checks
    // raw entity counts, not the computed status flags
    const stepsDone = steps.filter((s) => s.status === "completed" || s.status === "needs_attention").length;
    if (stepsDone >= 12 && schoolStatus === "onboarding" && !isCompleting) {
      setIsCompleting(true);
      fetch("/api/admin/setup/complete", { method: "POST" })
        .then((res) => {
          if (!res.ok) throw new Error("Setup completion failed");
          trackSetupCompleted();
          return res.json();
        })
        .then(() => statusQuery.refetch())
        .catch((err) => {
          console.error("[setup] Auto-complete error:", err);
        })
        .finally(() => setIsCompleting(false));
    }
  }, [phases, steps, loading, schoolStatus, showCelebration, isCompleting, statusQuery]);

  const handlePhaseNavigate = (phaseId: number) => {
    setActivePhase(phaseId);
    setShowCelebration(null);
  };

  const handleCelebrationContinue = () => {
    const nextPhase = (showCelebration ?? 1) + 1;
    if (nextPhase > 3) {
      // All phases complete — go to dashboard
      router.push("/admin/dashboard");
      router.refresh();
    } else {
      setShowCelebration(null);
      setActivePhase(nextPhase);
      statusQuery.refetch();
    }
  };

  const handleCelebrationDashboard = () => {
    router.push("/admin/dashboard");
  };

  if (flagsLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]" role="status" aria-live="polite" aria-label="Loading setup">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" aria-hidden="true" />
        <p className="text-body-large text-neutral-600">Loading setup...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]" role="alert" aria-live="assertive">
        <AlertCircle className="w-12 h-12 text-error mb-4" aria-hidden="true" />
        <h3 className="text-title-medium text-neutral-900 font-bold mb-2">Could Not Load Onboarding Setup</h3>
        <p className="text-body-medium text-neutral-600 mb-6">{error}</p>
        <button onClick={() => statusQuery.refetch()} className="min-h-[44px] px-4 py-2 bg-primary text-white font-bold rounded-lg text-body-small hover:bg-primary-dark transition inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Retry Setup Load
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8" role="status" aria-live="polite" aria-label="Loading setup progress">
        <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200 shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-24 bg-neutral-200 rounded" />
            <div className="h-8 w-64 bg-neutral-200 rounded" />
            <div className="h-4 w-96 bg-neutral-200 rounded" />
            <div className="h-3 w-48 bg-neutral-200 rounded" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <div className="animate-pulse grid grid-cols-3 gap-4">
            <div className="h-24 bg-neutral-100 rounded-xl" />
            <div className="h-24 bg-neutral-100 rounded-xl" />
            <div className="h-24 bg-neutral-100 rounded-xl" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-20 bg-neutral-100 rounded-xl" />
          ))}
        </div>
        <span className="sr-only">Loading setup progress...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Celebration Overlay */}
      {showCelebration && (
        <PhaseCelebration
          phase={showCelebration}
          phaseTitle={PHASE_LABELS[showCelebration] ?? ""}
          summaryItems={
            PHASE_SUMMARIES[showCelebration]
              ? PHASE_SUMMARIES[showCelebration](celebrationCounts)
              : []
          }
          isLast={showCelebration >= 3 || (phases[2]?.completed ?? 0) >= (phases[2]?.total ?? 3)}
          onContinue={handleCelebrationContinue}
          onDashboard={handleCelebrationDashboard}
        />
      )}

      {/* Header */}
      <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary text-body-small font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              School Setup
            </span>
          </div>
          <h1 className="text-headline-small text-neutral-900 font-bold">
            Get Your School Ready
          </h1>
          <p className="text-body-medium text-neutral-600 max-w-xl">
            Complete three phases to configure your school, add your community, and start collecting fees.
          </p>
          <p className="text-body-small text-neutral-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Est. 10–15 minutes total
          </p>
        </div>

        {/* Overall Progress */}
        {progress && (
          <div className="flex items-center gap-4 shrink-0 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="absolute w-full h-full transform -rotate-90" aria-hidden="true">
                <circle cx="32" cy="32" r={SVG_RADIUS} className="stroke-neutral-200" strokeWidth="4" fill="transparent" />
                <circle
                  cx="32" cy="32" r={SVG_RADIUS}
                  className="stroke-primary transition-all duration-500 motion-reduce:transition-none"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={SVG_CIRCUMFERENCE}
                  strokeDashoffset={SVG_CIRCUMFERENCE - (SVG_CIRCUMFERENCE * progress.percentage) / 100}
                />
              </svg>
              <span className="text-title-medium text-neutral-950 font-bold">{progress.percentage}%</span>
            </div>
            <div>
              <p className="text-body-small text-neutral-500 font-medium">Overall Progress</p>
              <p className="text-title-small text-neutral-900 font-bold">
                {progress.completed} of {progress.total} Steps
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Phase Wizard */}
      {phases.length > 0 && (
        <PhaseWizard
          phases={phases}
          steps={steps}
          activePhase={activePhase}
          onNavigate={handlePhaseNavigate}
        />
      )}

      {/* Completion Banner */}
      {schoolStatus === "active" && (
        <div className="p-6 bg-success-500 rounded-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
          <div className="space-y-1">
            <h3 className="text-title-large font-bold">Workspace Fully Active!</h3>
            <p className="text-body-medium text-green-100">
              All setup phases are complete. You can now access the full dashboard and manage fees and payments.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="min-h-[52px] px-6 py-3 bg-white text-green-700 font-bold rounded-lg text-label-large hover:bg-green-50 transition shadow shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

export default function SetupChecklistPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-body-large text-neutral-600">Loading setup...</p>
      </div>
    }>
      <SetupContent />
    </Suspense>
  );
}
