"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck, AlertCircle, ArrowLeft, KeyRound, Smartphone, Star } from "lucide-react";

interface DemoParent {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  school: { name: string };
}

export default function ParentLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("from") || "/parent/dashboard";

  // Login steps: "contact" (phone/email input) or "otp" (code verification)
  const [step, setStep] = useState<"contact" | "otp">("contact");
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Demo state
  const [demoParents, setDemoParents] = useState<DemoParent[]>([]);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [showDemoList, setShowDemoList] = useState(false);

  useEffect(() => {
    // Pre-fetch demo parents if they exist in DB
    setLoadingDemo(true);
    fetch("/api/demo/parents")
      .then((r) => r.json())
      .then((res) => {
        setDemoParents(res.data || []);
        setLoadingDemo(false);
      })
      .catch(() => setLoadingDemo(false));
  }, []);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/parent-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", phoneOrEmail }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to request code");

      setInfo(body.data.message);
      setStep("otp");
    } catch (err: any) {
      setError(err.message ?? "Failed to send code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/parent-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", phoneOrEmail, otp }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Verification failed");

      router.push(redirectPath);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Failed to verify code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (parentId: string) => {
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/parent-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "demo", parentId }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Demo login failed");

      router.push(redirectPath);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Failed to start demo session");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link href="/" className="text-title-large text-primary font-bold tracking-tight inline-flex items-center gap-1.5">
          <ShieldCheck className="w-6 h-6" />
          WardBalance
        </Link>
        <span className="ml-2 px-2 py-0.5 rounded bg-primary-100 text-primary text-[10px] font-bold uppercase tracking-wider">
          Parent Portal
        </span>
      </div>

      <div className="w-full max-w-md mx-auto">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-neutral-200">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small mb-5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-primary-50 text-on-primary-container text-body-small mb-5 border border-primary-100">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
              <span>{info}</span>
            </div>
          )}

          {step === "contact" ? (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div className="text-center mb-6">
                <h1 className="text-title-medium text-neutral-900 font-bold mb-1">
                  Access Parent Portal
                </h1>
                <p className="text-body-small text-neutral-600">
                  Enter your phone number or email registered with your child&apos;s school to receive a login code.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Phone or Email Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +234 801 234 5678 or parent@email.com"
                  value={phoneOrEmail}
                  onChange={(e) => setPhoneOrEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-bold text-label-large hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    Send Verification Code
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center mb-6">
                <button
                  type="button"
                  onClick={() => setStep("contact")}
                  className="inline-flex items-center gap-1 text-body-small text-neutral-500 hover:text-neutral-900 font-medium mb-3 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Change phone or email
                </button>
                <h1 className="text-title-medium text-neutral-900 font-bold mb-1">
                  Enter Verification Code
                </h1>
                <p className="text-body-small text-neutral-600">
                  Please enter the 6-digit code sent to <strong className="text-neutral-800">{phoneOrEmail}</strong>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block text-center">Verification Code (OTP)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  placeholder="e.g. 123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-center tracking-[0.5em] text-title-large font-bold focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-bold text-label-large hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying Code...
                  </>
                ) : (
                  "Verify & Log In"
                )}
              </button>
            </form>
          )}

          {/* Demo Section */}
          {demoParents.length > 0 && (
            <div className="mt-8 pt-6 border-t border-neutral-200">
              {!showDemoList ? (
                <button
                  type="button"
                  onClick={() => setShowDemoList(true)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-2.5 border border-primary-200 text-primary hover:bg-primary-50/50 bg-white rounded-lg font-bold text-body-small transition cursor-pointer"
                >
                  <Star className="w-4 h-4 text-primary fill-primary" />
                  Try Demo Parent Portals
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Select a Parent Profile</span>
                    <button
                      type="button"
                      onClick={() => setShowDemoList(false)}
                      className="text-[10px] text-neutral-500 hover:text-neutral-900 font-bold cursor-pointer"
                    >
                      Hide Shortcuts
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-1">
                    {demoParents.map((parent) => (
                      <button
                        key={parent.id}
                        type="button"
                        onClick={() => handleDemoLogin(parent.id)}
                        disabled={submitting}
                        className="text-left p-2.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-body-small transition flex flex-col justify-between cursor-pointer"
                      >
                        <div className="font-bold text-neutral-800">
                          {parent.firstName} {parent.lastName}
                        </div>
                        <div className="text-[10px] text-neutral-500 flex justify-between w-full mt-0.5">
                          <span>{parent.school.name}</span>
                          <span className="font-mono">{parent.phone}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
