"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff, TrendingUp, Coins, CreditCard, FileText, Sparkles, Upload, Monitor } from "lucide-react";
import { trackEvent } from "@/lib/analytics/posthog";
import {
  trackSignupStarted,
  trackSignupCompleted,
  trackPreviewDashboardViewed,
  trackDemoModeEntered,
} from "@/lib/analytics/funnel";
import { isCategoryAllowed } from "@/lib/cookies/consent";
import { useOnboardingFlags } from "@/hooks/use-onboarding-flags";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signupV2, dashboardPreview, loading: flagsLoading } = useOnboardingFlags();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [schoolName, setSchoolName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [schoolType, setSchoolType] = useState("");
  const [estimatedStudents, setEstimatedStudents] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createdSchoolName, setCreatedSchoolName] = useState("");

  // Track dashboard preview view when step 4 is reached
  useEffect(() => {
    if (step === 4 && dashboardPreview) {
      trackPreviewDashboardViewed();
    }
  }, [step, dashboardPreview]);

  useEffect(() => {
    trackSignupStarted(searchParams.get("source") || undefined);
  }, [searchParams]);

  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!schoolName.trim()) errors.schoolName = "School name is required.";
    if (!ownerFullName.trim()) errors.ownerFullName = "Full name is required.";
    if (!ownerEmail.trim()) {
      errors.ownerEmail = "Email address is required.";
    } else if (!/\S+@\S+\.\S+/.test(ownerEmail)) {
      errors.ownerEmail = "Please enter a valid email address.";
    }
    if (!ownerPhone.trim()) errors.ownerPhone = "Phone number is required.";
    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    } else if (!/[^a-zA-Z0-9\s]/.test(password)) {
      errors.password = "Password must contain at least one special character.";
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "Password must contain at least one uppercase letter.";
    } else if (!/[a-z]/.test(password)) {
      errors.password = "Password must contain at least one lowercase letter.";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    if (!agreedToTerms) {
      errors.agreedToTerms = "You must agree to the terms to proceed.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (validateStep1()) {
        if (isCategoryAllowed("analytics")) {
          trackEvent({ event: "signup_step_completed", properties: { step: "1" } });
        }
        setStep(2);
      }
    }
    if (step === 2) {
      if (isCategoryAllowed("analytics")) {
        trackEvent({ event: "signup_step_completed", properties: { step: "2" } });
      }
      setStep(3);
    }
  };

  const handlePrev = () => {
    setError(null);
    setFieldErrors({});
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    if (isCategoryAllowed("analytics")) {
      trackEvent({ event: "signup_submitted", properties: {} });
    }

    try {
      const response = await fetch("/api/signup/school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName,
          ownerFullName,
          ownerEmail,
          ownerPhone,
          password,
          agreedToTerms,
          schoolType: schoolType || undefined,
          estimatedStudents: estimatedStudents ? Number(estimatedStudents) : undefined,
          source: searchParams.get("source") || undefined,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Workspace creation failed. Please try again.");
      }

      const schoolData = body.data?.school;
      trackSignupCompleted(schoolData?.id, schoolType || undefined, schoolData?.selectedPlan || "freemium");

      const signInResult = await signIn("admin-login", {
        email: ownerEmail,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        console.warn("Auto-login after signup failed:", signInResult.error);
      }

      setCreatedSchoolName(schoolName);
      setLoading(false);

      // Feature flag: skip the dashboard preview (step 4) if flag is off
      if (dashboardPreview) {
        setStep(4);
      } else {
        router.push("/admin/setup?phase=1");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Workspace creation failed. Please try again.";
      setError(message);
      setLoading(false);
      if (isCategoryAllowed("analytics")) {
        trackEvent({ event: "signup_failed", properties: { reason: message } });
      }
    }
  };

  // Feature flag: if signupV2 is disabled, show a minimal bridge UI that
  // collects only the essential fields and creates the account in one step.
  if (!flagsLoading && !signupV2) {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-headline-small text-neutral-900 font-bold mb-2">Create Your School Workspace</h1>
          <p className="text-body-medium text-neutral-600">No credit card required.</p>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-neutral-200 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">School Name *</label>
            <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">Your Full Name *</label>
            <input type="text" value={ownerFullName} onChange={(e) => setOwnerFullName(e.target.value)} className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">Work Email *</label>
            <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">Phone *</label>
            <input type="tel" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">Password *</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">Confirm Password *</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-1 accent-primary-500 shrink-0" />
            <span className="text-body-medium text-neutral-600">I agree to the <Link href="/terms" target="_blank" className="text-primary underline">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>.</span>
          </label>
          <button
            disabled={loading}
            onClick={() => { if (validateStep1()) handleSubmit(); }}
            className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-label-large font-bold hover:bg-primary-dark transition cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating Workspace...</> : "Create Free Account"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full mx-auto transition-all duration-500 ease-in-out ${step === 4 ? "max-w-4xl" : "max-w-xl"}`}>
      <div className="text-center mb-8">
        <h1 className="text-headline-small text-neutral-900 font-bold mb-2">
          {step === 4 ? "Welcome to WardBalance!" : step === 3 ? "Review Your Details" : "Create Your School Workspace"}
        </h1>
        <p className="text-body-medium text-neutral-600">
          {step === 1 && "No credit card required. Free plan includes up to 50 students."}
          {step === 2 && "Tell us about your school. You can change this later."}
          {step === 3 && "Confirm your information before we create your workspace."}
          {step === 4 && "Here's what your school's financial dashboard will look like."}
        </p>
      </div>

      {/* Progress Tracker */}
      {step < 4 && (
        <div className="flex items-center justify-between mb-8 px-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-label-medium font-bold transition-all duration-300 ${
                  step === s
                    ? "bg-primary text-white ring-4 ring-primary-100"
                    : step > s
                    ? "bg-success-500 text-white"
                    : "bg-neutral-200 text-neutral-500"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-all duration-300 ${
                    step > s ? "bg-success-500" : "bg-neutral-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-neutral-200">
        {error && step < 4 && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small mb-6">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Account Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">School Name *</label>
              <input
                type="text"
                placeholder="e.g. Royal Academy International"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-lg border text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none ${
                  fieldErrors.schoolName ? "border-error" : "border-neutral-300"
                }`}
              />
              {fieldErrors.schoolName && (
                <p className="text-label-small text-error">{fieldErrors.schoolName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">Your Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Babatunde Johnson"
                value={ownerFullName}
                onChange={(e) => setOwnerFullName(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-lg border text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none ${
                  fieldErrors.ownerFullName ? "border-error" : "border-neutral-300"
                }`}
              />
              {fieldErrors.ownerFullName && (
                <p className="text-label-small text-error">{fieldErrors.ownerFullName}</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Work Email *</label>
                <input
                  type="email"
                  placeholder="e.g. proprietor@school.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none ${
                    fieldErrors.ownerEmail ? "border-error" : "border-neutral-300"
                  }`}
                />
                {fieldErrors.ownerEmail && (
                  <p className="text-label-small text-error">{fieldErrors.ownerEmail}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Phone Number *</label>
                <input
                  type="tel"
                  placeholder="e.g. +234 801 234 5678"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none ${
                    fieldErrors.ownerPhone ? "border-error" : "border-neutral-300"
                  }`}
                />
                {fieldErrors.ownerPhone && (
                  <p className="text-label-small text-error">{fieldErrors.ownerPhone}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-3.5 pr-10 py-2.5 rounded-lg border text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none ${
                    fieldErrors.password ? "border-error" : "border-neutral-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-label-small text-error">{fieldErrors.password}</p>
              )}
              <div className="mt-2.5 p-3 rounded-lg bg-neutral-50 border border-neutral-100 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Password Requirements:
                </p>
                <div className="grid sm:grid-cols-1 gap-1.5">
                  {[
                    { label: "Minimum 8 characters", met: password.length >= 8 },
                    { label: "At least one special character (e.g. !, @, #, $, %)", met: /[^a-zA-Z0-9\s]/.test(password) },
                    { label: "At least one uppercase letter", met: /[A-Z]/.test(password) },
                    { label: "At least one lowercase letter", met: /[a-z]/.test(password) },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-body-small">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 transition-colors duration-200 ${
                          item.met ? "text-success-500 fill-success-50" : "text-neutral-300"
                        }`}
                      />
                      <span
                        className={`transition-colors duration-200 ${
                          item.met ? "text-success-700 font-medium" : "text-neutral-700"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">Confirm Password *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-3.5 pr-10 py-2.5 rounded-lg border text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none ${
                    fieldErrors.confirmPassword ? "border-error" : "border-neutral-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-label-small text-error">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 accent-primary-500 shrink-0"
                />
                <span className="text-body-medium text-neutral-600">
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" className="text-primary underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank" className="text-primary underline">
                    Privacy Policy
                  </Link>
                  . *
                </span>
              </label>
              {fieldErrors.agreedToTerms && (
                <p className="text-label-small text-error">{fieldErrors.agreedToTerms}</p>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white rounded-lg text-label-large font-bold hover:bg-primary-dark transition cursor-pointer"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Quick Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary-50 border border-primary-100 text-body-small text-primary-800 flex items-start gap-2.5 mb-2">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span>These details help us personalize your setup. You can change them later in Settings.</span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">School Type (optional)</label>
                <select
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                >
                  <option value="">Select type</option>
                  <option value="Nursery">Nursery</option>
                  <option value="Primary">Primary</option>
                  <option value="Secondary">Secondary</option>
                  <option value="Nursery & Primary">Nursery & Primary</option>
                  <option value="Primary & Secondary">Primary & Secondary</option>
                  <option value="Nursery, Primary & Secondary">Nursery, Primary & Secondary</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Estimated Students (optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 250"
                  value={estimatedStudents}
                  onChange={(e) => setEstimatedStudents(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={handlePrev}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg text-label-large font-bold hover:bg-neutral-50 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white rounded-lg text-label-large font-bold hover:bg-primary-dark transition cursor-pointer"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50/50">
              <div className="p-4 flex justify-between">
                <span className="text-body-medium font-medium text-neutral-600">School Name</span>
                <span className="text-body-medium font-bold text-neutral-900">{schoolName}</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-body-medium font-medium text-neutral-600">Owner Name</span>
                <span className="text-body-medium font-bold text-neutral-900">{ownerFullName}</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-body-medium font-medium text-neutral-600">Work Email</span>
                <span className="text-body-medium font-bold text-neutral-900">{ownerEmail}</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-body-medium font-medium text-neutral-600">Phone</span>
                <span className="text-body-medium font-bold text-neutral-900">{ownerPhone}</span>
              </div>
              {schoolType && (
                <div className="p-4 flex justify-between">
                  <span className="text-body-medium font-medium text-neutral-600">School Type</span>
                  <span className="text-body-medium font-bold text-neutral-900">{schoolType}</span>
                </div>
              )}
              {estimatedStudents && (
                <div className="p-4 flex justify-between">
                  <span className="text-body-medium font-medium text-neutral-600">Est. Students</span>
                  <span className="text-body-medium font-bold text-neutral-900 tabular-nums">{estimatedStudents}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <button
                disabled={loading}
                onClick={handlePrev}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg text-label-large font-bold hover:bg-neutral-50 transition cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                disabled={loading}
                onClick={handleSubmit}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-label-large font-bold hover:bg-primary-dark transition cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Workspace...
                  </>
                ) : (
                  "Create Free Account"
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Aha Moment — Dashboard Preview */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-success-200 shadow-sm animate-bounce">
                <CheckCircle2 className="w-9 h-9 text-success-600" />
              </div>
              <h2 className="text-headline-small text-neutral-900 font-bold mb-1">
                {createdSchoolName || "Your School"} is Ready!
              </h2>
              <p className="text-body-large text-neutral-700 font-medium">{ownerEmail} · Free Plan</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-250 text-neutral-800 flex items-start gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-amber-200/50 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4 text-amber-700" />
              </div>
              <span className="text-body-small text-neutral-700 leading-relaxed">
                <strong>Simulated workspace view:</strong> We have populated this preview with mock records to demonstrate how WardBalance tracks cash flows. No actual database records are created until you select an onboarding path below.
              </span>
            </div>

            {/* Sample Dashboard Preview */}
            <div className="border border-neutral-200 rounded-2xl bg-white overflow-hidden shadow-md">
              <div className="p-5 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
                <p className="text-label-medium text-neutral-700 uppercase tracking-wider font-bold">Workspace Live Preview</p>
                <span className="px-2.5 py-0.5 rounded-full bg-success-100 text-success-800 text-[10px] font-bold uppercase tracking-wider">
                  Interactive demo
                </span>
              </div>
              <div className="p-5 space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Expected Revenue */}
                  <div className="p-5 rounded-xl border border-neutral-200 bg-gradient-to-br from-white to-primary-50/10 shadow-sm space-y-2 hover:scale-[1.02] hover:shadow-md transition-all duration-200 border-t-4 border-t-primary-500">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-primary-600" />
                      </div>
                      <span className="text-label-small text-neutral-700 font-bold uppercase tracking-wider">Expected</span>
                    </div>
                    <p className="text-title-large text-neutral-900 font-extrabold font-mono tracking-tight">₦12,450,000</p>
                    <p className="text-body-small text-neutral-600 font-medium">Total term invoices</p>
                  </div>

                  {/* Collected Revenue */}
                  <div className="p-5 rounded-xl border border-neutral-200 bg-gradient-to-br from-white to-success-50/10 shadow-sm space-y-2 hover:scale-[1.02] hover:shadow-md transition-all duration-200 border-t-4 border-t-success-500">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center">
                        <Coins className="w-4 h-4 text-success-600" />
                      </div>
                      <span className="text-label-small text-neutral-700 font-bold uppercase tracking-wider">Collected</span>
                    </div>
                    <p className="text-title-large text-success-600 font-extrabold font-mono tracking-tight">₦8,230,000</p>
                    <p className="text-body-small text-neutral-600 font-medium">Verified payments</p>
                  </div>

                  {/* Outstanding */}
                  <div className="p-5 rounded-xl border border-neutral-200 bg-gradient-to-br from-white to-amber-50/10 shadow-sm space-y-2 hover:scale-[1.02] hover:shadow-md transition-all duration-200 border-t-4 border-t-amber-500">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="text-label-small text-neutral-700 font-bold uppercase tracking-wider">Outstanding</span>
                    </div>
                    <p className="text-title-large text-amber-700 font-extrabold font-mono tracking-tight">₦4,220,000</p>
                    <p className="text-body-small text-neutral-600 font-medium">Remaining dues</p>
                  </div>

                  {/* Collection Rate */}
                  <div className="p-5 rounded-xl border border-neutral-200 bg-gradient-to-br from-white to-blue-50/10 shadow-sm space-y-2 hover:scale-[1.02] hover:shadow-md transition-all duration-200 border-t-4 border-t-blue-500">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-label-small text-neutral-700 font-bold uppercase tracking-wider">Rate</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-title-large text-neutral-900 font-extrabold font-mono tracking-tight">66%</p>
                      <span className="text-[11px] text-success-600 font-bold">+4% vs last term</span>
                    </div>
                    <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden mt-1">
                      <div className="bg-success-500 h-full rounded-full transition-all duration-500" style={{ width: "66%" }} />
                    </div>
                    <p className="text-[10px] text-neutral-600 font-medium">Target: 90% collection</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 pt-2">
                  {/* Left block: Collection Progress Chart (Visual) */}
                  <div className="md:col-span-2 p-5 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-4 shadow-inner">
                    <p className="text-label-small text-neutral-700 uppercase tracking-wider font-bold">Term Collection Breakdown</p>
                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-body-small font-semibold text-neutral-700">
                          <span>Tuition Fees</span>
                          <span className="font-mono text-neutral-900">₦6.8M / ₦9.0M (75%)</span>
                        </div>
                        <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-primary-500 h-full rounded-full" style={{ width: "75%" }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-body-small font-semibold text-neutral-700">
                          <span>Bus & Transportation</span>
                          <span className="font-mono text-neutral-900">₦1.1M / ₦2.2M (51%)</span>
                        </div>
                        <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full" style={{ width: "51%" }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-body-small font-semibold text-neutral-700">
                          <span>Uniforms & Books</span>
                          <span className="font-mono text-neutral-900">₦300k / ₦1.2M (24%)</span>
                        </div>
                        <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-success-500 h-full rounded-full" style={{ width: "24%" }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right block: Recent Activity */}
                  <div className="p-5 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-3 flex flex-col justify-between shadow-inner">
                    <div>
                      <p className="text-label-small text-neutral-700 uppercase tracking-wider font-bold mb-3">Live Feed</p>
                      <div className="space-y-3">
                        <div className="flex gap-2 items-start text-body-small text-neutral-700">
                          <span className="px-1.5 py-0.5 rounded bg-success-100 text-success-800 text-[9px] font-bold uppercase shrink-0 mt-0.5">PAYMENT</span>
                          <span className="truncate">₦120k recorded for Chioma O.</span>
                        </div>
                        <div className="flex gap-2 items-start text-body-small text-neutral-700">
                          <span className="px-1.5 py-0.5 rounded bg-primary-100 text-primary-800 text-[9px] font-bold uppercase shrink-0 mt-0.5">INVOICE</span>
                          <span className="truncate">JSS 1A class bills published</span>
                        </div>
                        <div className="flex gap-2 items-start text-body-small text-neutral-700">
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase shrink-0 mt-0.5">PROOF</span>
                          <span className="truncate">Parent uploaded proof for ₦85k</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[11px] text-neutral-600 font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
                        Active Term
                      </span>
                      <span className="font-mono">1st Term</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Path Selection */}
            <div className="space-y-4">
              <p className="text-title-medium text-neutral-900 font-bold text-center">How would you like to start?</p>
              <div className="grid md:grid-cols-3 gap-4">
                <button
                  onClick={() => router.push("/admin/setup?phase=1")}
                  className="p-5 rounded-2xl border border-neutral-200 bg-white hover:border-primary-500 hover:shadow-md hover:scale-[1.02] transition-all duration-200 text-left group cursor-pointer flex flex-col justify-between min-h-[170px] shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary-500/5 rounded-full blur-xl group-hover:bg-primary-500/10 transition-colors" />
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center mb-3 group-hover:bg-primary-100 transition-colors">
                      <Sparkles className="w-5 h-5 text-primary-500" />
                    </div>
                    <p className="text-title-small text-neutral-900 font-bold mb-1">Start Fresh</p>
                    <p className="text-[12px] text-neutral-700 leading-relaxed">Configure divisions, classes, and fee structures step-by-step.</p>
                  </div>
                  <span className="text-[11px] font-bold text-primary-500 mt-4 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Begin guided setup <ArrowRight className="w-3 h-3" />
                  </span>
                </button>

                <button
                  onClick={() => router.push("/admin/setup?phase=1")}
                  className="p-5 rounded-2xl border border-neutral-200 bg-white hover:border-primary-500 hover:shadow-md hover:scale-[1.02] transition-all duration-200 text-left group cursor-pointer flex flex-col justify-between min-h-[170px] shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary-500/5 rounded-full blur-xl group-hover:bg-primary-500/10 transition-colors" />
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center mb-3 group-hover:bg-primary-100 transition-colors">
                      <Upload className="w-5 h-5 text-primary-500" />
                    </div>
                    <p className="text-title-small text-neutral-900 font-bold mb-1">Import Students</p>
                    <p className="text-[12px] text-neutral-700 leading-relaxed">Upload your CSV sheet to instantiate your student records immediately.</p>
                  </div>
                  <span className="text-[11px] font-bold text-primary-500 mt-4 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Upload school list <ArrowRight className="w-3 h-3" />
                  </span>
                </button>

                <button
                  onClick={async () => {
                    trackDemoModeEntered();
                    try {
                      const res = await fetch("/api/demo/start", { method: "POST" });
                      if (res.ok) {
                        window.location.href = "/admin/dashboard?demo=true";
                        return;
                      }
                    } catch {
                      // Fallback to setup if demo fails
                    }
                    router.push("/admin/setup?phase=1");
                  }}
                  className="p-5 rounded-2xl border border-neutral-200 bg-white hover:border-primary-500 hover:shadow-md hover:scale-[1.02] transition-all duration-200 text-left group cursor-pointer flex flex-col justify-between min-h-[170px] shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary-500/5 rounded-full blur-xl group-hover:bg-primary-500/10 transition-colors" />
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center mb-3 group-hover:bg-primary-100 transition-colors">
                      <Monitor className="w-5 h-5 text-primary-500" />
                    </div>
                    <p className="text-title-small text-neutral-900 font-bold mb-1">Explore Demo</p>
                    <p className="text-[12px] text-neutral-700 leading-relaxed">Explore the platform with fully configured sample financial ledgers.</p>
                  </div>
                  <span className="text-[11px] font-bold text-primary-500 mt-4 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Launch live sandbox <ArrowRight className="w-3 h-3" />
                  </span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-center">
              <p className="text-body-small text-neutral-700 font-medium">
                📧 <strong>Email verification recommended.</strong> Verify your email in Settings to unlock core functions like publishing invoices. You can safely continue setting up in the meantime.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link href="/" className="text-title-large text-primary font-bold tracking-tight inline-flex items-center gap-2">
          <Image
            src="/logo-v5.png"
            alt="WardBalance logo"
            width={40}
            height={40}
          />
          WardBalance
        </Link>
        <p className="text-body-small text-neutral-600 mt-2">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-body-large text-neutral-600">Preparing signup steps...</p>
          </div>
        }
      >
        <SignupContent />
      </Suspense>

      <p className="text-center text-body-small text-neutral-700 mt-6">
        Prefer a guided walkthrough?{" "}
        <a href="/#demo" className="text-primary font-bold hover:underline">
          Book a demo instead
        </a>
      </p>
    </main>
  );
}
