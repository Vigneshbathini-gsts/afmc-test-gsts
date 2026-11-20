const express = require("express");
const router = express.Router();
const requireRole = require("../middleware/requireRole");
const authMiddleware = require("../middleware/authMiddleware");

const {
  getAllOffers,
  getOfferById,
  createOffer,
  updateOffer,
  getAllItemsForOffer,
} = require("../controllers/offerController")

// IMPORTANT: specific routes first
router.get("/active", authMiddleware, getAllOffers);
router.get("/items", authMiddleware, requireRole(10), getAllItemsForOffer);

router.get("/", authMiddleware, requireRole(10), getAllOffers);
router.get("/:id", authMiddleware, requireRole(10), getOfferById);
router.post("/", authMiddleware, requireRole(10), createOffer);
router.put("/:id", authMiddleware, requireRole(10), updateOffer);

module.exports = router;

