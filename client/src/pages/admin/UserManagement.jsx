import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  ChevronsLeft,
  Eye,
  EyeOff,
  X,
  PlusCircle,
  Search,
  UploadCloud,
  KeyRound,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { userAPI } from "../../services/api";
import { getPasswordPolicyError } from "../../utils/passwordPolicy";
import Actions, { useActionColumns } from "../../components/common/Actions";
import { exportTableToPdf } from "../../utils/pdfExport";
import { exportTableToCsv } from "../../utils/csvExport";

const STATUS_STYLES = {
  Active: "bg-[#ebf7ef] text-[#1f7a3d] border-[#cbe8d3]",
  Inactive: "bg-[#fff1f1] text-[#b04444] border-[#f1c8c8]",
};

const formatRoleLabel = (role) => {
  if (!role) return "-";
  if (role === "Order") return "Order Attendent";
  return role.replace(/_/g, " ");
};

const INITIAL_FORM = {
  loginType: "Member",
  firstName: "",
  lastName: "",
  userName: "",
  password: "",
  confirmPassword: "",
  email: "",
  phoneNumber: "",
  department: "", // holds DEPARTMENT_ID
  rank: "",       // holds RANK_ID
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;

const USER_TABLE_COLUMNS = [
  { key: "userName", label: "User Name" },
  { key: "status", label: "Status" },
  { key: "role", label: "Role" },
  { key: "loginType", label: "Login Type" },
];

const validateCreateForm = (formData) => {
  if (!formData.firstName.trim()) return "First name is required.";
  if (formData.firstName.trim().length < 2)
    return "First name must be at least 2 characters.";
  if (!formData.lastName.trim()) return "Last name is required.";
  if (!formData.userName.trim()) return "User name is required.";
  if (!EMAIL_REGEX.test(formData.userName.trim()))
    return "Please enter a valid email address for User Name.";
  if (!formData.password) return "Password is required.";
  const passwordError = getPasswordPolicyError(
    formData.password,
    formData.confirmPassword
  );
  if (passwordError) return passwordError;
  if (!formData.email.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(formData.email.trim()))
    return "Please enter a valid email address.";
  if (!formData.phoneNumber.trim()) return "Phone number is required.";
  if (!PHONE_REGEX.test(formData.phoneNumber.trim()))
    return "Phone number must be exactly 10 digits.";
  if (!formData.department) return "Department is required.";
  if (!formData.rank) return "Rank is required.";
  return "";
};

export default function UserManagement() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const { actionColumns, isColumnVisible, toggleColumn } =
    useActionColumns(USER_TABLE_COLUMNS);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const uploadInputRef = useRef(null);

  // Department & Rank options
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [rankOptions, setRankOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  // ---------- API helpers ----------
  const fetchDepartmentOptions = useCallback(async () => {
    const response = await userAPI.getDepartmentOptions();
    return response.data?.data || [];
  }, []);

  const fetchRankOptions = useCallback(async () => {
    const response = await userAPI.getRankOptions();
    return response.data?.data || [];
  }, []);

  const loadFormOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const [departments, ranks] = await Promise.all([
        fetchDepartmentOptions(),
        fetchRankOptions(),
      ]);
      setDepartmentOptions(departments);
      setRankOptions(ranks);
    } catch (err) {
      console.error("Failed to load form options:", err);
      toast.error("Unable to load Department / Rank options.");
    } finally {
      setOptionsLoading(false);
    }
  }, [fetchDepartmentOptions, fetchRankOptions]);

  // ---------- Users list ----------
  const fetchUsers = useCallback(async (searchValue = "") => {
    try {
      setLoading(true);
      setError("");
      const response = await userAPI.getAll(searchValue.trim());
      setUsers(response.data?.data || []);
      setCurrentPage(1);
    } catch (fetchError) {
      console.error("Failed to fetch users:", fetchError);
      const msg =
        fetchError.response?.data?.message || "Unable to load user details.";
      setUsers([]);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = () => {
    fetchUsers(search);
  };

  // ---------- Pagination / Export ----------
  const visibleUsers = useMemo(() => users || [], [users]);
  const totalPages =
    rowsPerPage === 0 ? 1 : Math.ceil(visibleUsers.length / rowsPerPage);
  const currentUsers =
    rowsPerPage === 0
      ? visibleUsers
      : visibleUsers.slice(
          (currentPage - 1) * rowsPerPage,
          currentPage * rowsPerPage
        );

  const userExportRows = visibleUsers.map((row) => ({
    userName: row.USER_NAME || "-",
    status: row.status || "-",
    role: formatRoleLabel(row.Role),
    loginType: row.LOGIN_TYPE
      ? `${row.LOGIN_TYPE.charAt(0)}${row.LOGIN_TYPE.slice(1).toLowerCase()}`
      : "-",
  }));

  const selectedUserColumns = USER_TABLE_COLUMNS.filter(({ key }) =>
    isColumnVisible(key)
  );

  const downloadUsersCsv = () => {
    if (!userExportRows.length) {
      toast.info("No users to download.");
      return;
    }
    exportTableToCsv({
      fileName: "users.csv",
      headers: selectedUserColumns.map(({ label }) => label),
      rows: userExportRows.map((row) =>
        selectedUserColumns.map(({ key }) => row[key])
      ),
    });
  };

  const downloadUsersPdf = () => {
    if (!userExportRows.length) {
      toast.info("No users to download.");
      return;
    }
    exportTableToPdf({
      title: "User Management",
      fileName: "users.pdf",
      headers: selectedUserColumns.map(({ label }) => label),
      rows: userExportRows.map((row) =>
        selectedUserColumns.map(({ key }) => row[key])
      ),
    });
  };

  // ---------- Current user (for createdBy) ----------
  const currentUser = useMemo(() => {
    if (user) {
      return (
        user?.username ||
        user?.email ||
        user?.user_name ||
        user?.name ||
        "SYSTEM"
      );
    }
    try {
      const storedUser = localStorage.getItem("authUser");
      const parsed = storedUser ? JSON.parse(storedUser) : null;
      return (
        parsed?.username ||
        parsed?.email ||
        parsed?.user_name ||
        parsed?.name ||
        "SYSTEM"
      );
    } catch {
      return "SYSTEM";
    }
  }, [user]);

  // ---------- Form helpers ----------
  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setFormError("");
    setFormSuccess("");
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
    loadFormOptions(); // load Department + Rank when modal opens
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setSaving(false);
    resetForm();
  };

  const openUploadModal = () => {
    setUploadFile(null);
    setUploadError("");
    setUploadSuccess("");
    if (uploadInputRef.current) uploadInputRef.current.value = "";
    setIsUploadModalOpen(true);
  };

  const closeUploadModal = () => {
    setUploadFile(null);
    setUploadError("");
    setUploadSuccess("");
    setUploading(false);
    if (uploadInputRef.current) uploadInputRef.current.value = "";
    setIsUploadModalOpen(false);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    const normalizedValue =
      name === "phoneNumber" ? value.replace(/\D/g, "").slice(0, 10) : value;

    setFormError("");
    setFormSuccess("");
    setFormData((prev) => ({
      ...prev,
      [name]: normalizedValue,
    }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");

    const validationMessage = validateCreateForm(formData);
    if (validationMessage) {
      setFormError(validationMessage);
      toast.error(validationMessage);
      return;
    }

    const payload = {
      loginType: formData.loginType,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      userName: formData.userName.trim(),
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      email: formData.email.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      departmentId: formData.department ? Number(formData.department) : null,
      rankId: formData.rank ? Number(formData.rank) : null,
      createdBy: currentUser,
    };

    try {
      setSaving(true);
      const response = await userAPI.create(payload);
      const successMessage =
        response.data?.message || "User created successfully.";
      setFormSuccess(successMessage);
      toast.success(successMessage);
      await fetchUsers(search);
      setTimeout(() => closeCreateModal(), 900);
    } catch (saveError) {
      console.error("Failed to create user:", saveError);
      const msg =
        saveError.response?.data?.message || "Unable to create user.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ---------- Bulk upload ----------
  const handleTemplateDownload = async () => {
    const XLSX = await import("xlsx");
    const columns = [
      "Login Type",
      "Full Name With Rank",
      "First Name",
      "Last Name",
      "User Name",
      "Password",
      "Confirm Password",
      "Email",
      "Phone Number",
      "Department",
      "Rank",
    ];
    const sampleRow = [
      "END USER",
      "Capt Ram Kumar",
      "Ram",
      "Kumar",
      "ram.kumar@example.com",
      "Pass123",
      "Pass123",
      "ram.kumar@example.com",
      "9876543210",
      "",
      "",
    ];
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["AFMC Users Bulk Upload Template"],
      [
        "Fill the required columns. Department and Rank are optional; use their exact active names. Phone Number must be exactly 10 digits. Keep User Name as a valid email address.",
      ],
      columns,
      sampleRow,
    ]);

    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: columns.length - 1 } },
    ];
    worksheet["!cols"] = [
      { wch: 16 },
      { wch: 26 },
      { wch: 16 },
      { wch: 16 },
      { wch: 28 },
      { wch: 14 },
      { wch: 18 },
      { wch: 30 },
      { wch: 16 },
      { wch: 24 },
      { wch: 20 },
    ];
    worksheet.A1.s = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 16 },
      fill: { fgColor: { rgb: "5B1F2A" } },
      alignment: { horizontal: "center" },
    };
    worksheet.A2.s = {
      font: { bold: true, color: { rgb: "4A2F12" } },
      fill: { fgColor: { rgb: "FFF4D6" } },
    };
    columns.forEach((_, index) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 2, c: index });
      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1F2937" } },
        alignment: { horizontal: "center" },
      };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users Upload");
    XLSX.writeFile(workbook, "multiple-employee-template.xlsx");
  };

  const handleUploadFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setUploadFile(selectedFile);
    setUploadError("");
    setUploadSuccess("");
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      const msg = "Please choose a CSV or Excel template file to upload.";
      setUploadError(msg);
      toast.error(msg);
      return;
    }

    const formPayload = new FormData();
    formPayload.append("file", uploadFile);
    formPayload.append("createdBy", currentUser);

    try {
      setUploading(true);
      setUploadError("");
      setUploadSuccess("");

      const response = await userAPI.bulkUpload(formPayload);
      const result = response.data?.data;

      const skippedMessages = (result?.skippedRows || [])
        .slice(0, 5)
        .map((item) => item.reason)
        .join(" | ");

      const successMsg = `${
        response.data?.message || "Bulk upload completed."
      } Skipped: ${result?.skippedCount || 0}${
        skippedMessages ? ` (${skippedMessages})` : ""
      }`;

      setUploadSuccess(successMsg);
      setUploadFile(null);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
      toast.success(successMsg);
      await fetchUsers(search);
      setTimeout(() => closeUploadModal(), 1200);
    } catch (err) {
      console.error("Failed to bulk upload users:", err);
      const backendErrors = err.response?.data?.errors;
      const msg =
        Array.isArray(backendErrors) && backendErrors.length
          ? backendErrors.join(" | ")
          : err.response?.data?.message || "Unable to upload users.";
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-afmc-bg via-white to-afmc-bg2 relative">
      <div className="absolute top-16 left-12 h-72 w-72 rounded-full bg-afmc-maroon/10 blur-3xl" />
      <div className="absolute bottom-20 right-20 h-80 w-80 rounded-full bg-afmc-maroon2/10 blur-3xl" />

      <div className="relative z-10 px-0 py-4 md:p-8">
        <style>{`
          .password-field::-ms-reveal,
          .password-field::-ms-clear {
            display: none;
          }
          .password-field::-webkit-textfield-decoration-container,
          .password-field::-webkit-credentials-auto-fill-button {
            display: none !important;
          }
        `}</style>

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            User Management
          </h1>
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="self-end sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow hover:shadow-md border border-afmc-gold/30 text-gray-700 hover:text-afmc-maroon hover:bg-afmc-maroon/5 transition max-w-max"
          >
            <ChevronsLeft size={16} />
            Go To Dashboard
          </button>
        </div>

        {/* Main card */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
          {/* Search + Actions */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Search
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <Search size={18} className="text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    placeholder="Search by user name, officer id, role..."
                    className="w-full bg-transparent text-gray-800 outline-none placeholder:text-gray-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearch}
                  className="flex items-center gap-2 rounded-2xl bg-afmc-maroon px-5 py-3 font-semibold text-white shadow-afmc transition hover:bg-afmc-maroon2 focus:outline-none focus:ring-2 focus:ring-afmc-gold/50"
                >
                  <Search size={16} />
                  Search
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openUploadModal}
                className="inline-flex items-center gap-2 rounded-2xl border border-afmc-maroon bg-white px-5 py-3 font-semibold text-afmc-maroon transition hover:bg-afmc-maroon/5"
              >
                <UploadCloud size={18} />
                Upload Users Details
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-2xl border border-afmc-maroon bg-white px-5 py-3 font-semibold text-afmc-maroon transition hover:bg-afmc-maroon/5"
              >
                <PlusCircle size={18} />
                Add User
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-6 md:mt-8">
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="mb-3 flex justify-end">
              <Actions
                columns={actionColumns}
                onToggleColumn={toggleColumn}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(value) => {
                  setRowsPerPage(value);
                  setCurrentPage(1);
                }}
                onDownloadCsv={downloadUsersCsv}
                onDownloadPdf={downloadUsersPdf}
                loading={loading}
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-afmc-gold/25 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="bg-afmc-maroon/5 text-afmc-maroon">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">View</th>
                      {isColumnVisible("userName") && (
                        <th className="px-4 py-3 text-left font-medium">
                          User Name
                        </th>
                      )}
                      {isColumnVisible("status") && (
                        <th className="px-4 py-3 text-left font-medium">
                          Status
                        </th>
                      )}
                      {isColumnVisible("role") && (
                        <th className="px-4 py-3 text-left font-medium">Role</th>
                      )}
                      {isColumnVisible("loginType") && (
                        <th className="px-4 py-3 text-left font-medium">
                          Login Type
                        </th>
                      )}
                      <th className="px-1 py-3 text-center font-medium">
                        Reset Password
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          className="px-4 py-6 text-center text-gray-500"
                          colSpan={2 + selectedUserColumns.length}
                        >
                          Loading user details...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td
                          className="px-4 py-6 text-center text-red-600"
                          colSpan={2 + selectedUserColumns.length}
                        >
                          {error}
                        </td>
                      </tr>
                    ) : currentUsers.length ? (
                      currentUsers.map((u) => {
                        const statusClass =
                          STATUS_STYLES[u.status] || STATUS_STYLES.Inactive;
                        return (
                          <tr
                            key={u.USER_ID}
                            className="border-t border-gray-100 transition-colors hover:bg-afmc-gold/10"
                          >
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/admin/users/${u.USER_ID}`)
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-afmc-maroon transition hover:bg-afmc-maroon/10"
                                aria-label={`View ${u.USER_NAME}`}
                              >
                                <Eye size={18} />
                              </button>
                            </td>
                            {isColumnVisible("userName") && (
                              <td className="px-4 py-3 font-medium text-gray-800">
                                {u.USER_NAME || "-"}
                              </td>
                            )}
                            {isColumnVisible("status") && (
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${statusClass}`}
                                >
                                  {u.status}
                                </span>
                              </td>
                            )}
                            {isColumnVisible("role") && (
                              <td className="px-4 py-3 text-gray-700">
                                {formatRoleLabel(u.Role)}
                              </td>
                            )}
                            {isColumnVisible("loginType") && (
                              <td className="px-4 py-3 text-gray-700">
                                {u.LOGIN_TYPE
                                  ? `${u.LOGIN_TYPE.charAt(0)}${u.LOGIN_TYPE
                                      .slice(1)
                                      .toLowerCase()}`
                                  : "-"}
                              </td>
                            )}
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/admin/users/${u.USER_ID}/reset-password`
                                  )
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-afmc-maroon transition hover:border-afmc-maroon/30 hover:bg-afmc-maroon/10 focus:outline-none focus:ring-2 focus:ring-afmc-maroon/30"
                                aria-label={`Reset password for ${u.USER_NAME}`}
                                title="Reset password"
                              >
                                <KeyRound size={17} strokeWidth={2.2} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          className="px-4 py-6 text-center text-gray-500"
                          colSpan={2 + selectedUserColumns.length}
                        >
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {visibleUsers.length > 0 && (
                <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
                  <span>
                    {rowsPerPage === 0
                      ? `All ${visibleUsers.length} users`
                      : `Page ${currentPage} of ${totalPages || 1} (${
                          visibleUsers.length
                        } users)`}
                  </span>
                  {rowsPerPage !== 0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
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

      {/* ===================== CREATE USER MODAL ===================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2c2118]/35 p-4 backdrop-blur-[2px]">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/70 bg-white/95 p-5 shadow-2xl backdrop-blur-md">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(193,173,144,0.12)_0%,rgba(193,173,144,0.04)_38%,transparent_68%)]" />

            <div className="relative mb-3 flex items-center justify-between border-b border-gray-100 pb-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Add User</h2>
                <p className="text-xs text-gray-500">
                  Create a new account using the same form pattern as inventory
                  management.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="text-gray-500 transition hover:text-gray-700"
                aria-label="Close create user modal"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleCreateUser}
              className="relative"
              autoComplete="off"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                {/* Login Type */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Login Type
                  </label>
                  <select
                    name="loginType"
                    value={formData.loginType}
                    onChange={handleFormChange}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 outline-none transition focus:border-afmc-maroon2 focus:ring-2 focus:ring-afmc-maroon2/20"
                  >
                    <option value="Member">Member</option>
                    <option value="Non Member">Non Member</option>
                  </select>
                </div>

                {/* First Name */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleFormChange}
                    maxLength={25}
                    placeholder="Enter first name"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 outline-none transition focus:border-afmc-maroon2 focus:ring-2 focus:ring-afmc-maroon2/20"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleFormChange}
                    maxLength={25}
                    placeholder="Enter last name"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 outline-none transition focus:border-afmc-maroon2 focus:ring-2 focus:ring-afmc-maroon2/20"
                  />
                </div>

                {/* User Name */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    User Name
                  </label>
                  <input
                    type="email"
                    name="userName"
                    value={formData.userName}
                    onChange={handleFormChange}
                    autoComplete="off"
                    maxLength={100}
                    placeholder="Enter username same as email"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 outline-none transition focus:border-afmc-maroon2 focus:ring-2 focus:ring-afmc-maroon2/20"
                  />
                </div>

                {/* ========== DEPARTMENT ========== */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleFormChange}
                    disabled={optionsLoading}
                    required
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 outline-none transition focus:border-afmc-maroon2 focus:ring-2 focus:ring-afmc-maroon2/20 disabled:opacity-60"
                  >
                    <option value="">
                      {optionsLoading
                        ? "Loading departments..."
                        : "Select Department"}
                    </option>
                    {departmentOptions.map((dept) => (
                      <option
                        key={dept.DEPARTMENT_ID}
                        value={dept.DEPARTMENT_ID}
                      >
                        {dept.DEPARTMENT_NAME}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ========== RANK ========== */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Rank <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="rank"
                    value={formData.rank}
                    onChange={handleFormChange}
                    disabled={optionsLoading}
                    required
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 outline-none transition focus:border-afmc-maroon2 focus:ring-2 focus:ring-afmc-maroon2/20 disabled:opacity-60"
                  >
                    <option value="">
                      {optionsLoading ? "Loading ranks..." : "Select Rank"}
                    </option>
                    {rankOptions.map((r) => (
                      <option key={r.RANK_ID} value={r.RANK_ID}>
                        {r.RANK_NAME}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    autoComplete="off"
                    maxLength={100}
                    placeholder="Enter email"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 outline-none transition focus:border-afmc-maroon2 focus:ring-2 focus:ring-afmc-maroon2/20"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleFormChange}
                      autoComplete="new-password"
                      minLength={6}
                      maxLength={72}
                      placeholder="Enter password"
                      className="password-field w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 pr-10 text-sm text-gray-800 outline-none transition focus:border-afmc-maroon2 focus:ring-2 focus:ring-afmc-maroon2/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-700"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleFormChange}
                      autoComplete="new-password"
                      minLength={6}
                      maxLength={72}
                      placeholder="Re-enter password"
                      className="password-field w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 pr-10 text-sm text-gray-800 outline-none transition focus:border-afmc-maroon2 focus:ring-2 focus:ring-afmc-maroon2/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-700"
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleFormChange}
                    inputMode="numeric"
                    pattern="\d{10}"
                    maxLength={10}
                    placeholder="Enter 10-digit phone number"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 outline-none transition focus:border-afmc-maroon2 focus:ring-2 focus:ring-afmc-maroon2/20"
                  />
                </div>
              </div>

              {formError && (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-[#b04444]">
                  {formError}
                </p>
              )}
              {formSuccess && (
                <p className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-[#2f7a3f]">
                  {formSuccess}
                </p>
              )}

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-full bg-gray-600 px-5 py-2 text-sm font-semibold text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-afmc-maroon px-5 py-2 text-sm font-semibold text-white transition hover:bg-afmc-maroon2 disabled:cursor-not-allowed disabled:bg-[#9cac74]"
                >
                  <PlusCircle size={18} />
                  {saving ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== UPLOAD MODAL ===================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2c2118]/35 p-4 backdrop-blur-[2px]">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-[18px] border border-[#d8ccbe] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(249,245,239,0.98)_100%)] shadow-[0_30px_90px_rgba(61,41,18,0.22)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(193,173,144,0.16)_0%,rgba(193,173,144,0.05)_34%,transparent_65%)]" />

            <div className="relative flex items-center justify-between border-b border-[#eadfd2] px-5 py-3">
              <h2 className="text-[20px] font-semibold text-[#2a221b]">
                Multiple Employee Creation
              </h2>
              <button
                type="button"
                onClick={closeUploadModal}
                className="text-[#5d5044] transition hover:text-[#1f1a15]"
                aria-label="Close upload users modal"
              >
                <X size={22} />
              </button>
            </div>

            <div className="relative p-5">
              <div className="rounded-[14px] border border-[#e5dbd0] bg-white/90 p-4 shadow-[0_12px_30px_rgba(61,41,18,0.12)]">
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleTemplateDownload}
                    className="rounded-md bg-[#3f3935] px-5 py-2 text-base font-semibold text-white transition hover:bg-[#302b28]"
                  >
                    Sample Template
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm text-[#5f564d]">
                      Upload File:
                    </label>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={handleUploadFileChange}
                      className="block w-full rounded-md border border-dashed border-[#9b8f82] bg-white px-3 py-2 text-[#241d17] file:mr-4 file:rounded file:border-0 file:bg-transparent file:text-base"
                    />
                  </div>

                  {uploadError && (
                    <p className="text-sm font-medium text-[#b04444]">
                      {uploadError}
                    </p>
                  )}
                  {uploadSuccess && (
                    <p className="text-sm font-medium text-[#2f7a3f]">
                      {uploadSuccess}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleBulkUpload}
                      disabled={uploading}
                      className="rounded-md bg-[#3f3935] px-8 py-2 text-lg font-semibold text-white transition hover:bg-[#302b28] disabled:cursor-not-allowed disabled:bg-[#8f8883]"
                    >
                      {uploading ? "Uploading..." : "Upload"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}