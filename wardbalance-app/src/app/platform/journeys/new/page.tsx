"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  GitBranch,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Mail,
  MessageSquare,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface StepDraft {
  stepOrder: number;
  delayDays: number;
  channel: "EMAIL" | "SMS";
  subject: string;
  htmlBody: string;
  smsBody: string;
}

export default function NewJourneyWizard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTrigger = searchParams.get("trigger") || "INACTIVE_7D";

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState(initialTrigger);

  const [steps, setSteps] = useState<StepDraft[]>([
    {
      stepOrder: 1,
      delayDays: 0,
      channel: "EMAIL",
      subject: "Welcome to WardBalance",
      htmlBody: "<p>Hello {{firstName}}, we're excited to partner with {{schoolName}}!</p>",
      smsBody: "",
    },
    {
      stepOrder: 2,
      delayDays: 3,
      channel: "SMS",
      subject: "",
      htmlBody: "",
      smsBody: "Hi {{firstName}}, need help setting up your invoice templates? Reply or visit wardbalance.com/setup",
    },
  ]);

  const [submitting, setSubmitting] = useState(false);

  const handleAddStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        stepOrder: prev.length + 1,
        delayDays: 2,
        channel: "EMAIL",
        subject: "",
        htmlBody: "",
        smsBody: "",
      },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length === 1) {
      toast.error("A journey must have at least one step");
      return;
    }
    setSteps((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((s, idx) => ({ ...s, stepOrder: idx + 1 }))
    );
  };

  const handleUpdateStep = (index: number, fields: Partial<StepDraft>) => {
    setSteps((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, ...fields } : s))
    );
  };

  const handleSubmit = async () => {
    if (!name) return toast.error("Please enter a journey name");
    if (steps.length === 0) return toast.error("At least one step is required");

    setSubmitting(true);
    try {
      const res = await fetch("/api/platform/journeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          trigger,
          steps,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create journey");

      toast.success("Journey created successfully!");
      router.push("/platform/journeys");
    } catch (err: any) {
      toast.error(err.message || "Failed to save journey");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-headline-medium text-neutral-900 font-bold tracking-tight">
          Journey Builder Wizard
        </h1>
        <p className="text-body-medium text-neutral-500 mt-1">
          Design event-driven drip sequences with multi-channel support.
        </p>
      </div>

      {/* Progress Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div className={`flex items-center gap-2 font-bold text-body-medium ${currentStep === 1 ? "text-primary-600" : "text-neutral-400"}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-label-small ${currentStep === 1 ? "bg-primary-500 text-white" : "bg-neutral-200 text-neutral-600"}`}>1</span>
          1. Trigger & Basics
        </div>
        <div className={`flex items-center gap-2 font-bold text-body-medium ${currentStep === 2 ? "text-primary-600" : "text-neutral-400"}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-label-small ${currentStep === 2 ? "bg-primary-500 text-white" : "bg-neutral-200 text-neutral-600"}`}>2</span>
          2. Sequence Steps
        </div>
        <div className={`flex items-center gap-2 font-bold text-body-medium ${currentStep === 3 ? "text-primary-600" : "text-neutral-400"}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-label-small ${currentStep === 3 ? "bg-primary-500 text-white" : "bg-neutral-200 text-neutral-600"}`}>3</span>
          3. Review & Save
        </div>
      </div>

      {/* STEP 1: Basics & Trigger */}
      {currentStep === 1 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-6 animate-fadeIn">
          <h3 className="text-title-medium text-neutral-900 font-bold">Step 1: Define Trigger Condition</h3>

          <div className="space-y-4">
            <div>
              <label className="text-body-small text-neutral-600 font-bold block mb-1">
                Journey Name
              </label>
              <input
                type="text"
                placeholder="e.g. Inactive School Win-back Drip"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-body-medium focus:outline-primary-500"
              />
            </div>

            <div>
              <label className="text-body-small text-neutral-600 font-bold block mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Re-engages school bursars who haven't logged in for 7+ days"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-body-medium focus:outline-primary-500"
              />
            </div>

            <div>
              <label className="text-body-small text-neutral-600 font-bold block mb-1">
                Trigger Rule Event
              </label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-body-medium focus:outline-primary-500"
              >
                <option value="INACTIVE_7D">INACTIVE_7D — School active, no login in last 7 days</option>
                <option value="TRIAL_EXPIRING_3D">TRIAL_EXPIRING_3D — Free trial expires in 3 days</option>
                <option value="HEALTH_AT_RISK">HEALTH_AT_RISK — Composite health score drops below 39</option>
                <option value="ONBOARDING_STALLED">ONBOARDING_STALLED — Setup incomplete for &gt; 7 days</option>
                <option value="NEW_LEAD">NEW_LEAD — New inbound lead captured in last 24h</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-neutral-200">
            <button
              onClick={() => {
                if (!name) return toast.error("Please enter a name");
                setCurrentStep(2);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-lg transition"
            >
              <span>Next: Sequence Steps</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Steps Builder */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-title-medium text-neutral-900 font-bold">Step 2: Sequence Step Builder</h3>
            <button
              onClick={handleAddStep}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 font-bold text-label-small rounded-lg border border-primary-100"
            >
              <Plus className="w-4 h-4" />
              <span>Add Step</span>
            </button>
          </div>

          {steps.map((step, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-4 relative">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center">
                    {step.stepOrder}
                  </span>
                  <span className="font-bold text-neutral-900 text-title-small">Step {step.stepOrder}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-body-small text-neutral-500">Delay:</span>
                    <input
                      type="number"
                      min={0}
                      value={step.delayDays}
                      onChange={(e) => handleUpdateStep(idx, { delayDays: parseInt(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 border border-neutral-200 rounded text-body-small font-bold text-center"
                    />
                    <span className="text-body-small text-neutral-500">day(s)</span>
                  </div>

                  <button
                    onClick={() => handleRemoveStep(idx)}
                    className="text-red-500 hover:text-red-700 transition"
                    title="Remove step"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Channel Selector */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleUpdateStep(idx, { channel: "EMAIL" })}
                  className={`flex-1 py-2 px-3 rounded-lg border text-label-small font-bold flex items-center justify-center gap-2 transition ${
                    step.channel === "EMAIL" ? "bg-primary-50 border-primary-300 text-primary-700" : "bg-neutral-50 border-neutral-200 text-neutral-600"
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Email Channel
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStep(idx, { channel: "SMS" })}
                  className={`flex-1 py-2 px-3 rounded-lg border text-label-small font-bold flex items-center justify-center gap-2 transition ${
                    step.channel === "SMS" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-neutral-50 border-neutral-200 text-neutral-600"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Termii SMS Channel
                </button>
              </div>

              {/* Channel Specific Content */}
              {step.channel === "EMAIL" ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-body-small text-neutral-600 font-bold block mb-1">Subject</label>
                    <input
                      type="text"
                      placeholder="e.g. Action required for {{schoolName}}"
                      value={step.subject}
                      onChange={(e) => handleUpdateStep(idx, { subject: e.target.value })}
                      className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-body-small focus:outline-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-body-small text-neutral-600 font-bold block mb-1">HTML Body</label>
                    <textarea
                      rows={4}
                      value={step.htmlBody}
                      onChange={(e) => handleUpdateStep(idx, { htmlBody: e.target.value })}
                      className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg font-mono text-body-small focus:outline-primary-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-body-small text-neutral-600 font-bold block">SMS Content Body</label>
                    <span className={`text-[11px] font-bold ${step.smsBody.length > 160 ? "text-red-600" : "text-neutral-400"}`}>
                      {step.smsBody.length} / 160 chars ({Math.ceil((step.smsBody.length || 1) / 160)} segment)
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Hi {{firstName}}, your WardBalance setup is waiting..."
                    value={step.smsBody}
                    onChange={(e) => handleUpdateStep(idx, { smsBody: e.target.value })}
                    className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-body-small focus:outline-primary-500"
                  />
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-between pt-4 border-t border-neutral-200">
            <button
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-bold rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: Basics</span>
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-lg transition"
            >
              <span>Next: Review</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review & Submit */}
      {currentStep === 3 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-6 animate-fadeIn">
          <h3 className="text-title-medium text-neutral-900 font-bold">Step 3: Review & Save Journey</h3>

          <div className="space-y-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <div>
              <span className="text-body-small text-neutral-500 block font-bold">Journey Name</span>
              <span className="text-title-medium font-bold text-neutral-900">{name}</span>
            </div>
            <div>
              <span className="text-body-small text-neutral-500 block font-bold">Trigger Rule</span>
              <span className="text-body-medium font-bold text-primary-600">{trigger}</span>
            </div>
            <div>
              <span className="text-body-small text-neutral-500 block font-bold">Total Sequence Steps</span>
              <span className="text-body-medium font-bold text-neutral-800">{steps.length} Step(s)</span>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-neutral-200">
            <button
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-bold rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: Edit Steps</span>
            </button>

            <button
              disabled={submitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition shadow-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Save & Publish Journey</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
