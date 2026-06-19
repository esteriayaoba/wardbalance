"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Lock, Unlock, Calendar, Check, AlertTriangle, Layers, Trash2, FolderPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface Session {
  id: string;
  name: string;
  isActive: boolean;
}

interface Term {
  id: string;
  sessionId: string;
  name: string;
  isActive: boolean;
  status: "active" | "locked";
  session?: { name: string };
}

interface ClassArm {
  id: string;
  classLevelId: string;
  name: string;
}

interface ClassLevel {
  id: string;
  divisionId: string;
  name: string;
  classArms: ClassArm[];
}

interface Division {
  id: string;
  name: string;
  classLevels: ClassLevel[];
}

export default function AcademicSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "sessions";

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  // Form states
  const [newSessionName, setNewSessionName] = useState("");
  const [newSessionActive, setNewSessionActive] = useState(false);
  
  const [newTermName, setNewTermName] = useState("");
  const [newTermSessionId, setNewTermSessionId] = useState("");
  const [newTermActive, setNewTermActive] = useState(false);

  const [newDivisionName, setNewDivisionName] = useState("");
  const [newLevelName, setNewLevelName] = useState("");
  const [newLevelDivisionId, setNewLevelDivisionId] = useState("");
  
  const [newArmName, setNewArmName] = useState("");
  const [newArmLevelId, setNewArmLevelId] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/academic/sessions").then((r) => r.json()),
      fetch("/api/admin/academic/terms").then((r) => r.json()),
      fetch("/api/admin/academic/classes").then((r) => r.json()),
    ])
      .then(([sessionData, termData, classData]) => {
        setSessions(sessionData.data || []);
        setTerms(termData.data || []);
        setDivisions(classData.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Load failed:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.push(`/admin/academic?${params.toString()}`);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/academic/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSessionName.trim(), isActive: newSessionActive }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create session");
      
      setSuccess("Session created successfully.");
      setNewSessionName("");
      setNewSessionActive(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/academic/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: newTermSessionId,
          name: newTermName.trim(),
          isActive: newTermActive,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create term");

      setSuccess("Term created successfully.");
      setNewTermName("");
      setNewTermSessionId("");
      setNewTermActive(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTerm = async (termId: string, updates: { isActive?: boolean; status?: "active" | "locked" }) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/academic/terms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: termId, ...updates }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to update term");

      setSuccess("Term updated successfully.");
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateClassElement = async (e: React.FormEvent, type: "division" | "level" | "arm") => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    let payload: any = { type };
    if (type === "division") {
      payload.name = newDivisionName.trim();
    } else if (type === "level") {
      payload.name = newLevelName.trim();
      payload.divisionId = newLevelDivisionId;
    } else if (type === "arm") {
      payload.name = newArmName.trim();
      payload.classLevelId = newArmLevelId;
    }

    try {
      const res = await fetch("/api/admin/academic/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Failed to create ${type}`);

      setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} created successfully.`);
      if (type === "division") setNewDivisionName("");
      else if (type === "level") {
        setNewLevelName("");
        setNewLevelDivisionId("");
      } else if (type === "arm") {
        setNewArmName("");
        setNewArmLevelId("");
      }
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClassElement = async (type: "division" | "level" | "arm", id: string) => {
    const confirmText =
      type === "division"
        ? "Warning: Deleting a division will cascade delete all levels, arms, and students under it. Continue?"
        : `Are you sure you want to delete this class ${type}?`;

    if (!confirm(confirmText)) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/academic/classes?type=${type}&id=${id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to delete item");

      setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.`);
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
        <p className="text-body-large text-neutral-600">Retrieving academic details...</p>
      </div>
    );
  }

  // Get class levels and arms flattened for selections
  const flatClassLevels = divisions.flatMap((d) =>
    d.classLevels.map((l) => ({ id: l.id, name: `${d.name} — ${l.name}` }))
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-headline-small text-neutral-900 font-bold">Academic Hierarchy Setup</h1>
        <p className="text-body-medium text-neutral-600">
          Configure your educational structure including divisions, class levels, terms, and sessions.
        </p>
      </div>

      {/* Tabs list */}
      <div className="border-b border-neutral-200 flex gap-4">
        {["sessions", "terms", "divisions", "levels", "arms"].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 text-label-large font-bold border-b-2 capitalize transition -mb-[2px] ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Message alerts */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-green-50 text-green-700 text-body-small border border-green-200">
          <Check className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
          <span>{success}</span>
        </div>
      )}

      {/* 1. SESSIONS TAB */}
      {activeTab === "sessions" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-title-small text-neutral-900 font-bold">Sessions List</h3>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
                    <th className="px-6 py-3 font-semibold">Session Name</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {sessions.map((s) => (
                    <tr key={s.id} className="text-body-medium text-neutral-800">
                      <td className="px-6 py-4 font-bold">{s.name}</td>
                      <td className="px-6 py-4">
                        {s.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                            <Check className="w-3.5 h-3.5" />
                            Active Session
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Session Form */}
          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm h-fit">
            <h3 className="text-title-small text-neutral-950 font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Add Academic Session
            </h3>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Session Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026/2027"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2.5 py-2">
                <input
                  type="checkbox"
                  id="session-active-checkbox"
                  checked={newSessionActive}
                  onChange={(e) => setNewSessionActive(e.target.checked)}
                  className="w-4 h-4 border border-neutral-300 rounded text-primary focus:ring-primary focus:outline-none"
                />
                <label htmlFor="session-active-checkbox" className="text-body-small text-neutral-600 select-none">
                  Set as active school session
                </label>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-sm"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Session
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. TERMS TAB */}
      {activeTab === "terms" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-title-small text-neutral-900 font-bold">Academic Terms List</h3>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
                    <th className="px-6 py-3 font-semibold">Term / Session</th>
                    <th className="px-6 py-3 font-semibold">Active State</th>
                    <th className="px-6 py-3 font-semibold">Lock Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {terms.map((t) => (
                    <tr key={t.id} className="text-body-medium text-neutral-800">
                      <td className="px-6 py-4">
                        <div className="font-bold">{t.name}</div>
                        <div className="text-body-small text-neutral-500">{t.session?.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        {t.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={() => handleUpdateTerm(t.id, { isActive: true })}
                            disabled={actionLoading}
                            className="text-body-small text-primary hover:underline font-bold"
                          >
                            Set Active
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {t.status === "locked" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold uppercase">
                            Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold uppercase">
                            Open
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {t.status === "locked" ? (
                          <button
                            onClick={() => handleUpdateTerm(t.id, { status: "active" })}
                            disabled={actionLoading}
                            className="px-3 py-1.5 border border-neutral-300 text-neutral-700 rounded-lg text-body-small font-bold hover:bg-neutral-50 transition inline-flex items-center gap-1"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Unlock
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateTerm(t.id, { status: "locked" })}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-body-small font-bold hover:bg-red-100 transition inline-flex items-center gap-1"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Lock Term
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Term Form */}
          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm h-fit">
            <h3 className="text-title-small text-neutral-950 font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Add Academic Term
            </h3>
            <form onSubmit={handleCreateTerm} className="space-y-4">
              {/* Select Session */}
              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Select Session *</label>
                <select
                  required
                  value={newTermSessionId}
                  onChange={(e) => setNewTermSessionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium bg-white focus:outline-none"
                >
                  <option value="">Choose session...</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Term Name */}
              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Term Name *</label>
                <select
                  required
                  value={newTermName}
                  onChange={(e) => setNewTermName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium bg-white focus:outline-none"
                >
                  <option value="">Choose term name...</option>
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5 py-2">
                <input
                  type="checkbox"
                  id="term-active-checkbox"
                  checked={newTermActive}
                  onChange={(e) => setNewTermActive(e.target.checked)}
                  className="w-4 h-4 border border-neutral-300 rounded text-primary focus:ring-primary focus:outline-none"
                />
                <label htmlFor="term-active-checkbox" className="text-body-small text-neutral-600 select-none">
                  Set as active term
                </label>
              </div>

              <button
                type="submit"
                disabled={actionLoading || sessions.length === 0}
                className="w-full px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-sm"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Term
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. DIVISIONS TAB */}
      {activeTab === "divisions" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            {divisions.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-neutral-200">
                <Layers className="w-12 h-12 text-neutral-400 mx-auto mb-2" />
                <p className="text-body-large text-neutral-900 font-medium">No divisions created yet</p>
                <p className="text-body-small text-neutral-500">Add Nursery, Primary or Secondary divisions to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {divisions.map((div) => (
                  <div key={div.id} className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-title-small text-neutral-950 font-bold">{div.name}</h4>
                      <p className="text-body-small text-neutral-500">
                        {div.classLevels.length} Class Levels created
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteClassElement("division", div.id)}
                      disabled={actionLoading}
                      title="Delete division"
                      className="p-2 text-neutral-400 hover:text-error hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm h-fit">
            <h3 className="text-title-small text-neutral-950 font-bold mb-4 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              Add Division
            </h3>
            <form onSubmit={(e) => handleCreateClassElement(e, "division")} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Division Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nursery, Primary, Secondary"
                  value={newDivisionName}
                  onChange={(e) => setNewDivisionName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-sm"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Division
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. LEVELS TAB */}
      {activeTab === "levels" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-title-small text-neutral-900 font-bold">Class Levels List</h3>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
                    <th className="px-6 py-3 font-semibold">Level Name</th>
                    <th className="px-6 py-3 font-semibold">Division</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {divisions.flatMap((d) =>
                    d.classLevels.map((l) => (
                      <tr key={l.id} className="text-body-medium text-neutral-800">
                        <td className="px-6 py-4 font-bold">{l.name}</td>
                        <td className="px-6 py-4">{d.name}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteClassElement("level", l.id)}
                            disabled={actionLoading}
                            className="p-1.5 text-neutral-400 hover:text-error hover:bg-red-50 rounded-md transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                  {divisions.flatMap((d) => d.classLevels).length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-neutral-400">
                        No class levels created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Level Form */}
          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm h-fit">
            <h3 className="text-title-small text-neutral-950 font-bold mb-4 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              Add Class Level
            </h3>
            <form onSubmit={(e) => handleCreateClassElement(e, "level")} className="space-y-4">
              {/* Select Division */}
              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Select Division *</label>
                <select
                  required
                  value={newLevelDivisionId}
                  onChange={(e) => setNewLevelDivisionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium bg-white focus:outline-none"
                >
                  <option value="">Choose division...</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Level Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nursery 1, Primary 4, JSS1"
                  value={newLevelName}
                  onChange={(e) => setNewLevelName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading || divisions.length === 0}
                className="w-full px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-sm"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Level
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. ARMS TAB */}
      {activeTab === "arms" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-title-small text-neutral-900 font-bold">Class Arms List</h3>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
                    <th className="px-6 py-3 font-semibold">Arm Name</th>
                    <th className="px-6 py-3 font-semibold">Class Level</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {divisions.flatMap((d) =>
                    d.classLevels.flatMap((l) =>
                      l.classArms.map((a) => (
                        <tr key={a.id} className="text-body-medium text-neutral-800">
                          <td className="px-6 py-4 font-bold">{a.name}</td>
                          <td className="px-6 py-4">{l.name} ({d.name})</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteClassElement("arm", a.id)}
                              disabled={actionLoading}
                              className="p-1.5 text-neutral-400 hover:text-error hover:bg-red-50 rounded-md transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )
                  )}
                  {divisions.flatMap((d) => d.classLevels.flatMap((l) => l.classArms)).length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-neutral-400">
                        No class arms created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Arm Form */}
          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm h-fit">
            <h3 className="text-title-small text-neutral-950 font-bold mb-4 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              Add Class Arm
            </h3>
            <form onSubmit={(e) => handleCreateClassElement(e, "arm")} className="space-y-4">
              {/* Select Level */}
              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Select Class Level *</label>
                <select
                  required
                  value={newArmLevelId}
                  onChange={(e) => setNewArmLevelId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium bg-white focus:outline-none"
                >
                  <option value="">Choose class level...</option>
                  {flatClassLevels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-label-medium text-neutral-700 block">Arm Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A, B, Blue, Gold"
                  value={newArmName}
                  onChange={(e) => setNewArmName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading || flatClassLevels.length === 0}
                className="w-full px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-sm"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Arm
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
