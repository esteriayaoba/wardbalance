"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Coins, CreditCard, TrendingUp, AlertTriangle, ArrowRight, Activity, FileText, CheckCircle2, UserPlus, AlertCircle, RefreshCw, Calendar, Clock, Rocket, MapPin, Building2 } from "lucide-react";
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

interface LifecycleMilestone {
  milestone: string;
  occurredAt: string;
}

interface LifecycleData {
  stage: string;
  milestones: LifecycleMilestone[];
}

interface DashboardData {
  schoolName?: string;
  userName?: string;
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

export default function DashboardPage() {
  const router = useRouter();
  const dashQuery = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard metrics");
      return res.json();
    },
  });

  const setupQuery = useQuery({
    queryKey: ["admin", "setup", "status"],
    queryFn: async () => {
      const res = await fetch("/api/admin/setup/status");
      if (!res.ok) throw new Error("Failed to load setup status");
      return res.json();
    },
    // Poll every 5 seconds while school is still onboarding
    refetchInterval: (query) => {
      const data = query.state.data?.data;
      return data?.schoolStatus === "onboarding" ? 5_000 : false;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    // Shared cache with the setup page — 30s stale window means the dashboard
    // almost never re-fetches if the user was just on the setup page.
    staleTime: 30_000,
  });

  const lifecycleQuery = useQuery({
    queryKey: ["admin", "lifecycle"],
    queryFn: async () => {
      const res = await fetch("/api/admin/lifecycle");
      return res.json();
    },
  });

  const data = dashQuery.data?.data as DashboardData | undefined;
  const setupStatus = setupQuery.data?.data as SetupStatus | undefined;
  const lifecycle = lifecycleQuery.data?.data as LifecycleData | undefined;
  const error = dashQuery.error || setupQuery.error;
  const loading = dashQuery.isLoading && !dashQuery.data;

  if (loading) {
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
        <p className="text-body-medium text-neutral-600 mb-6">{error instanceof Error ? error.message : "An unexpected error occurred"}</p>
        <button onClick={() => { dashQuery.refetch(); setupQuery.refetch(); lifecycleQuery.refetch(); }} className="px-4 py-2 bg-primary text-white font-bold rounded-lg text-body-small hover:bg-primary-dark transition inline-flex items-center gap-2 cursor-pointer">
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

    // Minimum-State Action Guidance Specs
    let currentPhaseNum = 1;
    let phaseLabel = "Set Up School Structure";
    let nextActionTitle = "Define Divisions & Class Levels";
    let nextActionDesc = "Add your nursery, primary, or secondary class levels and arms.";
    let estTime = "~4 mins to invoice-ready";
    let nextRoute = "/admin/setup";

    if (completedCount >= 6 && completedCount < 9) {
      currentPhaseNum = 2;
      phaseLabel = "Add Community";
      nextActionTitle = "Add Students & Link Parents";
      nextActionDesc = "Enroll student records and link parent accounts for automated alerts.";
      estTime = "~3 mins remaining";
    } else if (completedCount >= 9 && completedCount < 12) {
      currentPhaseNum = 3;
      phaseLabel = "Configure Fee Desk";
      nextActionTitle = "Build Fee Items & Class Templates";
      nextActionDesc = "Set mandatory tuition items and publish term billing templates.";
      estTime = "~2 mins remaining";
    } else if (completedCount >= 12) {
      currentPhaseNum = 3;
      phaseLabel = "Setup Complete";
      nextActionTitle = "Activate Finance Operations";
      nextActionDesc = "All 12 setup steps are complete! You are ready to generate live bills.";
      estTime = "Ready now";
    }

    return (
      <div className="space-y-6">
        {/* Onboarding Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-4">
          <div>
            <h1 className="text-headline-small text-neutral-900 font-bold tracking-tight">Finance Desk Onboarding</h1>
            <p className="text-body-medium text-neutral-500">
              Guided 3-phase setup for your school workspace. Complete setup to unlock billing and collection workflows.
            </p>
          </div>
          <button
            onClick={() => router.push(nextRoute)}
            className="shrink-0 px-5 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-body-small rounded-lg transition inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <span>Continue Setup</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Column Hero Workspace Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6 lg:p-8 shadow-sm space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Column: Progress & Phase Tracker (7 Cols) */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded bg-primary/10 text-primary text-label-small uppercase tracking-wider">
                  Phase {currentPhaseNum} of 3
                </span>
                <span className="text-body-small text-neutral-500 font-medium">
                  {phaseLabel}
                </span>
              </div>

              <div>
                <h2 className="text-title-large text-neutral-950 font-bold tracking-tight">
                  Your Finance Desk Awaits
                </h2>
                <p className="text-body-medium text-neutral-500 mt-1 max-w-xl">
                  Complete the quick setup checklist to start generating invoices, tracking parent payments, and monitoring expected revenue.
                </p>
              </div>

              {/* Progress Bar & Phase Stepper */}
              <div className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200/60">
                <div className="flex justify-between items-center text-body-small font-bold text-neutral-800">
                  <span>Overall Setup Progress</span>
                  <span className="font-mono text-primary">{completedCount} / {totalCount} Steps ({progressPercent}%)</span>
                </div>
                <div className="w-full bg-neutral-200/80 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500 rounded-full"
                    style={{ width: `${Math.max(progressPercent, 5)}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  {[
                    { label: "1. School Structure", threshold: 0 },
                    { label: "2. Community", threshold: 6 },
                    { label: "3. Fee Desk", threshold: 9 },
                  ].map((phase, i) => {
                    const isDone = completedCount >= (i === 0 ? 6 : i === 1 ? 9 : 12);
                    const isCurrent = currentPhaseNum === i + 1;
                    return (
                      <div
                        key={phase.label}
                        className={`p-2 rounded-lg text-label-small transition-colors ${
                          isDone
                            ? "bg-green-50 text-green-700 border border-green-200/60"
                            : isCurrent
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-white text-neutral-400 border border-neutral-200/60"
                        }`}
                      >
                        {isDone ? "✓ " : ""}{phase.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Minimum-State Recommended Next Action (5 Cols) */}
            <div className="lg:col-span-5 bg-primary-light p-6 rounded-xl border border-primary/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-label-small text-neutral-400 uppercase tracking-wider">Recommended Next Step</span>
                <span className="px-2 py-0.5 rounded bg-neutral-200/60 text-neutral-600 text-label-small">{estTime}</span>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-title-small text-neutral-900 font-bold flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-primary shrink-0" />
                  {nextActionTitle}
                </h4>
                <p className="text-body-small text-neutral-600 leading-relaxed">
                  {nextActionDesc}
                </p>
              </div>

              <button
                onClick={() => router.push(nextRoute)}
                className="w-full py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-bold text-body-small rounded-lg transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Go to Checklist Step</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Operational Preview Grid (Dimmed / Preview State) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-label-small text-neutral-400 uppercase tracking-wider">Dashboard Preview (Locked until setup completes)</span>
            <span className="text-label-small text-primary">Complete Setup to Activate</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-60 pointer-events-none select-none">
            <DashboardStatCard label="Expected Revenue" value={0} icon={TrendingUp} subtitle="Sum of generated term invoices" />
            <DashboardStatCard label="Collected Revenue" value={0} icon={Coins} subtitle="Total verified manual payments" valueColor="green" />
            <DashboardStatCard label="Outstanding Balance" value={0} icon={CreditCard} subtitle="Remaining receivable fee dues" valueColor="amber" />
            <DashboardStatCard label="Invoices Generated" value={0} icon={FileText} subtitle="Total generated student bills" />
          </div>
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const expectedRev = stats?.expectedRevenue ? Number(stats.expectedRevenue) : 0;
  const collectedRev = stats?.collectedRevenue ? Number(stats.collectedRevenue) : 0;
  const collectionRate = expectedRev > 0 ? Math.round((collectedRev / expectedRev) * 100) : 0;
  const activeTerm = data?.activeTerm;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="space-y-6">
      {/* Personalized CRM Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-headline-small text-neutral-950 font-bold tracking-tight">
              {getGreeting()}, {data?.userName ?? "Administrator"} 👋
            </h1>
            {data?.schoolName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 border border-neutral-200/60 text-neutral-800 text-body-small font-bold">
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{data.schoolName}</span>
              </span>
            )}
          </div>
          <p className="text-body-medium text-neutral-500">
            {activeTerm
              ? `Financial collections and receivable overview for ${activeTerm.sessionName} \u2014 ${activeTerm.name}.`
              : `Overview of school collections, outstanding balances, and administrative log activity.`}
          </p>
        </div>

        {activeTerm && (
          <div className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-body-small font-bold">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span>{activeTerm.sessionName} &mdash; {activeTerm.name}</span>
          </div>
        )}
      </div>

      <div id="dashboard-kpi-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardStatCard label="Expected Revenue" value={stats?.expectedRevenue} icon={TrendingUp} subtitle="Sum of generated term invoices" href="/admin/invoices" />
        <DashboardStatCard label="Collected Revenue" value={stats?.collectedRevenue} icon={Coins} subtitle="Total verified manual payments" valueColor="green" href="/admin/payments" />
        <DashboardStatCard label="Outstanding Balance" value={stats?.outstandingBalance} icon={CreditCard} subtitle="Remaining receivable fee dues" valueColor="amber" href="/admin/reports" />
        <DashboardStatCard label="Invoices Generated" value={stats?.totalInvoices ?? 0} icon={FileText} subtitle="Total generated student bills" href="/admin/invoices" />
      </div>

      {stats && stats.overdue.overdueCount > 0 && (
        <div onClick={() => router.push("/admin/reports")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/admin/reports"); }} role="button" tabIndex={0} aria-label={`${stats.overdue.overdueCount} overdue invoices totalling ${stats.overdue.overdueTotal}. Click to view reports.`} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-red-50 text-red-900 border border-red-200 shadow-sm cursor-pointer hover:bg-red-100/60 transition">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-body-medium"><strong>{stats.overdue.overdueCount} overdue invoice{stats.overdue.overdueCount !== 1 ? "s" : ""}</strong> totalling <strong>{formatNaira(stats.overdue.overdueTotal)}</strong>. {stats.overdue.pendingReminders > 0 && ` ${stats.overdue.pendingReminders} reminder${stats.overdue.pendingReminders !== 1 ? "s" : ""} pending delivery.`}</span>
          </div>
          <span className="text-body-small text-red-700 font-bold inline-flex items-center gap-1 shrink-0">View Debtors <ArrowRight className="w-4 h-4" /></span>
        </div>
      )}

      <div onClick={() => router.push("/admin/reports")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/admin/reports"); }} role="button" tabIndex={0} aria-label="Collection rate — click to view reports" className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm cursor-pointer hover:border-primary/40 hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-label-small text-neutral-500 uppercase tracking-wider">Collection Rate</span>
          <TrendingUp className={`w-5 h-5 ${collectionRate >= 75 ? "text-green-500" : collectionRate >= 50 ? "text-amber-500" : "text-neutral-400"}`} />
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className={`text-headline-small font-bold tabular-nums ${collectionRate >= 75 ? "text-green-600" : collectionRate >= 50 ? "text-amber-600" : "text-neutral-900"}`}>{collectionRate}%</span>
            <span className="text-body-small text-neutral-400">of expected revenue collected</span>
          </div>
          <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${collectionRate >= 75 ? "bg-green-500" : collectionRate >= 50 ? "bg-amber-500" : "bg-neutral-400"}`} style={{ width: `${collectionRate}%` }} />
          </div>
        </div>
      </div>

      {/* Lifecycle Stage Card */}
      {lifecycle && !isOnboarding && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Rocket className="w-5 h-5 text-primary" />
            <h3 className="text-title-small text-neutral-900 font-bold">Account Journey</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-body-small font-bold ${
              lifecycle.stage === "NEW" ? "bg-neutral-100 text-neutral-600" :
              lifecycle.stage === "ONBOARDING" ? "bg-blue-50 text-blue-700" :
              lifecycle.stage === "ACTIVATING" ? "bg-amber-50 text-amber-700" :
              lifecycle.stage === "ACTIVE" ? "bg-green-50 text-green-700" :
              lifecycle.stage === "AT_RISK" ? "bg-red-50 text-red-700" :
              "bg-neutral-100 text-neutral-600"
            }`}>
              <MapPin className="w-3.5 h-3.5" />
              {lifecycle.stage === "ACTIVE" ? "Active" :
               lifecycle.stage === "AT_RISK" ? "At Risk" :
               lifecycle.stage === "DORMANT" ? "Dormant" :
               lifecycle.stage.charAt(0) + lifecycle.stage.slice(1).toLowerCase()}
            </span>
            <span className="text-body-small text-neutral-500">
              {lifecycle.milestones.length} milestone{lifecycle.milestones.length !== 1 ? "s" : ""} completed
            </span>
          </div>
          {lifecycle.milestones.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {lifecycle.milestones.slice(-5).map((m) => (
                <span key={m.milestone} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 text-body-small">
                  <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                  {m.milestone.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {stats && stats.studentsWithoutParents > 0 && (
        <div onClick={() => router.push("/admin/students")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/admin/students"); }} role="button" tabIndex={0} aria-label={`${stats.studentsWithoutParents} students without linked parents. Click to manage.`} className="flex items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 shadow-sm cursor-pointer hover:bg-amber-100/60 transition">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-body-medium">You have <strong>{stats.studentsWithoutParents} students</strong> in your registry without any linked parents. No parent will receive invoice alerts or payment notifications.</span>
          </div>
          <button className="text-body-small text-amber-700 hover:underline font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer">Link Wards <ArrowRight className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-neutral-400" />
              <h3 className="text-title-small text-neutral-900 font-bold">Recent System Logs</h3>
            </div>
            <button onClick={() => router.push("/admin/audit")} className="text-body-small text-primary hover:underline font-bold cursor-pointer">Full Log History</button>
          </div>

          <div className="space-y-4">
            {dashQuery.isFetching && !data?.recentActivity ? (
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
                    <span className="text-body-small text-neutral-400 block mt-0.5">{new Date(log.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-neutral-400 text-center py-6">No administrative logs recorded yet.</p>
            )}
          </div>
        </div>

        <div id="quick-billing-actions" className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <h3 className="text-title-small text-neutral-900 font-bold">Billing Actions</h3>
            </div>

            <div className="space-y-3.5 text-body-medium">
              <div onClick={() => router.push("/admin/invoices")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/admin/invoices"); }} role="button" tabIndex={0} aria-label="Open billing wizard to generate term invoices" className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:bg-neutral-100/50 cursor-pointer">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-bold text-neutral-800">Billing Wizard</div>
                  <div className="text-body-small text-neutral-400">Generate term invoices</div>
                </div>
              </div>

              <div onClick={() => router.push("/admin/payments")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/admin/payments"); }} role="button" tabIndex={0} aria-label="Record a manual payment collection" className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:bg-neutral-100/50 cursor-pointer">
                <Coins className="w-5 h-5 text-green-500" />
                <div>
                  <div className="font-bold text-neutral-800">Record Collection</div>
                  <div className="text-body-small text-neutral-400">Log cash, transfer or cheque</div>
                </div>
              </div>

              <div onClick={() => router.push("/admin/students")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/admin/students"); }} role="button" tabIndex={0} aria-label="Open student registry to add or manage students" className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:bg-neutral-100/50 cursor-pointer">
                <UserPlus className="w-5 h-5 text-neutral-500" />
                <div>
                  <div className="font-bold text-neutral-800">Student Registry</div>
                  <div className="text-body-small text-neutral-400">Add parents and wards</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 p-4 border border-neutral-200 rounded-xl space-y-2 mt-4">
            <div className="text-label-small text-neutral-400 uppercase tracking-wider">Active Term Tracker</div>
            {activeTerm ? (
              <p className="text-body-small text-neutral-700 leading-snug font-bold">Dashboard KPIs are scoped to <span className="text-primary">{activeTerm.sessionName} &mdash; {activeTerm.name}</span>. Switch the active term in Academic Settings to view data for a different period.</p>
            ) : (
              <p className="text-body-small text-amber-700 leading-snug font-bold">No active term set. KPIs show all-time data. Set an active term in Academic Settings to scope invoices and payments.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
