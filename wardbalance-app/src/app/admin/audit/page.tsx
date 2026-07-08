"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, ShieldAlert, History, Search, FileText, XCircle } from "lucide-react";
import PaginationBar from "@/components/admin/shared/pagination-bar";

interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue: any;
  newValue: any;
  ipAddress: string | null;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 20;

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setPage(1); }, [searchQuery]);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    const offset = (page - 1) * pageSize;
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
    if (searchQuery) params.set("actor", searchQuery);
    fetch(`/api/admin/audit?${params.toString()}`, { signal: controller.signal })
      .then((r) => {
        if (r.status === 403) throw new Error("Access Denied: Only authorized users can view workspace audit logs.");
        if (!r.ok) throw new Error("Failed to retrieve system logs.");
        return r.json();
      })
      .then((res) => {
        setLogs(res.data || []);
        setTotalRecords(res.meta?.total ?? 0);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message);
        setLoading(false);
      });
    return () => controller.abort();
  }, [page, searchQuery]);

  const filteredLogs = logs;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-body-large text-neutral-600">Retrieving system ledger logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 border border-red-200 bg-red-50/50 rounded-2xl text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 bg-red-100 text-error rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-title-medium text-neutral-900 font-bold">Unauthorized View</h3>
          <p className="text-body-medium text-neutral-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-headline-small text-neutral-900 font-bold inline-flex items-center gap-2">
          <History className="w-6 h-6 text-neutral-500" />
          System Audit Logs
        </h1>
        <p className="text-body-medium text-neutral-600">
          Read-only immutable historical log of all administrative actions, settings modifications, and financial payments.
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute w-4 h-4 text-neutral-400 left-3 top-3" />
          <input
            type="text"
            aria-label="Search audit logs"
            placeholder="Search by actor, action, type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-2 focus:outline-primary/50 focus:outline-offset-1"
          />
        </div>
      </div>

      {/* Audit Table / Empty State */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-16">
          <History className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-body-large text-neutral-500 font-medium">
            {searchQuery ? "No audit logs match your search." : "No audit logs recorded yet."}
          </p>
          <p className="text-body-small text-neutral-400 mt-1">
            {searchQuery
              ? "Try a different search term."
              : "Audit logs are created automatically when financial actions are performed."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
                <th className="px-6 py-3 font-semibold">Timestamp</th>
                <th className="px-6 py-3 font-semibold">Action / Event</th>
                <th className="px-6 py-3 font-semibold">Actor</th>
                <th className="px-6 py-3 font-semibold">Target Entity</th>
                <th className="px-6 py-3 font-semibold">IP Address</th>
                <th className="px-6 py-3 font-semibold text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredLogs.map((log) => {
                const isVoid = log.action.includes("VOID");
                const isPayment = log.action.includes("PAYMENT");
                const isDelete = log.action.includes("DELETED");
                return (
                  <tr key={log.id} className="text-body-medium hover:bg-neutral-50/50">
                    <td className="px-6 py-4 text-neutral-600 text-body-small whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-NG", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "2-digit", minute: "2-digit", second: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isVoid || isDelete ? "bg-red-100 text-red-700"
                        : isPayment ? "bg-green-100 text-green-700"
                        : "bg-neutral-100 text-neutral-600"
                      }`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-neutral-900">{log.actorName}</td>
                    <td className="px-6 py-4 text-neutral-600">
                      <span className="font-semibold text-neutral-800">{log.entityType}</span>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate max-w-[120px]" title={log.entityId}>
                        ID: {log.entityId}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-body-small text-neutral-500">{log.ipAddress || "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setSelectedLog(log)}
                        className="px-3 py-1.5 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded-lg text-body-small font-bold inline-flex items-center gap-1.5 transition">
                        <FileText className="w-3.5 h-3.5" /> Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
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

      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col justify-between max-h-[80vh]">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-title-small text-neutral-900 font-bold">Inspect Log Event</h3>
                <p className="text-body-small text-neutral-500">{selectedLog.action.replace(/_/g, " ")} — ID: {selectedLog.id}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-body-small text-neutral-500 hover:text-neutral-900 font-bold">Close</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-neutral-950 font-mono text-[12px] text-green-400 leading-normal">
              {selectedLog.previousValue && (
                <div className="space-y-1">
                  <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Previous Value State</div>
                  <pre className="p-4 rounded bg-neutral-900 overflow-x-auto border border-neutral-800">{JSON.stringify(selectedLog.previousValue, null, 2)}</pre>
                </div>
              )}
              {selectedLog.newValue && (
                <div className="space-y-1">
                  <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">New Value State</div>
                  <pre className="p-4 rounded bg-neutral-900 overflow-x-auto border border-neutral-800">{JSON.stringify(selectedLog.newValue, null, 2)}</pre>
                </div>
              )}
              {!selectedLog.previousValue && !selectedLog.newValue && (
                <div className="text-neutral-500 text-center py-6">No state delta tracked for this event metadata.</div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex justify-end">
              <button onClick={() => setSelectedLog(null)} className="px-4 py-2 border border-neutral-300 text-neutral-700 bg-white rounded-lg text-body-medium font-bold hover:bg-neutral-50 transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
