"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    fetch("/api/portal/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard data");
        return r.json();
      })
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

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
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white font-bold rounded-lg text-body-small hover:bg-primary-dark transition cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const outstandingNum = Number(data.totalOutstanding);
  const hasOutstanding = outstandingNum > 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="space-y-1">
        <h1 className="text-headline-small text-neutral-900 font-bold">My Wards</h1>
        <p className="text-body-small text-neutral-600">
          View academic invoices, track payments, and verify balances.
        </p>
      </div>

      {/* Combined Outstanding Card */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-4">
        <div>
          <span className="text-label-small text-neutral-400 font-bold uppercase tracking-wider block mb-1">
            Total Outstanding Balance
          </span>
          <div className={`text-display-small font-extrabold tabular-nums tracking-tight ${
            hasOutstanding ? "text-amber-600" : "text-green-600"
          }`}>
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
            <button
              onClick={() => router.push("/parent/invoices")}
              className="text-body-small text-primary hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              Pay Wards Invoices
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Wards list */}
      <div className="space-y-3">
        <h3 className="text-label-medium text-neutral-900 font-bold uppercase tracking-wider">
          Student Registries ({data.wards.length})
        </h3>
        
        {data.wards.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-400">
              <User className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-title-small text-neutral-900 font-bold">No linked wards yet</h4>
              <p className="text-body-small text-neutral-500 max-w-xs mx-auto">
                Please contact the school administrative desk to link your parent profile to your child&apos;s records.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {data.wards.map((ward) => {
              const wardOutstanding = Number(ward.outstanding);
              const isWardSettled = wardOutstanding <= 0;

              return (
                <div
                  key={ward.id}
                  onClick={() => router.push(`/parent/invoices?studentId=${ward.id}`)}
                  className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-primary/45 transition shadow-sm cursor-pointer flex justify-between items-center group"
                >
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-label-large">
                        {ward.firstName[0]}
                      </div>
                      <div>
                        <h4 className="text-body-medium font-bold text-neutral-900 truncate">
                          {ward.lastName}, {ward.firstName}
                        </h4>
                        <span className="text-[11px] text-neutral-400">
                          {ward.className} • Adm No: {ward.admissionNumber}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                        Outstanding
                      </span>
                      <span className={`text-title-medium font-extrabold tabular-nums ${
                        isWardSettled ? "text-green-600" : "text-amber-600"
                      }`}>
                        {formatNaira(ward.outstanding)}
                      </span>
                    </div>
                  </div>

                  <div className="ml-4 shrink-0 flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isWardSettled ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {isWardSettled ? "Paid" : `${ward.invoiceCount} Unpaid`}
                    </span>
                    <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      {data.recentPayments.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neutral-400" />
              <h3 className="text-label-medium text-neutral-900 font-bold uppercase tracking-wider">
                Recent Payments
              </h3>
            </div>
            <button
              onClick={() => router.push("/parent/payments")}
              className="text-body-small text-primary hover:underline font-bold cursor-pointer"
            >
              All History
            </button>
          </div>

          <div className="space-y-3.5">
            {data.recentPayments.map((p) => (
              <div key={p.id} className="flex justify-between items-start text-body-small">
                <div>
                  <p className="font-bold text-neutral-800">
                    Payment of {formatNaira(p.amount)}
                  </p>
                  <span className="text-[10px] text-neutral-400">
                    For {p.studentName} • {p.method.replace("_", " ")}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold block text-neutral-500">
                    {new Date(p.createdAt).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded border border-green-100 uppercase font-extrabold mt-0.5 inline-block">
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
