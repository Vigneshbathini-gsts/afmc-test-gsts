const db = require("../config/db");
const jwt = require("jsonwebtoken");
const { getRedirectPath } = require("../utils/roleRedirect");
const nodemailer = require("nodemailer");
const {
  generateResetToken,
  hashResetToken,
  hashPassword,
  comparePassword,
  validatePassword,
} = require("../helpers/authHelper");
const MessTimingsService = require("../services/MessTimingsService");

const MESS_TIMING_EXEMPT_ROLES = [10, 40];

// ==========================================
// GET USER ROLE BASED ON EMAIL / USERNAME
// ==========================================
exports.getUserRole = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username / Email is required",
      });
    }

    const sql = `
      SELECT 
        u.ROLE_ID
      FROM xxafmc_users u
      WHERE (u.EMAIL = ? OR u.USER_NAME = ?)
        AND u.ATTRIBUTE1 = 'A'
      LIMIT 1
    `;

    const [rows] = await db.execute(sql, [username, username]);

    const roleId = Number(rows?.[0]?.ROLE_ID || 0);

    return res.status(200).json({
      success: true,
      showOutletSelection: roleId === 40,
    });
  } catch (error) {
    console.error("Get User Role Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching role",
    });
  }
};


// ==========================================
// LOGIN USER
// ==========================================
exports.loginUser = async (req, res) => {
  try {
    const { username, password, outletType } = req.body;


    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const sql = `
      SELECT 
        u.USER_ID,
        u.USER_NAME,
        u.EMAIL,
        u.PHONE_NUMBER,
        u.LOGIN_TYPE,
        u.ROLE_ID,
        u.PASSWORD,
        u.REQUIRED_PASSWORD_CHANGE,
        u.ATTRIBUTE1,
        r.ROLE_CODE,
        r.ROLE_NAME
      FROM xxafmc_users u
      JOIN xxafmc_role r 
        ON u.ROLE_ID = r.ROLE_ID
      WHERE (u.EMAIL = ? OR u.USER_NAME = ?)
      LIMIT 1
    `;

    const [rows] = await db.execute(sql, [username, username]);


    if (!rows || rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password, or account is inactive",
      });
    }

    const user = rows[0];
    const passwordCheck = await comparePassword(password, user.PASSWORD);
    if (user.ATTRIBUTE1 !== "A" || !passwordCheck.valid) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }
    const requiresPasswordChange =
      passwordCheck.legacy || String(user.REQUIRED_PASSWORD_CHANGE || "").toUpperCase() === "Y";
    if (passwordCheck.legacy) {
      await db.execute(
        "UPDATE xxafmc_users SET REQUIRED_PASSWORD_CHANGE = 'Y' WHERE USER_ID = ?",
        [user.USER_ID]
      );
    }

    if (
      !requiresPasswordChange &&
      !MESS_TIMING_EXEMPT_ROLES.includes(Number(user.ROLE_ID)) &&
      !(await MessTimingsService.isMessOpen({ forceRefresh: true }))
    ) {
      return res.status(403).json({
        success: false,
        code: "MESS_CLOSED",
        message: "Mess is currently closed.",
      });
    }

    // Always start a fresh session on login so previous in-session state
    // (e.g., scanned items) does not carry across logins / closed tabs.
    if (req.session?.regenerate) {
      await new Promise((resolve, reject) => {
        req.session.regenerate((err) => (err ? reject(err) : resolve()));
      });
      req.session.loggedInAt = Date.now();
      req.session.userId = user.USER_ID;
      req.session.roleId = user.ROLE_ID;
    }

    // If role 40, outlet is mandatory
    if (Number(user.ROLE_ID) === 40 && !outletType) {
      return res.status(400).json({
        success: false,
        message: "Please select Kitchen or Bar",
      });
    }

    const destinationPath = getRedirectPath(user.ROLE_ID, outletType, user.LOGIN_TYPE);
    const redirectPath = requiresPasswordChange
      ? "/force-password-change"
      : destinationPath;
    // console.log("redirectPath",redirectPath);


    const token = jwt.sign(
      {
        userId: user.USER_ID,
        username: user.USER_NAME,
        roleId: user.ROLE_ID,
        roleCode: user.ROLE_CODE,
        loginType: user.LOGIN_TYPE || null,
        outletType: outletType || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );
    res.clearCookie("afmc_access", {
      httpOnly: true,
      sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === "production" ? "none" : "lax"),
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      redirectPath,
      destinationPath,
      user: {
        userId: user.USER_ID,
        username: user.USER_NAME,
        email: user.EMAIL,
        phoneNumber: user.PHONE_NUMBER,
        loginType: user.LOGIN_TYPE || null,
        roleId: user.ROLE_ID,
        roleCode: user.ROLE_CODE,
        roleName: user.ROLE_NAME,
        outletType: outletType || null,
      },
      requiresPasswordChange,
    });
  } catch (error) {
    console.error("Login failed");
    return res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};




