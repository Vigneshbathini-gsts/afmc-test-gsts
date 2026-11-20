const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const requireOrderAccess = require("../middleware/requireOrderAccess");
// const barStatusMiddleware = require("../middleware/barStatusMiddleware");
const messTimingsMiddleware = require("../middleware/messTimingsMiddleware");
const ConfirmOrdercontroller = require("../controllers/ConfirmOrdercontroller");

const router = express.Router();
const checkBarOpen = [authMiddleware, messTimingsMiddleware];
const checkOrderAccess = requireOrderAccess((req) => req.params.ORDER_NUMBER);

router.post(
  "/confirm-order/:ORDER_NUMBER",
  checkBarOpen,
  requireRole(10, 20, 30),
  checkOrderAccess,
  ConfirmOrdercontroller.confirmOrder
);
router.get(
  "/confirm-order/:ORDER_NUMBER",
  checkBarOpen,
  requireRole(10, 20, 30),
  checkOrderAccess,
  ConfirmOrdercontroller.getConfirmedOrderDetails
);

module.exports = router;
