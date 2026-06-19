"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Coins, CreditCard, TrendingUp, AlertTriangle, ArrowRight, Activity, FileText, CheckCircle2, UserPlus, AlertCircle } from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface DashboardStats {
  totalInvoices: number;
  expectedRevenue: string;
  collectedRevenue: string;
  outstandingBalance: string;
  studentsWithoutParents: number;
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);

  useEffect(() => {
    // Load dashboard stats & setup status in parallel
    Promise.all([
      fetch("/api/admin/dashboard").then((r) => r.json()),
      fetch("/api/admin/setup/status").then((r) => r.json()),
    ])
      .then(([dashRes, setupRes]) => {
        setData(dashRes.data);
        setSetupStatus(setupRes.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load dashboard metrics:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-body-large text-neutral-600">Assembling financial workspace...</p>
      </div>
    );
  }

  const isOnboarding = data?.schoolStatus === "onboarding";

  // Render Onboarding Checklist Empty State Dashboard
  if (isOnboarding) {
    const progressPercent = setupStatus?.progress?.percentage ?? 0;
    const completedCount = setupStatus?.progress?.completed ?? 0;
    const totalCount = setupStatus?.progress?.total ?? 12;

    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="space-y-2 text-center py-4">
          <h1 className="text-headline-small text-neutral-900 font-bold">Welcome to WardBalance</h1>
          <p className="text-body-medium text-neutral-600">
            Let's configure your school's workspace settings to activate your financial ledger.
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

          {/* Progress Indicator */}
          <div className="bg-neutral-50 p-6 rounded-xl max-w-md mx-auto border border-neutral-200 text-left space-y-3">
            <div className="flex justify-between items-center text-body-medium font-bold text-neutral-800">
              <span>Setup Checklist Progress</span>
              <span className="font-mono">{completedCount} / {totalCount} Steps</span>
            </div>
            
            <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-505"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            
            <span className="text-[11px] text-neutral-400 block text-center pt-1">
              Checklist tracks academic sessions, divisions, levels, arms, fee items, and invoicing setup.
            </span>
          </div>

          <button
            onClick={() => router.push("/admin/setup")}
            className="px-6 py-3 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center gap-2 shadow-sm"
          >
            Continue Workspace Setup
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Render Active Dashboard
  const stats = data?.stats;

  // Format activity action log nicely
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
      {/* Welcome banner */}
      <div className="space-y-1">
        <h1 className="text-headline-small text-neutral-900 font-bold">Finance Dashboard</h1>
        <p className="text-body-medium text-neutral-600">
          Overview of school collections, outstanding balances, and administrative log activity.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI: Expected Revenue */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-label-medium text-neutral-500 uppercase tracking-wider font-semibold">
              Expected Revenue
            </span>
            <TrendingUp className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="space-y-1">
            <div className="text-headline-small font-extrabold text-neutral-900 tabular-nums">
              {formatNaira(stats?.expectedRevenue)}
            </div>
            <p className="text-[11px] text-neutral-400">Sum of generated terms invoices</p>
          </div>
        </div>

        {/* KPI: Collected Revenue */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-label-medium text-neutral-500 uppercase tracking-wider font-semibold">
              Collected Revenue
            </span>
            <Coins className="w-5 h-5 text-green-500" />
          </div>
          <div className="space-y-1">
            <div className="text-headline-small font-extrabold text-green-600 tabular-nums">
              {formatNaira(stats?.collectedRevenue)}
            </div>
            <p className="text-[11px] text-neutral-400">Total verified manual payments</p>
          </div>
        </div>

        {/* KPI: Outstanding Balance */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-label-medium text-neutral-500 uppercase tracking-wider font-semibold">
              Outstanding Balance
            </span>
            <CreditCard className="w-5 h-5 text-amber-500" />
          </div>
          <div className="space-y-1">
            <div className="text-headline-small font-extrabold text-amber-600 tabular-nums">
              {formatNaira(stats?.outstandingBalance)}
            </div>
            <p className="text-[11px] text-neutral-400">Remaining receivable fee dues</p>
          </div>
        </div>

        {/* KPI: Total Invoices */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-label-medium text-neutral-500 uppercase tracking-wider font-semibold">
              Invoices Generated
            </span>
            <FileText className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="space-y-1">
            <div className="text-headline-small font-extrabold text-neutral-900 tabular-nums">
              {stats?.totalInvoices}
            </div>
            <p className="text-[11px] text-neutral-400">Total generated student bills</p>
          </div>
        </div>
      </div>

      {/* Alert bar for students without parents */}
      {stats && stats.studentsWithoutParents > 0 && (
        <div
          onClick={() => router.push("/admin/students")}
          className="flex items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 shadow-sm cursor-pointer hover:bg-amber-100/60 transition"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-body-medium">
              You have <strong>{stats.studentsWithoutParents} students</strong> in your registry without any linked parents. No parent will receive invoice alerts or payment notifications.
            </span>
          </div>
          <button className="text-body-small text-amber-700 hover:underline font-bold inline-flex items-center gap-1 shrink-0">
            Link Wards
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Lower Dashboard split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent actions / Audit feed */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-neutral-400" />
              <h3 className="text-title-small text-neutral-900 font-bold">Recent System Logs</h3>
            </div>
            <button
              onClick={() => router.push("/admin/audit")}
              className="text-body-small text-primary hover:underline font-bold"
            >
              Full Log History
            </button>
          </div>

          <div className="space-y-4">
            {data?.recentActivity && data.recentActivity.length > 0 ? (
              data.recentActivity.map((log) => (
                <div key={log.id} className="flex gap-4 items-start text-body-medium text-neutral-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 mt-2 shrink-0"></div>
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

        {/* Quick billing summary */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <h3 className="text-title-small text-neutral-900 font-bold">Billing Actions</h3>
            </div>

            <div className="space-y-3.5 text-body-medium">
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:bg-neutral-100/50 cursor-pointer" onClick={() => router.push("/admin/invoices")}>
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-bold text-neutral-850">Billing Wizard</div>
                  <div className="text-[10px] text-neutral-400">Generate term invoices</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:bg-neutral-100/50 cursor-pointer" onClick={() => router.push("/admin/payments")}>
                <Coins className="w-5 h-5 text-green-500" />
                <div>
                  <div className="font-bold text-neutral-850">Record Collection</div>
                  <div className="text-[10px] text-neutral-400">Log cash, transfer or cheque</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:bg-neutral-100/50 cursor-pointer" onClick={() => router.push("/admin/students")}>
                <UserPlus className="w-5 h-5 text-neutral-500" />
                <div>
                  <div className="font-bold text-neutral-850">Student Registry</div>
                  <div className="text-[10px] text-neutral-400">Add parents and wards</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 p-4 border border-neutral-150 rounded-xl space-y-2 mt-4">
            <div className="text-[10px] text-neutral-400 uppercase font-semibold">Active Term Tracker</div>
            <p className="text-body-small text-neutral-700 leading-snug font-bold">
              Invoices generated will align with the currently set active academic term settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
