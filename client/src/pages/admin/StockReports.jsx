import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaSearch, FaArrowLeft, FaDownload } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { inventoryAPI } from "../../services/api";
import { exportTableToPdf } from "../../utils/pdfExport";
import { toInitCap } from "../../utils/textFormat";
import Actions, { useActionColumns } from "../../components/common/Actions";
import { exportTableToCsv } from "../../utils/csvExport";

const toInputDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
};

const formatDisplayDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
};

const formatReportDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
};

const REPORT_PAGE_SIZE = 20;
const STOCK_REPORT_COLUMNS = [
  { key: "itemCode", label: "Item Code" },
  { key: "itemName", label: "Item Name" },
  { key: "date", label: "Creation Date" },
  { key: "unit", label: "A/c Unit" },
  { key: "stock", label: "Stock" },
  { key: "totalPrice", label: "Total Price" },
];

export default function StockReports() {
  const navigate = useNavigate();
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { actionColumns, isColumnVisible, toggleColumn } =
    useActionColumns(STOCK_REPORT_COLUMNS);
  const [activeTab, setActiveTab] = useState("in");
  const [fromDate, setFromDate] = useState(toInputDate(new Date()));
  const [toDate, setToDate] = useState(toInputDate(new Date()));
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [stockInRows, setStockInRows] = useState([]);
  const [stockOutRows, setStockOutRows] = useState([]);
  const [stockInSummary, setStockInSummary] = useState({ total_stock: 0, total_price: 0 });
  const [stockOutSummary, setStockOutSummary] = useState({ total_stock: 0, total_price: 0 });
  const [stockInPage, setStockInPage] = useState(0);
  const [stockOutPage, setStockOutPage] = useState(0);
  const [stockInHasMore, setStockInHasMore] = useState(true);
  const [stockOutHasMore, setStockOutHasMore] = useState(true);
  const requestInFlight = useRef(false);
  const searchTermRef = useRef("");

  const fetchStockIn = useCallback(async (queryParams, { reset = true, nextPage = 0 } = {}) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError("");
    try {
      let rows = [];
      let summary = { total_stock: 0, total_price: 0 };
      if (rowsPerPage === 0) {
        let offsetPage = 0;
        while (true) {
          const response = await inventoryAPI.getStockInReport({
            ...queryParams,
            limit: REPORT_PAGE_SIZE,
            offset: offsetPage * REPORT_PAGE_SIZE,
          });
          const chunk = response.data.data || [];
          rows.push(...chunk);
          if (offsetPage === 0) {
            summary = response.data.summary || summary;
          }
          if (chunk.length < REPORT_PAGE_SIZE) break;
          offsetPage += 1;
        }
      } else {
        const response = await inventoryAPI.getStockInReport({
          ...queryParams,
          limit: rowsPerPage,
          offset: nextPage * rowsPerPage,
        });
        rows = response.data.data || [];
        summary = response.data.summary || summary;
      }
      if (!rows.length && nextPage > 0) {
        setStockInHasMore(false);
        return;
      }
      setStockInRows((current) => (reset ? rows : [...current, ...rows]));
      setStockInSummary(summary);
      setStockInPage(rowsPerPage === 0 ? 1 : nextPage + 1);
      setStockInHasMore(rowsPerPage !== 0 && rows.length === rowsPerPage);
    } catch (err) {
      console.error("Failed to load stock-in report:", err);
      setError("Failed to load stock-in report.");
      if (reset && nextPage === 0) setStockInRows([]);
      if (nextPage === 0) setStockInHasMore(false);
    } finally {
      requestInFlight.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [rowsPerPage]);

  const fetchStockOut = useCallback(async (queryParams, { reset = true, nextPage = 0 } = {}) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError("");
    try {
      let rows = [];
      let summary = { total_stock: 0, total_price: 0 };
      if (rowsPerPage === 0) {
        let offsetPage = 0;
        while (true) {
          const response = await inventoryAPI.getStockOutReport({
            ...queryParams,
            limit: REPORT_PAGE_SIZE,
            offset: offsetPage * REPORT_PAGE_SIZE,
          });
          const chunk = response.data.data || [];
          rows.push(...chunk);
          if (offsetPage === 0) {
            summary = response.data.summary || summary;
          }
          if (chunk.length < REPORT_PAGE_SIZE) break;
          offsetPage += 1;
        }
      } else {
        const response = await inventoryAPI.getStockOutReport({
          ...queryParams,
          limit: rowsPerPage,
          offset: nextPage * rowsPerPage,
        });
        rows = response.data.data || [];
        summary = response.data.summary || summary;
      }
      if (!rows.length && nextPage > 0) {
        setStockOutHasMore(false);
        return;
      }
      setStockOutRows((current) => (reset ? rows : [...current, ...rows]));
      setStockOutSummary(summary);
      setStockOutPage(rowsPerPage === 0 ? 1 : nextPage + 1);
      setStockOutHasMore(rowsPerPage !== 0 && rows.length === rowsPerPage);
      console.log("data stock reports", rows)
      console.log("summary",summary)
      
    } catch (err) {
      console.error("Failed to load stock-out report:", err);
      setError("Failed to load stock-out report.");
      if (reset && nextPage === 0) setStockOutRows([]);
      if (nextPage === 0) setStockOutHasMore(false);
    } finally {
      requestInFlight.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [rowsPerPage]);

  const handleSearch = useCallback(async () => {
    const queryParams = {
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      search: searchTermRef.current.trim() || undefined,
    };

    if (activeTab === "in") {
      await fetchStockIn(queryParams, { reset: true, nextPage: 0 });
    } else {
      await fetchStockOut(queryParams, { reset: true, nextPage: 0 });
    }
  }, [activeTab, fromDate, toDate, fetchStockIn, fetchStockOut]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const rows = activeTab === "in" ? stockInRows : stockOutRows;
  const hasMore = activeTab === "in" ? stockInHasMore : stockOutHasMore;
  const summary = activeTab === "in" ? stockInSummary : stockOutSummary;
  const summaryLabelColumnCount = [
    "itemCode",
    "itemName",
    "date",
    "unit",
  ].filter(isColumnVisible).length;
  const hasVisibleSummaryValue =
    isColumnVisible("stock") || isColumnVisible("totalPrice");

  const fetchAllReportRows = async () => {
    if (!rows || rows.length === 0) return;
    const isStockIn = activeTab === "in";
    const reportRows = [];
    let offsetPage = 0;
    const pageSize = rowsPerPage || REPORT_PAGE_SIZE;
    const queryParams = {
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      search: searchTerm.trim() || undefined,
    };

    while (true) {
      const response = isStockIn
        ? await inventoryAPI.getStockInReport({
            ...queryParams,
            limit: pageSize,
            offset: offsetPage * pageSize,
          })
        : await inventoryAPI.getStockOutReport({
            ...queryParams,
            limit: pageSize,
            offset: offsetPage * pageSize,
          });
      const chunk = response.data.data || [];
      reportRows.push(...chunk);
      if (chunk.length < pageSize) break;
      offsetPage += 1;
    }

    return { reportRows, isStockIn };
  };

  const getExportColumns = () =>
    STOCK_REPORT_COLUMNS.filter(({ key }) => isColumnVisible(key));

  const getExportRow = (row) => ({
    itemCode: row.item_code ?? "",
    itemName: toInitCap(row.item_name),
    date: formatReportDate(row.transaction_date || row.creation_date),
    unit: row.ac_unit || "Nos",
    stock: row.stock ?? 0,
    totalPrice: row.total_price ?? row.totalprice ?? 0,
  });

  const downloadPdf = async () => {
    try {
      const result = await fetchAllReportRows();
      if (!result) return;
      const { reportRows, isStockIn } = result;
      const columns = getExportColumns();
      const exportRows = reportRows.map(getExportRow);

      const totalStock = reportRows.reduce(
        (sum, row) => sum + Number(row.stock || 0),
        0
      );
      const totalPrice = reportRows.reduce(
        (sum, row) => sum + Number(row.total_price ?? row.totalprice ?? 0),
        0
      );
      exportRows.push({
        itemCode: "",
        itemName: "",
        date: "Totals",
        unit: "",
        stock: totalStock,
        totalPrice,
      });

      exportTableToPdf({
        title: isStockIn ? "Stock In Report" : "Stock Out Report",
        fileName: isStockIn ? "stock-in-report.pdf" : "stock-out-report.pdf",
        subtitle: `From: ${formatReportDate(fromDate)}    To: ${formatReportDate(
          toDate
        )}`,
        headers: columns.map(({ label }) => label),
        rows: exportRows.map((row) => columns.map(({ key }) => row[key])),
        orientation: "portrait",
      });
    } catch (exportError) {
      console.error("Failed to export stock report PDF:", exportError);
      setError("Failed to export stock report PDF.");
    }
  };

  const downloadCsv = async () => {
    try {
      const result = await fetchAllReportRows();
      if (!result) return;
      const columns = getExportColumns();
      exportTableToCsv({
        fileName: activeTab === "in" ? "stock-in-report.csv" : "stock-out-report.csv",
        headers: columns.map(({ label }) => label),
        rows: result.reportRows.map((row) => {
          const values = getExportRow(row);
          return columns.map(({ key }) => values[key]);
        }),
      });
    } catch (exportError) {
      console.error("Failed to export stock report CSV:", exportError);
      setError("Failed to export stock report CSV.");
    }
  };

  const handleReportPageChange = (nextPage) => {
    const queryParams = {
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      search: searchTerm.trim() || undefined,
    };
    if (activeTab === "in") {
      fetchStockIn(queryParams, { reset: true, nextPage });
    } else {
      fetchStockOut(queryParams, { reset: true, nextPage });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-afmc-bg via-white to-afmc-bg2 relative">
      <div className="absolute top-16 left-12 w-72 h-72 bg-afmc-maroon/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-afmc-maroon2/10 rounded-full blur-3xl"></div>

      <div className="px-0 py-4 md:p-8 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">
            {activeTab === "in" ? "Stock In Report" : "Stock Out Report"}
          </h1>
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="self-end sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow hover:shadow-md border border-afmc-gold/30 text-gray-700 hover:text-afmc-maroon hover:bg-afmc-maroon/5 transition max-w-max"
          >
            <FaArrowLeft />
            Go To Dashboard
          </button>
        </div>

        <div className="bg-white/80 border border-white/60 rounded-3xl shadow-xl backdrop-blur-sm p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2 mb-6 md:flex md:flex-wrap md:gap-4">
            <div className="min-w-0 md:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 focus:border-afmc-maroon2 focus:ring-2 focus:ring-afmc-maroon2/20"
              />
            </div>

            <div className="min-w-0 md:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 focus:border-afmc-maroon2 focus:ring-2 focus:ring-afmc-maroon2/20"
              />
            </div>

            <div className="col-span-2 min-w-0 md:col-span-1 md:w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search item
              </label>
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => {
                  searchTermRef.current = e.target.value;
                  setSearchTerm(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="Name or item code"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 focus:border-afmc-maroon2 focus:ring-2 focus:ring-afmc-maroon2/20"
                aria-label="Search by item name or item code"
              />
            </div>

            <button
              type="button"
              onClick={handleSearch}
              className="h-12 w-10 md:w-auto md:px-6 md:py-3 rounded-2xl bg-[#5b5b5b] text-white font-semibold flex items-center justify-center gap-2 shadow hover:shadow-md"
              aria-label="Search stock report"
            >
              <FaSearch />
              <span className="hidden md:inline">Search</span>
            </button>

            <div className="col-span-3 w-full flex justify-end md:w-auto md:ml-auto">
              <button
                type="button"
                onClick={downloadPdf}
                disabled={!rows.length || loading}
                className="mr-3 w-auto px-5 md:px-6 py-3 rounded-2xl bg-afmc-maroon hover:bg-afmc-maroon2 text-white font-semibold flex items-center justify-center gap-2 shadow hover:shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FaDownload />
                Download PDF
              </button>
              <Actions
                columns={actionColumns}
                onToggleColumn={toggleColumn}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={setRowsPerPage}
                onDownloadCsv={downloadCsv}
                onDownloadPdf={downloadPdf}
                loading={loading}
              />
            </div>
          </div>

          <div className="flex rounded-2xl overflow-hidden border border-gray-200 bg-white mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("in")}
              className={`flex-1 py-3 text-sm font-semibold ${
                activeTab === "in"
                  ? "bg-afmc-maroon/10 text-afmc-maroon border-b-2 border-afmc-maroon"
                  : "text-gray-600"
                }`}
            >
              Stock In Report
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("out")}
              className={`flex-1 py-3 text-sm font-semibold ${
                activeTab === "out"
                  ? "bg-afmc-maroon/10 text-afmc-maroon border-b-2 border-afmc-maroon"
                  : "text-gray-600"
                }`}
            >
              Stock Out Report
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  {isColumnVisible("itemCode") && <th className="px-4 py-3 text-left font-medium">Item Code</th>}
                  {isColumnVisible("itemName") && <th className="px-4 py-3 text-left font-medium">Item Name</th>}
                  {/* {activeTab === "in" && (
                    <th className="px-4 py-3 text-left font-medium">Batch ID</th>
                  )} */}
                  {isColumnVisible("date") && <th className="px-4 py-3 text-left font-medium">
                    Creation  Date
                  </th>}
                  {isColumnVisible("unit") && <th className="px-4 py-3 text-left font-medium">A/c Unit</th>}
                  {isColumnVisible("stock") && <th className="px-4 py-3 text-left font-medium">Stock</th>}
                  {isColumnVisible("totalPrice") && <th className="px-4 py-3 text-left font-medium">Total Price</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={Math.max(1, actionColumns.filter(({ visible }) => visible).length)} className="px-4 py-6 text-center text-gray-500">
                      Loading report...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(1, actionColumns.filter(({ visible }) => visible).length)} className="px-4 py-6 text-center text-gray-500">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={`${row.item_code}-${idx}`} className="border-t border-gray-100">
                      {isColumnVisible("itemCode") && <td className="px-4 py-3">{row.item_code}</td>}
                      {isColumnVisible("itemName") && <td className="px-4 py-3">{toInitCap(row.item_name)}</td>}
                      {/* {activeTab === "in" && (
                        <td className="px-4 py-3">{row.batch_id || "-"}</td>
                      )} */}
                      {isColumnVisible("date") && <td className="px-4 py-3">
                        {formatDisplayDate(row.transaction_date || row.creation_date)}
                      </td>}
                      {isColumnVisible("unit") && <td className="px-4 py-3">{row.ac_unit || "Nos"}</td>}
                      {isColumnVisible("stock") && <td className="px-4 py-3">{row.stock}</td>}
                      {isColumnVisible("totalPrice") && <td className="px-4 py-3">
                        {row.total_price ?? row.totalprice ?? 0}
                      </td>}
                    </tr>
                  ))
                )}
                {!loading && rows.length > 0 && (
                  <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                    {summaryLabelColumnCount > 0 ? (
                      <td className="px-4 py-3" colSpan={summaryLabelColumnCount}>
                        Totals
                      </td>
                    ) : !hasVisibleSummaryValue ? (
                      <td className="px-4 py-3">Totals</td>
                    ) : null}
                    {isColumnVisible("stock") && (
                      <td className="px-4 py-3">
                        {summaryLabelColumnCount === 0
                          ? `Totals: ${summary.total_stock || 0}`
                          : summary.total_stock || 0}
                      </td>
                    )}
                    {isColumnVisible("totalPrice") && (
                      <td className="px-4 py-3">
                        {summaryLabelColumnCount === 0 && !isColumnVisible("stock")
                          ? `Totals: ${summary.total_price || 0}`
                          : summary.total_price || 0}
                      </td>
                    )}
                  </tr>
                )}
              </tbody>
            </table>
            {loadingMore && (
              <p className="px-4 py-4 text-center text-gray-500">
                Loading more report data...
              </p>
            )}
            {!loading && !loadingMore && rows.length > 0 && !hasMore && rowsPerPage !== 0 && (
              <p className="px-4 py-4 text-center text-gray-500">
                No more data
              </p>
            )}
            {!loading && rows.length > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
                <span>
                  {rowsPerPage === 0
                    ? `${rows.length} records`
                    : `Page ${activeTab === "in" ? stockInPage : stockOutPage}`}
                </span>
                {rowsPerPage !== 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={(activeTab === "in" ? stockInPage : stockOutPage) <= 1 || loading}
                      onClick={() =>
                        handleReportPageChange(
                          (activeTab === "in" ? stockInPage : stockOutPage) - 2
                        )
                      }
                      className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={!hasMore || loading}
                      onClick={() =>
                        handleReportPageChange(
                          activeTab === "in" ? stockInPage : stockOutPage
                        )
                      }
                      className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
