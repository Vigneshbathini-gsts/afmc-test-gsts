const express = require("express");
const router = express.Router();
const requireRole = require("../middleware/requireRole");
router.use(requireRole(10));

const {
  getCancelledOrders,
} = require("../controllers/cancelledOrdersController");

router.get("/", getCancelledOrders);

module.exports = router;

