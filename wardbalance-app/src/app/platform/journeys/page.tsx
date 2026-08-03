"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  GitBranch,
  Plus,
  Loader2,
  Play,
  Pause,
  Mail,
  MessageSquare,
  Users,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

interface JourneyStep {
  id: string;
  stepOrder: number;
  delayDays: number;
  channel: "EMAIL" | "SMS";
  subject?: string;
  smsBody?: string;
}

interface Journey {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  isActive: boolean;
  steps: JourneyStep[];
  activeEnrollmentsCount: number;
  totalEnrollmentsCount: number;
  createdAt: string;
}

export default function PlatformJourneys() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadJourneys() {
    try {
      const res = await fetch("/api/platform/journeys");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load journeys");
      setJourneys(data.journeys);
    } catch (err: any) {
      toast.error(err.message || "Failed to load journeys");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJourneys();
  }, []);

  const handleToggleActive = async (id: string) => {
    try {
      const res = await fetch(`/api/platform/journeys/${id}/toggle`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle journey");

      toast.success(data.message);
      setJourneys((prev) =>
        prev.map((j) => (j.id === id ? { ...j, isActive: data.isActive } : j))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update journey status");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        <p className="text-body-medium text-neutral-500 font-medium">Loading automation journeys...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-medium text-neutral-900 font-bold tracking-tight">
            Journeys Automation Engine
          </h1>
          <p className="text-body-medium text-neutral-500 mt-1">
            Build event-driven multi-step drip sequences across Email and Termii SMS channels.
          </p>
        </div>

        <Link
          href="/platform/journeys/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-body-medium rounded-lg transition shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Build New Journey</span>
        </Link>
      </div>

      {/* Journeys List Table */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-label-small text-neutral-500 uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Journey Details</th>
                <th className="px-6 py-4">Trigger Rule</th>
                <th className="px-6 py-4">Sequence Steps</th>
                <th className="px-6 py-4">Active Enrollments</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-body-medium text-neutral-700">
              {journeys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400 font-medium">
                    <GitBranch className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                    <p className="text-neutral-600 font-bold text-title-medium mb-1">No automation journeys created yet</p>
                    <p className="text-neutral-500 text-body-small mb-4">Set up event-driven drip sequences for inactive schools or expiring trials.</p>
                    <Link
                      href="/platform/journeys/new"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 font-bold text-label-small rounded-lg border border-primary-100"
                    >
                      <span>Create Journey</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ) : (
                journeys.map((j) => {
                  const emailSteps = j.steps.filter((s) => s.channel === "EMAIL").length;
                  const smsSteps = j.steps.filter((s) => s.channel === "SMS").length;

                  return (
                    <tr key={j.id} className="hover:bg-neutral-50/50 transition">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-bold text-neutral-900 flex items-center gap-2">
                            <span>{j.name}</span>
                          </div>
                          {j.description && (
                            <p className="text-body-small text-neutral-500 line-clamp-1 mt-0.5">
                              {j.description}
                            </p>
                          )}
                          <span className="text-[10px] text-neutral-400 block mt-1">
                            Created: {new Date(j.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-label-small font-bold bg-neutral-100 text-neutral-800 px-2.5 py-1 rounded-md border border-neutral-200">
                          {j.trigger}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {emailSteps > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                              <Mail className="w-3 h-3" />
                              {emailSteps} Email
                            </span>
                          )}
                          {smsSteps > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                              <MessageSquare className="w-3 h-3" />
                              {smsSteps} SMS
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-neutral-400" />
                          <span className="font-bold text-neutral-900 tabular-nums">
                            {j.activeEnrollmentsCount}
                          </span>
                          <span className="text-body-small text-neutral-400">
                            ({j.totalEnrollmentsCount} total)
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-label-small font-bold px-2.5 py-1 rounded-full ${
                            j.isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${j.isActive ? "bg-emerald-600 animate-pulse" : "bg-neutral-400"}`}></span>
                          {j.isActive ? "Active" : "Paused"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/platform/journeys/${j.id}/enrollments`}
                            className="text-label-small font-bold text-neutral-600 hover:text-neutral-900 border border-neutral-200 px-2.5 py-1.5 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition"
                          >
                            Tracker
                          </Link>

                          <button
                            onClick={() => handleToggleActive(j.id)}
                            className={`p-1.5 rounded-lg border transition ${
                              j.isActive
                                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            }`}
                            title={j.isActive ? "Pause Journey" : "Activate Journey"}
                          >
                            {j.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
