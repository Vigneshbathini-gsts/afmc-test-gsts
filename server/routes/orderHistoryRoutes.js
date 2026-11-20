const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const router = express.Router();
router.use(requireRole(10));

const {
  fetchAdminOrderHistory,
  fetchOrderDetails,
} = require("../controllers/orderController");

router.get("/history", authMiddleware, fetchAdminOrderHistory);
router.get("/:orderId/details", authMiddleware, fetchOrderDetails);
router.get("/:id/details", authMiddleware, fetchOrderDetails);      

module.exports = router;