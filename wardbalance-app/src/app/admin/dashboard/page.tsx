"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Coins, CreditCard, TrendingUp, AlertTriangle, ArrowRight, Activity, FileText, CheckCircle2, UserPlus, AlertCircle, RefreshCw, Calendar, Clock } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { DashboardStatCard, DashboardStatCardSkeleton } from "@/components/admin/shared/dashboard-stat-card";

interface DashboardStats {
  totalInvoices: number;
  expectedRevenue: string;
  collectedRevenue: string;
  outstandingBalance: string;
  studentsWithoutParents: number;
  overdue: {
    overdueCount: number;
    overdueTotal: string;
    pendingReminders: number;
  };
}

interface AuditLog {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  createdAt: string;
}

interface DashboardData {
  schoolStatus: "lead" | "approved" | "invited" | "onboarding" | "active" | "paused" | "archived";
  activeTerm: { name: string; sessionName: string } | null;
  stats: DashboardStats;
  recentActivity: AuditLog[];
}

interface SetupStatus {
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, setupRes] = await Promise.all([
        fetch("/api/admin/dashboard").then((r) => {
          if (!r.ok) throw new Error("Failed to load dashboard metrics");
          return r.json();
        }),
        fetch("/api/admin/setup/status").then((r) => {
          if (!r.ok) throw new Error("Failed to load setup status");
          return r.json();
        }),
      ]);
      setData(dashRes.data);
      setSetupStatus(setupRes.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-neutral-200 rounded animate-pulse" />
          <div className="h-4 w-72 bg-neutral-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardStatCardSkeleton />
          <DashboardStatCardSkeleton />
          <DashboardStatCardSkeleton />
          <DashboardStatCardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <AlertCircle className="w-12 h-12 text-error mb-4" />
        <h3 className="text-title-medium text-neutral-900 font-bold mb-2">Could Not Load Dashboard</h3>
        <p className="text-body-medium text-neutral-600 mb-6">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-primary text-white font-bold rounded-lg text-body-small hover:bg-primary-dark transition inline-flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const isOnboarding = data?.schoolStatus === "onboarding";

  if (isOnboarding) {
    const progressPercent = setupStatus?.progress?.percentage ?? 0;
    const completedCount = setupStatus?.progress?.completed ?? 0;
    const totalCount = setupStatus?.progress?.total ?? 12;

    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="space-y-2 text-center py-4">
          <h1 className="text-headline-small text-neutral-900 font-bold">Welcome to WardBalance</h1>
          <p className="text-body-medium text-neutral-600">
            Let&apos;s configure your school&apos;s workspace settings to activate your financial ledger.
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-8 space-y-6 text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
            <Coins className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-title-medium text-neutral-950 font-bold">
              Your Finance Dashboard is Almost Ready
            </h3>
            <p className="text-body-medium text-neutral-500">
              Complete your school onboarding checklist to start recording class fee items, generating invoice bills, and tracking manual payments.
            </p>
          </div>

          <div className="bg-neutral-50 p-6 rounded-xl max-w-md mx-auto border border-neutral-200 text-left space-y-3">
            <div className="flex justify-between items-center text-body-medium font-bold text-neutral-800">
              <span>Setup Checklist Progress</span>
              <span className="font-mono">{completedCount} / {totalCount} Steps</span>
            </div>

            <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <span className="text-[11px] text-neutral-400 block text-center pt-1">
              Checklist tracks academic sessions, divisions, levels, arms, fee items, and invoicing setup.
            </span>
          </div>

          <button
            onClick={() => router.push("/admin/setup")}
            className="px-6 py-3 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center gap-2 shadow-sm cursor-pointer"
          >
            Continue Workspace Setup
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const expectedRev = stats?.expectedRevenue ? Number(stats.expectedRevenue) : 0;
  const collectedRev = stats?.collectedRevenue ? Number(stats.collectedRevenue) : 0;
  const collectionRate = expectedRev > 0 ? Math.round((collectedRev / expectedRev) * 100) : 0;
  const activeTerm = data?.activeTerm;

  const formatActionMessage = (log: AuditLog) => {
    const actor = <strong className="text-neutral-800">{log.actorName}</strong>;
    const actionLower = log.action.toLowerCase();

    if (actionLower.includes("created")) {
      return <span>{actor} created new {log.entityType.toLowerCase()} entry.</span>;
    }
    if (actionLower.includes("updated")) {
      return <span>{actor} modified {log.entityType.toLowerCase()} profile.</span>;
    }
    if (actionLower.includes("deleted")) {
      return <span>{actor} deleted {log.entityType.toLowerCase()} record.</span>;
    }
    if (actionLower.includes("registered")) {
      return <span>{actor} registered student.</span>;
    }
    if (actionLower.includes("generated")) {
      return <span>{actor} generated term invoice bills.</span>;
    }
    if (actionLower.includes("recorded")) {
      return <span>{actor} recorded manual payment.</span>;
    }
    if (actionLower.includes("voided")) {
      return <span className="text-red-750">{actor} voided recorded payment.</span>;
    }
    return <span>{actor} executed action: {log.action}.</span>;
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-headline-small text-neutral-900 font-bold">Finance Dashboard</h1>
          {activeTerm && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-body-small font-bold">
              <Calendar className="w-3.5 h-3.5" />
              {activeTerm.sessionName} — {activeTerm.name}
            </span>
          )}
        </div>
        <p className="text-body-medium text-neutral-600">
          {activeTerm
            ? `Revenue and collection overview for ${activeTerm.sessionName} — ${activeTerm.name}. KPIs are scoped to this active term.`
            : "Overview of school collections, outstanding balances, and administrative log activity. Set an active term to scope dashboard data."
          }
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardStatCard
          label="Expected Revenue"
          value={stats?.expectedRevenue}
          icon={TrendingUp}
          subtitle="Sum of generated term invoices"
          href="/admin/invoices"
        />
        <DashboardStatCard
          label="Collected Revenue"
          value={stats?.collectedRevenue}
          icon={Coins}
          subtitle="Total verified manual payments"
          valueColor="green"
          href="/admin/payments"
        />
        <DashboardStatCard
          label="Outstanding Balance"
          value={stats?.outstandingBalance}
          icon={CreditCard}
          subtitle="Remaining receivable fee dues"
          valueColor="amber"
          href="/admin/reports"
        />
        <DashboardStatCard
          label="Invoices Generated"
          value={stats?.totalInvoices ?? 0}
          icon={FileText}
          subtitle="Total generated student bills"
          href="/admin/invoices"
        />
      </div>

      {stats && stats.overdue.overdueCount > 0 && (
        <div
          onClick={() => router.push("/admin/reports")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/admin/reports"); }}
          role="button"
          tabIndex={0}
          aria-label={`${stats.overdue.overdueCount} overdue invoices totalling ${stats.overdue.overdueTotal}. Click to view reports.`}
          className="flex items-center justify-between gap-4 p-4 rounded-xl bg-red-50 text-red-900 border border-red-200 shadow-sm cursor-pointer hover:bg-red-100/60 transition"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-body-medium">
              <strong>{stats.overdue.overdueCount} overdue invoice{stats.overdue.overdueCount !== 1 ? "s" : ""}</strong> totalling <strong>{formatNaira(stats.overdue.overdueTotal)}</strong>. {stats.overdue.pendingReminders > 0 && ` ${stats.overdue.pendingReminders} reminder${stats.overdue.pendingReminders !== 1 ? "s" : ""} pending delivery.`}
            </span>
          </div>
          <span className="text-body-small text-red-700 font-bold inline-flex items-center gap-1 shrink-0">
            View Debtors
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      )}

      <div
        onClick={() => router.push("/admin/reports")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/admin/reports"); }}
        role="button"
        tabIndex={0}
        aria-label="Collection rate — click to view reports"
        className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-label-medium text-neutral-500 uppercase tracking-wider font-semibold">
            Collection Rate
          </span>
          <TrendingUp className={`w-5 h-5 ${collectionRate >= 75 ? "text-green-500" : collectionRate >= 50 ? "text-amber-500" : "text-neutral-400"}`} />
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className={`text-headline-small font-extrabold tabular-nums ${collectionRate >= 75 ? "text-green-600" : collectionRate >= 50 ? "text-amber-600" : "text-neutral-900"}`}>
              {collectionRate}%
            </span>
            <span className="text-[11px] text-neutral-400">
              of expected revenue collected
            </span>
          </div>
          <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                collectionRate >= 75 ? "bg-green-500" : collectionRate >= 50 ? "bg-amber-500" : "bg-neutral-400"
              }`}
              style={{ width: `${collectionRate}%` }}
            />
          </div>
        </div>
      </div>

      {stats && stats.studentsWithoutParents > 0 && (
        <div
          onClick={() => router.push("/admin/students")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/admin/students"); }}
          role="button"
          tabIndex={0}
          aria-label={`${stats.studentsWithoutParents} students without linked parents. Click to manage.`}
          className="flex items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 shadow-sm cursor-pointer hover:bg-amber-100/60 transition"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-body-medium">
              You have <strong>{stats.studentsWithoutParents} students</strong> in your registry without any linked parents. No parent will receive invoice alerts or payment notifications.
            </span>
          </div>
          <button className="text-body-small text-amber-700 hover:underline font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer">
            Link Wards
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-neutral-400" />
              <h3 className="text-title-small text-neutral-900 font-bold">Recent System Logs</h3>
            </div>
            <button
              onClick={() => router.push("/admin/audit")}
              className="text-body-small text-primary hover:underline font-bold cursor-pointer"
            >
              Full Log History
            </button>
          </div>

          <div className="space-y-4">
            {loading && !data?.recentActivity ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-start animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-200 mt-2 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-3/4 bg-neutral-200 rounded" />
                    <div className="h-3 w-1/4 bg-neutral-200 rounded" />
                  </div>
                </div>
              ))
            ) : data?.recentActivity && data.recentActivity.length > 0 ? (
              data.recentActivity.map((log) => (
                <div key={log.id} className="flex gap-4 items-start text-body-medium text-neutral-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 mt-2 shrink-0" />
                  <div className="flex-1">
                    <p className="leading-snug">{formatActionMessage(log)}</p>
                    <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">
                      {new Date(log.createdAt).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-neutral-400 text-center py-6">No administrative logs recorded yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <h3 className="text-title-small text-neutral-900 font-bold">Billing Actions</h3>
            </div>

            <div className="space-y-3.5 text-body-medium">
              <div
                onClick={() => router.push("/admin/invoices")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/admin/invoices"); }}
                role="button"
                tabIndex={0}
                aria-label="Open billing wizard to generate term invoices"
                className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:bg-neutral-100/50 cursor-pointer"
              >
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-bold text-neutral-800">Billing Wizard</div>
                  <div className="text-[10px] text-neutral-400">Generate term invoices</div>
                </div>
              </div>

              <div
                onClick={() => router.push("/admin/payments")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/admin/payments"); }}
                role="button"
                tabIndex={0}
                aria-label="Record a manual payment collection"
                className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:bg-neutral-100/50 cursor-pointer"
              >
                <Coins className="w-5 h-5 text-green-500" />
                <div>
                  <div className="font-bold text-neutral-800">Record Collection</div>
                  <div className="text-[10px] text-neutral-400">Log cash, transfer or cheque</div>
                </div>
              </div>

              <div
                onClick={() => router.push("/admin/students")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/admin/students"); }}
                role="button"
                tabIndex={0}
                aria-label="Open student registry to add or manage students"
                className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:bg-neutral-100/50 cursor-pointer"
              >
                <UserPlus className="w-5 h-5 text-neutral-500" />
                <div>
                  <div className="font-bold text-neutral-800">Student Registry</div>
                  <div className="text-[10px] text-neutral-400">Add parents and wards</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 p-4 border border-neutral-200 rounded-xl space-y-2 mt-4">
            <div className="text-[10px] text-neutral-400 uppercase font-semibold">Active Term Tracker</div>
            {activeTerm ? (
              <p className="text-body-small text-neutral-700 leading-snug font-bold">
                Dashboard KPIs are scoped to <span className="text-primary">{activeTerm.sessionName} — {activeTerm.name}</span>. Switch the active term in Academic Settings to view data for a different period.
              </p>
            ) : (
              <p className="text-body-small text-amber-700 leading-snug font-bold">
                No active term set. KPIs show all-time data. Set an active term in Academic Settings to scope invoices and payments.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
