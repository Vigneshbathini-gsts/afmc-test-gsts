const jwt = require('jsonwebtoken');
const db = require('../config/db');
const dotenv = require('dotenv');
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters');
}

async function authMiddleware(req, res, next){
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if(!token) return res.status(401).json({ error: "Unauthorized" });
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    const [users] = await db.execute(
      `SELECT USER_ID, ROLE_ID, ATTRIBUTE1, REQUIRED_PASSWORD_CHANGE
       FROM xxafmc_users
       WHERE USER_ID = ?
       LIMIT 1`,
      [payload.userId]
    );
    if (!users.length || users[0].ATTRIBUTE1 !== 'A') return res.status(401).json({ error: "Unauthorized" });
    const user = users[0];
    req.user = {
      ...payload,
      userId: user.USER_ID,
      roleId: user.ROLE_ID,
      requiresPasswordChange:
        String(user.REQUIRED_PASSWORD_CHANGE || "").toUpperCase() === "Y",
    };
    const originalPath = req.originalUrl.split("?")[0];
    const isPasswordChangeRoute =
      originalPath.endsWith("/auth/change-password") ||
      originalPath.endsWith("/auth/logout");
    if (req.user.requiresPasswordChange && !isPasswordChangeRoute) {
      return res.status(403).json({
        success: false,
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "Change your password to continue.",
      });
    }
    next();
  }catch(e){
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = authMiddleware;


