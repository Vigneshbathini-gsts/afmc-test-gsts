// auth routes
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const rateLimit = require("../middleware/rateLimit");

const loginRateLimit = rateLimit({ windowMs: 60 * 1000, max: 8 });
const resetRateLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });
const changePasswordRateLimit = rateLimit({ windowMs: 60 * 1000, max: 5 });
const roleLookupRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const registrationRateLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });

router.post(
  "/register",
  authMiddleware,
  requireRole(10),
  registrationRateLimit,
  userController.createUser
);

// Route for user login
router.post("/login", loginRateLimit, authController.loginUser);
router.post("/get-role", roleLookupRateLimit, authController.getUserRole);
router.post("/change-password", authMiddleware, changePasswordRateLimit, authController.changePassword);
router.post("/forgot-password", resetRateLimit, authController.forgotPassword);
router.post("/reset-password", resetRateLimit, authController.resetPassword);
router.post("/logout", authController.logout);


module.exports = router;

