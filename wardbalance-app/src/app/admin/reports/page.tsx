"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, Users, Calendar, AlertCircle, FileSpreadsheet, Search } from "lucide-react";
import { formatNaira } from "@/lib/utils";

interface RevenueSummaryRow {
  termId: string;
  termName: string;
  sessionName: string;
  expected: string;
  collected: string;
  outstanding: string;
}

interface DebtorRow {
  invoiceId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  termName: string;
  expected: string;
  collected: string;
  outstanding: string;
  dueDate: string;
  status: string;
}

interface ClassSummaryRow {
  classArmId: string;
  className: string;
  studentCount: number;
  expected: string;
  collected: string;
  outstanding: string;
}

interface ClassLevel {
  id: string;
  name: string;
}

interface AcademicTerm {
  id: string;
  name: string;
  isActive: boolean;
  session: { name: string };
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<"revenue" | "debtors" | "classes">("revenue");
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<(RevenueSummaryRow | DebtorRow | ClassSummaryRow)[]>([]);

  // Filter lists
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);

  // Filter states
  const [filterTermId, setFilterTermId] = useState("");
  const [filterClassLevelId, setFilterClassLevelId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadFilters = () => {
    Promise.all([
      fetch("/api/admin/academic/classes").then((r) => r.json()),
      fetch("/api/admin/academic/terms").then((r) => r.json()),
    ])
      .then(([classRes, termRes]) => {
        const divisions: Array<{ name: string; classLevels: Array<{ id: string; name: string }> }> = classRes.data || [];
        const flatLevels = divisions.flatMap((d) =>
          d.classLevels.map((l) => ({ id: l.id, name: `${d.name} — ${l.name}` }))
        );
        setClassLevels(flatLevels);

        const termsList: AcademicTerm[] = termRes.data || [];
        setTerms(termsList);

        const activeTerm = termsList.find((t) => t.isActive);
        if (activeTerm) {
          setFilterTermId(activeTerm.id);
        }
      })
      .catch((err) => console.error("Failed to load reports filters:", err));
  };

  const loadReport = () => {
    setLoading(true);
    let typeParam = "revenue_summary";
    if (activeReport === "debtors") typeParam = "debtors";
    if (activeReport === "classes") typeParam = "class_summary";

    let url = `/api/admin/reports?type=${typeParam}`;
    if (filterTermId) url += `&termId=${filterTermId}`;
    if (filterClassLevelId) url += `&classLevelId=${filterClassLevelId}`;

    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        setReportData(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load report data:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadReport();
  }, [activeReport, filterTermId, filterClassLevelId]);

  // Debtor client search filtering
  const filteredDebtors = (reportData as DebtorRow[]).filter((row) => {
    if (activeReport !== "debtors") return true;
    return (
      row.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-headline-small text-neutral-900 font-bold">Financial Reports</h1>
          <p className="text-body-medium text-neutral-600">
            Analyze school collections billing trends, outstanding debtor balances, and classroom aggregate metrics.
          </p>
        </div>
        {(activeReport === "debtors" || activeReport === "revenue" || activeReport === "classes") && (
          <a
            href={`/api/admin/reports/export?type=${activeReport === "classes" ? "collection" : activeReport}${filterTermId ? `&termId=${filterTermId}` : ""}${filterClassLevelId && activeReport === "debtors" ? `&classLevelId=${filterClassLevelId}` : ""}`}
            className="px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 font-bold text-label-large rounded-lg transition inline-flex items-center gap-2 shadow-sm shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </a>
        )}
      </div>

      {/* Reports Tab Selectors */}
      <div className="border-b border-neutral-200">
        <div className="flex gap-6 -mb-px">
          <button
            onClick={() => setActiveReport("revenue")}
            className={`pb-4 text-label-large font-bold transition border-b-2 px-1 ${
              activeReport === "revenue"
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Revenue Summary
          </button>
          <button
            onClick={() => setActiveReport("debtors")}
            className={`pb-4 text-label-large font-bold transition border-b-2 px-1 ${
              activeReport === "debtors"
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Debtors Ledger Schedule
          </button>
          <button
            onClick={() => setActiveReport("classes")}
            className={`pb-4 text-label-large font-bold transition border-b-2 px-1 ${
              activeReport === "classes"
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Classroom Collections Summary
          </button>
        </div>
      </div>

      {/* Dynamic Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full">
          {/* Search only visible on Debtors report */}
          {activeReport === "debtors" && (
            <div className="relative w-full md:w-64">
              <Search className="absolute w-4 h-4 text-neutral-400 left-3 top-3" />
              <input
                type="text"
                placeholder="Search student or adm no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-body-medium focus:outline-none"
              />
            </div>
          )}

          {/* Term Filter (Not needed for Revenue Summary as it lists all terms anyway) */}
          {activeReport !== "revenue" && (
            <select
              value={filterTermId}
              onChange={(e) => setFilterTermId(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-body-medium bg-white focus:outline-none shrink-0"
            >
              <option value="">All Academic Terms</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.session.name} — {t.name}
                </option>
              ))}
            </select>
          )}

          {/* Class Level Filter (Only visible on Debtors list) */}
          {activeReport === "debtors" && (
            <select
              value={filterClassLevelId}
              onChange={(e) => setFilterClassLevelId(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-body-medium bg-white focus:outline-none shrink-0"
            >
              <option value="">All Class Levels</option>
              {classLevels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Report Table Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-body-large text-neutral-600">Compiling financial metrics...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          {/* Report 1: Revenue Summary */}
          {activeReport === "revenue" && (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
                  <th className="px-6 py-3 font-semibold">Academic Session & Term</th>
                  <th className="px-6 py-3 font-semibold text-right">Expected Collections</th>
                  <th className="px-6 py-3 font-semibold text-right">Collected Revenue</th>
                  <th className="px-6 py-3 font-semibold text-right">Receivable Dues</th>
                  <th className="px-6 py-3 font-semibold text-right">Collection Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {(reportData as RevenueSummaryRow[]).map((row, idx) => {
                  const expVal = parseFloat(row.expected);
                  const colVal = parseFloat(row.collected);
                  const colRate = expVal > 0 ? Math.round((colVal / expVal) * 100) : 0;

                  return (
                    <tr key={row.termId || `rev-${idx}`} className="text-body-medium text-neutral-800 hover:bg-neutral-50/50">
                      <td className="px-6 py-4 font-bold text-neutral-900">
                        {row.sessionName} — {row.termName}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-neutral-900 tabular-nums">
                        {formatNaira(row.expected)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-green-600 tabular-nums">
                        {formatNaira(row.collected)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-amber-600 tabular-nums">
                        {formatNaira(row.outstanding)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold tabular-nums">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs ${
                            colRate >= 85
                              ? "bg-green-100 text-green-700"
                              : colRate >= 50
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-105 bg-red-100 text-red-700"
                          }`}
                        >
                          {colRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {reportData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                      No session data found to compile summaries.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Report 2: Debtors Schedule */}
          {activeReport === "debtors" && (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
                  <th className="px-6 py-3 font-semibold">Student Name</th>
                  <th className="px-6 py-3 font-semibold">Class / Section</th>
                  <th className="px-6 py-3 font-semibold">Term</th>
                  <th className="px-6 py-3 font-semibold text-right">Total Expected</th>
                  <th className="px-6 py-3 font-semibold text-right">Amount Paid</th>
                  <th className="px-6 py-3 font-semibold text-right">Outstanding Balance</th>
                  <th className="px-6 py-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredDebtors.map((row) => (
                  <tr key={row.invoiceId} className="text-body-medium text-neutral-800 hover:bg-neutral-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-neutral-900">{row.studentName}</div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{row.admissionNumber}</div>
                    </td>
                    <td className="px-6 py-4">{row.className}</td>
                    <td className="px-6 py-4 truncate max-w-[120px]">{row.termName}</td>
                    <td className="px-6 py-4 text-right font-semibold text-neutral-900 tabular-nums">
                      {formatNaira(row.expected)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600 tabular-nums">
                      {formatNaira(row.collected)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-red-600 tabular-nums">
                      {formatNaira(row.outstanding)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          row.status === "overdue"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredDebtors.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">
                      No outstanding debtors found matching the parameters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Report 3: Classroom Collections Summary */}
          {activeReport === "classes" && (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
                  <th className="px-6 py-3 font-semibold">Class Section</th>
                  <th className="px-6 py-3 font-semibold text-center">Active Wards</th>
                  <th className="px-6 py-3 font-semibold text-right">Total Expected</th>
                  <th className="px-6 py-3 font-semibold text-right">Revenue Collected</th>
                  <th className="px-6 py-3 font-semibold text-right">Receivable Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {(reportData as ClassSummaryRow[]).map((row, idx) => (
                  <tr key={row.classArmId || `class-${idx}`} className="text-body-medium text-neutral-800 hover:bg-neutral-50/50">
                    <td className="px-6 py-4 font-bold text-neutral-900">{row.className}</td>
                    <td className="px-6 py-4 text-center font-mono font-bold tabular-nums">
                      {row.studentCount}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-neutral-900 tabular-nums">
                      {formatNaira(row.expected)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-green-600 tabular-nums">
                      {formatNaira(row.collected)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-amber-600 tabular-nums">
                      {formatNaira(row.outstanding)}
                    </td>
                  </tr>
                ))}
                {reportData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                      No class arms found to compile summary metrics.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
