"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowRight, User, TrendingUp, CreditCard, ChevronRight } from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface Ward {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  className: string;
  outstanding: string;
  invoiceCount: number;
  hasPartial: boolean;
  isOverdue: boolean;
}

interface RecentPayment {
  id: string;
  amount: string;
  method: string;
  status: string;
  createdAt: string;
  studentName: string;
}

interface DashboardData {
  totalOutstanding: string;
  wards: Ward[];
  recentPayments: RecentPayment[];
}

export default function ParentDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard data");
      const body = await res.json();
      setData(body.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let startY = 0;
    let pulling = false;
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) { startY = e.touches[0].clientY; pulling = true; }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pulling) return;
      const diff = e.touches[0].clientY - startY;
      if (diff > 80 && !loading) { pulling = false; fetchData(); }
    };
    const onTouchEnd = () => { pulling = false; };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [loading, fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-body-medium text-neutral-600">Retrieving student portals...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
        <AlertCircle className="w-12 h-12 text-error mb-4" />
        <h3 className="text-title-medium text-neutral-900 font-bold mb-2">Could Not Load Dashboard</h3>
        <p className="text-body-medium text-neutral-600 mb-6">{error ?? "Something went wrong"}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-primary text-white font-bold rounded-lg text-body-small hover:bg-primary-dark transition cursor-pointer">Try Again</button>
      </div>
    );
  }

  const outstandingNum = Number(data.totalOutstanding);
  const hasOutstanding = outstandingNum > 0;

  const getStatusBadge = (wardOutstanding: number, invoiceCount: number, isOverdue: boolean, hasPartial: boolean) => {
    if (wardOutstanding <= 0) {
      return { label: "Paid", bg: "bg-green-100 text-green-700" };
    }
    if (isOverdue) {
      return { label: "Overdue", bg: "bg-red-100 text-red-700" };
    }
    if (hasPartial) {
      return { label: "Partial", bg: "bg-amber-100 text-amber-700" };
    }
    return { label: "Outstanding", bg: "bg-neutral-100 text-neutral-700" };
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-headline-small text-neutral-900 font-bold">My Wards</h1>
        <p className="text-body-small text-neutral-600">View academic invoices, track payments, and verify balances.</p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-4">
        <div>
          <span className="text-label-small text-neutral-400 font-bold uppercase tracking-wider block mb-1">Total Outstanding Balance</span>
          <div className={`text-display-small font-extrabold tabular-nums tracking-tight flex items-center gap-2 ${hasOutstanding ? "text-amber-600" : "text-green-600"}`}>
            <CreditCard className={`w-6 h-6 ${hasOutstanding ? "text-amber-500" : "text-green-500"}`} />
            {formatNaira(data.totalOutstanding)}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
          <span className="text-body-small text-neutral-500">
            {hasOutstanding
              ? `${data.wards.reduce((acc, w) => acc + w.invoiceCount, 0)} unpaid term invoices pending`
              : "All academic terms fees are fully settled."
            }
          </span>
          {hasOutstanding && (
            <button onClick={() => router.push("/parent/invoices")}
              className="text-body-small text-primary hover:underline font-bold inline-flex items-center gap-1 cursor-pointer">
              Pay Wards Invoices <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-label-medium text-neutral-900 font-bold uppercase tracking-wider">Student Registries ({data.wards.length})</h3>

        {data.wards.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-400">
              <User className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-title-small text-neutral-900 font-bold">No linked wards yet</h4>
              <p className="text-body-small text-neutral-500 max-w-xs mx-auto">Please contact the school administrative desk to link your parent profile to your child&apos;s records.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {data.wards.map((ward) => {
              const wardOutstanding = Number(ward.outstanding);
              const badge = getStatusBadge(wardOutstanding, ward.invoiceCount, ward.isOverdue, ward.hasPartial);

              return (
                <div key={ward.id} onClick={() => router.push(`/parent/invoices?studentId=${ward.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/parent/invoices?studentId=${ward.id}`); }}
                  role="button" tabIndex={0}
                  aria-label={`View invoices for ${ward.firstName} ${ward.lastName}`}
                  className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-primary/45 transition shadow-sm cursor-pointer flex justify-between items-center group">
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-label-large">{ward.firstName[0]}</div>
                      <div>
                        <h4 className="text-body-medium font-bold text-neutral-900 truncate">{ward.lastName}, {ward.firstName}</h4>
                        <span className="text-[11px] text-neutral-400">{ward.className} &bull; Adm No: {ward.admissionNumber}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Outstanding</span>
                      <span className={`text-title-medium font-extrabold tabular-nums flex items-center gap-1 ${wardOutstanding <= 0 ? "text-green-600" : "text-amber-600"}`}>
                        {formatNaira(ward.outstanding)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 shrink-0 flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-neutral-400" />
            <h3 className="text-label-medium text-neutral-900 font-bold uppercase tracking-wider">Recent Payments</h3>
          </div>
          <button onClick={() => router.push("/parent/payments")}
            className="text-body-small text-primary hover:underline font-bold cursor-pointer">All History</button>
        </div>

        {data.recentPayments.length === 0 ? (
          <div className="text-center py-6 text-body-small text-neutral-400">
            No payments recorded yet. Payments and receipts will appear here after verification.
          </div>
        ) : (
          <div className="space-y-3.5">
            {data.recentPayments.map((p) => (
              <div key={p.id} className="flex justify-between items-start text-body-small">
                <div>
                  <p className="font-bold text-neutral-800">Payment of {formatNaira(p.amount)}</p>
                  <span className="text-[10px] text-neutral-400">For {p.studentName} &bull; {p.method.replace("_", " ")}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold block text-neutral-500">
                    {new Date(p.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-extrabold mt-0.5 inline-block ${p.status === "recorded" ? "bg-green-50 text-green-600 border-green-100" : p.status === "void" ? "bg-red-50 text-red-600 border-red-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
