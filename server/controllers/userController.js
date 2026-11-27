const userModel = require("../models/userModel");
const XLSX = require("xlsx");
const { validatePassword } = require("../helpers/authHelper");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const isOtherOption = (value) =>
  String(value ?? "").trim().toUpperCase() === "OTHER";

const normalizeOptionId = (value) => {
  if (value == null || value === "" || isOtherOption(value)) return null;
  return Number(value);
};

const normalizeUserPayload = (payload = {}) => ({
  loginType: String(payload.loginType || "").trim(),
  firstName: String(payload.firstName || "").trim(),
  lastName: String(payload.lastName || "").trim(),
  userName: String(payload.userName || "").trim(),
  password: String(payload.password || ""),
  confirmPassword: String(payload.confirmPassword || ""),
  email: String(payload.email || "").trim(),
  phoneNumber: String(payload.phoneNumber || "").trim(),
  createdBy: String(payload.createdBy || "").trim(),
  roleId: payload.roleId,
  status: String(payload.status || "").trim(),
  departmentIsOther: isOtherOption(payload.departmentId),
  rankIsOther: isOtherOption(payload.rankId),
  departmentId: normalizeOptionId(payload.departmentId),
  rankId: normalizeOptionId(payload.rankId),
  otherDepartment: String(payload.otherDepartment || "").trim(),
  otherRank: String(payload.otherRank || "").trim(),
});

const isValidOptionId = (value) =>
  Number.isInteger(value) && value > 0;

const validateOptionSelection = (
  label,
  optionId,
  isOther,
  customValue,
  required
) => {
  const normalizedLabel = label.toLowerCase();
  if (customValue.length > 255) {
    return `Other ${normalizedLabel} must be 255 characters or fewer`;
  }
  if (isOther) {
    return customValue ? null : `Enter the ${normalizedLabel}`;
  }
  if (customValue) {
    return `Select Others to enter a custom ${normalizedLabel}`;
  }
  if (optionId == null) {
    return required ? `${label} is required` : null;
  }
  return isValidOptionId(optionId)
    ? null
    : `Invalid ${normalizedLabel} selected`;
};

const validateCreatePayload = (payload) => {
  if (
    !payload.loginType ||
    !payload.firstName ||
    !payload.lastName ||
    !payload.userName ||
    !payload.password ||
    !payload.confirmPassword ||
    !payload.email ||
    !payload.phoneNumber
  ) {
    return "All fields are required";
  }

  if (!["Member", "Non Member"].includes(payload.loginType)) {
    return "Invalid login type";
  }

  if (payload.firstName.length < 2 || payload.firstName.length > 50) {
    return "First name must be between 2 and 50 characters";
  }

  if (payload.lastName.length < 1 || payload.lastName.length > 50) {
    return "Last name must be between 1 and 50 characters";
  }

  

  const passwordError = validatePassword(payload.password, payload.confirmPassword);
  if (passwordError) {
    return passwordError;
  }

  if (!EMAIL_REGEX.test(payload.email)) {
    return "Please enter a valid email address";
  }

  if (!PHONE_REGEX.test(payload.phoneNumber)) {
    return "Phone number must be exactly 10 digits";
  }

  const departmentError = validateOptionSelection(
    "Department",
    payload.departmentId,
    payload.departmentIsOther,
    payload.otherDepartment,
    false
  );
  if (departmentError) return departmentError;

  const rankError = validateOptionSelection(
    "Rank",
    payload.rankId,
    payload.rankIsOther,
    payload.otherRank,
    false
  );
  if (rankError) return rankError;

  return null;
};

const validateUpdatePayload = (payload) => {
  if (
    !payload.roleId ||
    !payload.status ||
    !payload.firstName ||
    !payload.loginType ||
    !payload.email ||
    !payload.phoneNumber
  ) {
    return "All fields are required";
  }

  if (!["Member", "Non Member"].includes(payload.loginType)) {
    return "Invalid login type";
  }

  if (!["Active", "Inactive"].includes(payload.status)) {
    return "Invalid status";
  }

  if (!Number.isInteger(Number(payload.roleId)) || Number(payload.roleId) <= 0) {
    return "Invalid role selected";
  }

  if (payload.firstName.length < 2 || payload.firstName.length > 50) {
    return "Officer name must be between 2 and 50 characters";
  }

  if (!EMAIL_REGEX.test(payload.email)) {
    return "Please enter a valid email address";
  }

  if (!PHONE_REGEX.test(payload.phoneNumber)) {
    return "Phone number must be exactly 10 digits";
  }

  const departmentError = validateOptionSelection(
    "Department",
    payload.departmentId,
    payload.departmentIsOther,
    payload.otherDepartment,
    false
  );
  if (departmentError) return departmentError;

  const rankError = validateOptionSelection(
    "Rank",
    payload.rankId,
    payload.rankIsOther,
    payload.otherRank,
    false
  );
  if (rankError) return rankError;

  return null;
};

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values.map((value) => value.replace(/^"|"$/g, "").trim());
};

