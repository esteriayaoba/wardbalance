"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Receipt, Loader2, AlertCircle } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import PaginationBar from "@/components/admin/shared/pagination-bar";

interface ReceiptRecord {
  id: string;
  receiptNumber: string;
  createdAt: string;
  payment: {
    amount: string;
    method: string;
    reference: string | null;
    student: { id: string; firstName: string; lastName: string; admissionNumber: string };
    invoice: { id: string; status: string };
  };
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 20;

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setPage(1); }, [search]);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    const offset = (page - 1) * pageSize;
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
    fetch(`/api/admin/receipts?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (res.status === 403) throw new Error("You do not have permission to view receipts.");
        if (!res.ok) throw new Error("Failed to load receipts");
        return res.json();
      })
      .then((body) => {
        setReceipts(body.data ?? []);
        setTotalRecords(body.meta?.total ?? 0);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load receipts");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [page, search]);

  const filtered = receipts.filter((r) =>
    !search ||
    r.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
    `${r.payment.student.firstName} ${r.payment.student.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    r.payment.student.admissionNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-headline-small text-neutral-900 font-bold">Receipts</h1>
        <p className="text-body-medium text-neutral-600">View all issued receipts across the school.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="relative w-full max-w-sm">
          <Search className="absolute w-4 h-4 text-neutral-400 left-3 top-3" />
          <input
            type="text"
            aria-label="Search receipts"
            placeholder="Search by receipt number or student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="ml-2 text-body-medium text-neutral-500">Loading receipts...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Receipt className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-body-large text-neutral-500 font-medium">
            {search ? "No receipts match your search." : "No receipts issued yet."}
          </p>
          <p className="text-body-small text-neutral-400 mt-1">
            {search ? "Try a different search term." : "Receipts are created automatically when payments are recorded."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 text-left text-label-medium text-neutral-500">
                  <th className="px-6 py-3 font-semibold">Receipt #</th>
                  <th className="px-6 py-3 font-semibold">Student</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                  <th className="px-6 py-3 font-semibold">Method</th>
                  <th className="px-6 py-3 font-semibold">Reference</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50/50 transition">
                    <td className="px-6 py-4 font-mono text-body-small font-bold text-primary">
                      {r.receiptNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-body-small font-medium text-neutral-900">
                        {r.payment.student.firstName} {r.payment.student.lastName}
                      </div>
                      <div className="text-body-small text-neutral-400">
                        {r.payment.student.admissionNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-body-small font-medium text-neutral-900">
                      {formatNaira(r.payment.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold border uppercase bg-neutral-50 text-neutral-600 border-neutral-200">
                        {r.payment.method.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-body-small text-neutral-500 font-mono">
                      {r.payment.reference || "—"}
                    </td>
                    <td className="px-6 py-4 text-body-small text-neutral-500">
                      {new Date(r.createdAt).toLocaleDateString("en-NG", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
