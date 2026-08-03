"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  School,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Mail,
  Loader2,
  DollarSign,
  ShieldCheck,
  Heart,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  GitBranch
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

interface PlatformKpis {
  newLeads: number;
  demoRequests: number;
  registeredSchools: number;
  onboardingSchools: number;
  activeSchools: number;
  trialSchools: number;
  payingSchools: number;
  mrr: number;
  schoolsAtRisk: number;
  trialExpiringThisWeek: number;
}

interface HealthDistribution {
  healthy: number;
  needsAttention: number;
  atRisk: number;
  inactive: number;
}

interface GrowthTrendPoint {
  date: string;
  newLeads: number;
  newConversions: number;
}

interface ActionableInsight {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  businessImpact: string;
  suggestedAction: string;
  suggestedCampaign: {
    templateCategory: string;
    segment: string;
  };
  affectedCount: number;
}

export default function PlatformDashboard() {
  const [kpis, setKpis] = useState<PlatformKpis | null>(null);
  const [healthDistribution, setHealthDistribution] = useState<HealthDistribution | null>(null);
  const [growthTrends, setGrowthTrends] = useState<GrowthTrendPoint[]>([]);
  const [insights, setInsights] = useState<ActionableInsight[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [overviewRes, recRes] = await Promise.all([
          fetch("/api/platform/overview"),
          fetch("/api/platform/recommendations"),
        ]);

        const data = await overviewRes.json();
        const recData = await recRes.json();

        if (!overviewRes.ok) throw new Error(data.error || "Failed to load dashboard metrics");

        setKpis(data.kpis);
        setHealthDistribution(data.healthDistribution);
        setGrowthTrends(data.growthTrends);
        setInsights(data.insights);
        if (recRes.ok && recData.recommendations) {
          setRecommendations(recData.recommendations);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load metrics");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const formatNaira = (amount: number): string => {
    return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        <p className="text-body-medium text-neutral-500 font-medium">Loading platform metrics...</p>
      </div>
    );
  }

  // Funnel rates calculation
  const totalLeads = (kpis?.demoRequests || 0) + (kpis?.newLeads || 0);
  const registered = kpis?.registeredSchools || 0;
  const onboarding = kpis?.onboardingSchools || 0;
  const active = kpis?.activeSchools || 0;
  const paying = kpis?.payingSchools || 0;

  const leadToRegisteredPct = totalLeads > 0 ? Math.round((registered / totalLeads) * 100) : 0;
  const registeredToActivePct = registered > 0 ? Math.round((active / registered) * 100) : 0;
  const activeToPayingPct = active > 0 ? Math.round((paying / active) * 100) : 0;
  const totalConversionRate = totalLeads > 0 ? ((paying / totalLeads) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-medium text-neutral-900 font-bold tracking-tight">
            Founder Command Centre
          </h1>
          <p className="text-body-medium text-neutral-500 mt-1">
            Real-time acquisition, activation, MRR, and lifecycle indicators.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-label-small font-bold border border-emerald-100 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Operator Session Active
        </div>
      </div>

      {/* KPI Cards Grid */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* MRR Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-label-medium text-neutral-500 uppercase tracking-wider font-bold">
                MRR (Est.)
              </span>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[28px] font-bold text-neutral-900 tabular-nums leading-none">
                {formatNaira(kpis.mrr)}
              </p>
              <div className="flex items-center gap-1.5 mt-2.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-body-small text-emerald-600 font-bold">+12% MRR growth</span>
              </div>
            </div>
          </div>

          {/* Active/Paying Schools Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-label-medium text-neutral-500 uppercase tracking-wider font-bold">
                Paying / Active Schools
              </span>
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <School className="w-5 h-5 text-primary-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[28px] font-bold text-neutral-900 tabular-nums leading-none">
                {kpis.payingSchools} <span className="text-body-medium text-neutral-400 font-normal">/ {kpis.activeSchools}</span>
              </p>
              <div className="flex items-center gap-1.5 mt-2.5">
                <span className="text-body-small text-neutral-500 font-medium">
                  {kpis.trialSchools} schools in trial
                </span>
              </div>
            </div>
          </div>

          {/* Leads Funnel Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-label-medium text-neutral-500 uppercase tracking-wider font-bold">
                Leads / Demo Requests
              </span>
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-neutral-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[28px] font-bold text-neutral-900 tabular-nums leading-none">
                {kpis.newLeads} <span className="text-body-medium text-neutral-400 font-normal">/ {kpis.demoRequests}</span>
              </p>
              <div className="flex items-center gap-1.5 mt-2.5">
                <span className="text-body-small text-neutral-500 font-medium">
                  Active CRM prospects
                </span>
              </div>
            </div>
          </div>

          {/* Risks / At-Risk Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-label-medium text-neutral-500 uppercase tracking-wider font-bold">
                Schools At Risk
              </span>
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[28px] font-bold text-red-600 tabular-nums leading-none">
                {kpis.schoolsAtRisk}
              </p>
              <div className="flex items-center gap-1.5 mt-2.5">
                <span className="text-body-small text-red-600 font-bold">
                  {kpis.trialExpiringThisWeek} trials expire this week
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smart Recommendations Section */}
      {recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-neutral-900 via-primary-950 to-neutral-900 rounded-xl p-6 text-white shadow-md space-y-4 border border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-400" />
              <h3 className="text-title-medium font-bold">Smart Growth Recommendations</h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-500/20 text-primary-300 border border-primary-500/30 px-2.5 py-1 rounded-full">
              Automated Advisor
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.slice(0, 3).map((rec: any) => (
              <div key={rec.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${rec.priority === "critical" ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"}`}>
                      {rec.priority}
                    </span>
                    <span className="text-body-small text-neutral-300">Reach: ~{rec.estimatedReach}</span>
                  </div>
                  <h4 className="text-body-medium font-bold text-white mb-1">{rec.title}</h4>
                  <p className="text-body-small text-neutral-300 leading-snug">{rec.rationale}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10">
                  {rec.recommendedAction === "launch_journey" ? (
                    <Link
                      href={`/platform/journeys/new?trigger=${rec.journeyTrigger}`}
                      className="inline-flex items-center gap-1.5 text-label-small font-bold text-primary-300 hover:text-white transition"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>Launch Automated Journey →</span>
                    </Link>
                  ) : (
                    <Link
                      href={`/platform/campaigns?templateCategory=${rec.campaignTemplateCategory}&segment=${rec.campaignSegment}`}
                      className="inline-flex items-center gap-1.5 text-label-small font-bold text-primary-300 hover:text-white transition"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Compose Targeted Drip →</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Health & Funnel Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Conversion Funnel & 30-Day Leads Trend Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Custom CSS Conversion Funnel */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-title-medium text-neutral-900 font-bold">Acquisition Funnel</h3>
              <span className="text-label-small font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                {totalConversionRate}% Total Conversion Rate
              </span>
            </div>

            <div className="space-y-4">
              {/* Stage: Leads */}
              <div>
                <div className="flex justify-between text-body-small text-neutral-600 mb-1">
                  <span>Prospect Inbound Leads</span>
                  <span className="font-bold tabular-nums">{totalLeads}</span>
                </div>
                <div className="w-full bg-neutral-100 h-4 rounded-full overflow-hidden">
                  <div className="bg-neutral-400 h-full rounded-full" style={{ width: "100%" }}></div>
                </div>
              </div>

              {/* Stage: Registered */}
              <div>
                <div className="flex justify-between text-body-small text-neutral-600 mb-1">
                  <span>Registered Schools (Attribution: {leadToRegisteredPct}%)</span>
                  <span className="font-bold tabular-nums">{registered}</span>
                </div>
                <div className="w-full bg-neutral-100 h-4 rounded-full overflow-hidden">
                  <div className="bg-primary-300 h-full rounded-full transition-all" style={{ width: `${leadToRegisteredPct}%` }}></div>
                </div>
              </div>

              {/* Stage: Onboarding */}
              <div>
                <div className="flex justify-between text-body-small text-neutral-600 mb-1">
                  <span>Onboarding Checklist Active</span>
                  <span className="font-bold tabular-nums">{onboarding}</span>
                </div>
                <div className="w-full bg-neutral-100 h-4 rounded-full overflow-hidden">
                  <div className="bg-primary-400 h-full rounded-full transition-all" style={{ width: `${totalLeads > 0 ? Math.round((onboarding / totalLeads) * 100) : 0}%` }}></div>
                </div>
              </div>

              {/* Stage: Active */}
              <div>
                <div className="flex justify-between text-body-small text-neutral-600 mb-1">
                  <span>Active Schools (Setup Complete: {registeredToActivePct}%)</span>
                  <span className="font-bold tabular-nums">{active}</span>
                </div>
                <div className="w-full bg-neutral-100 h-4 rounded-full overflow-hidden">
                  <div className="bg-primary-500 h-full rounded-full transition-all" style={{ width: `${totalLeads > 0 ? Math.round((active / totalLeads) * 100) : 0}%` }}></div>
                </div>
              </div>

              {/* Stage: Paying */}
              <div>
                <div className="flex justify-between text-body-small text-neutral-600 mb-1">
                  <span>Paying Customers (LTV Conversion: {activeToPayingPct}%)</span>
                  <span className="font-bold tabular-nums">{paying}</span>
                </div>
                <div className="w-full bg-neutral-100 h-4 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${totalLeads > 0 ? Math.round((paying / totalLeads) * 100) : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* 30-Day Growth Trend Chart (Single Dashboard Chart) */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-title-medium text-neutral-900 font-bold">Chronological Growth Trends</h3>
              <p className="text-body-small text-neutral-500 mt-0.5">Chronological lead generation & conversions over the last 30 days.</p>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#155EEF" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#155EEF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="conversionsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: "11px", fill: "#6B7280" }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: "11px", fill: "#6B7280" }} />
                  <Tooltip
                    contentStyle={{ background: "#ffffff", border: "1px solid #E5E7EB", borderRadius: "8px" }}
                    labelStyle={{ fontWeight: "bold", color: "#111827", fontSize: "12px" }}
                  />
                  <Area
                    type="monotone"
                    name="New Leads"
                    dataKey="newLeads"
                    stroke="#155EEF"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#leadsGradient)"
                  />
                  <Area
                    type="monotone"
                    name="Conversions"
                    dataKey="newConversions"
                    stroke="#16A34A"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#conversionsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Customer Health Indicators Summary */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-title-medium text-neutral-900 font-bold">Customer Health</h3>
            <p className="text-body-small text-neutral-500 mt-0.5">Real-time health breakdown derived from weighted indicators.</p>
          </div>

          {healthDistribution && (
            <div className="space-y-4">
              {/* Healthy */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                <div className="flex items-center gap-2.5">
                  <Heart className="w-5 h-5 text-emerald-500 fill-emerald-500" />
                  <div>
                    <span className="text-body-medium font-bold text-emerald-900 block">Healthy Tier</span>
                    <span className="text-[11px] text-emerald-600">Active engagement & paying</span>
                  </div>
                </div>
                <span className="text-title-large font-bold text-emerald-700 tabular-nums">{healthDistribution.healthy}</span>
              </div>

              {/* Needs Attention */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50 border border-amber-100">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <div>
                    <span className="text-body-medium font-bold text-amber-900 block">Needs Attention</span>
                    <span className="text-[11px] text-amber-600">Trial expiring / setup stuck</span>
                  </div>
                </div>
                <span className="text-title-large font-bold text-amber-700 tabular-nums">{healthDistribution.needsAttention}</span>
              </div>

              {/* At Risk */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50/50 border border-red-100">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-red-500 fill-red-500" />
                  <div>
                    <span className="text-body-medium font-bold text-red-900 block">At Risk</span>
                    <span className="text-[11px] text-red-600">Overdue bills / login dry</span>
                  </div>
                </div>
                <span className="text-title-large font-bold text-red-700 tabular-nums">{healthDistribution.atRisk}</span>
              </div>

              {/* Inactive */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                <div className="flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-neutral-500" />
                  <div>
                    <span className="text-body-medium font-bold text-neutral-900 block">Inactive / Dormant</span>
                    <span className="text-[11px] text-neutral-500">No login in last 14 days</span>
                  </div>
                </div>
                <span className="text-title-large font-bold text-neutral-700 tabular-nums">{healthDistribution.inactive}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prioritised Actionable Founder Insights with Dashboard Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-title-large text-neutral-950 font-bold tracking-tight">
          Prioritised Action Items & Quick Actions
        </h3>
        
        {insights.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center max-w-2xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-title-medium text-neutral-900 font-bold mb-1">All pipelines operational!</h4>
            <p className="text-body-medium text-neutral-500">
              No critical re-engagement alerts or setup roadblocks detected.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights.map((insight) => {
              const borderStyles = {
                critical: "border-l-4 border-l-red-500",
                high: "border-l-4 border-l-amber-500",
                medium: "border-l-4 border-l-primary-500",
                low: "border-l-4 border-l-neutral-400"
              };

              const badgeStyles = {
                critical: "bg-red-50 text-red-800 border-red-100",
                high: "bg-amber-50 text-amber-800 border-amber-100",
                medium: "bg-blue-50 text-blue-800 border-blue-100",
                low: "bg-neutral-50 text-neutral-800 border-neutral-200"
              };

              return (
                <div
                  key={insight.id}
                  className={`bg-white rounded-xl border border-neutral-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition relative overflow-hidden ${borderStyles[insight.priority]}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeStyles[insight.priority]}`}>
                        {insight.priority} Priority
                      </span>
                      {insight.priority === "critical" && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                      )}
                    </div>
                    
                    <h4 className="text-title-medium text-neutral-900 font-bold mb-1.5">
                      {insight.title}
                    </h4>
                    <p className="text-body-medium text-neutral-600 mb-3">
                      {insight.description}
                    </p>
                    
                    {/* Business Impact block */}
                    <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100 mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                        Business Impact
                      </span>
                      <p className="text-body-small text-neutral-800 italic">
                        "{insight.businessImpact}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-neutral-100 pt-4 mt-2">
                    <span className="text-body-small text-neutral-500 font-medium">
                      Target segment: <strong className="text-neutral-800 tabular-nums">{insight.affectedCount}</strong> contacts
                    </span>
                    
                    <Link
                      href={`/platform/campaigns?templateCategory=${insight.suggestedCampaign.templateCategory}&segment=${insight.suggestedCampaign.segment}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-label-small font-bold text-primary-700 rounded-lg border border-primary-100 transition shrink-0"
                    >
                      <span>Quick Action</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-neutral-200 pt-8">
        <Link
          href="/platform/leads"
          className="bg-white rounded-xl border border-neutral-200 p-6 flex items-center justify-between shadow-sm hover:border-neutral-300 transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-neutral-600" />
            </div>
            <div>
              <h4 className="text-title-medium text-neutral-900 font-bold">Manage leads database</h4>
              <p className="text-body-small text-neutral-500 mt-0.5">
                Review and follow up with landing page signups.
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-neutral-400" />
        </Link>

        <Link
          href="/platform/campaigns"
          className="bg-white rounded-xl border border-neutral-200 p-6 flex items-center justify-between shadow-sm hover:border-neutral-300 transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-neutral-600" />
            </div>
            <div>
              <h4 className="text-title-medium text-neutral-900 font-bold">Dispatch campaigns</h4>
              <p className="text-body-small text-neutral-500 mt-0.5">
                Compose broadcasts or test email templates.
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-neutral-400" />
        </Link>
      </div>
    </div>
  );
}