// =========================
// Forgot Password
// =========================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    // console.log("Forgot Password Request for:", email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check user exists
    const [users] = await db.query(
      "SELECT USER_ID, USER_NAME, EMAIL, FIRST_NAME FROM xxafmc_users WHERE EMAIL = ? AND ATTRIBUTE1 = 'A'",
      [email]
    );

    if (users.length === 0) {
      return res.status(200).json({ success: true, message: "If the account exists, a reset link has been sent." });
    }

    const user = users[0];

    if (!user.EMAIL) {
      return res.status(200).json({ success: true, message: "If the account exists, a reset link has been sent." });
    }

    // Generate token and expiry
    const resetToken = generateResetToken();
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000);

    // Save token in DB
    await db.query(
      "UPDATE xxafmc_users SET RESET_TOKEN = ?, RESET_EXPIRY = ? WHERE USER_ID = ?",
      [hashResetToken(resetToken), expiryTime, user.USER_ID]
    );

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");

    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

    // Mail config
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.EMAIL,
      subject: "Password Reset Request",
      html: `
        <h3>Reset Your Password</h3>
        <p>Hello ${user.FIRST_NAME || user.USER_NAME},</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 15 minutes.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "If the account exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error("Forgot Password Error:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

// =========================
// Reset Password
// =========================
exports.resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        message: "Token, password and confirm password are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Password and confirm password do not match",
      });
    }

    const passwordError = validatePassword(password, confirmPassword);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    // Find user with valid token
   const [users] = await db.query(
  "SELECT USER_ID, PASSWORD FROM xxafmc_users WHERE RESET_TOKEN = ? AND RESET_EXPIRY > NOW() AND ATTRIBUTE1 = 'A'",
  [hashResetToken(token)]
);

    if (users.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = users[0];
    if ((await comparePassword(password, user.PASSWORD)).valid) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as the current password",
      });
    }

    const hashedPassword = await hashPassword(password);

    // Update password and clear token
    await db.query(
      `UPDATE xxafmc_users
       SET PASSWORD = ?, RESET_TOKEN = NULL, RESET_EXPIRY = NULL,
           REQUIRED_PASSWORD_CHANGE = 'N'
       WHERE USER_ID = ?`,
      [hashedPassword, user.USER_ID]
    );

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (err) {
    console.error("Reset Password Error:");
    return res.status(500).json({ message: "Internal server error" });
  }
};


/**
 * CHANGE PASSWORD
 */
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user?.userId;

    // Validation
    if (!userId || !oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
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
      return res.status(400).json({ success: false, message: passwordError });
    }

    // Fetch user
    const [users] = await db.query(
      `SELECT user_id, password
       FROM xxafmc_users
       WHERE user_id = ? AND ATTRIBUTE1 = 'A'`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    // Compare old password
    const oldPasswordCheck = await comparePassword(oldPassword, user.password);
    const isOldPasswordValid = oldPasswordCheck.valid;

    if (!isOldPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect",
      });
    }

    const passwordError = validatePassword(newPassword, confirmPassword);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    // Prevent same password reuse
    const isSamePassword = (await comparePassword(newPassword, user.password)).valid;

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be same as old password",
      });
    }

    // MD5 hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
   await db.query(
  `UPDATE xxafmc_users
  SET password = ?, REQUIRED_PASSWORD_CHANGE = 'N'
   WHERE user_id = ?`,
  [hashedPassword, user.user_id]
);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error in changePassword:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("afmc_access", { httpOnly: true, sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === "production" ? "none" : "lax"), secure: process.env.NODE_ENV === "production", path: "/" });
  if (req.session?.destroy) {
    return req.session.destroy(() => res.status(200).json({ success: true, message: "Logged out" }));
  }
  return res.status(200).json({ success: true, message: "Logged out" });
};


