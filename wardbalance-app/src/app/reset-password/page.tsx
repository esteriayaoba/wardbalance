"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const criteria = [
    { label: "Minimum 8 characters", met: password.length >= 8 },
    { label: "At least one special character (e.g. !, @, #, $, %)", met: /[^a-zA-Z0-9\s]/.test(password) },
    { label: "At least one uppercase letter", met: /[A-Z]/.test(password) },
    { label: "At least one lowercase letter", met: /[a-z]/.test(password) },
  ];

  const allMet = criteria.every((c) => c.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!allMet) {
      setError("Please meet all password requirements before submitting.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Invalid or missing reset token. Please request a new link.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Password reset failed.");

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-neutral-200 text-center">
        <AlertCircle className="w-10 h-10 text-error mx-auto mb-3" />
        <h1 className="text-title-large text-neutral-900 font-bold mb-2">Invalid Reset Link</h1>
        <p className="text-body-medium text-neutral-600 mb-6">
          This password reset link is missing required information.
        </p>
        <Link href="/forgot-password" className="text-primary font-bold hover:underline text-body-medium">
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-neutral-200 text-center">
        <div className="w-14 h-14 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-success-100">
          <CheckCircle2 className="w-8 h-8 text-success-500" />
        </div>
        <h1 className="text-title-large text-neutral-900 font-bold mb-2">Password Updated!</h1>
        <p className="text-body-medium text-neutral-600 mb-4">
          Your password has been changed successfully. Redirecting you to sign in…
        </p>
        <Loader2 className="w-5 h-5 text-primary animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-headline-small text-neutral-900 font-bold mb-2">Set a new password</h1>
        <p className="text-body-medium text-neutral-600">
          Choose a strong password for your WardBalance account.
        </p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-neutral-200">
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small mb-5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">New Password *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password criteria */}
            <div className="mt-2.5 p-3 rounded-lg bg-neutral-50 border border-neutral-100 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Password Requirements:</p>
              {criteria.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-body-small">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 transition-colors duration-200 ${item.met ? "text-success-500 fill-success-50" : "text-neutral-300"}`}
                  />
                  <span className={`transition-colors duration-200 ${item.met ? "text-success-700 font-medium" : "text-neutral-500"}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">Confirm Password *</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full pl-3.5 pr-10 py-2.5 rounded-lg border text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none ${
                  confirmPassword && confirmPassword !== password ? "border-error" : "border-neutral-300"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-label-small text-error">Passwords do not match.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !allMet}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-bold text-label-large hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating Password...
              </>
            ) : (
              "Set New Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link href="/" className="text-title-large text-primary font-bold tracking-tight inline-flex items-center gap-1.5">
          <ShieldCheck className="w-6 h-6" />
          WardBalance
        </Link>
      </div>

      <div className="w-full max-w-md mx-auto">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
            <p className="text-body-medium text-neutral-600">Loading…</p>
          </div>
        }>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </main>
  );
}
