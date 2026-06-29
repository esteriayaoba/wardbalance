"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, UserPlus, AlertCircle, Copy, Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Lead {
  id: string;
  fullName: string;
  schoolName: string;
  role: string;
  email: string;
  numberOfStudents: string | null;
  status: string;
  createdAt: string;
}

export default function LeadsPortalPage() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [approvedLink, setApprovedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchLeads = () => {
    fetch("/api/admin/leads")
      .then(async (res) => {
        const body = await res.json();
        if (res.ok) {
          setLeads(body.data);
        } else {
          throw new Error(body.error ?? "Failed to load leads");
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleApprove = async (leadId: string) => {
    setProcessingId(leadId);
    setApprovedLink(null);
    setCopied(false);

    try {
      const res = await fetch("/api/admin/leads/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to approve lead");
      }

      setApprovedLink(window.location.origin + body.data.inviteLink);
      // Refresh list to show updated status
      fetchLeads();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopyLink = () => {
    if (!approvedLink) return;
    navigator.clipboard.writeText(approvedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-body-large text-neutral-600">Loading captured leads...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 py-12 px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 pb-6">
          <div className="space-y-1">
            <span className="text-title-large text-primary font-bold tracking-tight inline-flex items-center gap-2 mb-2">
              <Image
                src="/logo-v5.png"
                alt="WardBalance logo"
                width={36}
                height={36}
              />
              WardBalance
            </span>
            <h1 className="text-headline-small text-neutral-900 font-bold">
              Pilot Lead Approval Portal
            </h1>
            <p className="text-body-medium text-neutral-600">
              Manual pipeline review to convert public leads into onboarding school tenants.
            </p>
          </div>
          <Link
            href="/"
            className="text-body-medium text-primary hover:underline font-bold"
          >
            Go to Landing Page
          </Link>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-4 rounded-lg bg-error-container text-on-error-container text-body-small">
            <AlertCircle className="w-5 h-5 shrink-0 text-error" />
            <span>{error}</span>
          </div>
        )}

        {/* Invitation Link Result Drawer/Box */}
        {approvedLink && (
          <div className="p-6 bg-primary-light border border-primary/20 rounded-xl space-y-3 animate-fade-in">
            <h3 className="text-title-small text-neutral-900 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              School Tenant Created & Invited Successfully!
            </h3>
            <p className="text-body-medium text-neutral-600">
              Copy and open this link to set the administrator credentials and initialize the checklist.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={approvedLink}
                className="flex-1 px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-body-medium font-mono text-neutral-800 focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 bg-primary text-white rounded-lg font-bold text-label-large hover:bg-primary-dark transition inline-flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy Link"}
              </button>
              <a
                href={approvedLink}
                target="_blank"
                className="px-4 py-2.5 bg-neutral-900 text-white rounded-lg font-bold text-label-large hover:bg-neutral-800 transition text-center"
              >
                Open Setup
              </a>
            </div>
          </div>
        )}

        {/* Leads Grid/Table */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="text-title-small text-neutral-900 font-bold">Leads Registry ({leads.length})</h2>
          </div>

          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <UserPlus className="w-12 h-12 text-neutral-400 mb-2" />
              <p className="text-body-large text-neutral-900 font-medium">No leads captured yet</p>
              <p className="text-body-medium text-neutral-500">Submit the early access form on the homepage first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-label-medium text-neutral-500 border-b border-neutral-200">
                    <th className="px-6 py-3 font-semibold">School Name</th>
                    <th className="px-6 py-3 font-semibold">Owner / Contact</th>
                    <th className="px-6 py-3 font-semibold">Role</th>
                    <th className="px-6 py-3 font-semibold">Students</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="text-body-medium text-neutral-800 hover:bg-neutral-50/50 transition">
                      <td className="px-6 py-4 font-bold text-neutral-900">{lead.schoolName}</td>
                      <td className="px-6 py-4">
                        <div>{lead.fullName}</div>
                        <div className="text-body-small text-neutral-500">{lead.email}</div>
                      </td>
                      <td className="px-6 py-4 capitalize">{lead.role}</td>
                      <td className="px-6 py-4 text-center tabular-nums">
                        {lead.numberOfStudents ? lead.numberOfStudents.replace("_", "-") : "—"}
                      </td>
                      <td className="px-6 py-4">
                        {lead.status === "converted" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                            Converted
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                            New Lead
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {lead.status === "converted" ? (
                          <button
                            disabled
                            className="px-3 py-1.5 bg-neutral-100 text-neutral-400 border border-neutral-200 rounded-lg text-body-small font-bold cursor-not-allowed"
                          >
                            Approved
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApprove(lead.id)}
                            disabled={processingId !== null}
                            className="px-3 py-1.5 bg-primary text-white hover:bg-primary-dark rounded-lg text-body-small font-bold transition disabled:opacity-50 inline-flex items-center gap-1.5"
                          >
                            {processingId === lead.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5" />
                                Approve & Setup
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
