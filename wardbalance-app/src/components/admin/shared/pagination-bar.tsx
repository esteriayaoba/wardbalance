"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface PaginationBarProps {
  currentPage: number;
  pageSize: number;
  total: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

export default function PaginationBar({
  currentPage,
  pageSize,
  total,
  loading = false,
  onPageChange,
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startRecord = Math.min((currentPage - 1) * pageSize + 1, total);
  const endRecord = Math.min(currentPage * pageSize, total);

  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  };

  if (total <= pageSize) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
      <p className="text-body-small text-neutral-500">
        {loading ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
          </span>
        ) : total > 0 ? (
          <>Showing <strong>{startRecord}–{endRecord}</strong> of <strong>{total}</strong></>
        ) : (
          <>0 records</>
        )}
      </p>

      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loading}
          aria-label="Previous page"
          className="p-2 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((page, idx) =>
          page === "ellipsis" ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-neutral-400 select-none">…</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              disabled={loading}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
              className={`min-w-[36px] h-9 rounded-lg text-body-small font-bold transition ${
                page === currentPage
                  ? "bg-primary text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100"
              } disabled:opacity-40`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || loading}
          aria-label="Next page"
          className="p-2 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
}
