const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/authMiddleware");
const messTimingsMiddleware = require("../../middleware/messTimingsMiddleware");
const requireRole = require("../../middleware/requireRole");
const requireOrderAccess = require("../../middleware/requireOrderAccess");
const PubmenubuyController = require("./PubmenubuyController");

const checkBarOpen = [authMiddleware, messTimingsMiddleware];
const checkOrderAccess = requireOrderAccess((req) => req.params.ORDER_NUMBER);
router.use(requireRole(10, 20, 30));

router.post("/Pubmenubuy/create", checkBarOpen, PubmenubuyController.createPubMenuOrder);
router.get("/Pubmenubuy/:ORDER_NUMBER", checkBarOpen, checkOrderAccess, PubmenubuyController.getPubMenuOrderSummary);
router.patch("/Pubmenubuy/:ORDER_NUMBER/item/:ITEM_CODE", checkBarOpen, checkOrderAccess, PubmenubuyController.updatePubMenuOrderItemQuantity);
router.put(
  "/Pubmenubuy/:ORDER_NUMBER/item/:ITEM_CODE/customization",
  checkBarOpen,
  checkOrderAccess,
  PubmenubuyController.updatePubMenuOrderItemCustomization
);
router.delete("/Pubmenubuy/:ORDER_NUMBER/item/:ITEM_CODE",checkBarOpen, checkOrderAccess, PubmenubuyController.deletePubMenuOrderItem);
router.delete("/Pubmenubuy/:ORDER_NUMBER", authMiddleware,checkBarOpen, checkOrderAccess, PubmenubuyController.cancelPubMenuOrder);
router.put(
  "/Pubmenubuy/:ORDER_NUMBER/line/:ORDER_LINE_ID/quantity",
  checkBarOpen,
  checkOrderAccess,
  PubmenubuyController.updatePubMenuOrderLineQuantity
);

module.exports = router;
