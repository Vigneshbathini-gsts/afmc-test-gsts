// payment routes


const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const messTimingsMiddleware = require("../../middleware/messTimingsMiddleware");
const requireRole = require("../../middleware/requireRole");
const requireOrderAccess = require("../../middleware/requireOrderAccess");
const router = express.Router();

const {
  getPaymentModes,
  updatePayment,
} = require("./paymentController");

const validatePayment = require("./validatePayment");
const checkBarOpen = [authMiddleware, messTimingsMiddleware];
const checkPaymentOrder = requireOrderAccess(
  (req) => req.body?.orderNumber || req.body?.order_number
);

router.get("/modes", checkBarOpen, requireRole(10, 20, 30), getPaymentModes);
router.put(
  "/update",
  checkBarOpen,
  requireRole(10, 20, 30),
  checkPaymentOrder,
  validatePayment,
  updatePayment
);

module.exports = router;
