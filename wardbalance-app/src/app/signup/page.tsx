"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { PRICING_PLANS, PlanId } from "@/constants/pricing";
import { trackEvent } from "@/lib/analytics/posthog";
import { isCategoryAllowed } from "@/lib/cookies/consent";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Multi-step State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [plan, setPlan] = useState<PlanId>("freemium");
  const [schoolName, setSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [estimatedStudents, setEstimatedStudents] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Field errors for each step
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Initialize selected plan from query param
  useEffect(() => {
    const planParam = searchParams.get("plan");
    if (planParam === "business") {
      setPlan("business");
    } else if (planParam === "multi_school") {
      setPlan("multi_school");
    } else {
      setPlan("freemium");
    }

    if (isCategoryAllowed("analytics")) {
      trackEvent({
        event: "signup_started",
        properties: { plan: planParam || "freemium", source: searchParams.get("source") || "unknown" },
      });
    }
  }, [searchParams]);

  // Validation functions for each step
  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!plan) errors.plan = "Please select a pricing plan.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (!schoolName.trim()) errors.schoolName = "School name is required.";
    if (!schoolType) errors.schoolType = "School type is required.";
    if (!country.trim()) errors.country = "Country is required.";
    if (!estimatedStudents || Number(estimatedStudents) <= 0) {
      errors.estimatedStudents = "Please enter a valid number of students greater than 0.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = () => {
    const errors: Record<string, string> = {};
    if (!ownerFullName.trim()) errors.ownerFullName = "Owner name is required.";
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
    let isValid = false;

    if (step === 1) isValid = validateStep1();
    if (step === 2) isValid = validateStep2();
    if (step === 3) isValid = validateStep3();

    if (isValid) {
      if (isCategoryAllowed("analytics")) {
        trackEvent({
          event: "signup_step_completed",
          properties: { step: String(step), plan },
        });
      }
      setStep((prev) => prev + 1);
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
      trackEvent({ event: "signup_submitted", properties: { plan } });
    }

    try {
      const response = await fetch("/api/signup/school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          schoolName,
          schoolType,
          country,
          state,
          city,
          estimatedStudents: Number(estimatedStudents),
          ownerFullName,
          ownerEmail,
          ownerPhone,
          password,
          agreedToTerms,
          source: searchParams.get("source") || undefined,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Workspace creation failed. Please try again.");
      }

      if (isCategoryAllowed("analytics")) {
        trackEvent({ event: "signup_succeeded", properties: { plan } });
      }

      // Sign in with NextAuth using the password the user just set
      const signInResult = await signIn("admin-login", {
        email: ownerEmail,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        console.warn("Auto-login after signup failed:", signInResult.error);
      }

      // Successful creation, redirect to verify-email
      setLoading(false);
      setStep(5);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      if (isCategoryAllowed("analytics")) {
        trackEvent({ event: "signup_failed", properties: { plan, reason: err.message } });
      }
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-headline-small text-neutral-900 font-bold mb-2">
          {step === 5 ? "Workspace Created!" : "Create Your Free School Workspace"}
        </h1>
        <p className="text-body-medium text-neutral-600">
          {step === 1 && "Choose a plan tailored to your school's current operations."}
          {step === 2 && "Provide basic details about your school's divisions and arms."}
          {step === 3 && "Create your administrative account credentials."}
          {step === 4 && "Review your configuration details before setup begins."}
          {step === 5 && "Congratulations! Let's get started on setting up your finance desk."}
        </p>
      </div>

      {/* Progress Tracker */}
      {step < 5 && (
        <div className="flex items-center justify-between mb-8 px-4">
          {[1, 2, 3, 4].map((s) => (
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
              {s < 4 && (
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

      {/* Card Content */}
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-neutral-200">
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small mb-6">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Plan Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {PRICING_PLANS.filter((p) => p.id !== "multi_school").map((p) => (
                <div
                  key={p.id}
                  onClick={() => setPlan(p.id)}
                  className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                    plan === p.id
                      ? "border-primary bg-primary-50/20"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-title-medium text-neutral-900 font-bold">{p.name}</span>
                    <input
                      type="radio"
                      checked={plan === p.id}
                      onChange={() => setPlan(p.id)}
                      className="accent-primary-500"
                    />
                  </div>
                  <p className="text-body-small text-neutral-700 mb-3">{p.targetUser}</p>
                  <p className="text-title-large text-primary font-bold tabular-nums">
                    {p.priceDisplay}
                    <span className="text-body-small font-normal text-neutral-600 ml-1">
                      {p.billingLabel}
                    </span>
                  </p>
                </div>
              ))}
            </div>

            {/* Special Multi-School Redirect message */}
            <div
              onClick={() => {
                if (isCategoryAllowed("analytics")) {
                  trackEvent({ event: "multi_school_demo_clicked" });
                }
                router.push("/#demo");
              }}
              className="p-4 rounded-lg border border-dashed border-neutral-300 hover:border-primary cursor-pointer transition text-center"
            >
              <p className="text-label-medium text-neutral-800 font-bold mb-1">
                Managing Multiple Branches / Schools?
              </p>
              <p className="text-body-small text-neutral-600">
                Multi-school setups require guided onboarding. Click here to book a branch demo instead.
              </p>
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

        {/* STEP 2: School Info */}
        {step === 2 && (
          <div className="space-y-4">
            {/* School Name */}
            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">School Name *</label>
              <input
                type="text"
                placeholder="e.g. Royal Academy"
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

            {/* School Type & Estimated Students */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">School Type *</label>
                <select
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none ${
                    fieldErrors.schoolType ? "border-error" : "border-neutral-300"
                  }`}
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
                {fieldErrors.schoolType && (
                  <p className="text-label-small text-error">{fieldErrors.schoolType}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Estimated Students *</label>
                <input
                  type="number"
                  placeholder="e.g. 250"
                  value={estimatedStudents}
                  onChange={(e) => setEstimatedStudents(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none ${
                    fieldErrors.estimatedStudents ? "border-error" : "border-neutral-300"
                  }`}
                />
                {fieldErrors.estimatedStudents && (
                  <p className="text-label-small text-error">{fieldErrors.estimatedStudents}</p>
                )}
              </div>
            </div>

            {/* Country & State */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Country *</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">State (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Lagos"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">City (optional)</label>
              <input
                type="text"
                placeholder="e.g. Ikeja"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              />
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

        {/* STEP 3: Owner / Admin Info */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">Full Name *</label>
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

            {/* Email & Phone */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Work Email Address *</label>
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

                {/* Password Criteria List */}
                <div className="mt-2.5 p-3 rounded-lg bg-neutral-50 border border-neutral-100 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
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
                            item.met ? "text-success-700 font-medium" : "text-neutral-500"
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

            {/* Terms checkbox */}
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

        {/* STEP 4: Review Details */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50/50">
              <div className="p-4 flex justify-between">
                <span className="text-body-medium font-medium text-neutral-600">Selected Plan</span>
                <span className="text-body-medium font-bold text-neutral-900">
                  {PRICING_PLANS.find((p) => p.id === plan)?.name ?? plan}
                </span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-body-medium font-medium text-neutral-600">School Name</span>
                <span className="text-body-medium font-bold text-neutral-900">{schoolName}</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-body-medium font-medium text-neutral-600">School Type</span>
                <span className="text-body-medium font-bold text-neutral-900">{schoolType}</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-body-medium font-medium text-neutral-600">Estimated Students</span>
                <span className="text-body-medium font-bold text-neutral-900 tabular-nums">{estimatedStudents}</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-body-medium font-medium text-neutral-600">Location</span>
                <span className="text-body-medium font-bold text-neutral-900">
                  {[city, state, country].filter(Boolean).join(", ")}
                </span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-body-medium font-medium text-neutral-600">Owner Name</span>
                <span className="text-body-medium font-bold text-neutral-900">{ownerFullName}</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-body-medium font-medium text-neutral-600">Work Email</span>
                <span className="text-body-medium font-bold text-neutral-900">{ownerEmail}</span>
              </div>
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
                  "Create School Workspace"
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Success Flow */}
        {step === 5 && (
          <div className="text-center py-6">
            {/* One-shot pop-in animation via inline style */}
            <div
              style={{ animation: "popIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards" }}
              className="w-14 h-14 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-success-100"
            >
              <CheckCircle2 className="w-8 h-8 text-success-500" />
            </div>
            <h2 className="text-title-large text-neutral-900 font-bold mb-1">
              {schoolName || "School Workspace"} is Ready!
            </h2>
            <p className="text-body-small text-neutral-500 mb-5">
              {PRICING_PLANS.find((p) => p.id === plan)?.name ?? plan} Plan · {ownerEmail}
            </p>
            <p className="text-body-medium text-neutral-600 mb-6 max-w-md mx-auto">
              Your WardBalance account is active. Complete your school setup to start creating invoices and tracking payments.
            </p>

            {/* Account active confirmation */}
            <div className="mb-6 p-4 rounded-lg bg-success-500/10 border border-success-500/20 text-left">
              <p className="text-label-medium text-success-700 font-bold mb-1">
                ✅ You are signed in
              </p>
              <p className="text-body-small text-success-700">
                You can proceed to the setup checklist. Email verification will be required later for financial actions like generating invoices and recording payments.
              </p>
            </div>

            <button
              onClick={() => {
                router.push("/admin/verify-email");
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg text-label-large font-bold hover:bg-primary-dark transition cursor-pointer"
            >
              Verify Email & Start Setup
              <ArrowRight className="w-4 h-4" />
            </button>
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

      <p className="text-center text-body-small text-neutral-500 mt-6">
        Prefer a guided walkthrough?{" "}
        <a href="/#demo" className="text-primary font-bold hover:underline">
          Book a demo instead
        </a>
      </p>
    </main>
  );
}
