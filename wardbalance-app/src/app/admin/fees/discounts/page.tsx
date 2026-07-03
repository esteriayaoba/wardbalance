"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, CheckCircle, XCircle, Search, Edit } from "lucide-react";

type DiscountRule = {
  id: string;
  name: string;
  type: string;
  value: string;
  condition: string;
  scope: string;
  isActive: boolean;
};

export default function DiscountRulesPage() {
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchRules() {
      try {
        const res = await fetch("/api/admin/fees/discounts");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setRules(json.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRules();
  }, []);

  const formatType = (type: string, value: string) => {
    return type === "percentage" ? `${value}%` : `₦${Number(value).toLocaleString()}`;
  };

  const filteredRules = rules.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-headline-small text-neutral-900 mb-1">Discount Rules</h1>
          <p className="text-body-small text-neutral-500">Manage automated fee reductions and manual discounts.</p>
        </div>
        <Link 
          href="/admin/fees/discounts/new"
          className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-label-large hover:bg-primary-dark flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Rule
        </Link>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Search rules..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-lg text-body-medium focus:outline-2 focus:outline-primary/50 focus:outline-offset-1 focus:outline"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-6 py-3 text-label-medium text-neutral-500 font-bold uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-label-medium text-neutral-500 font-bold uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-label-medium text-neutral-500 font-bold uppercase tracking-wider">Condition</th>
                <th className="px-6 py-3 text-label-medium text-neutral-500 font-bold uppercase tracking-wider">Scope</th>
                <th className="px-6 py-3 text-label-medium text-neutral-500 font-bold uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-label-medium text-neutral-500 font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">Loading rules...</td>
                </tr>
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-neutral-500 mb-2">No discount rules found.</div>
                    <Link href="/admin/fees/discounts/new" className="text-primary hover:underline font-bold text-body-small">Create your first rule</Link>
                  </td>
                </tr>
              ) : (
                filteredRules.map(rule => (
                  <tr key={rule.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-body-medium font-bold text-neutral-900">{rule.name}</td>
                    <td className="px-6 py-4 text-body-small tabular-nums font-bold">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md">{formatType(rule.type, rule.value)}</span>
                    </td>
                    <td className="px-6 py-4 text-body-small text-neutral-700 capitalize">{rule.condition.replace("_", " ")}</td>
                    <td className="px-6 py-4 text-body-small text-neutral-700 capitalize">{rule.scope.replace("_", " ")}</td>
                    <td className="px-6 py-4">
                      {rule.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          <CheckCircle className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-neutral-400 hover:text-primary rounded-lg hover:bg-primary-50 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
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
