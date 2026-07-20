"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { trackEmailVerified } from "@/lib/analytics/funnel";

interface VerifyEmailFormProps {
  devOtp?: string;
}

export default function VerifyEmailForm({ devOtp }: VerifyEmailFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to verify email.");
      }

      setSuccess(true);
      trackEmailVerified();
      setTimeout(() => {
        router.push("/admin/setup");
        router.refresh();
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setError(null);
    setResendMessage(null);
    setResending(true);

    try {
      const res = await fetch("/api/admin/resend-verification-code", {
        method: "POST",
      });

      const body = await res.json();
      if (!res.ok) {
        if (res.status === 429 && body.retryAfter) {
          setResendCooldown(body.retryAfter);
        }
        throw new Error(body.error ?? "Failed to resend code.");
      }

      setResendMessage(body.message ?? "A new verification code has been sent.");
      setResendCooldown(60); // start 60s cooldown
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resend verification code.";
      setError(message);
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-sm text-center space-y-5">
        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-100">
          <CheckCircle2 className="w-6 h-6 animate-bounce" />
        </div>
        <div className="space-y-2">
          <h2 className="text-title-medium text-neutral-900 font-bold">Email Verified</h2>
          <p className="text-body-medium text-neutral-500">
            Thank you! Your email address has been successfully verified. Unlocking financial actions and redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-headline-small text-neutral-900 font-bold mb-2">
          Verify Your Email
        </h1>
        <p className="text-body-medium text-neutral-600 max-w-sm mx-auto">
          Enter the 6-digit verification code sent to your registered email address to unlock administrative features.
        </p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-neutral-200 space-y-6">
        {/* Dev Mode Helper */}
        {devOtp && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-body-small">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <span className="font-bold block">Development Environment — Test Code</span>
              <span>Your verification code is: <strong className="font-mono tracking-wider">{devOtp}</strong></span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 text-red-900 border border-red-100 text-body-small">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {resendMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-green-50 text-green-900 border border-green-100 text-body-small">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-green-500" />
              <span>{resendMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">6-Digit Verification Code</label>
            <input
              type="text"
              required
              maxLength={6}
              pattern="\d{6}"
              placeholder="e.g. 123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-large font-mono tracking-[0.2em] text-center focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-bold text-label-large hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying Code...
              </>
            ) : (
              "Verify Email"
            )}
          </button>
        </form>

        <div className="border-t border-neutral-100 pt-5 flex items-center justify-between text-body-small">
          <span className="text-neutral-500">Didn&apos;t receive a code?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="text-primary hover:underline font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:no-underline"
          >
            {resending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : "Resend Code"}
          </button>
        </div>
      </div>
    </div>
  );
}
