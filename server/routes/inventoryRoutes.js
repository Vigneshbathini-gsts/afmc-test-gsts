const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");
const addStockController = require("../controllers/addStockController");
const upload = require("../utils/uploadMiddleware");
const requireRole = require("../middleware/requireRole");
const authMiddleware = require("../middleware/authMiddleware");

router.get(
  "/customer/:id",
  authMiddleware,
  requireRole(10, 20, 30, 80),
  inventoryController.getCustomerItemById
);

router.use(requireRole(10, 80));

router.get("/", inventoryController.getInventory);
router.get("/categories", inventoryController.getCategories);
router.get("/items", inventoryController.getItems); 
router.get("/subcategories", inventoryController.getSubCategories);
router.get("/bar-types", inventoryController.getBarTypes);
router.get("/barcode/:barcode/exists", inventoryController.checkBarcodeExists);
router.get("/batch-id/next", addStockController.getNextBatchId);
router.get("/stock-out/barcode/:barcode", inventoryController.getStockOutItemByBarcode);
router.get("/stock-in-report", inventoryController.getStockInReport);
router.get("/stock-out-report", inventoryController.getStockOutReport);
router.get("/today-stock-out-details", inventoryController.getTodayStockOutDetails);
router.get("/:id", inventoryController.getItemById);
router.post("/", upload.single("image"), upload.validateImageSignature, inventoryController.createItem);
router.put("/:itemCode/image", upload.single("image"), upload.validateImageSignature, inventoryController.updateItemImage);
router.post("/add-stock", addStockController.addStock);
router.post("/stock-out", inventoryController.addStockOut);
router.put("/:itemCode/status", inventoryController.updateItemStatus);

module.exports = router;


