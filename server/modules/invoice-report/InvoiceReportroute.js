const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const requireRole = require("../../middleware/requireRole");
const requireOrderAccess = require("../../middleware/requireOrderAccess");
const invoiceReportController = require("./InvoiceReportcontroller");

const router = express.Router();
const checkOrderAccess = requireOrderAccess((req) => req.params.orderNumber);

router.get(
  "/:orderNumber",
  authMiddleware,
  requireRole(10, 20, 30),
  checkOrderAccess,
  invoiceReportController.getInvoiceReportByOrderNumber
);

module.exports = router;
