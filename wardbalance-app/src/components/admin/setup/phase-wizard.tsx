"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Lock, AlertCircle, ArrowRight, School, Users, CreditCard } from "lucide-react";
import { trackSetupStepClicked } from "@/lib/analytics/funnel";

export interface StepData {
  id: number;
  title: string;
  description: string;
  status: "completed" | "not_started" | "blocked" | "in_progress" | "needs_attention";
  blocked: boolean;
  blockedBy: string[];
  cta: string;
  href: string;
}

export interface PhaseData {
  id: number;
  title: string;
  description: string;
  icon: string;
  stepIds: number[];
  completed: number;
  total: number;
}

interface PhaseWizardProps {
  phases: PhaseData[];
  steps: StepData[];
  activePhase: number;
  onNavigate: (phase: number) => void;
}

const PHASE_ICONS: Record<string, React.ElementType> = {
  School,
  Users,
  CreditCard,
};

export default function PhaseWizard({ phases, steps, activePhase, onNavigate }: PhaseWizardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const navigateToStep = (stepId: number, stepTitle: string, href: string) => {
    // Track onboarding step click event
    trackSetupStepClicked(stepId, stepTitle);

    // Immediately bust the setup status cache so the wizard reflects
    // completion as soon as the admin returns from the step page.
    queryClient.invalidateQueries({ queryKey: ["admin", "setup", "status"] });
    router.push(href);
  };

  // Determine the next uncompleted step in the active phase
  const activeStepIds = phases.find((p) => p.id === activePhase)?.stepIds ?? [];
  const firstNotStarted = steps.find(
    (s) => activeStepIds.includes(s.id) && s.status === "not_started" && !s.blocked
  );
  const firstNeedsAttention = steps.find(
    (s) => activeStepIds.includes(s.id) && s.status === "needs_attention"
  );

  return (
    <div className="space-y-8">
      {/* Phase Progress Bar */}
      <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {phases.map((phase) => {
            const isActive = phase.id === activePhase;
            const isComplete = phase.completed >= phase.total;
            const isFuture = phase.id > activePhase;
            const Icon = PHASE_ICONS[phase.icon] ?? School;
            const progressPct = Math.round((phase.completed / phase.total) * 100);

            return (
              <button
                key={phase.id}
                onClick={() => onNavigate(phase.id)}
                disabled={isFuture && !isComplete}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Phase ${phase.id}: ${phase.title}${isComplete ? " (complete)" : isActive ? " (active)" : ""}`}
                className={`relative min-h-[88px] p-4 rounded-xl border-2 text-left transition cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  isComplete
                    ? "border-green-200 bg-green-50/30"
                    : isActive
                    ? "border-primary bg-primary-50/20 shadow-sm"
                    : isFuture
                    ? "border-neutral-200 bg-neutral-50 opacity-60"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isComplete
                        ? "bg-green-100 text-green-700"
                        : isActive
                        ? "bg-primary text-white"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {isComplete ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-title-small font-bold mb-0.5 ${
                      isComplete ? "text-green-900" : isActive ? "text-primary" : "text-neutral-600"
                    }`}>
                      {isComplete && "✓ "}Phase {phase.id}
                    </p>
                    <p className={`text-body-small font-medium ${
                      isComplete ? "text-green-700" : isActive ? "text-neutral-900" : "text-neutral-500"
                    }`}>
                      {phase.title}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isComplete ? "bg-green-500" : isActive ? "bg-primary" : "bg-neutral-300"
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-bold tabular-nums ${
                        isComplete ? "text-green-700" : "text-neutral-500"
                      }`}>
                        {phase.completed}/{phase.total}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Phase Steps */}
      <div className="space-y-3">
        {phases
          .filter((p) => p.id === activePhase)
          .map((phase) => {
            const phaseSteps = steps.filter((s) => phase.stepIds.includes(s.id));

            return (
              <div key={phase.id}>
                <div className="mb-4">
                  <h2 className="text-title-large text-neutral-900 font-bold">{phase.title}</h2>
                  <p className="text-body-medium text-neutral-600">{phase.description}</p>
                </div>

                <div className="space-y-2">
                  {phaseSteps.map((step) => {
                    const isCompleted = step.status === "completed";
                    const isBlocked = step.status === "blocked";
                    const isNeedsAttention = step.status === "needs_attention";
                    const isNext = step.id === firstNotStarted?.id || step.id === firstNeedsAttention?.id;

                    return (
                      <div
                        key={step.id}
                        className={`p-4 md:p-5 bg-white rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isCompleted
                            ? "border-green-200 bg-green-50/20"
                            : isNeedsAttention
                            ? "border-amber-200 bg-amber-50/20 ring-1 ring-amber-200"
                            : isBlocked
                            ? "border-neutral-200 bg-neutral-50/50"
                            : isNext
                            ? "border-primary/30 bg-white shadow-sm"
                            : "border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-body-small font-bold shrink-0 mt-0.5 ${
                              isCompleted
                                ? "bg-green-100 text-green-700"
                                : isNeedsAttention
                                ? "bg-amber-100 text-amber-700"
                                : isBlocked
                                ? "bg-neutral-200 text-neutral-500"
                                : isNext
                                ? "bg-primary text-white"
                                : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="w-4 h-4" />
                            ) : isNeedsAttention ? (
                              <AlertCircle className="w-4 h-4" />
                            ) : (
                              step.id
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`text-title-small font-bold ${
                                isCompleted ? "text-green-950" : isBlocked ? "text-neutral-500" : "text-neutral-900"
                              }`}>
                                {step.title}
                              </h3>
                              {isCompleted && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                                  Done
                                </span>
                              )}
                              {isNeedsAttention && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                                  <AlertCircle className="w-3 h-3" />
                                  Needs Attention
                                </span>
                              )}
                              {isBlocked && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">
                                  <Lock className="w-3 h-3" />
                                  Locked
                                </span>
                              )}
                            </div>
                            <p className={`text-body-small mt-0.5 ${
                              isBlocked ? "text-neutral-500" : "text-neutral-600"
                            }`}>
                              {step.description}
                            </p>
                            {isBlocked && step.blockedBy.length > 0 && (
                              <p className="text-body-small text-neutral-500 mt-1">
                                Complete first: <span className="font-bold text-neutral-600">{step.blockedBy.join(", ")}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isCompleted ? (
                            <button
                              onClick={() => navigateToStep(step.id, step.title, step.href)}
                              className="px-5 min-h-[44px] border border-green-200 text-green-700 rounded-lg text-body-small font-bold bg-green-50 hover:bg-green-100 transition cursor-pointer flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                              View / Edit
                            </button>
                          ) : isBlocked ? (
                            <button
                              disabled
                              className="px-5 min-h-[44px] bg-neutral-100 border border-neutral-200 text-neutral-400 rounded-lg text-body-small font-bold cursor-not-allowed inline-flex items-center gap-1.5"
                            >
                              <Lock className="w-4 h-4" />
                              Locked
                            </button>
                          ) : (
                            <button
                              onClick={() => navigateToStep(step.id, step.title, step.href)}
                              className={`px-5 min-h-[44px] rounded-lg text-body-small font-bold transition inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                                isNeedsAttention
                                  ? "bg-amber-500 text-white hover:bg-amber-600 ring-2 ring-amber-300"
                                  : "bg-primary text-white hover:bg-primary-dark"
                              }`}
                            >
                              {isNeedsAttention ? "Review" : step.cta}
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
