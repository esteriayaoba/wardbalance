"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Minus, CheckCircle, Ticket } from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface Activity {
  id: string;
  name: string;
  amount: number;
  billingFrequency: string;
  isEnrolled: boolean;
  enrolmentId: string | null;
}

export default function StudentActivities({ studentId }: { studentId: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sessions, setSessions] = useState<{ id: string; name: string }[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadSessions = async () => {
    try {
      const res = await fetch("/api/admin/academic/terms");
      const data = await res.json();
      
      const sessionMap = new Map();
      (data.data || []).forEach((term: any) => {
        if (!sessionMap.has(term.sessionId)) {
          sessionMap.set(term.sessionId, { id: term.sessionId, name: term.session.name, isActive: term.session.isActive });
        }
      });
      const uniqueSessions = Array.from(sessionMap.values());
      setSessions(uniqueSessions);
      
      const active = uniqueSessions.find((s: any) => s.isActive);
      if (active) setSelectedSessionId(active.id);
      else if (uniqueSessions.length > 0) setSelectedSessionId(uniqueSessions[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const loadActivities = async () => {
    if (!selectedSessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/activities?sessionId=${selectedSessionId}`);
      const data = await res.json();
      setActivities(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    loadActivities();
  }, [selectedSessionId]);

  const toggleEnrolment = async (feeItemId: string, isCurrentlyEnrolled: boolean) => {
    if (!isCurrentlyEnrolled) {
      // Enrolling
      setActionLoading(feeItemId);
      try {
        await fetch(`/api/admin/students/${studentId}/activities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feeItemId, sessionId: selectedSessionId, action: "enrol" })
        });
        await loadActivities();
      } catch (e) {
        console.error(e);
      } finally {
        setActionLoading(null);
      }
    } else {
      // Removing
      if (!confirm("Remove this activity? If an invoice was already generated for this term, removing this will not alter that historic invoice. Proceed?")) return;
      setActionLoading(feeItemId);
      try {
        await fetch(`/api/admin/students/${studentId}/activities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feeItemId, sessionId: selectedSessionId, action: "remove" })
        });
        await loadActivities();
      } catch (e) {
        console.error(e);
      } finally {
        setActionLoading(null);
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
        <div>
          <h2 className="text-title-small text-neutral-900 font-bold">Activities & Optional Fees</h2>
          <p className="text-body-small text-neutral-500">Enrol student in optional programs</p>
        </div>
        <select 
          className="border border-neutral-300 rounded-lg text-body-small px-3 py-1.5 focus:ring-primary focus:outline-none"
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
        >
          {sessions.map(s => (
            <option key={s.id} value={s.id}>{s.name} Session</option>
          ))}
        </select>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="py-8 flex justify-center text-neutral-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-neutral-50 text-neutral-500 text-body-small">
            <Ticket className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold mb-1">No Optional Fees</p>
              <p>There are no optional fee items configured in the Fee Library.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activities.map((activity) => (
              <div key={activity.id} className={`border rounded-xl p-4 flex flex-col justify-between ${activity.isEnrolled ? "border-primary-200 bg-primary-50/30" : "border-neutral-200 bg-white"}`}>
                <div className="mb-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-label-large text-neutral-900">{activity.name}</h3>
                    {activity.isEnrolled && (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Enrolled
                      </span>
                    )}
                  </div>
                  <p className="text-body-medium font-bold tabular-nums text-neutral-700">{formatNaira(activity.amount)}</p>
                  <p className="text-body-small text-neutral-500 mt-1 capitalize">{activity.billingFrequency.replace("_", " ")}</p>
                </div>
                
                <button
                  disabled={actionLoading === activity.id}
                  onClick={() => toggleEnrolment(activity.id, activity.isEnrolled)}
                  className={`w-full py-2 rounded-lg text-label-small font-bold transition flex justify-center items-center gap-2 ${
                    activity.isEnrolled 
                    ? "bg-white border border-error text-error hover:bg-error-50" 
                    : "bg-neutral-100 border border-transparent text-neutral-700 hover:bg-neutral-200"
                  }`}
                >
                  {actionLoading === activity.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : activity.isEnrolled ? (
                    <><Minus className="w-4 h-4" /> Remove Enrolment</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Enrol Student</>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
