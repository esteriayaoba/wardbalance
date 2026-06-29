"use client";

import { Search } from "lucide-react";
import Input from "@/components/admin/shared/input";
import Select from "@/components/admin/shared/select";

interface InvoiceFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterTermId: string;
  onTermChange: (value: string) => void;
  filterClassLevelId: string;
  onClassLevelChange: (value: string) => void;
  filterStatus: string;
  onStatusChange: (value: string) => void;
  terms: { id: string; session: { name: string }; name: string }[];
  classLevels: { id: string; name: string }[];
}

export default function InvoiceFilters({
  searchQuery,
  onSearchChange,
  filterTermId,
  onTermChange,
  filterClassLevelId,
  onClassLevelChange,
  filterStatus,
  onStatusChange,
  terms,
  classLevels,
}: InvoiceFiltersProps) {
  return (
    <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
      <div className="relative w-full lg:w-80">
        <Search className="absolute w-4 h-4 text-neutral-400 left-3 top-3.5 z-10" />
        <Input
          type="text"
          placeholder="Search student or admission no..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-3 w-full lg:w-auto">
        <div className="w-48">
          <Select
            value={filterTermId}
            onChange={(e) => onTermChange(e.target.value)}
            className="py-2.5"
          >
            <option value="">All Terms</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.session.name} — {t.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-48">
          <Select
            value={filterClassLevelId}
            onChange={(e) => onClassLevelChange(e.target.value)}
            className="py-2.5"
          >
            <option value="">All Classes</option>
            {classLevels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-48">
          <Select
            value={filterStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="py-2.5"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </Select>
        </div>
      </div>
    </div>
  );
}
