const express = require("express");
const router = express.Router();
const requireRole = require("../middleware/requireRole");
router.use(requireRole(10));

const {
  updateMemberPricing,
  updateNonMemberPricing,
  getPricingReport,
} = require("../controllers/profitManagementController");

router.put("/member", updateMemberPricing);
router.put("/non-member", updateNonMemberPricing);
router.get("/report", getPricingReport);

module.exports = router;

