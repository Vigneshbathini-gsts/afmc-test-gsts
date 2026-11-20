const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const requireRole = require("../../middleware/requireRole");
const requireOrderAccess = require("../../middleware/requireOrderAccess");
const {
  createInvoice,
  getInvoiceByOrder,
  saveInvoicePayment,
} = require("./invoiceController");

const router = express.Router();
const checkOrderAccess = requireOrderAccess(
  (req) => req.params.orderNumber || req.body?.orderNumber || req.body?.order_number
);
router.use(requireRole(10, 20, 30));

// Get invoice details by order number
router.get("/:orderNumber", authMiddleware, checkOrderAccess, getInvoiceByOrder);

// Create new invoice
router.post("/create", authMiddleware, checkOrderAccess, createInvoice);

// Save invoice payment (if function exists in controller)
router.post("/:orderNumber/payment", authMiddleware, checkOrderAccess, (req, res, next) => {
  if (saveInvoicePayment) {
    return saveInvoicePayment(req, res, next);
  }
  res.status(404).json({ error: "Payment endpoint not available" });
});

module.exports = router;
