import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaSearch, FaArrowLeft, FaDownload } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { inventoryAPI } from "../../services/api";
import { exportTableToPdf } from "../../utils/pdfExport";
import { toInitCap } from "../../utils/textFormat";

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

const getBarcodeDetails = (item) => {
  const raw = item?.barcode_details ?? item?.BARCODE_DETAILS;
  if (Array.isArray(raw)) return raw.filter((entry) => entry?.barcode);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((entry) => entry?.barcode);
    } catch (_) {
      // Use the legacy barcode list if detailed data is unavailable.
    }
  }
  return String(item?.barcodes ?? item?.BARCODES ?? item?.barcode ?? item?.BARCODE ?? "")
    .split(",").map((barcode) => barcode.trim()).filter(Boolean).map((barcode) => ({ barcode }));
};

const formatBarcodeDate = (value) => {
  if (!value) return "-";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/);
  if (match) {
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0)));
    const options = { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" };
    if (match[4] !== undefined) Object.assign(options, { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
    const formatted = new Intl.DateTimeFormat("en-IN", options).format(date);
    return match[4] !== undefined ? `${formatted} IST` : formatted;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
};

export default function StockReports() {
  const navigate = useNavigate();
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
  const [selectedBarcodeItem, setSelectedBarcodeItem] = useState(null);
  const requestInFlight = useRef(false);
  const searchTermRef = useRef("");

  const fetchStockIn = useCallback(async (queryParams, { reset = true, nextPage = 0 } = {}) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError("");
    try {
      const response = await inventoryAPI.getStockInReport({
        ...queryParams,
        limit: REPORT_PAGE_SIZE,
        offset: nextPage * REPORT_PAGE_SIZE,
      });
      const rows = response.data.data || [];
      const summary = response.data.summary || { total_stock: 0, total_price: 0 };
      setStockInRows((current) => (reset ? rows : [...current, ...rows]));
      setStockInSummary(summary);
      setStockInPage(nextPage + 1);
      setStockInHasMore(rows.length === REPORT_PAGE_SIZE);
    } catch (err) {
      console.error("Failed to load stock-in report:", err);
      setError("Failed to load stock-in report.");
      if (reset) setStockInRows([]);
      setStockInHasMore(false);
    } finally {
      requestInFlight.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const fetchStockOut = useCallback(async (queryParams, { reset = true, nextPage = 0 } = {}) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError("");
    try {
      const response = await inventoryAPI.getStockOutReport({
        ...queryParams,
        limit: REPORT_PAGE_SIZE,
        offset: nextPage * REPORT_PAGE_SIZE,
      });
      const rows = response.data.data || [];
      const summary = response.data.summary || { total_stock: 0, total_price: 0 };
      setStockOutRows((current) => (reset ? rows : [...current, ...rows]));
      setStockOutSummary(summary);
      setStockOutPage(nextPage + 1);
      setStockOutHasMore(rows.length === REPORT_PAGE_SIZE);
      console.log("data stock reports",response.data)
      console.log("summary",summary)
      
    } catch (err) {
      console.error("Failed to load stock-out report:", err);
      setError("Failed to load stock-out report.");
      if (reset) setStockOutRows([]);
      setStockOutHasMore(false);
    } finally {
      requestInFlight.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

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
  const selectedBarcodeDetails = getBarcodeDetails(selectedBarcodeItem);

  const handleReportScroll = (event) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
    if (scrollTop + clientHeight < scrollHeight - 80 || loading || loadingMore || !hasMore) {
      return;
    }

    const queryParams = {
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      search: searchTerm.trim() || undefined,
    };

    if (activeTab === "in") {
      fetchStockIn(queryParams, { reset: false, nextPage: stockInPage });
    } else {
      fetchStockOut(queryParams, { reset: false, nextPage: stockOutPage });
    }
  };

  const downloadPdf = async () => {
    if (!rows || rows.length === 0) return;

    const isStockIn = activeTab === "in";
    const reportRows = [];
    let offsetPage = 0;
    const queryParams = {
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      search: searchTerm.trim() || undefined,
    };

    while (true) {
      const response = isStockIn
        ? await inventoryAPI.getStockInReport({
            ...queryParams,
            limit: REPORT_PAGE_SIZE,
            offset: offsetPage * REPORT_PAGE_SIZE,
          })
        : await inventoryAPI.getStockOutReport({
            ...queryParams,
            limit: REPORT_PAGE_SIZE,
            offset: offsetPage * REPORT_PAGE_SIZE,
          });
      const chunk = response.data.data || [];
      reportRows.push(...chunk);
      if (chunk.length < REPORT_PAGE_SIZE) break;
      offsetPage += 1;
    }

    const tableRows = reportRows.map((row) =>
      isStockIn
        ? [
            row.item_code,
            row.item_name,
            // row.batch_id || "-",
            formatReportDate(row.transaction_date || row.creation_date),
            row.ac_unit || "Nos",
            row.stock,
            row.total_price ?? row.totalprice ?? 0,
          ]
        : [
            row.item_code,
            row.item_name,
            formatReportDate(row.creation_date),
            row.ac_unit || "Nos",
            row.stock,
            row.total_price ?? row.totalprice ?? 0,
          ]
    );

    const totalStock = reportRows.reduce(
      (sum, row) => sum + Number(row.stock || 0),
      0
    );
    const totalPrice = reportRows.reduce(
      (sum, row) => sum + Number(row.total_price ?? row.totalprice ?? 0),
      0
    );

    if (isStockIn) {
      tableRows.push(["", "", "Totals", "", totalStock, totalPrice]);
    } else {
      tableRows.push(["", "", "Totals", "", totalStock, totalPrice]);
    }

    exportTableToPdf({
      title: isStockIn ? "Stock In Report" : "Stock Out Report",
      fileName: isStockIn ? "stock-in-report.pdf" : "stock-out-report.pdf",
      subtitle: `From: ${formatReportDate(fromDate)}    To: ${formatReportDate(
        toDate
      )}`,
      headers: isStockIn
        ? [
            "Item Code",
            "Item Name",
            // "Batch ID",
            "Transaction Date",
            "A/c Unit",
            "Stock",
            "Total Price",
          ]
        : [
            "Item Code",
            "Item Name",
            "Transaction Date",
            "A/c Unit",
            "Stock",
            "Total Price",
          ],
      rows: tableRows,
      orientation: "portrait",
    });
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
                className="w-auto px-5 md:px-6 py-3 rounded-2xl bg-afmc-maroon hover:bg-afmc-maroon2 text-white font-semibold flex items-center justify-center gap-2 shadow hover:shadow-md transition"
              >
                <FaDownload />
                Download PDF
              </button>
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
            <div className="max-h-[70vh] overflow-auto" onScroll={handleReportScroll}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Item Code</th>
                  <th className="px-4 py-3 text-left font-medium">Item Name</th>
                  {/* {activeTab === "in" && (
                    <th className="px-4 py-3 text-left font-medium">Batch ID</th>
                  )} */}
                  <th className="px-4 py-3 text-left font-medium">
                    Creation  Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium">A/c Unit</th>
                  <th className="px-4 py-3 text-left font-medium">Stock</th>
                  <th className="px-4 py-3 text-left font-medium">Total Price</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      Loading report...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={`${row.item_code}-${idx}`} className="border-t border-gray-100">
                      <td className="px-4 py-3">{row.item_code}</td>
                      <td className="px-4 py-3"><button type="button" className="text-left text-afmc-maroon hover:underline" onClick={() => setSelectedBarcodeItem(row)}>{toInitCap(row.item_name)}</button></td>
                      {/* {activeTab === "in" && (
                        <td className="px-4 py-3">{row.batch_id || "-"}</td>
                      )} */}
                      <td className="px-4 py-3">
                        {formatDisplayDate(row.transaction_date || row.creation_date)}
                      </td>
                      <td className="px-4 py-3">{row.ac_unit || "Nos"}</td>
                      <td className="px-4 py-3">{row.stock}</td>
                      <td className="px-4 py-3">
                        {row.total_price ?? row.totalprice ?? 0}
                      </td>
                    </tr>
                  ))
                )}
                {!loading && rows.length > 0 && (
                  <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                    <td className="px-4 py-3" colSpan={4}>
                      Totals
                    </td>
                    <td className="px-4 py-3">{summary.total_stock || 0}</td>
                    <td className="px-4 py-3">{summary.total_price || 0}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {loadingMore && (
              <p className="px-4 py-4 text-center text-gray-500">
                Loading more report data...
              </p>
            )}
            {!loading && !loadingMore && rows.length > 0 && !hasMore && (
              <p className="px-4 py-4 text-center text-gray-500">
                No more data
              </p>
            )}
            </div>
          </div>
        </div>
      </div>
      {selectedBarcodeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onClick={() => setSelectedBarcodeItem(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="report-barcode-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div><h2 id="report-barcode-title" className="text-xl font-semibold text-afmc-maroon">Item barcodes</h2><p className="text-sm text-gray-600">{toInitCap(selectedBarcodeItem.item_name)} ({selectedBarcodeItem.item_code})</p></div>
              <button type="button" onClick={() => setSelectedBarcodeItem(null)} className="rounded-lg px-3 py-1 text-gray-600 hover:bg-gray-100" aria-label="Close">X</button>
            </div>
            {selectedBarcodeDetails.length ? (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600"><tr><th className="px-3 py-2">Barcode</th><th className="px-3 py-2">Stock date</th><th className="px-3 py-2">Quantity</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2">Rate</th><th className="px-3 py-2">Batch</th></tr></thead>
                  <tbody>{selectedBarcodeDetails.map((detail, index) => <tr key={`${detail.barcode}-${index}`} className="border-t"><td className="px-3 py-2 font-mono">{detail.barcode}</td><td className="px-3 py-2">{formatBarcodeDate(detail.date)}</td><td className="px-3 py-2">{detail.quantity ?? "-"}</td><td className="px-3 py-2">{detail.ac_unit || "-"}</td><td className="px-3 py-2">{detail.unit_price ?? detail.rate ?? "-"}</td><td className="px-3 py-2">{detail.batch || "-"}</td></tr>)}</tbody>
                </table>
              </div>
            ) : <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">No barcode is available for this item.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
