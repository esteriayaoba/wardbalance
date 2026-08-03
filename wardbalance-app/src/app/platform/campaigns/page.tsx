"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  Send,
  Play,
  Sparkles,
  Loader2,
  RefreshCw,
  BarChart2,
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingUp,
  TrendingDown,
  UserCheck,
  Building
} from "lucide-react";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  previewText: string | null;
  goal: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  audienceFilter: any;
  createdAt: string;
  completedAt: string | null;
  scheduledAt: string | null;
}

interface Template {
  id: string;
  name: string;
  category: string;
  subject: string;
  previewText: string;
  htmlBody: string;
}

interface Estimation {
  segment: string;
  eligibleCount: number;
  suppressedCount: number;
  unsubscribedCount: number;
  invalidEmailCount: number;
  finalRecipientCount: number;
  sampleRecipients: Array<{ email: string; firstName: string; schoolName: string }>;
}

interface CampaignHealthMetrics {
  campaignId: string;
  goal: string;
  recipientCount: number;
  sentCount: number;
  deliveryRate: number;
  bounceRate: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
  complaintRate: number;
  demoBookings: number;
  registrations: number;
  onboardingCompletions: number;
  trialActivations: number;
  paidSubscriptions: number;
  renewals: number;
  attributedRevenue: number;
  primaryGoalCount: number;
  primaryGoalEvent: string;
}

interface CampaignAnalyticsComparison {
  current: CampaignHealthMetrics;
  previous: CampaignHealthMetrics | null;
  deltas: {
    deliveryRate: number | null;
    openRate: number | null;
    clickRate: number | null;
    bounceRate: number | null;
    unsubscribeRate: number | null;
    primaryGoalCount: number | null;
    attributedRevenue: number | null;
  };
}