const decodeHtmlCell = (value = "") =>
  String(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .trim();

const parseHtmlTableRows = (htmlText) => {
  const tableRows = [];
  const rowMatches = htmlText.match(/<tr[\s\S]*?<\/tr>/gi) || [];

  rowMatches.forEach((rowHtml) => {
    const cellMatches = rowHtml.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [];
    const cells = cellMatches.map(decodeHtmlCell);

    if (cells.length) {
      tableRows.push(cells);
    }
  });

  return tableRows;
};

const legacyBulkHeaders = [
  "login type",
  "full name with rank",
  "first name",
  "last name",
  "user name",
  "password",
  "confirm password",
  "email",
  "phone number",
];

const expectedBulkHeaders = [
  ...legacyBulkHeaders,
  "department",
  "rank",
];

const isValidBulkHeaders = (headers) =>
  [legacyBulkHeaders, expectedBulkHeaders].some(
    (expected) =>
      headers.length === expected.length &&
      expected.every((header, index) => headers[index] === header)
  );

const validateBulkHeaders = (headers) => {
  if (!isValidBulkHeaders(headers)) {
    throw new Error(
      "Invalid template. Please use the sample template for bulk upload"
    );
  }
};

const mapBulkRow = (columns, index, headers) => {
  const getValue = (header) => {
    const columnIndex = headers.indexOf(header);
    return columnIndex === -1 ? "" : String(columns[columnIndex] || "").trim();
  };

  return {
    rowNumber: index + 2,
    loginType: getValue("login type"),
    fullName: getValue("full name with rank"),
    firstName: getValue("first name"),
    lastName: getValue("last name"),
    userName: getValue("user name"),
    password: getValue("password"),
    confirmPassword: getValue("confirm password"),
    email: getValue("email"),
    phoneNumber: getValue("phone number").replace(/\D/g, ""),
    departmentName: getValue("department"),
    rankName: getValue("rank"),
  };
};

const parseBulkCsv = (buffer) => {
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const tableRows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });
    const headerIndex = tableRows.findIndex((row) => {
      const normalizedRow = row.map((header) =>
        String(header || "").trim().toLowerCase()
      );
      return isValidBulkHeaders(normalizedRow);
    });

    if (headerIndex === -1 || tableRows.length <= headerIndex + 1) {
      throw new Error(
        "Invalid template. Please use the sample template for bulk upload"
      );
    }

    const headers = tableRows[headerIndex].map((header) =>
      String(header || "").trim().toLowerCase()
    );
    validateBulkHeaders(headers);

    return tableRows
      .slice(headerIndex + 1)
      .filter((row) => row.some((cell) => String(cell || "").trim()))
      .map((row, index) => mapBulkRow(row, index, headers));
  }

  const csvText = buffer.toString("utf8").replace(/^\uFEFF/, "");

  if (/<table[\s\S]*?>/i.test(csvText)) {
    const tableRows = parseHtmlTableRows(csvText);
    const headerIndex = tableRows.findIndex((row) => {
      const normalizedRow = row.map((header) => header.toLowerCase());
      return isValidBulkHeaders(normalizedRow);
    });

    if (headerIndex === -1 || tableRows.length <= headerIndex + 1) {
      throw new Error(
        "Invalid template. Please use the sample template for bulk upload"
      );
    }

    const headers = tableRows[headerIndex].map((header) => header.toLowerCase());
    validateBulkHeaders(headers);

    return tableRows
      .slice(headerIndex + 1)
      .filter((row) => row.some((cell) => String(cell || "").trim()))
      .map((row, index) => mapBulkRow(row, index, headers));
  }

  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("The uploaded file does not contain any data rows");
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  validateBulkHeaders(headers);

  return lines.slice(1).map((line, index) => {
    const columns = parseCsvLine(line);

    return mapBulkRow(columns, index, headers);
  });
};

const validateBulkRows = (rows) => {
  const errors = [];

  rows.forEach((row) => {
    if (
      !row.loginType ||
      !row.fullName ||
      !row.firstName ||
      !row.lastName ||
      !row.userName ||
      !row.password ||
      !row.confirmPassword ||
      !row.email ||
      !row.phoneNumber
    ) {
      errors.push(`Row ${row.rowNumber}: all columns are required`);
      return;
    }

    const passwordError = validatePassword(row.password, row.confirmPassword);
    if (passwordError) {
      errors.push(`Row ${row.rowNumber}: ${passwordError}`);
    }

    if (!EMAIL_REGEX.test(row.email)) {
      errors.push(`Row ${row.rowNumber}: invalid email address`);
    }

     if (!EMAIL_REGEX.test(row.userName)) {
      errors.push(`Row ${row.rowNumber}: user name must be a valid email address`);
    }

    if (!PHONE_REGEX.test(row.phoneNumber)) {
      errors.push(`Row ${row.rowNumber}: phone number must be exactly 10 digits`);
    }
  });

  return errors;
};

