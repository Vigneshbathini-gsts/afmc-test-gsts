import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Eye, Rows3 } from "lucide-react";

const ROWS_PER_PAGE_OPTIONS = [10, 100, 0];

export default function Actions({
  columns = [],
  onToggleColumn,
  rowsPerPage = 10,
  onRowsPerPageChange,
  onDownloadCsv,
  onDownloadPdf,
  busy = false,
  loading = false,
  rowsPerPageOptions = ROWS_PER_PAGE_OPTIONS,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="report-actions-menu"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex h-12 items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-afmc-maroon/40 hover:text-afmc-maroon focus:outline-none focus:ring-2 focus:ring-afmc-maroon/30"
      >
        Actions
        <ChevronDown size={16} className={isOpen ? "rotate-180" : ""} />
      </button>

      {isOpen && (
        <div
          id="report-actions-menu"
          aria-label="Report actions"
          className="absolute right-0 z-[60] mt-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
        >
          <section aria-label="Show or hide columns">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <Eye size={14} />
              Columns
            </h3>
            <div className="max-h-44 space-y-1 overflow-y-auto">
              {columns.map((column) => (
                <label
                  key={column.key}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={column.visible}
                    onChange={() => onToggleColumn(column.key)}
                    className="accent-afmc-maroon"
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </section>

          <section className="mt-3 border-t border-gray-100 pt-3">
            <label className="flex items-center justify-between gap-3 text-sm text-gray-700">
              <span className="flex items-center gap-2">
                <Rows3 size={15} />
                Rows per page
              </span>
              <select
                value={rowsPerPage}
                disabled={loading}
                onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
                className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-afmc-maroon focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rowsPerPageOptions.map((count) => (
                  <option key={count} value={count}>
                    {count === 0 ? "Unlimited" : count}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="mt-3 border-t border-gray-100 pt-3">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <Download size={14} />
              Download
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onDownloadCsv();
                  setIsOpen(false);
                }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                CSV
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onDownloadPdf();
                  setIsOpen(false);
                }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                PDF
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export function useActionColumns(columns) {
  const [visibility, setVisibility] = useState(() =>
    Object.fromEntries(columns.map(({ key }) => [key, true]))
  );

  const toggleColumn = useCallback((key) => {
    setVisibility((current) => {
      const visibleCount = columns.filter(
        (column) => current[column.key] !== false
      ).length;
      if (current[key] !== false && visibleCount === 1) return current;
      return {
        ...current,
        [key]: current[key] === false,
      };
    });
  }, [columns]);

  const isColumnVisible = useCallback(
    (key) => visibility[key] !== false,
    [visibility]
  );

  return {
    actionColumns: columns.map((column) => ({
      ...column,
      visible: isColumnVisible(column.key),
    })),
    isColumnVisible,
    toggleColumn,
  };
}