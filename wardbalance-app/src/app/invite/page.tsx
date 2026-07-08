"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Loader2, AlertCircle, Sparkles } from "lucide-react";

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  
  const [inviteData, setInviteData] = useState<{
    email: string;
    schoolName: string;
  } | null>(null);

  const [fullName, setFullName] = useState("");
  const [schoolNameInput, setSchoolNameInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No invitation token found in the URL. Please verify your link.");
      setLoading(false);
      return;
    }

    // Verify token
    fetch(`/api/auth/invite/verify?token=${token}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body.error ?? "Failed to verify invitation");
        }
        setInviteData(body.data);
        setSchoolNameInput(body.data.schoolName);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError("Full name is required");
      return;
    }
    if (!schoolNameInput.trim()) {
      setFormError("School name is required");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }
    if (!agreed) {
      setFormError("You must agree to the Terms of Service and Privacy Policy");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          fullName: fullName.trim(),
          schoolName: schoolNameInput.trim(),
          password,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to accept invitation");
      }

      // Sign in with NextAuth using the password the user just set
      const signInResult = await signIn("admin-login", {
        email: inviteData!.email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error("Account created but auto-login failed. Please go to the login page.");
      }

      // Automatically redirect to setup checklist
      router.push("/admin/setup");
    } catch (err: any) {
      setFormError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-body-large text-neutral-600">Verifying your secure invitation details...</p>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px] max-w-md mx-auto">
        <AlertCircle className="w-16 h-16 text-error mb-4" />
        <h2 className="text-title-large text-neutral-900 mb-2">Invitation Error</h2>
        <p className="text-body-medium text-neutral-600 mb-6">{error ?? "Invalid token configuration."}</p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg font-bold text-label-large hover:bg-neutral-50 transition"
          >
            Return to Homepage
          </button>
          {token && (
            <button
              disabled={resending}
              onClick={async () => {
                setResending(true);
                try {
                  const res = await fetch("/api/auth/invite/resend", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                  });
                  const body = await res.json();
                  if (!res.ok) throw new Error(body.error ?? "Failed to resend");
                  setResendSuccess(true);
                } catch {
                  setError("Failed to resend invitation. Please contact support.");
                } finally {
                  setResending(false);
                }
              }}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold text-label-large hover:bg-primary-dark transition disabled:opacity-50 inline-flex items-center gap-2"
            >
              {resending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Resending...</>
              ) : (
                "Resend Invitation"
              )}
            </button>
          )}
        </div>
        {resendSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-body-small">
            Invitation resent successfully. Please check your email inbox.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Welcome Card */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-light text-primary mb-4">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-headline-small text-neutral-900 font-bold mb-2">
          Activate Your Workspace
        </h1>
        <p className="text-body-medium text-neutral-600">
          Welcome to WardBalance. You have been invited to set up the workspace for{" "}
          <strong className="text-neutral-900">{inviteData.schoolName}</strong>. Create your password to continue.
        </p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-neutral-200">
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
              <span>{formError}</span>
            </div>
          )}

          {/* Email (Readonly) */}
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">Email Address</label>
            <input
              type="text"
              readOnly
              value={inviteData.email}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-neutral-50 text-neutral-500 cursor-not-allowed text-body-medium focus:outline-none"
            />
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">Your Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Alhaji Babatunde"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
            />
          </div>

          {/* School Name Confirm */}
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">Confirm School Name</label>
            <input
              type="text"
              required
              placeholder="School Name"
              value={schoolNameInput}
              onChange={(e) => setSchoolNameInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">Create Password</label>
            <input
              type="password"
              required
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">Confirm Password</label>
            <input
              type="password"
              required
              placeholder="Verify password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
            />
          </div>

          {/* Terms Consent */}
          <div className="flex items-start gap-2.5 pt-2">
            <input
              type="checkbox"
              id="agree-checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 mt-1 border border-neutral-300 rounded text-primary focus:ring-primary focus:outline-none"
            />
            <label htmlFor="agree-checkbox" className="text-body-small text-neutral-600 select-none">
              I acknowledge that I have read and agree to the{" "}
              <a href="/terms" target="_blank" className="text-primary hover:underline font-semibold">Terms of Service</a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" className="text-primary hover:underline font-semibold">Privacy Policy</a>.
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-bold text-label-large hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Initializing Workspace...
              </>
            ) : (
              "Initialize Workspace & Log In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <main className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        {/* WardBalance Logo / Branding */}
        <span className="text-title-large text-primary font-bold tracking-tight inline-flex items-center gap-2">
          <Image
            src="/logo-v5.png"
            alt="WardBalance logo"
            width={40}
            height={40}
          />
          WardBalance
        </span>
      </div>
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-body-large text-neutral-600">Loading page details...</p>
        </div>
      }>
        <InviteContent />
      </Suspense>
    </main>
  );
}
