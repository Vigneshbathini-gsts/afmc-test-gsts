const express = require("express");
const router = express.Router();
const KitchenOrdersController = require("../controllers/KitchenOrdersController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const requireOrderAccess = require("../middleware/requireOrderAccess");
const requireCocktailOrderAccess = requireOrderAccess((req) => req.query.orderNumber);

const checkCocktailDetailsAccess = (req, res, next) => {
  const orderNumber = String(req.query.orderNumber ?? "").trim();
  if (!orderNumber || [10, 40].includes(Number(req.user?.roleId))) {
    return next();
  }
  return requireCocktailOrderAccess(req, res, next);
};

router.get(
  "/cocktail/:itemId",
  authMiddleware,
  checkCocktailDetailsAccess,
  KitchenOrdersController.getCocktailDetailsById
);
router.use(requireRole(10, 40));
router.get("/", authMiddleware, KitchenOrdersController.getOrders);
router.put("/status", authMiddleware, KitchenOrdersController.updateBarOrderStatus);
router.post("/items", authMiddleware, KitchenOrdersController.getOrderItems);
router.post("/scan", authMiddleware, KitchenOrdersController.processBarcodeScan);
router.get("/scanned-items/:orderNumber", authMiddleware, KitchenOrdersController.getScannedItemsFromSession);
router.delete("/scanned-items/:orderNumber", authMiddleware, KitchenOrdersController.clearScannedItemsFromSession);
router.put("/cancel", authMiddleware, KitchenOrdersController.cancelBarOrderItem);
router.get("/active", authMiddleware, KitchenOrdersController.getActiveBarOrders);
router.put("/notifications/read", authMiddleware, KitchenOrdersController.markNotificationAsRead);
router.put("/notifications/read-all", authMiddleware, KitchenOrdersController.markAllNotificationsAsRead);
router.get("/cancelled-orders", authMiddleware, KitchenOrdersController.getCancelledOrders);
router.get("/order-history", authMiddleware, KitchenOrdersController.getOrderHistory);
router.get("/cancelled-order-details/:orderNumber", authMiddleware, KitchenOrdersController.getOrderDetailsByOrderNumber);
router.get("/order-history-details/:orderNumber", authMiddleware, KitchenOrdersController.getOrderHistoryItemDetails);
router.post("/completeOrder", authMiddleware, KitchenOrdersController.completeOrder);
module.exports = router;