export default function PlatformCampaigns() {
  const searchParams = useSearchParams();
  const templateCategoryParam = searchParams.get("templateCategory") || "";
  const segmentParam = searchParams.get("segment") || "ALL_LEADS";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [goal, setGoal] = useState("INCREASE_DEMO_BOOKINGS");
  const [segment, setSegment] = useState(segmentParam);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [textBody, setTextBody] = useState("");

  // Scheduling State
  const [dispatchType, setDispatchType] = useState<"immediate" | "scheduled">("immediate");
  const [scheduleTime, setScheduleTime] = useState("");

  // Preview & Action States
  const [estimation, setEstimation] = useState<Estimation | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Expandable campaign analytics state
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [campaignAnalytics, setCampaignAnalytics] = useState<CampaignAnalyticsComparison | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Load Campaigns History
  async function loadCampaigns() {
    try {
      const res = await fetch("/api/platform/campaigns");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load campaigns");
      setCampaigns(data.campaigns);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch campaigns history");
    } finally {
      setHistoryLoading(false);
    }
  }

  // Load Templates
  async function loadTemplates() {
    try {
      const res = await fetch("/api/platform/templates");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load templates");
      setTemplates(data.templates);
    } catch (err: any) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadCampaigns();
    loadTemplates();

    // Default schedule input to tomorrow at 9:00 AM WAT (GMT+1)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    // Convert to timezone-local ISO string format (YYYY-MM-DDTHH:mm)
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const day = String(tomorrow.getDate()).padStart(2, "0");
    const hours = String(tomorrow.getHours()).padStart(2, "0");
    const minutes = String(tomorrow.getMinutes()).padStart(2, "0");
    setScheduleTime(`${year}-${month}-${day}T${hours}:${minutes}`);
  }, []);

  // Pre-populate template if matches URL category
  useEffect(() => {
    if (templateCategoryParam && templates.length > 0) {
      const matched = templates.find((t) => t.category === templateCategoryParam);
      if (matched) {
        setSelectedTemplateId(matched.id);
        setSubject(matched.subject);
        setPreviewText(matched.previewText);
        setHtmlBody(matched.htmlBody);
      }
    }
  }, [templateCategoryParam, templates]);

  // Handle Template change
  const handleTemplateSelect = (id: string) => {
    setSelectedTemplateId(id);
    const matched = templates.find((t) => t.id === id);
    if (matched) {
      setSubject(matched.subject);
      setPreviewText(matched.previewText);
      setHtmlBody(matched.htmlBody.trim());
    } else {
      setSelectedTemplateId("");
      setSubject("");
      setPreviewText("");
      setHtmlBody("");
    }
  };

  // Run Audience Estimation Preview
  const runEstimation = async () => {
    if (!segment) return;
    setEstimating(true);
    try {
      const res = await fetch(`/api/platform/campaigns/preview?segment=${segment}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resolve estimation");
      setEstimation(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to calculate audience preview");
    } finally {
      setEstimating(false);
    }
  };

  useEffect(() => {
    runEstimation();
  }, [segment]);

  // Trigger Mock Send Test
  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address");
      return;
    }
    if (!subject || !htmlBody) {
      toast.error("Please fill subject and htmlBody before sending a test");
      return;
    }

    setTesting(true);
    try {
      const createRes = await fetch("/api/platform/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Test Draft ${Date.now()}`,
          subject,
          previewText,
          goal,
          htmlBody,
          textBody,
          segment,
          templateId: selectedTemplateId || undefined,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to create test draft");

      const testRes = await fetch(`/api/platform/campaigns/${createData.campaign.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail }),
      });

      const testData = await testRes.json();
      if (!testRes.ok) throw new Error(testData.error || "Failed to send test email");

      toast.success(testData.message || "Test email dispatched!");

      // Delete draft immediately
      await fetch(`/api/platform/campaigns/${createData.campaign.id}`, { method: "DELETE" });
    } catch (err: any) {
      toast.error(err.message || "Test send failed");
    } finally {
      setTesting(false);
    }
  };

  // Trigger Send Campaign Now / Schedule
  const handleDispatch = async () => {
    if (!name) return toast.error("Please name your campaign");
    if (!subject) return toast.error("Subject is required");
    if (!htmlBody) return toast.error("Email content is required");

    let scheduledAt: string | undefined = undefined;
    if (dispatchType === "scheduled") {
      if (!scheduleTime) return toast.error("Please select a valid schedule date and time");
      scheduledAt = new Date(scheduleTime).toISOString();
    }

    startTransition(async () => {
      try {
        // 1. Create Draft
        const createRes = await fetch("/api/platform/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            subject,
            previewText,
            goal,
            htmlBody,
            textBody,
            segment,
            templateId: selectedTemplateId || undefined,
          }),
        });

        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(createData.error || "Failed to create campaign draft");

        // 2. Queue dispatch (immediate or scheduled)
        const sendRes = await fetch(`/api/platform/campaigns/${createData.campaign.id}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledAt }),
        });

        const sendData = await sendRes.json();
        if (!sendRes.ok) throw new Error(sendData.error || "Failed to dispatch campaign");

        if (dispatchType === "scheduled") {
          toast.success("Campaign scheduled successfully! 📅");
        } else {
          toast.success("Campaign sent and processing in the background! 🚀");
        }
        
        // Reset form
        setName("");
        setSubject("");
        setPreviewText("");
        setHtmlBody("");
        loadCampaigns();
      } catch (err: any) {
        toast.error(err.message || "Failed to dispatch campaign");
      }
    });
  };

  // Fetch campaign detailed metrics
  const toggleCampaignExpand = async (campaignId: string) => {
    if (expandedCampaignId === campaignId) {
      setExpandedCampaignId(null);
      setCampaignAnalytics(null);
      return;
    }

    setExpandedCampaignId(campaignId);
    setAnalyticsLoading(true);
    setCampaignAnalytics(null);

    try {
      const res = await fetch(`/api/platform/campaigns/${campaignId}/analytics`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load campaign statistics");
      setCampaignAnalytics(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const renderDelta = (val: number | null, suffix: string = "%") => {
    if (val === null) return null;
    if (val > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded shrink-0">
          <TrendingUp className="w-3 h-3" />
          +{val}{suffix}
        </span>
      );
    }
    if (val < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-red-600 bg-red-50 px-1 py-0.2 rounded shrink-0">
          <TrendingDown className="w-3 h-3" />
          {val}{suffix}
        </span>
      );
    }
    return (
      <span className="text-[11px] text-neutral-400 font-medium ml-1">no change</span>
    );
  };

  // Group templates by category
  const groupedTemplates = templates.reduce<Record<string, Template[]>>((acc, t) => {
    acc[t.category] = acc[t.category] || [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-headline-medium text-neutral-900 font-bold tracking-tight">
          Campaigns Command Center
        </h1>
        <p className="text-body-medium text-neutral-500 mt-1">
          Compose targeted marketing drips, preview real audiences, and review business outcome attribution.
        </p>
      </div>

      {/* Main Grid: Composer on Left, Estimates Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Composer Form */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 shadow-sm p-6 space-y-6">
          <h3 className="text-title-medium text-neutral-900 font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-500" />
            Campaign Composer
          </h3>

          <div className="space-y-4">
            {/* Name & Goal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-body-small text-neutral-600 font-bold block mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Onboarding Welcome Series"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-body-medium focus:outline-primary-500"
                />
              </div>

              <div>
                <label className="text-body-small text-neutral-600 font-bold block mb-1">
                  Business Goal
                </label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-body-medium focus:outline-primary-500"
                >
                  <option value="INCREASE_DEMO_BOOKINGS">Increase Demo Bookings</option>
                  <option value="ACTIVATE_NEW_SCHOOLS">Activate Newly Registered</option>
                  <option value="COMPLETE_ONBOARDING">Complete Onboarding</option>
                  <option value="TRIAL_CONVERSION">Increase Trial Conversion</option>
                  <option value="SUBSCRIPTION_RENEWAL">Drive Subscription Renewals</option>
                  <option value="PRODUCT_ANNOUNCEMENT">Announce Product Updates</option>
                  <option value="NEWSLETTER">Newsletter / Education</option>
                </select>
              </div>
            </div>

            {/* Target Segment & Template select */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-body-small text-neutral-600 font-bold block mb-1">
                  Target Segment
                </label>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                  className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-body-medium focus:outline-primary-500"
                >
                  <option value="ALL_LEADS">All Leads (Organic/Inbound)</option>
                  <option value="NEW_LEADS">New Leads (Unaddressed)</option>
                  <option value="BOOKED_DEMO">Booked Demo (Contacted/Qualified)</option>
                  <option value="DEMO_NO_SHOW">Demo No-Show (Unqualified/Archived)</option>
                  <option value="REGISTERED_SCHOOLS">Registered Schools (Invited)</option>
                  <option value="ONBOARDING_SCHOOLS">Onboarding Schools (Incomplete)</option>
                  <option value="INACTIVE_SCHOOLS">Inactive Schools (No login 14d)</option>
                  <option value="TRIAL_EXPIRING">Trial Expiring (Next 3d)</option>
                  <option value="PAYING_CUSTOMERS">Paying Customers (Active Sub)</option>
                  <option value="NEVER_LOGGED_IN">Never Logged In</option>
                  <option value="NEVER_CREATED_CLASS">Never Created Class Arm</option>
                  <option value="NEVER_CREATED_INVOICE">Never Created Invoice</option>
                </select>
              </div>

              <div>
                <label className="text-body-small text-neutral-600 font-bold block mb-1">
                  Email Template Library (Categorised)
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-body-medium focus:outline-primary-500"
                >
                  <option value="">Start from Scratch</option>
                  {Object.keys(groupedTemplates).map((cat) => (
                    <optgroup key={cat} label={cat.toUpperCase().replace(/_/g, " ")}>
                      {groupedTemplates[cat].map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject & Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-body-small text-neutral-600 font-bold block mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  placeholder="Subject Line (e.g. Welcome {{firstName}})"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-body-medium focus:outline-primary-500"
                />
              </div>

              <div>
                <label className="text-body-small text-neutral-600 font-bold block mb-1">
                  Preview Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. We're excited to partner with {{schoolName}}"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-body-medium focus:outline-primary-500"
                />
              </div>
            </div>

            {/* HTML Body Area */}
            <div>
              <label className="text-body-small text-neutral-600 font-bold block mb-1">
                HTML Body Content (supports brackets variable replacement)
              </label>
              <textarea
                rows={10}
                placeholder="HTML content..."
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg font-mono text-body-small focus:outline-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Right: Estimates & Send Controls */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 space-y-6">
          <h3 className="text-title-medium text-neutral-900 font-bold flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-neutral-600" />
            Audience & Dispatch
          </h3>

          {/* Real Estimates Card */}
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <span className="text-body-small text-neutral-500 font-bold uppercase tracking-wider">
                Audience Preview
              </span>
              {estimating ? (
                <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
              ) : (
                <button
                  onClick={runEstimation}
                  className="text-neutral-400 hover:text-neutral-600 transition"
                  title="Recalculate count"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {estimation ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-body-medium text-neutral-600">Selected Segment:</span>
                  <span className="text-body-small font-bold text-neutral-800 bg-white px-2 py-0.5 rounded border border-neutral-200">
                    {estimation.segment}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-medium text-neutral-600">Eligible Recipients:</span>
                  <span className="text-body-medium font-bold text-neutral-800 tabular-nums">
                    {estimation.eligibleCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-medium text-red-600">Excluded (Suppressed):</span>
                  <span className="text-body-medium font-bold text-red-600 tabular-nums">
                    -{estimation.suppressedCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-medium text-neutral-500">Invalid Emails:</span>
                  <span className="text-body-medium font-bold text-neutral-800 tabular-nums">
                    {estimation.invalidEmailCount}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-200 pt-2.5">
                  <span className="text-body-medium text-neutral-900 font-bold">Estimated Send Count:</span>
                  <span className="text-headline-small font-bold text-primary-500 tabular-nums">
                    {estimation.finalRecipientCount}
                  </span>
                </div>

                {/* Sample Recipients list */}
                {estimation.sampleRecipients.length > 0 && (
                  <div className="border-t border-neutral-200 pt-3 mt-1.5 space-y-1.5">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Recipient Sample</span>
                    {estimation.sampleRecipients.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between text-body-small bg-white p-1.5 rounded border border-neutral-100">
                        <div className="truncate">
                          <span className="font-bold text-neutral-800 block truncate">{r.firstName}</span>
                          <span className="text-neutral-500 block truncate text-[10px]">{r.email}</span>
                        </div>
                        <span className="text-[10px] bg-neutral-50 text-neutral-600 border border-neutral-200 px-1.5 py-0.2 rounded truncate max-w-[80px]">
                          {r.schoolName || "lead"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-body-small text-neutral-400 italic">No segment resolution computed.</p>
            )}
          </div>

          {/* Dispatch Mode & datetime picker */}
          <div className="space-y-4 pt-4 border-t border-neutral-200">
            <label className="text-body-small text-neutral-600 font-bold block">
              Dispatch Schedule
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDispatchType("immediate")}
                className={`py-1.5 text-label-small font-bold border rounded-lg transition ${dispatchType === "immediate" ? "bg-primary-50 text-primary-700 border-primary-300" : "bg-white text-neutral-600 border-neutral-200"}`}
              >
                Send Now
              </button>
              <button
                type="button"
                onClick={() => setDispatchType("scheduled")}
                className={`py-1.5 text-label-small font-bold border rounded-lg transition ${dispatchType === "scheduled" ? "bg-primary-50 text-primary-700 border-primary-300" : "bg-white text-neutral-600 border-neutral-200"}`}
              >
                Schedule Drip
              </button>
            </div>

            {dispatchType === "scheduled" && (
              <div className="space-y-1.5 animate-fadeIn">
                <span className="text-[11px] text-neutral-400 block font-medium">Select future dispatch time (WAT)</span>
                <div className="flex gap-2">
                  <Calendar className="w-5 h-5 text-neutral-400 shrink-0 mt-2" />
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-body-medium focus:outline-primary-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Test Email block */}
          <div className="space-y-2.5 pt-4 border-t border-neutral-200">
            <label className="text-body-small text-neutral-600 font-bold block">
              Send Test Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="e.g. founder@wardbalance.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-neutral-200 rounded-lg text-body-medium focus:outline-primary-500"
              />
              <button
                disabled={testing}
                onClick={handleSendTest}
                className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-lg text-label-small transition shrink-0 inline-flex items-center gap-1.5"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Send Test
              </button>
            </div>
          </div>

          {/* Dispatch CTA */}
          <div className="pt-6 border-t border-neutral-200">
            <button
              disabled={isPending}
              onClick={handleDispatch}
              className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-lg text-body-medium transition flex items-center justify-center gap-2"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {dispatchType === "scheduled" ? "Schedule Campaign" : "Send Campaign Now"}
            </button>
          </div>
        </div>
      </div>

      {/* Campaign History Table */}
      <div className="space-y-4">
        <h3 className="text-title-large text-neutral-900 font-bold tracking-tight">
          Campaign Delivery History
        </h3>

        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-label-small text-neutral-500 uppercase tracking-wider font-bold">
                  <th className="px-6 py-4">Campaign details</th>
                  <th className="px-6 py-4">Goal</th>
                  <th className="px-6 py-4">Segment</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-body-medium text-neutral-700">
                {historyLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-400 font-medium">
                      <Loader2 className="w-6 h-6 text-primary-500 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-400 font-medium">
                      No campaigns have been sent yet.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => {
                    const isExpanded = expandedCampaignId === c.id;
                    return (
                      <React.Fragment key={c.id}>
                        <tr className="hover:bg-neutral-50/50 transition">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-bold text-neutral-900">{c.name}</div>
                              <div className="text-body-small text-neutral-500 truncate max-w-xs">
                                {c.subject}
                              </div>
                              <div className="flex gap-2 items-center text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1.5">
                                <span>Created: {new Date(c.createdAt).toLocaleDateString()}</span>
                                {c.scheduledAt && (
                                  <span className="text-amber-600 bg-amber-50 px-1 py-0.2 rounded border border-amber-100 flex items-center gap-0.5">
                                    <Calendar className="w-2.5 h-2.5" />
                                    Scheduled: {new Date(c.scheduledAt).toLocaleString("en-NG", { hour: "numeric", minute: "numeric" })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[11px] font-bold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded">
                              {c.goal.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-body-small text-neutral-600 font-medium">
                              {(c.audienceFilter as any)?.segment || "CUSTOM"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`text-label-small font-bold px-2 py-0.5 rounded-full ${
                                c.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : c.status === "PROCESSING"
                                  ? "bg-primary-100 text-primary-700"
                                  : c.status === "SCHEDULED"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-neutral-100 text-neutral-700"
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => toggleCampaignExpand(c.id)}
                              className="inline-flex items-center gap-1 text-label-small font-bold text-neutral-600 hover:text-neutral-900 border border-neutral-200 px-2.5 py-1.5 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition"
                            >
                              <span>Analytics</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Analytics Drawer block */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="bg-neutral-50/50 p-6 border-b border-neutral-200">
                              {analyticsLoading ? (
                                <div className="flex items-center gap-2 justify-center py-4">
                                  <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                                  <span className="text-body-small text-neutral-500 font-bold">Aggregating last-touch conversion deltas...</span>
                                </div>
                              ) : campaignAnalytics ? (
                                <div className="space-y-6 animate-fadeIn">
                                  {/* Delivery Health section */}
                                  <div>
                                    <h4 className="text-label-small font-bold text-neutral-400 uppercase tracking-wider mb-3">Email Delivery Health</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-sm flex flex-col justify-between">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Open Rate</span>
                                        <div className="flex items-end justify-between mt-1">
                                          <span className="text-title-medium font-bold text-neutral-900 tabular-nums">{campaignAnalytics.current.openRate}%</span>
                                          {renderDelta(campaignAnalytics.deltas.openRate)}
                                        </div>
                                      </div>
                                      <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-sm flex flex-col justify-between">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Click Rate</span>
                                        <div className="flex items-end justify-between mt-1">
                                          <span className="text-title-medium font-bold text-neutral-900 tabular-nums">{campaignAnalytics.current.clickRate}%</span>
                                          {renderDelta(campaignAnalytics.deltas.clickRate)}
                                        </div>
                                      </div>
                                      <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-sm flex flex-col justify-between">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Bounce Rate</span>
                                        <div className="flex items-end justify-between mt-1">
                                          <span className="text-title-medium font-bold text-neutral-900 tabular-nums">{campaignAnalytics.current.bounceRate}%</span>
                                          {renderDelta(campaignAnalytics.deltas.bounceRate)}
                                        </div>
                                      </div>
                                      <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-sm flex flex-col justify-between">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Unsubscribe Rate</span>
                                        <div className="flex items-end justify-between mt-1">
                                          <span className="text-title-medium font-bold text-neutral-900 tabular-nums">{campaignAnalytics.current.unsubscribeRate}%</span>
                                          {renderDelta(campaignAnalytics.deltas.unsubscribeRate)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Business Outcomes section */}
                                  <div>
                                    <h4 className="text-label-small font-bold text-neutral-400 uppercase tracking-wider mb-3">Business Outcomes & Attribution</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-sm flex flex-col justify-between">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Attributed Revenue</span>
                                        <div className="flex items-end justify-between mt-1">
                                          <span className="text-title-medium font-bold text-emerald-700 tabular-nums">₦{campaignAnalytics.current.attributedRevenue.toLocaleString("en-NG", { maximumFractionDigits: 0 })}</span>
                                          {renderDelta(campaignAnalytics.deltas.attributedRevenue, "")}
                                        </div>
                                      </div>
                                      <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-sm flex flex-col justify-between">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Goal Performance ({campaignAnalytics.current.primaryGoalEvent})</span>
                                        <div className="flex items-end justify-between mt-1">
                                          <span className="text-title-medium font-bold text-primary-700 tabular-nums">{campaignAnalytics.current.primaryGoalCount} conversion(s)</span>
                                          {renderDelta(campaignAnalytics.deltas.primaryGoalCount, "")}
                                        </div>
                                      </div>
                                      <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-sm flex flex-col justify-between">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Demo Bookings / Signup Funnel</span>
                                        <div className="flex items-end justify-between mt-1">
                                          <span className="text-body-medium font-bold text-neutral-800 tabular-nums flex items-center gap-1">
                                            <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
                                            {campaignAnalytics.current.demoBookings} booked
                                          </span>
                                        </div>
                                      </div>
                                      <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-sm flex flex-col justify-between">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Subscriptions / Renewals</span>
                                        <div className="flex items-end justify-between mt-1">
                                          <span className="text-body-medium font-bold text-neutral-800 tabular-nums flex items-center gap-1">
                                            <Building className="w-3.5 h-3.5 text-neutral-400" />
                                            {campaignAnalytics.current.paidSubscriptions} paid, {campaignAnalytics.current.renewals} renewed
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-body-small text-neutral-400 italic py-2 text-center">Failed to load analytics metrics.</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
