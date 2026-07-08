"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const navRef = useRef<HTMLElement>(null);

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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentPage > 1 && !loading) {
        onPageChange(currentPage - 1);
      } else if (e.key === "ArrowRight" && currentPage < totalPages && !loading) {
        onPageChange(currentPage + 1);
      } else if (e.key === "Home" && !loading) {
        e.preventDefault();
        onPageChange(1);
      } else if (e.key === "End" && !loading) {
        e.preventDefault();
        onPageChange(totalPages);
      }
    },
    [currentPage, totalPages, loading, onPageChange]
  );

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    nav.addEventListener("keydown", handleKeyDown);
    return () => nav.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (total <= pageSize) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
      <p key={`${startRecord}-${endRecord}`} className="text-body-small text-neutral-500 animate-fade-in" aria-live="polite">
        {total > 0 ? (
          <>Showing <strong>{startRecord}–{endRecord}</strong> of <strong>{total}</strong></>
        ) : (
          <>0 records</>
        )}
      </p>

      <nav ref={navRef} aria-label="Pagination" className="flex items-center gap-1" tabIndex={0}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loading}
          aria-label="Previous page"
          className="min-w-[44px] h-11 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="hidden sm:flex items-center gap-1">
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
                className={`min-w-[44px] h-11 rounded-lg text-body-small font-bold transition inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                  page === currentPage
                    ? "bg-primary text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100"
                } disabled:opacity-40`}
              >
                {page}
              </button>
            )
          )}
        </div>

        <span className="sm:hidden text-body-small text-neutral-500 px-2 select-none" aria-live="polite">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || loading}
          aria-label="Next page"
          className="min-w-[44px] h-11 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center justify-center"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
}
