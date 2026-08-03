"use client";

import React, { useEffect, useState } from "react";
import { Search, Loader2, Calendar, Phone, Mail, Link as LinkIcon, Compass, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  fullName: string;
  schoolName: string;
  role: string;
  email: string;
  phone: string | null;
  numberOfStudents: string | null;
  preferredContactMethod: string;
  message: string | null;
  source: string;
  status: "new" | "contacted" | "qualified" | "unqualified" | "converted" | "archived";
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  createdAt: string;
  school: { id: string; name: string } | null;
}

export default function PlatformLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeads() {
      try {
        const res = await fetch("/api/platform/leads");
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to load leads");
        setLeads(data.leads);
      } catch (err: any) {
        toast.error(err.message || "Failed to fetch leads");
      } finally {
        setLoading(false);
      }
    }

    loadLeads();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/platform/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to update lead status");

      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: data.lead.status } : l))
      );
      toast.success("Lead status updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter logic
  const filteredLeads = leads.filter((lead) => {
    const query = search.toLowerCase();
    const matchesSearch =
      lead.fullName.toLowerCase().includes(query) ||
      lead.schoolName.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query);

    const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-700";
      case "contacted":
        return "bg-neutral-100 text-neutral-700";
      case "qualified":
        return "bg-amber-100 text-amber-700";
      case "converted":
        return "bg-emerald-100 text-emerald-700";
      case "unqualified":
        return "bg-red-100 text-red-700";
      case "archived":
        return "bg-neutral-200 text-neutral-800";
      default:
        return "bg-neutral-100 text-neutral-600";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        <p className="text-body-medium text-neutral-500 font-medium">Loading CRM leads...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-headline-medium text-neutral-900 font-bold tracking-tight">
          CRM Leads Directory
        </h1>
        <p className="text-body-medium text-neutral-500 mt-1">
          Review, update statuses, and check UTM attributions for lander demo requests.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search leads, schools, emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border border-neutral-200 rounded-lg w-full text-body-medium focus:outline-primary-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          <span className="text-body-small text-neutral-500 font-bold uppercase tracking-wider">
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-body-medium focus:outline-primary-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="UNQUALIFIED">Unqualified</option>
            <option value="CONVERTED">Converted</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-label-small text-neutral-500 uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Lead / School</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Lander Details</th>
                <th className="px-6 py-4">Attribution</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-body-medium text-neutral-700">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-400 font-medium">
                    No leads found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-neutral-50/50 transition">
                    {/* Name / School */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-neutral-900">{lead.fullName}</div>
                        <div className="text-body-small text-neutral-500 font-medium">
                          {lead.role} at <strong className="text-neutral-700">{lead.schoolName}</strong>
                        </div>
                        <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-body-small font-medium text-neutral-600">
                          <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>{lead.email}</span>
                        </div>
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-body-small font-medium text-neutral-600">
                            <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          Method: {lead.preferredContactMethod}
                        </div>
                      </div>
                    </td>

                    {/* Lander details */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-body-small text-neutral-700 font-medium">
                          Size: {lead.numberOfStudents || "Unspecified"} students
                        </div>
                        {lead.message && (
                          <div className="mt-1.5 text-[11px] text-neutral-500 leading-normal max-w-xs line-clamp-2 italic">
                            &ldquo;{lead.message}&rdquo;
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Attribution */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {lead.utmSource ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold bg-neutral-100 text-neutral-700 rounded px-1.5 py-0.5 w-max">
                            <Compass className="w-3 h-3" />
                            <span>
                              {lead.utmSource} / {lead.utmMedium || "direct"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-body-small text-neutral-400 italic">Organic Direct</span>
                        )}
                        {lead.utmCampaign && (
                          <div className="text-[10px] text-neutral-500 truncate max-w-[150px]">
                            Campaign: {lead.utmCampaign}
                          </div>
                        )}
                        {lead.referrer && (
                          <div className="flex items-center gap-1 text-[9px] text-neutral-400 max-w-[150px] truncate">
                            <LinkIcon className="w-2.5 h-2.5" />
                            <span>{lead.referrer}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status Select Toggle */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {updatingId === lead.id ? (
                          <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                        ) : (
                          <select
                            value={lead.status}
                            disabled={updatingId !== null}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className={`px-2 py-1 rounded-full text-label-small font-bold border-0 cursor-pointer focus:ring-1 focus:ring-primary-500 ${getStatusBadgeClass(
                              lead.status
                            )}`}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="unqualified">Unqualified</option>
                            <option value="converted">Converted</option>
                            <option value="archived">Archived</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
