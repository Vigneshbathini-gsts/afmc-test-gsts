const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const requireOrderAccess = require("../middleware/requireOrderAccess");
const checkOrderAccess = requireOrderAccess((req) => req.params.id);
const {
  createOrUpdateNonMember,
  fetchActiveOrders,
  fetchAdminOrderHistory,
  fetchAttendantOrders,
  fetchOrderHistoryUsers,
  fetchItemWiseReport,
  fetchOrderDetails,
  fetchOrderSummary,
  fetchOrderWiseReport,
  lookupNonMember,
  fetchUserOrderHistory,
} = require("../controllers/orderController");

const router = express.Router();

router.get("/active", authMiddleware, requireRole(10, 20, 30), fetchActiveOrders);
router.get("/attendant", authMiddleware, requireRole(10, 30), fetchAttendantOrders);
router.get("/history", authMiddleware, requireRole(10), fetchAdminOrderHistory);
router.get("/history/users", authMiddleware, requireRole(10), fetchOrderHistoryUsers);
router.get("/history/order-wise", authMiddleware, requireRole(10), fetchOrderWiseReport);
router.get("/history/item-wise", authMiddleware, requireRole(10), fetchItemWiseReport);
router.get("/non-member", authMiddleware, requireRole(10, 30), lookupNonMember);
router.post("/non-member", authMiddleware, requireRole(10, 30), createOrUpdateNonMember);
router.get("/user/history", authMiddleware, requireRole(20), fetchUserOrderHistory);
router.get("/:id/summary", authMiddleware, requireRole(10, 20, 30), checkOrderAccess, fetchOrderSummary);
router.get("/:id/details", authMiddleware, requireRole(10, 20, 30), checkOrderAccess, fetchOrderDetails);
router.get("/:id", authMiddleware, requireRole(10, 20, 30), checkOrderAccess, fetchOrderDetails);

module.exports = router;


