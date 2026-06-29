"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Something went wrong. Please try again.");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand header */}
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
      </div>

      <div className="w-full max-w-md mx-auto">
        {submitted ? (
          /* Success state */
          <div className="bg-white p-8 rounded-xl shadow-sm border border-neutral-200 text-center">
            <div className="w-14 h-14 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-success-100">
              <CheckCircle2 className="w-8 h-8 text-success-500" />
            </div>
            <h1 className="text-title-large text-neutral-900 font-bold mb-2">Check your inbox</h1>
            <p className="text-body-medium text-neutral-600 mb-6">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
              The link expires in 1 hour.
            </p>
            <p className="text-body-small text-neutral-500 mb-6">
              Didn&apos;t receive it? Check your spam folder, or{" "}
              <button
                onClick={() => { setSubmitted(false); setEmail(""); }}
                className="text-primary font-bold hover:underline"
              >
                try again
              </button>
              .
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-body-medium text-primary font-bold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        ) : (
          /* Request form */
          <div>
            <div className="text-center mb-8">
              <h1 className="text-headline-small text-neutral-900 font-bold mb-2">Forgot your password?</h1>
              <p className="text-body-medium text-neutral-600">
                Enter your account email and we&apos;ll send a secure reset link.
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
                <div className="space-y-1.5">
                  <label className="text-label-medium text-neutral-700 block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. proprietor@school.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-bold text-label-large hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Reset Link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-body-medium text-neutral-600 hover:text-primary transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
