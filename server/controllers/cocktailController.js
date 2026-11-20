const {
  getCocktailItems,
  getCocktailIngredientOptions,
  getCocktailIngredientPricing,
  getCocktailItemById,
  createCocktailItem,
  updateCocktailItem,
} = require("../models/cocktailModel");

const getAuditUserName = (req) =>
  req.user?.username ||
  req.body?.createdBy ||
  req.body?.updatedBy ||
  "SYSTEM";

const getCocktails = async (req, res) => {
  try {
    const rows = await getCocktailItems(req.query.search, {
      limit: req.query.limit,
      offset: req.query.offset,
    });

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Failed to fetch cocktail items");
    res.status(500).json({
      success: false,
      message: "Error fetching cocktail items",
    });
  }
};

const getCocktailById = async (req, res) => {
  try {
    const itemId = Number(req.params.id);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid Item ID is required",
      });
    }

    const row = await getCocktailItemById(itemId);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Cocktail item not found",
      });
    }

    return res.json({
      success: true,
      data: row,
    });
  } catch (error) {
    console.error("Failed to fetch cocktail item");
    return res.status(500).json({
      success: false,
      message: "Error fetching cocktail item",
    });
  }
};

const getCocktailIngredients = async (req, res) => {
  try {
    const rows = await getCocktailIngredientOptions(req.query.search, {
      limit: req.query.limit,
      offset: req.query.offset,
      subCategory: req.query.subCategory,
    });
// console.log(rows.length)
    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Failed to fetch cocktail ingredients");
    return res.status(500).json({
      success: false,
      message: "Error fetching cocktail ingredients",
    });
  }
};

const getCocktailIngredientPrice = async (req, res) => {
  try {
    const data = await getCocktailIngredientPricing(
      req.query.itemCode,
      req.query.pegs
    );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Failed to calculate cocktail ingredient price");
    return res.status(400).json({
      success: false,
      message: "Error calculating ingredient price",
    });
  }
};

const createCocktail = async (req, res) => {
  try {
    const result = await createCocktailItem(req.body, {
      userName: getAuditUserName(req),
      imageFile: req.file || null,
    });

    return res.status(201).json({
      success: true,
      message: "Cocktail item created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Failed to create cocktail item");
    return res.status(400).json({
      success: false,
      message: "Error creating cocktail item",
    });
  }
};

const updateCocktail = async (req, res) => {
  try {
    const itemId = Number(req.params.id);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid Item ID is required",
      });
    }

    const result = await updateCocktailItem(itemId, req.body, {
      userName: getAuditUserName(req),
      imageFile: req.file || null,
    });

    return res.json({
      success: true,
      message: "Cocktail item updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Failed to update cocktail item");
    const statusCode = error.message === "Cocktail item not found" ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message: statusCode === 404 ? "Cocktail item not found" : "Error updating cocktail item",
    });
  }
};

module.exports = {
  getCocktails,
  getCocktailIngredients,
  getCocktailIngredientPrice,
  getCocktailById,
  createCocktail,
  updateCocktail,
};


