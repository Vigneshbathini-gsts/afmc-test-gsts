const express = require("express");
const {
  getCocktails,
  getCocktailIngredients,
  getCocktailIngredientPrice,
  getCocktailById,
  createCocktail,
  updateCocktail,
} = require("../controllers/cocktailController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../utils/uploadMiddleware");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

router.get("/", getCocktails);
router.get("/ingredients/options", getCocktailIngredients);
router.get("/ingredients/price", getCocktailIngredientPrice);
router.get("/:id", getCocktailById);
router.post("/", requireRole(10), authMiddleware, upload.single("image"), upload.validateImageSignature, createCocktail);
router.put("/:id", requireRole(10), authMiddleware, upload.single("image"), upload.validateImageSignature, updateCocktail);

module.exports = router;


