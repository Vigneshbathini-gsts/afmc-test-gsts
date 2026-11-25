import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaArrowLeft, FaDownload, FaSearch } from "react-icons/fa";
import api from "../../../services/api";
import Stackreporttab from "./Stackreporttab";
import { toInitCap } from "../../../utils/textFormat";
import { exportTableToPdf } from "../../../utils/pdfExport";
import Actions, { useActionColumns } from "../../../components/common/Actions";
import { exportTableToCsv } from "../../../utils/csvExport";

const BAR_STOCK_PAGE_SIZE = 20;
const BAR_STOCK_COLUMNS = [
  { key: "itemCode", label: "Item Code" },
  { key: "itemName", label: "Item Name" },
  { key: "unit", label: "A/C Unit" },
  { key: "stock", label: "Stock" },
  { key: "rate", label: "Rate" },
  { key: "value", label: "Value" },
  { key: "bottles", label: "Bottles/Nos" },
  { key: "pegs", label: "Pegs" },
  { key: "inventoryStock", label: "Inventory Stock" },
  { key: "totalStock", label: "Total Stock" },
];

export default function BarstockReports() {
  const navigate = useNavigate();
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { actionColumns, isColumnVisible, toggleColumn } =
    useActionColumns(BAR_STOCK_COLUMNS);
  const requestInFlight = useRef(false);
  const [searchParams] = useSearchParams();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemName, setItemName] = useState(searchParams.get("itemName") || "");
  const [activeFilters, setActiveFilters] = useState({
    itemName: searchParams.get("itemName") || "",
    itemCode: searchParams.get("itemCode") || "",
  });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const getAcUnitLabel = useCallback((row) => {
    const value =
      row?.A_C_UNIT ?? row?.a_c_unit ?? row?.ac_unit ?? row?.AC_UNIT ?? row?.A_CUNIT ?? "";
    const raw = String(value || "").trim();
    if (!raw) return "-";

    const key = raw.toLowerCase();
    if (key === "nos") return "Nos";
    if (key === "peg" || key === "pegs") return "Pegs";
    if (key === "glass") return "Glass";
    if (key === "mug") return "Mug";
    if (key === "can") return "Can";

    return toInitCap(raw);
  }, []);

  const fetchData = useCallback(
    async ({ reset = false, nextPage = 0 } = {}) => {
      if (requestInFlight.current) {
        return;
      }

      try {
        requestInFlight.current = true;
        setLoading(true);

        const queryParams = {
          itemName: activeFilters.itemName.trim(),
          itemCode: activeFilters.itemCode.trim(),
        };
        let newData = [];
        if (rowsPerPage === 0) {
          let offsetPage = 0;
          while (true) {
            const res = await api.get("/reports/stock-report", {
              params: {
                ...queryParams,
                limit: BAR_STOCK_PAGE_SIZE,
                offset: offsetPage * BAR_STOCK_PAGE_SIZE,
              },
            });
            const chunk = res.data.data || [];
            newData.push(...chunk);
            if (chunk.length < BAR_STOCK_PAGE_SIZE) break;
            offsetPage += 1;
          }
        } else {
          const res = await api.get("/reports/stock-report", {
            params: {
              ...queryParams,
              limit: rowsPerPage,
              offset: nextPage * rowsPerPage,
            },
          });
          newData = res.data.data || [];
        }

        if (!newData.length && nextPage > 0) {
          setHasMore(false);
          return;
        }

        console.log("Barstock",newData);

        if (reset) {
          setData(newData);
          setPage(rowsPerPage === 0 ? 1 : nextPage + 1);
        } else {
          setData((prev) => [...prev, ...newData]);
          setPage(rowsPerPage === 0 ? 1 : nextPage + 1);
        }

        setHasMore(rowsPerPage !== 0 && newData.length === rowsPerPage);
      } catch (err) {
        console.error("Error fetching data:", err);
        if (reset && nextPage === 0) {
          setData([]);
          setHasMore(false);
        }
      } finally {
        requestInFlight.current = false;
        setLoading(false);
      }
    },
    [activeFilters, rowsPerPage]
  );

  useEffect(() => {
    const nextItemName = searchParams.get("itemName") || "";
    const nextItemCode = searchParams.get("itemCode") || "";

    setItemName(nextItemName);
    setActiveFilters({
      itemName: nextItemName,
      itemCode: nextItemCode,
    });
    setPage(0);
    setHasMore(true);
    setData([]);
  }, [searchParams]);

  useEffect(() => {
    fetchData({ reset: true, nextPage: 0 });
  }, [fetchData]);

  const handleSearch = () => {
    setPage(0);
    setHasMore(true);
    setData([]);
    setActiveFilters({
      itemName: itemName.trim(),
      itemCode: "",
    });
  };

  const fetchAllRows = async () => {
    const allRows = [];
    let offsetPage = 0;
    const pageSize = rowsPerPage || BAR_STOCK_PAGE_SIZE;

    while (true) {
      const res = await api.get("/reports/stock-report", {
        params: {
          itemName: activeFilters.itemName.trim(),
          itemCode: activeFilters.itemCode.trim(),
          limit: pageSize,
          offset: offsetPage * pageSize,
        },
      });

      const chunk = res.data.data || [];
      allRows.push(...chunk);
      if (chunk.length < pageSize) break;
      offsetPage += 1;
    }

    return allRows;
  };

  const getExportRow = (item) => ({
    itemCode: item.item_code ?? "-",
    itemName: toInitCap(item.item_name),
    unit: getAcUnitLabel(item),
    stock: item.stock_quantity ?? item.STOCK_QUANTITY ?? 0,
    rate: item.unit_price ?? 0,
    value: item.value ?? 0,
    bottles: item.bottles ?? 0,
    pegs: item.pegs ?? 0,
    inventoryStock: item.inventory_stock ?? item.INVENTORY_STOCK ?? 0,
    totalStock:
      item.total_stock ??
      item.TOTAL_STOCK ??
      Number(item.stock_quantity ?? item.STOCK_QUANTITY ?? 0) +
        Number(item.inventory_stock ?? item.INVENTORY_STOCK ?? 0),
  });

  const getSelectedColumns = () =>
    BAR_STOCK_COLUMNS.filter(({ key }) => isColumnVisible(key));

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const allRows = await fetchAllRows();
      if (!allRows.length) return;
      const columns = getSelectedColumns();
      exportTableToPdf({
        title: "",
        fileName: "bar-stock-report.pdf",
        headers: columns.map(({ label }) => label),
        rows: allRows.map((item) => {
          const row = getExportRow(item);
          return columns.map(({ key }) => row[key]);
        }),
      });
    } catch (err) {
      console.error("Failed to download bar stock report PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      setDownloading(true);
      const allRows = await fetchAllRows();
      if (!allRows.length) return;
      const columns = getSelectedColumns();
      exportTableToCsv({
        fileName: "bar-stock-report.csv",
        headers: columns.map(({ label }) => label),
        rows: allRows.map((item) => {
          const row = getExportRow(item);
          return columns.map(({ key }) => row[key]);
        }),
      });
    } catch (err) {
      console.error("Failed to download bar stock report CSV:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-hidden bg-gradient-to-br from-afmc-bg via-white to-afmc-bg2 relative">
      <div className="absolute top-16 left-0 md:left-12 w-72 h-72 bg-afmc-maroon/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-0 md:right-20 w-80 h-80 bg-afmc-maroon2/10 rounded-full blur-3xl"></div>

      <div className="relative z-10 w-full p-0 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 pt-4 mb-6 md:mb-8 md:px-0 md:pt-0">
          <h1 className="text-2xl font-semibold text-afmc-maroon">
            Stock Reports
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

        <Stackreporttab showTopBar={false} showReportTitle={false} />

        <div className="mt-6 md:mt-8 bg-white/80 border border-white/60 rounded-none md:rounded-3xl shadow-xl backdrop-blur-sm p-3 md:p-6">
          <div className="flex flex-wrap items-end gap-3 mb-6 md:gap-4">
            <div className="min-w-0 flex-1 md:flex-none md:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Name
              </label>
              <input
                type="text"
                placeholder="Search Item Name..."
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full md:w-72 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 focus:border-afmc-maroon2 focus:ring-2 focus:ring-afmc-maroon2/20"
              />
            </div>

            <button
              type="button"
              onClick={handleSearch}
              className="h-12 w-12 md:w-auto md:px-6 md:py-3 rounded-2xl bg-[#5b5b5b] text-white font-semibold flex items-center justify-center gap-2 shadow hover:shadow-md"
              aria-label="Search bar stock"
            >
              <FaSearch size={16} />
              <span className="hidden md:inline">Search</span>
            </button>

            <Actions
              columns={actionColumns}
              onToggleColumn={toggleColumn}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(value) => {
                setRowsPerPage(value);
                setPage(0);
                setData([]);
              }}
              onDownloadCsv={handleDownloadCsv}
              onDownloadPdf={handleDownloadPdf}
              busy={downloading}
              loading={loading}
            />
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading || loading}
              className="w-auto px-5 py-3 rounded-2xl bg-afmc-maroon hover:bg-afmc-maroon2 text-white font-semibold flex items-center justify-center gap-2 shadow hover:shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
              title="Download PDF"
            >
              <FaDownload size={16} />
              {downloading ? "Downloading..." : "Download"}
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <div className="max-h-[70vh] overflow-auto">
                <table className="min-w-[720px] w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-gray-600">
                    <tr>
                      {isColumnVisible("itemCode") && <th className="px-4 py-3 text-left font-medium">
                        Item Code
                      </th>}
                      {isColumnVisible("itemName") && <th className="px-4 py-3 text-left font-medium">
                        Item Name
                      </th>}
                      {isColumnVisible("unit") && <th className="px-4 py-3 text-left font-medium">
                        A/C Unit
                      </th>}
                      {isColumnVisible("stock") && <th className="px-4 py-3 text-left font-medium">
                        Stock
                      </th>}
                      {isColumnVisible("rate") && <th className="px-4 py-3 text-left font-medium">
                        Rate
                      </th>}
                      {isColumnVisible("value") && <th className="px-4 py-3 text-left font-medium">
                        Value
                      </th>}
                      {isColumnVisible("bottles") && <th className="px-4 py-3 text-left font-medium">
                        Bottles/Nos
                      </th>}
                      {isColumnVisible("pegs") && <th className="px-4 py-3 text-left font-medium">
                        Pegs
                      </th>}
                      {isColumnVisible("inventoryStock") && <th className="px-4 py-3 text-left font-medium">
                        Inventory Stock
                      </th>}
                      {isColumnVisible("totalStock") && <th className="px-4 py-3 text-left font-medium">
                        Total Stock
                      </th>}
                    </tr>
                  </thead>

                  <tbody>
                    {data.map((item, index) => (
                      <tr
                        key={`${item.item_code || "row"}-${index}`}
                        className="border-t border-gray-100 hover:bg-gray-50"
                      >
                        {isColumnVisible("itemCode") && <td className="px-4 py-3">{item.item_code}</td>}
                        {isColumnVisible("itemName") && <td className="px-4 py-3 capitalize">
                          {toInitCap(item.item_name)}
                        </td>}
                        {isColumnVisible("unit") && <td className="px-4 py-3">{getAcUnitLabel(item)}</td>}
                        {isColumnVisible("stock") && <td className="px-4 py-3">{item.stock_quantity ?? item.STOCK_QUANTITY ?? 0}</td>}
                        {isColumnVisible("rate") && <td className="px-4 py-3">{item.unit_price ?? 0}</td>}
                        {isColumnVisible("value") && <td className="px-4 py-3">{item.value ?? 0}</td>}
                        {isColumnVisible("bottles") && <td className="px-4 py-3">{item.bottles ?? 0}</td>}
                        {isColumnVisible("pegs") && <td className="px-4 py-3">{item.pegs ?? 0}</td>}
                        {isColumnVisible("inventoryStock") && <td className="px-4 py-3">{item.inventory_stock ?? item.INVENTORY_STOCK ?? 0}</td>}
                        {isColumnVisible("totalStock") && <td className="px-4 py-3">{item.total_stock ?? item.TOTAL_STOCK ?? Number(item.stock_quantity ?? item.STOCK_QUANTITY ?? 0) + Number(item.inventory_stock ?? item.INVENTORY_STOCK ?? 0)}</td>}
                      </tr>
                    ))}

                    {!loading && !data.length && (
                      <tr>
                        <td className="px-4 py-6 text-center text-gray-500" colSpan={Math.max(1, actionColumns.filter(({ visible }) => visible).length)}>
                          No records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {loading && (
                  <p className="px-4 py-6 text-center text-gray-500">
                    Loading...
                  </p>
                )}
                {!loading && data.length > 0 && !hasMore && rowsPerPage !== 0 && (
                  <p className="px-4 py-6 text-center text-gray-500">
                    No more data
                  </p>
                )}
                {!loading && data.length > 0 && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
                    <span>
                      {rowsPerPage === 0 ? `${data.length} records` : `Page ${page}`}
                    </span>
                    {rowsPerPage !== 0 && <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page <= 1 || loading}
                        onClick={() => fetchData({ reset: true, nextPage: page - 2 })}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={!hasMore || loading}
                        onClick={() => fetchData({ reset: true, nextPage: page })}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
