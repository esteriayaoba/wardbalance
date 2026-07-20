"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, AlertCircle, PlayCircle, Eye, EyeOff } from "lucide-react";
import { trackDemoModeEntered } from "@/lib/analytics/funnel";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("from") || "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await signIn("admin-login", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error === "CredentialsSignin"
          ? "Invalid email or password. Please check and try again."
          : result.error
        );
      }

      router.push(redirectPath);
      router.refresh();
    } catch (err: unknown) {
      let message = "Failed to log in";
      if (err instanceof Error) {
        message = err.message;
      }
      
      if (
        message.includes("CredentialsSignin") ||
        (typeof err === "object" && err !== null && "type" in err && (err as any).type === "CredentialsSignin")
      ) {
        setError("Invalid email or password. Please check and try again.");
      } else {
        setError(message);
      }
      setSubmitting(false);
    }

  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-headline-small text-neutral-900 font-bold mb-2">
          Sign In to Your Workspace
        </h1>
        <p className="text-body-medium text-neutral-600">
          Enter your administrative credentials to manage your school&apos;s financial records.
        </p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-neutral-200">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">Email Address</label>
            <input
              type="email"
              required
              id="login-email"
              placeholder="e.g. bursar@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-label-medium text-neutral-700">Password</label>
              <Link
                href="/forgot-password"
                className="text-body-small text-primary hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                id="login-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none cursor-pointer"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="login-submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-bold text-label-large hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-neutral-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-neutral-400 font-bold">or</span>
          </div>
        </div>

        <button
          id="demo-login"
          onClick={async () => {
            trackDemoModeEntered();
            setSubmitting(true);
            setError(null);
            try {
              const res = await fetch("/api/demo/start", { method: "POST" });
              const body = await res.json();
              if (!res.ok) throw new Error(body.error ?? "Failed to start demo");

              const result = await signIn("admin-login", {
                email: body.email,
                password: body.password,
                redirect: false,
              });

              if (result?.error) throw new Error("Demo login failed");

              router.push(body.redirectTo);
              router.refresh();
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Failed to start demo");
              setSubmitting(false);
            }
          }}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2.5 px-6 py-3 border-2 border-primary text-primary rounded-lg font-bold text-label-large hover:bg-primary-50/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading Demo...
            </>
          ) : (
            <>
              <PlayCircle className="w-5 h-5" />
              Try Interactive Demo
            </>
          )}
        </button>
        <p className="text-center text-body-small text-neutral-400 mt-3">
          No account needed. Explore a fully-loaded demo school.
        </p>
      </div>

      <p className="text-center text-body-small text-neutral-500 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary font-bold hover:underline">
          Create a free workspace
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
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
      </div>
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-body-large text-neutral-600">Loading page details...</p>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </main>
  );
}
