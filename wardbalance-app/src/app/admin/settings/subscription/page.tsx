"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertTriangle, CreditCard, Clock, X, Lock, RefreshCw } from "lucide-react";

interface SubscriptionData {
  subscription: {
    id: string;
    status: string;
    plan: {
      id: string;
      name: string;
      tier: number;
      price: number;
      currency: string;
      billingPeriod: string | null;
      features: Record<string, unknown>;
      limits: Record<string, unknown>;
    };
    autoRenew: boolean;
    cancelAtPeriodEnd: boolean;
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    hasCardOnFile: boolean;
  };
  usage: {
    students: number;
    staff: number;
    studentLimit: number;
    staffLimit: number;
  };
  recentInvoices: {
    id: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    status: string;
    periodStart: string;
    periodEnd: string;
    paidAt: string | null;
    createdAt: string;
  }[];
}

interface PlanOption {
  id: string;
  name: string;
  tier: number;
  price: number;
  currency: string;
  billingPeriod: string | null;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
}

const STATUS_BADGES: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  trialing: { label: "Trialing", className: "bg-blue-100 text-blue-700", icon: Clock },
  active: { label: "Active", className: "bg-green-100 text-green-700", icon: Check },
  past_due: { label: "Past Due", className: "bg-red-100 text-red-700", icon: AlertTriangle },
  suspended: { label: "Suspended", className: "bg-amber-100 text-amber-700", icon: Lock },
  cancelled: { label: "Cancelled", className: "bg-neutral-100 text-neutral-600", icon: X },
  expired: { label: "Expired", className: "bg-neutral-100 text-neutral-500", icon: AlertTriangle },
};

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  if (limit === -1) {
    return (
      <div className="bg-white p-4 rounded-xl border border-neutral-200">
        <div className="flex justify-between mb-1.5">
          <span className="text-body-small font-medium text-neutral-700">{label}</span>
          <span className="text-body-small text-neutral-500 tabular-nums">{used} / Unlimited</span>
        </div>
      </div>
    );
  }

  const pct = Math.min((used / limit) * 100, 100);
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="bg-white p-4 rounded-xl border border-neutral-200">
      <div className="flex justify-between mb-1.5">
        <span className="text-body-small font-medium text-neutral-700">{label}</span>
        <span className="text-body-small text-neutral-500 tabular-nums">
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_BADGES[status] ?? STATUS_BADGES.active;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [flutterwaveStatus, setFlutterwaveStatus] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fwStatus = params.get("flutterwave_status");
    if (fwStatus) {
      setFlutterwaveStatus(fwStatus);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("flutterwave_status");
      url.searchParams.delete("transaction_id");
      url.searchParams.delete("tx_ref");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [subRes, plansRes] = await Promise.all([
          fetch("/api/admin/settings/subscription"),
          fetch("/api/admin/settings/subscription/plans"),
        ]);
        if (!subRes.ok) {
          const err = await subRes.json();
          throw new Error(err.error ?? "Failed to load subscription");
        }
        const subJson = await subRes.json();
        setData(subJson.data);

        if (plansRes.ok) {
          const plansJson = await plansRes.json();
          setPlans(plansJson.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-neutral-200 rounded-lg" />
        <div className="h-32 bg-neutral-200 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-20 bg-neutral-200 rounded-xl" />
          <div className="h-20 bg-neutral-200 rounded-xl" />
        </div>
        <div className="h-48 bg-neutral-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-title-large font-bold text-neutral-900 mb-2">Could not load subscription</h2>
        <p className="text-body-medium text-neutral-600 mb-6">{error}</p>
        <button
          onClick={() => router.refresh()}
          className="px-5 min-h-[44px] bg-primary text-white rounded-lg text-body-small font-bold inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { subscription, usage, recentInvoices } = data;

  const daysRemaining = subscription.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  const isTrial = subscription.status === "trialing";
  const isCancelled = subscription.status === "cancelled";
  const isSuspended = subscription.status === "suspended" || subscription.status === "expired";
  const canUpgrade = !isSuspended;
  const canCancel = subscription.status === "active" || isTrial;
  const canReactivate = isCancelled || isSuspended;

  const featureEntries = Object.entries(subscription.plan.features as Record<string, boolean>);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Trial Banner */}
      {isTrial && daysRemaining !== null && daysRemaining <= 7 && (
        <div className={`px-5 py-3 rounded-xl border-l-4 flex items-center justify-between gap-4 ${
          daysRemaining <= 3
            ? "bg-red-50 border-red-500 text-red-800"
            : "bg-amber-50 border-amber-500 text-amber-800"
        }`}>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 shrink-0" />
            <p className="text-body-small font-bold">
              Your trial ends in {daysRemaining} {daysRemaining === 1 ? "day" : "days"}
            </p>
          </div>
          <button
            onClick={() => setShowUpgrade(true)}
            className="px-4 min-h-[36px] bg-primary text-white rounded-lg text-body-small font-bold whitespace-nowrap"
          >
            Upgrade Now
          </button>
        </div>
      )}

      {/* Cancellation Banner */}
      {isCancelled && subscription.currentPeriodEnd && (
        <div className="px-5 py-3 rounded-xl border-l-4 bg-amber-50 border-amber-500 text-amber-800 flex items-center justify-between gap-4">
          <p className="text-body-small font-bold">
            Your plan remains active until {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
            After that, access will be limited.
          </p>
          <button
            onClick={() => router.push("/api/admin/settings/subscription/reactivate")}
            className="px-4 min-h-[36px] bg-primary text-white rounded-lg text-body-small font-bold whitespace-nowrap"
          >
            Reactivate
          </button>
        </div>
      )}

      {/* Suspended Banner */}
      {isSuspended && (
        <div className="px-5 py-3 rounded-xl border-l-4 bg-red-50 border-red-500 text-red-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 shrink-0" />
            <p className="text-body-small font-bold">
              Your subscription {subscription.status === "expired" ? "has expired" : "is suspended"}.
              {subscription.status === "expired" ? " Renew to regain access." : " Resolve the outstanding balance to continue."}
            </p>
          </div>
          <button
            onClick={() => router.push("/api/admin/settings/subscription/reactivate")}
            className="px-4 min-h-[36px] bg-primary text-white rounded-lg text-body-small font-bold whitespace-nowrap"
          >
            {subscription.status === "expired" ? "Renew" : "Reactivate"}
          </button>
        </div>
      )}

      {/* Flutterwave Status Banner */}
      {flutterwaveStatus === "success" && (
        <div className="px-5 py-3 rounded-xl border-l-4 bg-green-50 border-green-500 text-green-800 flex items-center gap-3">
          <Check className="w-5 h-5 shrink-0" />
          <p className="text-body-small font-bold">Payment confirmed! Your plan has been activated.</p>
        </div>
      )}
      {flutterwaveStatus === "cancelled" && (
        <div className="px-5 py-3 rounded-xl border-l-4 bg-amber-50 border-amber-500 text-amber-800 flex items-center gap-3">
          <X className="w-5 h-5 shrink-0" />
          <p className="text-body-small font-bold">Payment was cancelled. No charges were made.</p>
        </div>
      )}
      {flutterwaveStatus === "error" && (
        <div className="px-5 py-3 rounded-xl border-l-4 bg-red-50 border-red-500 text-red-800 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-body-small font-bold">Payment verification failed. Please check your subscription status or contact support.</p>
        </div>
      )}
      {flutterwaveStatus === "pending" && (
        <div className="px-5 py-3 rounded-xl border-l-4 bg-blue-50 border-blue-500 text-blue-800 flex items-center gap-3">
          <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
          <p className="text-body-small font-bold">Payment is being confirmed. This may take a moment. Refresh to see the latest status.</p>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-headline-small font-bold text-neutral-900">{subscription.plan.name} Plan</h1>
                <StatusBadge status={subscription.status} />
              </div>
              <p className="text-body-medium text-neutral-600">
                {subscription.plan.price > 0
                  ? `${formatNaira(subscription.plan.price)}/${subscription.plan.billingPeriod ?? "term"}`
                  : "Free plan"}
              </p>
            </div>
            <div className="flex gap-2">
              {canUpgrade && !isTrial && (
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="px-5 min-h-[44px] bg-primary text-white rounded-lg text-body-small font-bold"
                >
                  Upgrade
                </button>
              )}
            </div>
          </div>

          {/* Period Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {subscription.trialEndsAt && (
              <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                <p className="text-label-small text-neutral-500 mb-0.5">Trial ends</p>
                <p className="text-title-small font-bold text-neutral-900">
                  {new Date(subscription.trialEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            )}
            {subscription.currentPeriodEnd && (
              <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                <p className="text-label-small text-neutral-500 mb-0.5">Current period ends</p>
                <p className="text-title-small font-bold text-neutral-900">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            )}
            <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
              <p className="text-label-small text-neutral-500 mb-0.5">Payment method</p>
              <p className="text-title-small font-bold text-neutral-900">
                {subscription.hasCardOnFile ? "Card saved" : "None"}
              </p>
            </div>
          </div>

          {/* Usage */}
          <div>
            <h3 className="text-title-small font-bold text-neutral-900 mb-3">Usage & Limits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UsageBar used={usage.students} limit={usage.studentLimit} label="Students" />
              <UsageBar used={usage.staff} limit={usage.staffLimit} label="Staff accounts" />
            </div>
          </div>
        </div>
      </div>

      {/* Plan Features */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 md:p-8">
        <h2 className="text-title-large font-bold text-neutral-900 mb-4">Plan Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {featureEntries.map(([key, enabled]) => (
            <div key={key} className="flex items-center gap-2.5 py-1.5">
              {enabled ? (
                <Check className="w-4 h-4 text-green-500 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-neutral-300 shrink-0" />
              )}
              <span className={`text-body-medium ${enabled ? "text-neutral-900" : "text-neutral-400"}`}>
                {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 md:p-8">
        <h2 className="text-title-large font-bold text-neutral-900 mb-4">Billing History</h2>
        {recentInvoices.length === 0 ? (
          <div className="text-center py-10">
            <CreditCard className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-body-medium text-neutral-500">No billing history yet.</p>
            <p className="text-body-small text-neutral-400">Your first invoice will appear here after your next billing cycle.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="pb-3 text-label-small text-neutral-500 font-bold uppercase tracking-wider">Date</th>
                  <th className="pb-3 text-label-small text-neutral-500 font-bold uppercase tracking-wider">Invoice</th>
                  <th className="pb-3 text-label-small text-neutral-500 font-bold uppercase tracking-wider text-right">Amount</th>
                  <th className="pb-3 text-label-small text-neutral-500 font-bold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-neutral-100 last:border-0">
                    <td className="py-3 text-body-medium text-neutral-700">
                      {new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 text-body-medium text-neutral-700 font-mono">{inv.invoiceNumber}</td>
                    <td className="py-3 text-body-medium text-neutral-900 font-bold tabular-nums text-right">
                      {formatNaira(inv.amount)}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={inv.status === "paid" ? "active" : inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      {canCancel && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6 md:p-8">
          <h2 className="text-title-large font-bold text-red-700 mb-2">Danger Zone</h2>
          <p className="text-body-medium text-neutral-600 mb-4">
            Once you cancel, your subscription will remain active until the end of the current billing period.
          </p>
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to cancel your subscription? Your data will be preserved for 90 days.")) {
                fetch("/api/admin/settings/subscription/cancel", { method: "POST" })
                  .then(() => router.refresh())
                  .catch(() => {});
              }
            }}
            className="px-5 min-h-[44px] bg-red-600 text-white rounded-lg text-body-small font-bold"
          >
            Cancel Subscription
          </button>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgrade && plans.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-headline-small font-bold text-neutral-900">Choose a Plan</h2>
              <button onClick={() => setShowUpgrade(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.filter((p) => p.tier >= subscription.plan.tier).map((plan) => {
                const isCurrent = plan.id === subscription.plan.id;
                const featureList = Object.entries(plan.features as Record<string, boolean>);
                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border-2 p-5 ${
                      isCurrent
                        ? "border-green-200 bg-green-50/20"
                        : "border-neutral-200 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-title-large font-bold text-neutral-900">{plan.name}</h3>
                        <p className="text-headline-small font-bold text-primary tabular-nums mt-1">
                          {plan.price > 0 ? formatNaira(plan.price) : "Free"}
                        </p>
                        {plan.billingPeriod && (
                          <p className="text-label-small text-neutral-500">per {plan.billingPeriod}</p>
                        )}
                      </div>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 mb-5">
                      {featureList.map(([key, enabled]) => (
                        <div key={key} className="flex items-center gap-2">
                          {enabled ? (
                            <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                          )}
                          <span className={`text-body-small ${enabled ? "text-neutral-700" : "text-neutral-400"}`}>
                            {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                          </span>
                        </div>
                      ))}
                    </div>

                    {!isCurrent && plan.price > 0 && (
                      <button
                        onClick={async () => {
                          setShowUpgrade(false);
                          try {
                            const res = await fetch("/api/subscription/flutterwave/initialize", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ planId: plan.id }),
                            });
                            const json = await res.json();
                            if (res.ok && json.data?.checkoutUrl) {
                              window.location.href = json.data.checkoutUrl;
                            } else {
                              alert(json.error ?? "Failed to start checkout");
                            }
                          } catch {
                            alert("Network error. Please try again.");
                          }
                        }}
                        className="w-full min-h-[44px] bg-primary text-white rounded-lg text-body-small font-bold"
                      >
                        {isTrial ? "Choose Plan" : `Upgrade to ${plan.name}`}
                      </button>
                    )}

                    {!isCurrent && plan.price === 0 && (
                      <button
                        onClick={async () => {
                          const res = await fetch("/api/admin/settings/subscription/downgrade", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ planId: plan.id }),
                          });
                          if (res.ok) {
                            setShowUpgrade(false);
                            router.refresh();
                          }
                        }}
                        className="w-full min-h-[44px] border border-neutral-200 text-neutral-700 rounded-lg text-body-small font-bold"
                      >
                        Downgrade to {plan.name}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