exports.getAllUsers = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const users = await userModel.getAllUsers({ search });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Failed to fetch users");
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Failed to fetch user details");
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
    });
  }
};

exports.getRoleOptions = async (req, res) => {
  try {
    const { loginType = "Member" } = req.query;
    const roles = await userModel.getRoleOptionsByLoginType(loginType);

    return res.status(200).json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error("Failed to fetch role options");
    return res.status(500).json({
      success: false,
      message: "Failed to fetch role options",
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const payload = normalizeUserPayload(req.body);
    const validationMessage = validateCreatePayload(payload);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const createdUser = await userModel.createUser({
      loginType: payload.loginType,
      firstName: payload.firstName,
      lastName: payload.lastName,
      userName: payload.userName,
      password: payload.password,
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      departmentId: payload.departmentId,
      rankId: payload.rankId,
      otherDepartment: payload.otherDepartment,
      otherRank: payload.otherRank,
      createdBy: req.user?.username || req.user?.user_name || "SYSTEM",
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: createdUser,
    });
  } catch (error) {
    console.error("Failed to create user:", error);

    const statusCode =
      error.message === "Username or email already exists"
        ? 409
        : [
            "Invalid department selected",
            "Invalid rank selected",
          ].includes(error.message)
          ? 400
          : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 409 || statusCode === 400
          ? error.message
          : "Failed to create user",
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = normalizeUserPayload(req.body);

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const validationMessage = validateUpdatePayload(payload);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const updatedUser = await userModel.updateUser(id, {
      roleId: Number(payload.roleId),
      status: payload.status,
      firstName: payload.firstName,
      loginType: payload.loginType,
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      departmentId: payload.departmentId,
      rankId: payload.rankId,
      otherDepartment: payload.otherDepartment,
      otherRank: payload.otherRank,
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Failed to update user:", error);

    const statusCode =
      error.message === "User not found"
        ? 404
        : error.message === "Email already exists"
          ? 409
          : [
              "Invalid department selected",
              "Invalid rank selected",
            ].includes(error.message)
            ? 400
            : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 404
          ? "User not found"
          : statusCode === 409
            ? "Email already exists"
            : statusCode === 400
              ? error.message
          : "Failed to update user",
    });
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, confirmPassword } = req.body || {};

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }

    const passwordError = validatePassword(newPassword, confirmPassword);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    await userModel.resetUserPassword(id, newPassword);

    return res.status(200).json({
      success: true,
      message: "User password reset successfully",
    });
  } catch (error) {
    console.error("Failed to reset user password");
    const notFound = error.message === "User not found";

    return res.status(notFound ? 404 : 500).json({
      success: false,
      message: notFound ? "User not found" : "Failed to reset user password",
    });
  }
};

exports.bulkUploadUsers = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Please upload a CSV file",
      });
    }

    const rows = parseBulkCsv(req.file.buffer);
    const validationErrors = validateBulkRows(rows);

    if (validationErrors.length) {
      return res.status(400).json({
        success: false,
        message: "Bulk upload validation failed",
        errors: validationErrors,
      });
    }

    const createdBy =
      String(req.body?.createdBy || "").trim() || "SYSTEM";

    const result = await userModel.createBulkUsers({
      rows: rows.map((row) => ({
        loginType: row.loginType,
        fullName: row.fullName,
        firstName: row.firstName,
        lastName: row.lastName,
        userName: row.userName,
        password: row.password,
        email: row.email,
        phoneNumber: row.phoneNumber,
        departmentName: row.departmentName,
        rankName: row.rankName,
      })),
      createdBy,
    });

    return res.status(200).json({
      success: true,
      message: `Bulk upload completed. Created ${result.insertedCount} users.`,
      data: result,
    });
  } catch (error) {
    console.error("Failed to bulk upload users");
    return res.status(500).json({
      success: false,
      message: "Failed to bulk upload users",
    });
  }
};


exports.getDepartmentOptions = async (req, res) => {
  try {
    const departments = await userModel.getDepartmentOptions();
    return res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error("Failed to fetch department options:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch department options",
    });
  }
};

exports.getRankOptions = async (req, res) => {
  try {
    const ranks = await userModel.getRankOptions();
    return res.status(200).json({
      success: true,
      data: ranks,
    });
  }
  catch (error) {
    console.error("Failed to fetch rank options:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch rank options"
    });
  }
};

