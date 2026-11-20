const express = require("express");
const stockReportRoutes = require("./StockReports");
const orderTransactionRoutes = require("./ordertransactiondetails");
const orderItemRoutes = require("./orderitemdetails");
const requireRole = require("../middleware/requireRole");

const router = express.Router();
router.use(requireRole(10));

router.use(stockReportRoutes);
router.use(orderTransactionRoutes);
router.use(orderItemRoutes);

module.exports = router;


