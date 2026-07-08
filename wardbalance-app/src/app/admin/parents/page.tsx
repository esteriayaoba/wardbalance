"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, Plus, Upload, Check, AlertCircle, Search, Users, MapPin, Phone, Mail } from "lucide-react";
import ImportWizard from "@/components/admin/shared/import-wizard";
import PaginationBar from "@/components/admin/shared/pagination-bar";

interface WardLink {
  id: string;
  relationshipType: string;
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
}

interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string | null;
  wards: WardLink[];
}

export default function ParentsPage() {
  const [loading, setLoading] = useState(true);
  const [parents, setParents] = useState<Parent[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Overlay state
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);

  // Form states manual add
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 20;

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setPage(1); }, [searchQuery]);

  const loadData = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    const offset = (page - 1) * pageSize;
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
    if (searchQuery) params.set("search", searchQuery);
    fetch(`/api/admin/parents?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((body) => {
        setParents(body.data || []);
        setTotalRecords(body.meta?.total ?? 0);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Load failed:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    return () => abortRef.current?.abort();
  }, [page, searchQuery]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          address: address.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create parent profile");

      setSuccess("Parent profile created successfully.");
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setShowAddDrawer(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-body-large text-neutral-600">Retrieving parent directories...</p>
      </div>
    );
  }

  // API handles search filtering; parents array is already filtered and paginated
  const filteredParents = parents;

  const importFields = [
    { targetField: "firstName", label: "First Name", required: true },
    { targetField: "lastName", label: "Last Name", required: true },
    { targetField: "phone", label: "Phone Number", required: true },
    { targetField: "email", label: "Email Address", required: false },
    { targetField: "address", label: "Physical Address", required: false },
  ];

  return (
    <div className="space-y-8">
      {/* Header and CTAs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-headline-small text-neutral-900 font-bold">Parents Directory</h1>
          <p className="text-body-medium text-neutral-600">
            Manage parent/sponsor contact details and verify ward link associations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportWizard(true)}
            className="px-4 py-2 border border-neutral-300 text-neutral-700 bg-white rounded-lg text-body-small font-bold hover:bg-neutral-50 transition inline-flex items-center gap-2"
          >
            <Upload className="w-4 h-4 text-neutral-500" />
            Import CSV
          </button>

          <button
            onClick={() => setShowAddDrawer(true)}
            className="px-4 py-2 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Parent
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-green-50 text-green-700 text-body-small border border-green-200">
          <Check className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Import Wizard overlay popup */}
      {showImportWizard && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <ImportWizard
              type="parent"
              fields={importFields}
              onComplete={() => loadData()}
              onClose={() => setShowImportWizard(false)}
            />
          </div>
        </div>
      )}

      {/* Manual Register Parent Drawer */}
      {showAddDrawer && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-8 shadow-xl flex flex-col justify-between border-l border-neutral-200 animate-fade-in-up">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <h3 className="text-title-small text-neutral-900 font-bold">Add Parent Profile</h3>
                <button
                  onClick={() => setShowAddDrawer(false)}
                  className="text-body-small text-neutral-500 hover:text-neutral-900 font-bold"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleManualAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* First Name */}
                  <div className="space-y-1.5">
                    <label className="text-label-medium text-neutral-700 block">First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mrs. Funke"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-none"
                    />
                  </div>
                  {/* Last Name */}
                  <div className="space-y-1.5">
                    <label className="text-label-medium text-neutral-700 block">Last Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Adebayo"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-none"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-label-medium text-neutral-700 block">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 08012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-none"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-label-medium text-neutral-700 block">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. ade@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-none"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <label className="text-label-medium text-neutral-700 block">Home Address</label>
                  <textarea
                    rows={3}
                    placeholder="Physical address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center justify-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Register Parent
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute w-4 h-4 text-neutral-400 left-3 top-3" />
          <input
            type="text"
            aria-label="Search parents"
            placeholder="Search by parent name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          />
        </div>
      </div>

      {/* Parents Grid/Table / Empty State */}
      {filteredParents.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-body-large text-neutral-500 font-medium">
            {searchQuery ? "No parents match your search." : "No parents registered yet."}
          </p>
          <p className="text-body-small text-neutral-400 mt-1">
            {searchQuery
              ? "Try a different search term."
              : "Add your first parent profile to get started."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
                <th className="px-6 py-3 font-semibold">Parent / Sponsor Name</th>
                <th className="px-6 py-3 font-semibold">Contact Credentials</th>
                <th className="px-6 py-3 font-semibold">Wards (Linked Students)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredParents.map((p) => (
                <tr key={p.id} className="text-body-medium text-neutral-800 hover:bg-neutral-50/50">
                  <td className="px-6 py-4 font-bold text-neutral-900">
                    {p.lastName}, {p.firstName}
                  </td>
                  <td className="px-6 py-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-neutral-800">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{p.phone}</span>
                    </div>
                    {p.email && (
                      <div className="flex items-center gap-1.5 text-body-small text-neutral-500">
                        <Mail className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{p.email}</span>
                      </div>
                    )}
                    {p.address && (
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate max-w-[200px]" title={p.address}>{p.address}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {p.wards.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {p.wards.map((w) => (
                          <span
                            key={w.id}
                            className="inline-flex px-2 py-1 rounded bg-neutral-100 text-neutral-700 text-body-small font-medium"
                          >
                            {w.student.firstName} {w.student.lastName} ({w.relationshipType})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-body-small text-neutral-400 italic">No linked students</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar
        currentPage={page}
        pageSize={pageSize}
        total={totalRecords}
        loading={loading}
        onPageChange={setPage}
      />
    </div>
  );
}
